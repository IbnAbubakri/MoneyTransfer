import { createSupabaseBrowser } from "./supabase";
import {
  Profile,
  Transaction,
  TransactionWithCustomer,
  TransactionWithHistory,
  TransactionHistory,
  ExchangeRate,
  AiKnowledgeBase,
  Notification,
  TransactionStatus,
  AuditLog,
} from "./types";
import { isValidTransition as _isValidTransition } from "./status-config";

const supabase = createSupabaseBrowser();

// =====================================================
// PROFILE FUNCTIONS
// =====================================================
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.role === "admin";
}

// Re-export from shared module
export const isValidTransition = _isValidTransition;

// =====================================================
// EXCHANGE RATE FUNCTIONS
// =====================================================
export async function getActiveExchangeRate(): Promise<ExchangeRate | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("is_active", true)
    .eq("from_currency", "SAR")
    .eq("to_currency", "NGN")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching exchange rate:", error);
    return null;
  }

  return data;
}

export async function updateExchangeRate(
  rate: number,
  adminId: string
): Promise<boolean> {
  // Deactivate current rate
  const { error: deactivateError } = await supabase
    .from("exchange_rates")
    .update({ is_active: false })
    .eq("is_active", true)
    .eq("from_currency", "SAR")
    .eq("to_currency", "NGN");

  if (deactivateError) {
    console.error("Error deactivating current rate:", deactivateError);
    return false;
  }

  // Insert new rate
  const { error } = await supabase.from("exchange_rates").insert({
    from_currency: "SAR",
    to_currency: "NGN",
    rate,
    is_active: true,
    created_by: adminId,
  });

  if (error) {
    console.error("Error updating exchange rate:", error);
    return false;
  }

  return true;
}

