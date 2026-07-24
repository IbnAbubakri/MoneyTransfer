import { NextRequest, NextResponse } from "next/server";
import { checkLoginLockout, recordFailedLoginAttempt, clearFailedLoginAttempts, checkMultiIpAttack, recordFailedLoginByIp } from "@/middleware";

export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (action === "check") {
      const { allowed, retryAfterMs } = await checkLoginLockout(email, ip);
      if (!allowed) {
        return NextResponse.json(
          { locked: true, retryAfterMs, error: "Account temporarily locked. Please try again later." },
          { status: 429 }
        );
      }

      const multiIp = await checkMultiIpAttack(email, ip);
      if (multiIp) {
        return NextResponse.json(
          { locked: true, retryAfterMs: 0, error: "Suspicious activity detected. Please try again later." },
          { status: 429 }
        );
      }

      return NextResponse.json({ locked: false });
    }

    if (action === "failure") {
      await recordFailedLoginAttempt(email, ip);
      await recordFailedLoginByIp(email, ip);
      return NextResponse.json({ recorded: true });
    }

    if (action === "success") {
      await clearFailedLoginAttempts(email);
      return NextResponse.json({ cleared: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
