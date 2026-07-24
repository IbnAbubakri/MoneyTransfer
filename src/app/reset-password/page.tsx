"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const sanitize = (val: string) => val.replace(/<[^>]*>/g, "").trim();

function getPasswordStrength(pw: string): { label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", color: "text-destructive" };
  if (score <= 3) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Strong", color: "text-green-600" };
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const strength = newPassword.length > 0 ? getPasswordStrength(newPassword) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanNew = sanitize(newPassword);
    const cleanConfirm = sanitize(confirmPassword);

    if (!cleanNew) { setError("New password is required"); return; }
    if (cleanNew.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (cleanNew.length > 128) { setError("Password must be 128 characters or fewer"); return; }
    if (!/[A-Z]/.test(cleanNew)) { setError("Password must contain at least 1 uppercase letter"); return; }
    if (!/[a-z]/.test(cleanNew)) { setError("Password must contain at least 1 lowercase letter"); return; }
    if (!/[0-9]/.test(cleanNew)) { setError("Password must contain at least 1 number"); return; }
    if (cleanNew !== cleanConfirm) { setError("Passwords do not match"); return; }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { error: authError } = await createSupabaseBrowser().auth.updateUser({
        password: cleanNew,
      });

      clearTimeout(timeoutId);

      setLoading(false);

      if (authError) {
        setError(authError.message || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
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
            <h2 className="text-lg font-semibold text-foreground mb-2">Password reset successfully</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Redirecting you to sign in...
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
          <h2 className="text-lg font-semibold text-foreground mb-6">Reset Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-foreground/80 mb-1.5">New Password</label>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters" required minLength={8} autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? "reset-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <p className={`text-xs mt-1.5 font-medium ${strength.color}`}>
                  Strength: {strength.label}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-foreground/80 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password" required autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? "reset-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div id="reset-error" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
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