// =====================================================
// TRANSACTION FUNCTIONS
// =====================================================
export function generateTransactionReference(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TXN-${dateStr}-${random}`;
}

export async function createTransaction(
  customerId: string,
  sarAmount: number,
  exchangeRate: number
): Promise<Transaction | null> {
  const reference = generateTransactionReference();
  const ngnAmount = sarAmount * exchangeRate;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      reference,
      customer_id: customerId,
      sar_amount: sarAmount,
      exchange_rate: exchangeRate,
      ngn_amount: ngnAmount,
      status: "waiting_for_payment",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    return null;
  }

  return data;
}

export async function getTransactionByReference(
  reference: string
): Promise<TransactionWithCustomer | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles!customer_id(*)")
    .eq("reference", reference)
    .single();

  if (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }

  return data;
}

export async function getCustomerTransactions(
  customerId: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data || [];
}

export async function getAllTransactions(limit = 50, page = 0): Promise<TransactionWithCustomer[]> {
  const from = page * limit;
  const to = from + limit - 1;
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles!customer_id(*)")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data || [];
}

export async function getAllTransactionsCount(): Promise<number> {
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true });
  return count || 0;
}

export async function getTransactionsByStatus(
  status: TransactionStatus,
  limit = 50,
  page = 0
): Promise<TransactionWithCustomer[]> {
  const from = page * limit;
  const to = from + limit - 1;
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles!customer_id(*)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data || [];
}

export async function getTransactionsByStatusCount(status: TransactionStatus): Promise<number> {
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  return count || 0;
}

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  adminId: string,
  additionalData?: Record<string, unknown>
): Promise<boolean> {
  // Validate status transition
  const { data: current } = await supabase
    .from("transactions")
    .select("status")
    .eq("id", transactionId)
    .single();

  if (current && !isValidTransition(current.status, status)) {
    console.error(`Invalid transition: ${current.status} → ${status}`);
    return false;
  }

  const updateData: Record<string, unknown> = {
    status,
    ...additionalData,
  };

  if (status === "payment_confirmed") {
    updateData.payment_verified_at = new Date().toISOString();
    updateData.verified_by = adminId;
  }

  if (status === "completed") {
    updateData.transfer_completed_at = new Date().toISOString();
    updateData.completed_by = adminId;
  }

  const { error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", transactionId);

  if (error) {
    console.error("Error updating transaction:", error);
    return false;
  }

  return true;
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification["type"],
  transactionId?: string
): Promise<boolean> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    transaction_id: transactionId || null,
  });

  if (error) {
    console.error("Error creating notification:", error);
    return false;
  }

  return true;
}

export async function getUserNotifications(
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data || [];
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }

  return true;
}

// =====================================================
// AI KNOWLEDGE BASE FUNCTIONS
// =====================================================
export async function getKnowledgeBase(): Promise<AiKnowledgeBase[]> {
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .select("*")
    .eq("is_active", true)
    .order("category");

  if (error) {
    console.error("Error fetching knowledge base:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// AUDIT LOG FUNCTIONS
// =====================================================
export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_values: oldValues || null,
    new_values: newValues || null,
  });

  if (error) {
    console.error("Error creating audit log:", error);
    return false;
  }

  return true;
}

export async function getAuditLogs(): Promise<
  Array<AuditLog & { profiles: Profile }>
> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, profiles!customer_id(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// STATS FUNCTIONS
// =====================================================
export async function getDashboardStats() {
  const [pendingPayments, awaitingApproval, completedToday, totalCustomers] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting_for_payment"),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "payment_under_review"),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte(
          "transfer_completed_at",
          new Date().toISOString().split("T")[0]
        ),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer"),
    ]);

  return {
    pendingPayments: pendingPayments.count || 0,
    awaitingApproval: awaitingApproval.count || 0,
    completedToday: completedToday.count || 0,
    totalCustomers: totalCustomers.count || 0,
  };
}

// =====================================================
// ADMIN CUSTOMER FUNCTIONS
// =====================================================
export async function getAllCustomers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return data || [];
}

export async function getCustomerById(
  customerId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error) {
    console.error("Error fetching customer:", error);
    return null;
  }

  return data;
}

export async function updateCustomerStatus(
  customerId: string,
  isActive: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", customerId);

  if (error) {
    console.error("Error updating customer status:", error);
    return false;
  }

  return true;
}

// =====================================================
// ADMIN TRANSACTION FUNCTIONS
// =====================================================
export async function getTransactionWithHistory(
  transactionId: string
): Promise<TransactionWithHistory | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles!customer_id(*), transaction_history(*)")
    .eq("id", transactionId)
    .single();

  if (error) {
    console.error("Error fetching transaction with history:", error);
    return null;
  }

  return data;
}

export async function getTransactionHistory(
  transactionId: string
): Promise<TransactionHistory[]> {
  const { data, error } = await supabase
    .from("transaction_history")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// ADMIN EXCHANGE RATE FUNCTIONS
// =====================================================
export async function getAllExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// ADMIN KNOWLEDGE BASE FUNCTIONS
// =====================================================
export async function getAllKnowledgeBase(): Promise<AiKnowledgeBase[]> {
  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching knowledge base:", error);
    return [];
  }

  return data || [];
}

export async function createKnowledgeEntry(
  category: string,
  question: string,
  answer: string,
  createdBy: string
): Promise<boolean> {
  const { error } = await supabase.from("ai_knowledge_base").insert({
    category,
    question,
    answer,
    is_active: true,
    created_by: createdBy,
  });

  if (error) {
    console.error("Error creating knowledge entry:", error);
    return false;
  }

  return true;
}

export async function updateKnowledgeEntry(
  id: string,
  data: Partial<{ question: string; answer: string; category: string; is_active: boolean }>
): Promise<boolean> {
  const { error } = await supabase
    .from("ai_knowledge_base")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating knowledge entry:", error);
    return false;
  }

  return true;
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("ai_knowledge_base")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting knowledge entry:", error);
    return false;
  }

  return true;
}

// =====================================================
// ADMIN ENHANCED STATS
// =====================================================
export async function getAdminDashboardStats() {
  const [basicStats, volumeResult, totalResult] = await Promise.all([
    getDashboardStats(),
    supabase
      .from("transactions")
      .select("sar_amount, ngn_amount")
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true }),
  ]);

  const rows: { sar_amount?: number; ngn_amount?: number }[] = volumeResult.data || [];
  const totalSar = rows.reduce((sum: number, t) => sum + (t.sar_amount || 0), 0);
  const totalNgn = rows.reduce((sum: number, t) => sum + (t.ngn_amount || 0), 0);

  return {
    ...basicStats,
    totalSarVolume: totalSar,
    totalNgnVolume: totalNgn,
    totalTransactions: totalResult.count || 0,
  };
}