"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getActiveExchangeRate, createTransaction } from "@/lib/database";
import { ExchangeRate } from "@/lib/types";
import { ArrowLeftRight, AlertCircle, ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";

export default function NewTransactionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [sarAmount, setSarAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getActiveExchangeRate().then((r) => {
      setRate(r);
      setLoading(false);
    });
  }, []);

  const ngnAmount = sarAmount ? parseFloat(sarAmount) * (rate?.rate || 430) : 0;
  const isValid = sarAmount && parseFloat(sarAmount) >= 100;

  const handleSubmit = async () => {
    if (!profile || !isValid) return;
    setSubmitting(true);
    setError("");

    const txn = await createTransaction(profile.id, parseFloat(sarAmount), rate?.rate || 430);
    if (txn) {
      router.push(`/dashboard/transactions/${txn.id}`);
    } else {
      setError("Failed to create transaction. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">New Exchange</h1>
        <p className="text-muted-foreground mt-1">Convert Saudi Riyals to Nigerian Naira</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="bg-primary/5 rounded-lg p-4 flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-primary">Current Exchange Rate</p>
            <p className="text-lg font-bold text-foreground">
              1 SAR = ₦{rate?.rate?.toLocaleString() || "430"} NGN
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Amount in SAR
          </label>
          <div className="relative">
            <input
              type="number"
              value={sarAmount}
              onChange={(e) => {
                setSarAmount(e.target.value);
                setError("");
              }}
              placeholder="0.00"
              min="100"
              step="0.01"
              className="w-full px-4 py-3 text-2xl font-semibold border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
              SAR
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Minimum amount: 100 SAR</p>
        </div>

        {sarAmount && (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You send</span>
              <span className="font-semibold text-foreground">
                {parseFloat(sarAmount).toLocaleString()} SAR
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange rate</span>
              <span className="text-foreground">₦{rate?.rate?.toLocaleString() || "430"}/SAR</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-sm font-medium text-foreground">You receive</span>
              <span className="text-lg font-bold text-primary">
                ₦{ngnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Continue to Payment
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className="bg-muted/50 rounded-xl p-5 border border-border">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter the amount of SAR you want to exchange</li>
              <li>Confirm and upload your payment receipt</li>
              <li>We verify your payment (2-3 minutes)</li>
              <li>Naira is sent to your Nigerian bank account</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
