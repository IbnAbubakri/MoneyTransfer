"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";

const ALLOWED_REDIRECTS = ["/dashboard", "/admin"];
const sanitize = (val: string) => val.replace(/<[^>]*>/g, '').trim();
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
  const safeRedirect = redirectParam && ALLOWED_REDIRECTS.includes(redirectParam) ? redirectParam : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace(safeRedirect || "/dashboard");
    }
  }, [user, profile, authLoading, router, safeRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = sanitize(email);
    if (!cleanEmail) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Please enter a valid email address"); return; }
    if (cleanEmail.length > 254) { setError("Email is too long"); return; }

    setLoading(true);

    try {
      const lockoutRes = await fetch("/api/auth/check-lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, action: "check" }),
      });
      if (lockoutRes.status === 429) {
        const lockoutData = await lockoutRes.json();
        setError(lockoutData.error || "Account temporarily locked. Please try again later.");
        setLoading(false);
        return;
      }
    } catch {
      // Network error on lockout check — proceed anyway
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const { error: authError } = await signIn(cleanEmail, password);
      clearTimeout(timeout);

      if (authError) {
        await delay(200 + Math.random() * 300);

        fetch("/api/auth/check-lockout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, action: "failure" }),
        }).catch(() => {});

        fetch("/api/audit/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, success: false, userAgent: navigator.userAgent }),
        }).catch(() => {});

        const code = authError.message;
        if (code === "Invalid login credentials") {
          setError("Invalid email or password");
        } else if (code === "Email not confirmed") {
          setError("Please verify your email first");
        } else if (code.includes("Too Many Requests")) {
          setError("Too many attempts. Please wait.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      // Check if admin — admin must use /admin login
      const { createClient } = await import("@supabase/supabase-js");
      const checkClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await checkClient.auth.getSession();
      if (session?.user) {
        const { data: prof } = await checkClient
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (prof?.role === "admin") {
          await signOut();
          setError("Admin accounts must use the admin portal.");
          setLoading(false);
          return;
        }
      }

      fetch("/api/auth/check-lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, action: "success" }),
      }).catch(() => {});

      fetch("/api/audit/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, success: true, userAgent: navigator.userAgent }),
      }).catch(() => {});
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError("Request timed out. Please try again.");
        setLoading(false);
        return;
      }
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md transition-all duration-400 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground text-xl font-bold mb-4">
            MT
          </div>
          <h1 className="text-2xl font-bold text-foreground">MoneyTransfer</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-Powered SAR to NGN Exchange</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Welcome back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
              <Input
                id="login-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" required autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div id="login-error" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base" disabled={loading} aria-label="Sign in to dashboard">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">Forgot password?</Link>
          </p>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground/70 mt-6">© 2026 MoneyTransfer. All rights reserved.</p>
      </div>
    </div>
  );
}
