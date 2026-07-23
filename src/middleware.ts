import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// ── Rate limiter (in-memory, per-instance) ──────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// Evict stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateMap) {
      if (now > entry.resetAt) rateMap.delete(key);
    }
  }, 300_000);
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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none';"
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

  // Security headers on every response
  response = addSecurityHeaders(response);

  // ── Rate limiting ───────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Login: 10 requests per 15 minutes per IP
  if (pathname === "/login" || pathname === "/api/auth/login") {
    const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`, 10, 900_000);
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
    const { allowed, retryAfterMs } = checkRateLimit(`signup:${ip}`, 5, 3_600_000);
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

  // Chat API: 30 requests per 5 minutes per IP
  if (pathname === "/api/chat") {
    const { allowed, retryAfterMs } = checkRateLimit(`chat:${ip}`, 30, 300_000);
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
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  const isApiRoute = pathname.startsWith("/api/");

  if (isProtectedRoute || isApiRoute) {
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

    // Admin-only routes: verify role server-side
    if (pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        if (isApiRoute) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // API routes: also check admin for /api/admin/*
    if (pathname.startsWith("/api/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
  }

  // Persist refreshed cookies
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/chat",
    "/api/auth/:path*",
    "/api/admin/:path*",
    "/login",
    "/signup",
  ],
};
