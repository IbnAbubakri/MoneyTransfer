"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Shield, Zap, Clock, ArrowLeftRight, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              MT
            </div>
            <span className="font-semibold text-lg text-foreground">MoneyTransfer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div
            className={`text-center max-w-3xl mx-auto transition-all duration-500 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            }`}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
              Exchange SAR to NGN
              <span className="text-primary"> Instantly</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Fast, secure, and AI-powered money transfer from Saudi Riyal to Nigerian Naira.
              Get real-time rates and complete your exchange in minutes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/signup")}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-medium text-base hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center justify-center gap-2 border border-border bg-background px-8 py-3.5 rounded-lg font-medium text-base hover:bg-accent transition-colors"
              >
                Sign in to Dashboard
              </button>
            </div>
          </div>

          {/* Features — bento layout instead of identical cards */}
          <div
            className={`mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ease-out delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <ArrowLeftRight className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Instant Exchange</h3>
                <p className="text-muted-foreground">
                  Convert Saudi Riyals to Nigerian Naira in minutes. Our AI-powered system processes your exchange
                  with real-time rates and zero hidden fees.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Real-time rates</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No hidden fees</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> 2-3 min processing</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Bank-Level Security</h3>
              <p className="text-sm text-muted-foreground">
                Every transaction is manually verified. Your payments are protected with industry-standard encryption.
              </p>
            </div>
          </div>

          {/* How it works strip */}
          <div
            className={`mt-16 bg-muted/50 border border-border rounded-xl p-6 md:p-8 transition-all duration-500 ease-out delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "1. Enter amount", desc: "Choose how much SAR to exchange" },
                { icon: ArrowLeftRight, title: "2. Confirm & pay", desc: "Upload your payment receipt" },
                { icon: CheckCircle2, title: "3. Receive Naira", desc: "Funds sent to your bank account" },
              ].map((step) => (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-xs text-muted-foreground/70">
            &copy; 2026 MoneyTransfer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
