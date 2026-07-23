"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCustomerTransactions } from "@/lib/database";
import { Transaction } from "@/lib/types";
import { getStatusConfig } from "@/lib/status-config";
import { ArrowLeftRight, ArrowUpRight, Filter } from "lucide-react";

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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground mt-1">{transactions.length} total transactions</p>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
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

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            {filter === "all" ? "No transactions yet" : "No matching transactions"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === "all"
              ? "Start your first SAR to NGN exchange"
              : "Try a different filter"}
          </p>
          {filter === "all" && (
            <Link
              href="/dashboard/new-transaction"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border/50">
            {filtered.map((txn) => {
              const sc = getStatusConfig(txn.status);
              return (
                <Link
                  key={txn.id}
                  href={`/dashboard/transactions/${txn.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{txn.reference}</p>
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-sm font-semibold text-foreground">
                        {txn.sar_amount.toLocaleString()} SAR
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₦{txn.ngn_amount.toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                      <sc.icon className="w-3 h-3 mr-1" />
                      {sc.label}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
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
