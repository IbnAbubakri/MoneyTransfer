"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCustomerTransactions } from "@/lib/database";
import { Transaction } from "@/lib/types";
import { ArrowLeftRight, ArrowUpRight, Clock, CheckCircle2, XCircle, Filter } from "lucide-react";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const activeStatuses = [
  "waiting_for_payment",
  "payment_under_review",
  "payment_confirmed",
  "awaiting_bank_details",
  "transfer_in_progress",
];

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    waiting_for_payment: { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50", icon: Clock },
    payment_under_review: { label: "Reviewing", color: "text-blue-600 bg-blue-50", icon: Clock },
    payment_confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    awaiting_bank_details: { label: "Bank Details Needed", color: "text-purple-600 bg-purple-50", icon: Clock },
    transfer_in_progress: { label: "Transfer In Progress", color: "text-blue-600 bg-blue-50", icon: Clock },
    completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-gray-600 bg-gray-100", icon: XCircle },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50", icon: XCircle },
  };
  return map[status] || { label: status, color: "text-gray-600 bg-gray-50", icon: Clock };
}

export default function TransactionsPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getCustomerTransactions(profile.id).then((txns) => {
      setTransactions(txns);
      setLoading(false);
    });
  }, [profile]);

  const filtered = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return activeStatuses.includes(t.status);
    if (filter === "completed") return t.status === "completed";
    if (filter === "cancelled") return ["cancelled", "rejected"].includes(t.status);
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-500 mt-1">{transactions.length} total transactions</p>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              filter === f.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {filter === "all" ? "No transactions yet" : "No matching transactions"}
          </h3>
          <p className="text-gray-500 mb-4">
            {filter === "all"
              ? "Start your first SAR to NGN exchange"
              : "Try a different filter"}
          </p>
          {filter === "all" && (
            <Link
              href="/dashboard/new-transaction"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((txn) => {
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
                          year: "numeric",
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
