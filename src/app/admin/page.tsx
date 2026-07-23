"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminDashboardStats, getAllTransactions } from "@/lib/database";
import { TransactionWithCustomer } from "@/lib/types";
import { getStatusConfig } from "@/lib/status-config";
import {
  Clock,
  CheckCircle2,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Banknote,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminDashboardStats>> | null>(null);
  const [recentTxns, setRecentTxns] = useState<TransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminDashboardStats(), getAllTransactions()]).then(
      ([s, txns]) => {
        setStats(s);
        setRecentTxns(txns.slice(0, 10));
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your exchange platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-bold text-foreground">{stats?.pendingPayments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Under Review</p>
              <p className="text-2xl font-bold text-foreground">{stats?.awaitingApproval || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
              <p className="text-2xl font-bold text-foreground">{stats?.completedToday || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold text-foreground">{stats?.totalCustomers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total SAR Volume</p>
              <p className="text-xl font-bold text-foreground">
                {(stats?.totalSarVolume || 0).toLocaleString()} SAR
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total NGN Volume</p>
              <p className="text-xl font-bold text-foreground">
                ₦{(stats?.totalNgnVolume || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
        <Link
          href="/admin/transactions"
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
        >
          View all <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {recentTxns.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No transactions yet</h3>
          <p className="text-muted-foreground">Transactions will appear here as customers create them</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Reference
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Amount
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentTxns.map((txn) => {
                  const sc = getStatusConfig(txn.status);
                  return (
                    <tr key={txn.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-foreground">{txn.reference}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {txn.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{txn.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">
                          {txn.sar_amount.toLocaleString()} SAR
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₦{txn.ngn_amount.toLocaleString()}
                        </p>
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
      )}
    </div>
  );
}
