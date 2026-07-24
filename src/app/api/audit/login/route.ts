import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { email, success, userAgent } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: success ? "login_success" : "login_failure",
      entity_type: "auth",
      entity_id: null,
      new_values: {
        email,
        ip,
        user_agent: userAgent || "unknown",
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Audit log error:", error);
    }

    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
