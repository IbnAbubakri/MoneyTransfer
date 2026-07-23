import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting_for_payment: ["payment_under_review", "cancelled"],
  payment_under_review: ["payment_confirmed", "rejected", "cancelled"],
  payment_confirmed: ["awaiting_bank_details", "cancelled"],
  awaiting_bank_details: ["transfer_in_progress", "cancelled"],
  transfer_in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  switch (name) {
    case "getExchangeRate": {
      const { data } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("is_active", true)
        .eq("from_currency", "SAR")
        .eq("to_currency", "NGN")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return {
        rate: data?.rate || 430,
        from_currency: "SAR",
        to_currency: "NGN",
      };
    }

    case "createTransaction": {
      const sarAmount = args.sarAmount as number;
      const { data: rateData } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("is_active", true)
        .eq("from_currency", "SAR")
        .eq("to_currency", "NGN")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const rate = rateData?.rate || 430;
      const ngnAmount = sarAmount * rate;

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const reference = `TXN-${dateStr}-${random}`;

      const { data: txn, error } = await supabase
        .from("transactions")
        .insert({
          reference,
          customer_id: userId,
          sar_amount: sarAmount,
          exchange_rate: rate,
          ngn_amount: ngnAmount,
          status: "waiting_for_payment",
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      await supabase.from("transaction_history").insert({
        transaction_id: txn.id,
        new_status: "waiting_for_payment",
        changed_by: userId,
        notes: "Transaction created via AI chat",
      });

      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "create_transaction",
        entity_type: "transaction",
        entity_id: txn.id,
        new_values: { reference, sar_amount: sarAmount, exchange_rate: rate, ngn_amount: ngnAmount },
      });

      return {
        success: true,
        reference: txn.reference,
        sar_amount: sarAmount,
        exchange_rate: rate,
        ngn_amount: ngnAmount,
        transaction_id: txn.id,
      };
    }

    case "getTransactionStatus": {
      const reference = args.reference as string;
      const { data: txn } = await supabase
        .from("transactions")
        .select("reference, status, sar_amount, exchange_rate, ngn_amount, bank_name, bank_account_number, bank_account_name, transfer_reference, created_at")
        .eq("reference", reference)
        .eq("customer_id", userId)
        .single();

      if (!txn) {
        return { found: false, error: "Transaction not found" };
      }

      return {
        found: true,
        reference: txn.reference,
        status: txn.status,
        sar_amount: txn.sar_amount,
        ngn_amount: txn.ngn_amount,
        exchange_rate: txn.exchange_rate,
        bank_name: txn.bank_name,
        bank_account_number: txn.bank_account_number,
        bank_account_name: txn.bank_account_name,
        transfer_reference: txn.transfer_reference,
      };
    }

    case "submitPaymentReceipt": {
      const reference = args.reference as string;
      const receiptUrl = args.receiptUrl as string;

      const { data: txn } = await supabase
        .from("transactions")
        .select("id, status")
        .eq("reference", reference)
        .eq("customer_id", userId)
        .single();

      if (!txn) {
        return { success: false, error: "Transaction not found" };
      }

      if (txn.status !== "waiting_for_payment") {
        return { success: false, error: `Cannot submit receipt for transaction with status: ${txn.status}` };
      }

      if (!VALID_TRANSITIONS[txn.status]?.includes("payment_under_review")) {
        return { success: false, error: "Invalid status transition" };
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          status: "payment_under_review",
          payment_receipt_url: receiptUrl,
        })
        .eq("id", txn.id);

      if (error) {
        return { success: false, error: error.message };
      }

      await supabase.from("transaction_history").insert({
        transaction_id: txn.id,
        old_status: "waiting_for_payment",
        new_status: "payment_under_review",
        changed_by: userId,
        notes: "Payment receipt submitted via AI chat",
      });

      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "submit_receipt",
        entity_type: "transaction",
        entity_id: txn.id,
        old_values: { status: "waiting_for_payment" },
        new_values: { status: "payment_under_review", receipt_url: receiptUrl },
      });

      return { success: true, new_status: "payment_under_review" };
    }

    case "submitBankDetails": {
      const reference = args.reference as string;
      const bankName = args.bankName as string;
      const accountNumber = args.accountNumber as string;
      const accountName = args.accountName as string;

      const { data: txn } = await supabase
        .from("transactions")
        .select("id, status")
        .eq("reference", reference)
        .eq("customer_id", userId)
        .single();

      if (!txn) {
        return { success: false, error: "Transaction not found" };
      }

      const allowedStatuses = ["payment_confirmed", "awaiting_bank_details"];
      if (!allowedStatuses.includes(txn.status)) {
        return { success: false, error: `Cannot submit bank details for transaction with status: ${txn.status}` };
      }

      if (!VALID_TRANSITIONS[txn.status]?.includes("awaiting_bank_details")) {
        return { success: false, error: "Invalid status transition" };
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          bank_name: bankName,
          bank_account_number: accountNumber,
          bank_account_name: accountName,
          status: "awaiting_bank_details",
        })
        .eq("id", txn.id);

      if (error) {
        return { success: false, error: error.message };
      }

      await supabase.from("transaction_history").insert({
        transaction_id: txn.id,
        old_status: txn.status,
        new_status: "awaiting_bank_details",
        changed_by: userId,
        notes: "Bank details submitted via AI chat",
      });

      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "submit_bank_details",
        entity_type: "transaction",
        entity_id: txn.id,
        new_values: { bank_name: bankName, bank_account_number: accountNumber.slice(-4).padStart(accountNumber.length, "*"), bank_account_name: accountName },
      });

      return { success: true, new_status: "awaiting_bank_details" };
    }

    case "getCustomerTransactions": {
      const { data: txns } = await supabase
        .from("transactions")
        .select("reference, sar_amount, ngn_amount, exchange_rate, status, created_at")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        transactions: txns || [],
        count: txns?.length || 0,
      };
    }

    default:
      return { error: `Unknown function: ${name}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages" }, { status: 400 });
    }

    // Verify the access token from Authorization header (NOT from request body)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const accessToken = authHeader.slice(7);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Verify the token is valid and get the real user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const customerName = profile?.full_name || "Customer";

    const { data: kbEntries } = await supabase
      .from("ai_knowledge_base")
      .select("category, question, answer")
      .eq("is_active", true)
      .order("category");

    const { data: rateData } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("is_active", true)
      .eq("from_currency", "SAR")
      .eq("to_currency", "NGN")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentRate = rateData?.rate || 430;

    const kbText = (kbEntries || [])
      .map((e) => `- [${e.category}] Q: ${e.question}\n  A: ${e.answer}`)
      .join("\n");

    const systemPrompt = `You are a professional AI exchange assistant for a SAR to NGN foreign exchange platform.

Customer name: ${customerName}
Current exchange rate: ₦${currentRate} per 1 SAR
Minimum exchange amount: 100 SAR

## Company Bank Details (for customer payment)
- Bank Name: Al Rajhi Bank
- Account Number: 2071080100455095
- Account Name: Abubakri Abdulrasaq

## Your Role
You guide customers through the SAR to NGN exchange process. You handle the full conversation flow:
1. When the customer's first message is a greeting (hi, hello, hey, etc.), greet them warmly, introduce yourself as the AI Exchange Assistant for the SAR to NGN platform, explain what you do (check rates, help exchange SAR to NGN, track transactions), then ask how you can help them.
2. Greet customers and ask how much SAR they want to exchange
3. Use getExchangeRate to show the current rate
3. Use createTransaction when the customer confirms (says YES)
4. Show bank details after transaction creation
5. Accept receipt uploads and use submitPaymentReceipt
6. After admin confirms payment, collect bank details with submitBankDetails
7. Answer questions using the knowledge base below
8. Check transaction status when asked

## Knowledge Base
${kbText || "No knowledge base entries available."}

## Important Rules
- You are a COMMUNICATION assistant only. You NEVER make financial decisions (approving/rejecting payments, completing transfers).
- Always use the backend functions (tools) to create transactions, submit receipts, and update data. Never make up transaction references or statuses.
- Be professional, concise, and helpful.
- When a customer says they want to exchange SAR, ask for the amount first.
- When showing calculations, format them clearly.
- When a customer says YES to confirm, immediately create the transaction.
- For receipt uploads, the customer will provide a URL — use submitPaymentReceipt.
- For bank details collection, ask for: Bank Name, Account Number, Account Holder Name — then use submitBankDetails.
- Never fabricate information. If unsure, say you'll check and use the appropriate tool.`;

    const MAX_HISTORY = 20;
    const cappedMessages = messages.length > MAX_HISTORY
      ? messages.slice(messages.length - MAX_HISTORY)
      : messages;

    const geminiMessages = cappedMessages.map((m: ChatMessage) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
    const GEMINI_MODEL = "gemini-3.5-flash-lite";
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const functionDeclarations = [
      {
        name: "getExchangeRate",
        description: "Get the current SAR to NGN exchange rate",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "createTransaction",
        description: "Create a new exchange transaction. Use when customer confirms (says YES).",
        parameters: {
          type: "OBJECT",
          properties: { sarAmount: { type: "NUMBER", description: "Amount in SAR" } },
          required: ["sarAmount"],
        },
      },
      {
        name: "getTransactionStatus",
        description: "Get the status and details of an existing transaction",
        parameters: {
          type: "OBJECT",
          properties: { reference: { type: "STRING", description: "Transaction reference" } },
          required: ["reference"],
        },
      },
      {
        name: "submitPaymentReceipt",
        description: "Submit a payment receipt URL for a transaction",
        parameters: {
          type: "OBJECT",
          properties: {
            reference: { type: "STRING", description: "Transaction reference" },
            receiptUrl: { type: "STRING", description: "URL of uploaded receipt" },
          },
          required: ["reference", "receiptUrl"],
        },
      },
      {
        name: "submitBankDetails",
        description: "Submit customer's Nigerian bank details for receiving payment",
        parameters: {
          type: "OBJECT",
          properties: {
            reference: { type: "STRING", description: "Transaction reference" },
            bankName: { type: "STRING", description: "Bank name" },
            accountNumber: { type: "STRING", description: "Account number" },
            accountName: { type: "STRING", description: "Account holder name" },
          },
          required: ["reference", "bankName", "accountNumber", "accountName"],
        },
      },
      {
        name: "getCustomerTransactions",
        description: "Get a list of the customer's recent transactions",
        parameters: { type: "OBJECT", properties: {} },
      },
    ];

    async function callGemini(contents: { role: string; parts: { text?: string; functionCall?: unknown; functionResponse?: unknown }[] }[], retries = 3): Promise<Record<string, unknown>> {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const body = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: [{ functionDeclarations }],
          };
          const resp = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify(body),
          });
          if (!resp.ok) {
            const errBody = await resp.text();
            throw new Error(`Gemini ${resp.status}: ${errBody.slice(0, 200)}`);
          }
          return await resp.json();
        } catch (err: unknown) {
          const isQuota = err instanceof Error && (err.message.includes("429") || err.message.includes("503"));
          if (isQuota && attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 3000;
            console.log(`Gemini retry ${attempt + 1}/${retries} after ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw err;
        }
      }
      throw new Error("Max retries exceeded");
    }

    let conversationContents: { role: string; parts: Record<string, unknown>[] }[] = geminiMessages.map((m: { role: string; parts: { text: string }[] }) => ({
      role: m.role,
      parts: m.parts,
    }));

    let finalText = "";
    let maxIterations = 10;

    while (maxIterations > 0) {
      const geminiResp = await callGemini(conversationContents);
      const candidate = (geminiResp as Record<string, unknown>).candidates as { content: { parts: Record<string, unknown>[] } }[] | undefined;
      if (!candidate || !candidate[0] || !candidate[0].content) break;

      const parts = candidate[0].content.parts;
      const functionCallParts = parts.filter((p) => p.functionCall);

      if (functionCallParts.length === 0) {
        finalText = parts.map((p) => p.text || "").join("");
        break;
      }

      conversationContents.push({ role: "model", parts });

      for (const fcPart of functionCallParts) {
        const fc = fcPart.functionCall as { name: string; args: Record<string, unknown> };
        console.log(`[TOOL CALL] ${fc.name}`, JSON.stringify(fc.args));
        const toolResult = await executeTool(fc.name, fc.args, userId, supabase);
        console.log(`[TOOL RESULT] ${fc.name}`, JSON.stringify(toolResult).slice(0, 200));

        conversationContents.push({
          role: "user",
          parts: [{ functionResponse: { name: fc.name, response: toolResult } }],
        });
      }
      maxIterations--;
    }

    if (!finalText) finalText = "I apologize, but I could not process your request. Please try again.";

    if (profile) {
      const lastUserMsg = messages.filter((m: ChatMessage) => m.role === "user").pop();
      const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + "…" : s;
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "ai_chat",
        entity_type: "ai_chat",
        new_values: {
          user_message: truncate(lastUserMsg?.content || "", 500),
          ai_response: truncate(finalText, 500),
        },
      });
    }

    return NextResponse.json({ reply: finalText });
  } catch (error) {
    console.error("[CHAT ERROR]", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 }
    );
  }
}
