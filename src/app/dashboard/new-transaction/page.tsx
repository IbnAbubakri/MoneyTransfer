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
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New Exchange</h1>
        <p className="text-gray-500 mt-1">Convert Saudi Riyals to Nigerian Naira</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="bg-emerald-50 rounded-lg p-4 flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Current Exchange Rate</p>
            <p className="text-lg font-bold text-emerald-900">
              1 SAR = ₦{rate?.rate?.toLocaleString() || "430"} NGN
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-4 py-3 text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-400">
              SAR
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimum amount: 100 SAR</p>
        </div>

        {sarAmount && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">You send</span>
              <span className="font-semibold text-gray-900">
                {parseFloat(sarAmount).toLocaleString()} SAR
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Exchange rate</span>
              <span className="text-gray-700">₦{rate?.rate?.toLocaleString() || "430"}/SAR</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="text-sm font-medium text-gray-700">You receive</span>
              <span className="text-lg font-bold text-emerald-600">
                ₦{ngnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Continue to Payment
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-500">
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
