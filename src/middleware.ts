import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// ── Supabase service-role client (server-side only, for rate limiting) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Persistent rate limiter (Supabase-backed) ──────────────────────────
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  await supabaseAdmin
    .from("rate_limits")
    .delete()
    .eq("key", key)
    .lt("window_start", windowStart);

  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .gt("window_start", windowStart)
    .single();

  if (!existing) {
    await supabaseAdmin.from("rate_limits").insert({
      key,
      count: 1,
      window_start: now,
    });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterMs = existing.window_start + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  await supabaseAdmin
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key)
    .eq("window_start", existing.window_start);

  return { allowed: true, retryAfterMs: 0 };
}

// ── Account lockout with exponential backoff ───────────────────────────
export async function checkLoginLockout(email: string, ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const lockoutKey = `lockout:${email}`;

  const { data: lockout } = await supabaseAdmin
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", lockoutKey)
    .gt("window_start", now)
    .single();

  if (lockout && lockout.count >= 5) {
    const extraAttempts = lockout.count - 5;
    const lockoutMs = 15 * 60_000 * Math.pow(2, extraAttempts);
    const retryAfterMs = lockout.window_start + lockoutMs - now;
    if (retryAfterMs > 0) {
      return { allowed: false, retryAfterMs };
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export async function recordFailedLoginAttempt(email: string, ip: string): Promise<void> {
  const lockoutKey = `lockout:${email}`;
  const now = Date.now();
  const windowMs = 30 * 60_000;

  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", lockoutKey)
    .gt("window_start", now - windowMs)
    .single();

  if (!existing) {
    await supabaseAdmin.from("rate_limits").insert({
      key: lockoutKey,
      count: 1,
      window_start: now,
    });
  } else {
    await supabaseAdmin
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("key", lockoutKey)
      .eq("window_start", existing.window_start);
  }
}

export async function clearFailedLoginAttempts(email: string): Promise<void> {
  await supabaseAdmin
    .from("rate_limits")
    .delete()
    .eq("key", `lockout:${email}`);
}

// ── Multi-IP attack detection ──────────────────────────────────────────
export async function checkMultiIpAttack(email: string, currentIp: string): Promise<boolean> {
  const { data: attempts } = await supabaseAdmin
    .from("rate_limits")
    .select("key")
    .like("key", `failed_login:${email}:%`);

  if (!attempts) return false;

  const uniqueIps = new Set(attempts.map(a => a.key.split(":").pop()));
  uniqueIps.add(currentIp);
  return uniqueIps.size >= 3;
}

export async function recordFailedLoginByIp(email: string, ip: string): Promise<void> {
  const key = `failed_login:${email}:${ip}`;
  const now = Date.now();

  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .gt("window_start", now - 3_600_000)
    .single();

  if (!existing) {
    await supabaseAdmin.from("rate_limits").insert({
      key, count: 1, window_start: now,
    });
  } else {
    await supabaseAdmin
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("key", key)
      .eq("window_start", existing.window_start);
  }
}

// ── Security headers ────────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none';"
  );
  return response;
}

// ── Refresh Supabase session from cookie ────────────────────────────
async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  return supabase;
}

// ── Main middleware ──────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request: { headers: request.headers } });

  response = addSecurityHeaders(response);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Login: 10 requests per 15 minutes per IP
  if (pathname === "/login" || pathname === "/api/auth/login") {
    const { allowed, retryAfterMs } = await checkRateLimit(`login:${ip}`, 10, 900_000);
    if (!allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
            },
          }
        )
      );
    }
  }

  // Signup: 5 requests per hour per IP
  if (pathname === "/signup" || pathname === "/api/auth/signup") {
    const { allowed, retryAfterMs } = await checkRateLimit(`signup:${ip}`, 5, 3_600_000);
    if (!allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many signup attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
            },
          }
        )
      );
    }
  }

  // Forgot-password / reset-password: 3 requests per 15 minutes per IP
  if (pathname === "/forgot-password" || pathname === "/api/auth/reset-password") {
    const { allowed, retryAfterMs } = await checkRateLimit(`forgot:${ip}`, 3, 900_000);
    if (!allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many reset attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
            },
          }
        )
      );
    }
  }

  // Chat API: 30 requests per 5 minutes per IP
  if (pathname === "/api/chat") {
    const { allowed, retryAfterMs } = await checkRateLimit(`chat:${ip}`, 30, 300_000);
    if (!allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
            },
          }
        )
      );
    }
  }

  // ── Auth-gated routes ──────────────────────────────────────────
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isApiRoute = pathname.startsWith("/api/");

  if (isDashboardRoute || isApiRoute) {
    const supabase = await refreshSession(request, response);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin routes: refresh session but don't redirect (layout handles auth UI)
  if (pathname.startsWith("/admin")) {
    response = await (async () => {
      const supabase = await refreshSession(request, response);
      return response;
    })();
  }

  // API admin routes: verify role server-side
  if (pathname.startsWith("/api/admin")) {
    const supabase = await refreshSession(request, response);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/chat",
    "/api/auth/:path*",
    "/api/admin/:path*",
    "/api/audit/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
