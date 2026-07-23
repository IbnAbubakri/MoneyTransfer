"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCustomerTransactions, getActiveExchangeRate } from "@/lib/database";
import { Transaction, ExchangeRate } from "@/lib/types";
import { getStatusConfig } from "@/lib/status-config";
import { ArrowLeftRight, TrendingUp, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";

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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your exchange overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Rate</p>
              <p className="text-xl font-bold text-card-foreground">
                ₦{rate?.rate?.toLocaleString() || "430"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-card-foreground">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Exchanged</p>
              <p className="text-xl font-bold text-card-foreground">
                {totalExchanged.toLocaleString()} SAR
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">Recent Transactions</h2>
        <Link
          href="/dashboard/new-transaction"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          New Exchange
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-1">No transactions yet</h3>
          <p className="text-muted-foreground mb-4">Start your first SAR to NGN exchange</p>
          <Link
            href="/dashboard/new-transaction"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.slice(0, 5).map((txn) => {
              const sc = getStatusConfig(txn.status);
              return (
                <Link
                  key={txn.id}
                  href={`/dashboard/transactions/${txn.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{txn.reference}</p>
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-sm font-semibold text-card-foreground">
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
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/60" />
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
