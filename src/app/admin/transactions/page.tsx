"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getAllTransactions,
  getAllTransactionsCount,
  getTransactionsByStatus,
  getTransactionsByStatusCount,
} from "@/lib/database";
import { TransactionWithCustomer, TransactionStatus } from "@/lib/types";
import { getStatusConfig } from "@/lib/status-config";
import { ArrowUpRight, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

const statusFilters: { value: string; label: string; status?: TransactionStatus }[] = [
  { value: "all", label: "All" },
  { value: "waiting_for_payment", label: "Awaiting Payment", status: "waiting_for_payment" },
  { value: "payment_under_review", label: "Under Review", status: "payment_under_review" },
  { value: "payment_confirmed", label: "Confirmed", status: "payment_confirmed" },
  { value: "transfer_in_progress", label: "In Progress", status: "transfer_in_progress" },
  { value: "completed", label: "Completed", status: "completed" },
  { value: "cancelled", label: "Cancelled", status: "cancelled" },
];

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async (f: string, p: number) => {
    setLoading(true);
    const sf = statusFilters.find((s) => s.value === f);
    const [txns, count] = await Promise.all([
      sf?.status
        ? getTransactionsByStatus(sf.status, PAGE_SIZE, p)
        : getAllTransactions(PAGE_SIZE, p),
      sf?.status
        ? getTransactionsByStatusCount(sf.status)
        : getAllTransactionsCount(),
    ]);
    setTransactions(txns);
    setTotalCount(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter, page);
  }, [filter, page, load]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground mt-1">
          Manage all exchange transactions
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(0);
              setLoading(true);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Reference</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Customer</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">SAR Amount</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">NGN Amount</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Rate</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {transactions.map((txn) => {
                    const sc = getStatusConfig(txn.status);
                    return (
                      <tr key={txn.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-foreground">{txn.reference}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {txn.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{txn.profiles?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {txn.sar_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          ₦{txn.ngn_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          ₦{txn.exchange_rate}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
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
                            className="text-primary hover:text-primary/80"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const p = start + i;
                  if (p >= totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        p === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
