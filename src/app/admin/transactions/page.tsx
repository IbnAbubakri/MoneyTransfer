"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTransactions, getTransactionsByStatus } from "@/lib/database";
import { TransactionWithCustomer, TransactionStatus } from "@/lib/types";
import { ArrowUpRight, Filter } from "lucide-react";

const statusFilters: { value: string; label: string; status?: TransactionStatus }[] = [
  { value: "all", label: "All" },
  { value: "waiting_for_payment", label: "Awaiting Payment", status: "waiting_for_payment" },
  { value: "payment_under_review", label: "Under Review", status: "payment_under_review" },
  { value: "payment_confirmed", label: "Confirmed", status: "payment_confirmed" },
  { value: "transfer_in_progress", label: "In Progress", status: "transfer_in_progress" },
  { value: "completed", label: "Completed", status: "completed" },
  { value: "cancelled", label: "Cancelled", status: "cancelled" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  waiting_for_payment: { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50" },
  payment_under_review: { label: "Reviewing", color: "text-blue-600 bg-blue-50" },
  payment_confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-50" },
  awaiting_bank_details: { label: "Awaiting Bank", color: "text-purple-600 bg-purple-50" },
  transfer_in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50" },
  completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50" },
  cancelled: { label: "Cancelled", color: "text-gray-600 bg-gray-100" },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sf = statusFilters.find((f) => f.value === filter);
      const txns = sf?.status
        ? await getTransactionsByStatus(sf.status)
        : await getAllTransactions();
      setTransactions(txns);
      setLoading(false);
    };
    load();
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 mt-1">
          Manage all exchange transactions
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setLoading(true);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              filter === f.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Reference
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    SAR Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    NGN Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Rate
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((txn) => {
                  const sc = statusConfig[txn.status] || { label: txn.status, color: "text-gray-600 bg-gray-50" };
                  return (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900">{txn.reference}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {txn.profiles?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{txn.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {txn.sar_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ₦{txn.ngn_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        ₦{txn.exchange_rate}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/transactions/${txn.id}`}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
