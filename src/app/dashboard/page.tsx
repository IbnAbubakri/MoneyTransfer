"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCustomerTransactions, getActiveExchangeRate } from "@/lib/database";
import { Transaction, ExchangeRate } from "@/lib/types";
import { ArrowLeftRight, Clock, CheckCircle2, XCircle, TrendingUp, ArrowUpRight } from "lucide-react";

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    waiting_for_payment: { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50", icon: Clock },
    payment_under_review: { label: "Reviewing", color: "text-blue-600 bg-blue-50", icon: Clock },
    payment_confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    awaiting_bank_details: { label: "Bank Details Needed", color: "text-purple-600 bg-purple-50", icon: Clock },
    transfer_in_progress: { label: "Transfer In Progress", color: "text-blue-600 bg-blue-50", icon: Clock },
    completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-gray-600 bg-gray-50", icon: XCircle },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50", icon: XCircle },
  };
  return map[status] || { label: status, color: "text-gray-600 bg-gray-50", icon: Clock };
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getCustomerTransactions(profile.id),
      getActiveExchangeRate(),
    ]).then(([txns, r]) => {
      setTransactions(txns);
      setRate(r);
      setLoading(false);
    });
  }, [profile]);

  const totalExchanged = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.sar_amount, 0);
  const pendingCount = transactions.filter(
    (t) => !["completed", "cancelled", "rejected"].includes(t.status)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your exchange overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Rate</p>
              <p className="text-xl font-bold text-gray-900">
                ₦{rate?.rate?.toLocaleString() || "430"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Exchanged</p>
              <p className="text-xl font-bold text-gray-900">
                {totalExchanged.toLocaleString()} SAR
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        <Link
          href="/dashboard/new-transaction"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          New Exchange
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
          <p className="text-gray-500 mb-4">Start your first SAR to NGN exchange</p>
          <Link
            href="/dashboard/new-transaction"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 5).map((txn) => {
              const sc = statusConfig(txn.status);
              return (
                <Link
                  key={txn.id}
                  href={`/dashboard/transactions/${txn.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{txn.reference}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-gray-900">
                        {txn.sar_amount.toLocaleString()} SAR
                      </p>
                      <p className="text-xs text-gray-500">
                        ₦{txn.ngn_amount.toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                      <sc.icon className="w-3 h-3 mr-1" />
                      {sc.label}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
