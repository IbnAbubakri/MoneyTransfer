"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowser } from "@/lib/supabase";
import { CheckCircle2 } from "lucide-react";

const sanitize = (val: string) => val.replace(/<[^>]*>/g, "").trim();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = sanitize(email);
    if (!cleanEmail) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Please enter a valid email address"); return; }
    if (cleanEmail.length > 254) { setError("Email is too long"); return; }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { error: authError } = await createSupabaseBrowser().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset-password" : "",
      });

      clearTimeout(timeoutId);

      setLoading(false);

      if (authError) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md text-center transition-all duration-400 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <div className="bg-card rounded-xl border border-border p-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-6">
              If that email exists, a reset link has been sent. Please check your inbox.
            </p>
            <Link href="/login" className="text-primary text-sm font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
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
          <h2 className="text-lg font-semibold text-foreground mb-6">Forgot Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
              <Input
                id="forgot-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                aria-invalid={!!error}
                aria-describedby={error ? "forgot-error" : undefined}
              />
            </div>
            {error && (
              <div id="forgot-error" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6">
            <Link href="/login" className="text-primary font-medium hover:underline">Back to sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground/70 mt-6">© 2026 MoneyTransfer. All rights reserved.</p>
      </div>
    </div>
  );
}
