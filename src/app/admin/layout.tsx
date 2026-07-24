"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Menu, Shield, Eye, EyeOff } from "lucide-react";

function AdminLoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }

    setLoading(true);
    const { error: authError } = await signIn(email, password);
    setLoading(false);

    if (authError) {
      setError(authError.message === "Invalid login credentials"
        ? "Invalid email or password"
        : authError.message);
      return;
    }

    // Page will re-render with user set, layout checks role
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground text-xl font-bold mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to access the admin dashboard</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Admin sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-foreground/80 mb-1.5">Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@moneytransfer.com"
                required
                autoComplete="email"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 px-3 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
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
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in to Admin"}
            </button>
          </form>
          <p className="text-xs text-center text-muted-foreground/60 mt-6">
            Authorized administrators only
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in or not admin → show admin login form
  if (!user || profile?.role !== "admin") {
    // If logged in but not admin, show error
    if (user && profile && profile.role !== "admin") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-card rounded-xl border border-border p-8">
              <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your account does not have admin privileges.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return <AdminLoginForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-xs font-medium text-primary">Admin Mode</span>
            </div>
          </div>
        </header>
        <main id="main-content" className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
