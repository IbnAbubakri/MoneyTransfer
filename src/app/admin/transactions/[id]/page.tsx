"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowser } from "@/lib/supabase";
import {
  getTransactionWithHistory,
  updateTransactionStatus,
  createNotification,
  createAuditLog,
} from "@/lib/database";
import { getStatusConfig } from "@/lib/status-config";
import { TransactionWithHistory } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  FileImage,
  Send,
  History,
} from "lucide-react";
import Link from "next/link";

export default function AdminTransactionDetailPage() {
  const params = useParams();
  const { profile } = useAuth();
  const [txn, setTxn] = useState<TransactionWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [transferRef, setTransferRef] = useState("");
  const [notes, setNotes] = useState("");
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!params.id) return;
      const data = await getTransactionWithHistory(params.id as string);
      if (!cancelled) {
        setTxn(data);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  const handleStatusUpdate = async (
    newStatus: string,
    additional?: Record<string, unknown>,
    note?: string
  ) => {
    if (!txn || !profile) return;
    setActionLoading(true);

    const oldStatus = txn.status;
    await updateTransactionStatus(
      txn.id,
      newStatus as never,
      profile.id,
      additional
    );

    await supabase.from("transaction_history").insert({
      transaction_id: txn.id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: profile.id,
      notes: note || `Status changed to ${newStatus}`,
    });

    await createAuditLog(
      profile.id,
      `status_changed_${newStatus}`,
      "transaction",
      txn.id,
      { status: oldStatus },
      { status: newStatus, notes: note }
    );

    await createNotification(
      txn.customer_id,
      `Transaction ${newStatus.replace(/_/g, " ")}`,
      `Your transaction ${txn.reference} has been updated to ${newStatus.replace(/_/g, " ")}.`,
      "transaction",
      txn.id
    );

    const updated = await getTransactionWithHistory(txn.id);
    if (updated) setTxn(updated);
    setActionLoading(false);
  };

  const handleMarkCompleted = async () => {
    if (!transferRef.trim()) return;
    await handleStatusUpdate("completed", {
      transfer_reference: transferRef,
    }, `Transfer completed. Reference: ${transferRef}`);
    setTransferRef("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Transaction not found</p>
        <Link href="/admin/transactions" className="text-primary hover:underline mt-2 inline-block">
          Back to transactions
        </Link>
      </div>
    );
  }

  const sc = getStatusConfig(txn.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Transactions
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{txn.reference}</h1>
          <p className="text-muted-foreground mt-1">
            Created {new Date(txn.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${sc.color}`}>
          <sc.icon className="w-4 h-4" />
          {sc.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium text-card-foreground">{txn.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">{txn.profiles?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exchange Rate</p>
                <p className="font-medium text-card-foreground">₦{txn.exchange_rate}/SAR</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SAR Amount</p>
                <p className="text-xl font-bold text-card-foreground">{txn.sar_amount.toLocaleString()} SAR</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NGN Amount</p>
                <p className="text-xl font-bold text-primary">₦{txn.ngn_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {txn.payment_receipt_url && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Payment Receipt</h3>
              <a
                href={txn.payment_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileImage className="w-4 h-4" />
                View uploaded receipt
              </a>
            </div>
          )}

          {txn.bank_name && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-medium text-card-foreground">{txn.bank_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Number</p>
                  <p className="font-mono font-medium text-card-foreground">{txn.bank_account_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Name</p>
                  <p className="font-medium text-card-foreground">{txn.bank_account_name}</p>
                </div>
                {txn.transfer_reference && (
                  <div>
                    <p className="text-muted-foreground">Transfer Reference</p>
                    <p className="font-mono font-medium text-card-foreground">{txn.transfer_reference}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {txn.transaction_history && txn.transaction_history.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground/60" />
                Status History
              </h3>
              <div className="space-y-3">
                {txn.transaction_history
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-card-foreground">
                          {h.old_status ? `${h.old_status.replace(/_/g, " ")}` : "Created"} →{" "}
                          <span className="font-medium">{h.new_status.replace(/_/g, " ")}</span>
                        </p>
                        {h.notes && <p className="text-muted-foreground text-xs mt-0.5">{h.notes}</p>}
                        <p className="text-muted-foreground/60 text-xs">
                          {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Actions</h3>

            {txn.status === "waiting_for_payment" && (
              <p className="text-sm text-muted-foreground">Waiting for customer to upload payment receipt.</p>
            )}

            {txn.status === "payment_under_review" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Customer has uploaded a payment receipt.</p>
                <button
                  onClick={() => {
                    if (!window.confirm("Confirm this payment? This cannot be undone.")) return;
                    handleStatusUpdate("payment_confirmed", undefined, "Payment verified by admin");
                  }}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? "Processing..." : "Confirm Payment"}
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm("Reject this payment? This cannot be undone.")) return;
                    handleStatusUpdate("rejected", undefined, "Payment not verified");
                  }}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive font-medium rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors border border-destructive/20"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Payment
                </button>
              </div>
            )}

            {txn.status === "payment_confirmed" && (
              <p className="text-sm text-muted-foreground">
                Payment confirmed. Waiting for customer to provide bank details.
              </p>
            )}

            {txn.status === "awaiting_bank_details" && (
              <p className="text-sm text-muted-foreground">
                Customer has provided bank details. Ready to process transfer.
              </p>
            )}

            {txn.status === "transfer_in_progress" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Enter the transfer reference to complete.</p>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Transfer reference number"
                  aria-label="Transfer reference number"
                  className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                />
                <button
                  onClick={handleMarkCompleted}
                  disabled={!transferRef.trim() || actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? "Processing..." : "Mark Completed"}
                </button>
              </div>
            )}

            {txn.status === "completed" && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-primary">Completed</p>
              </div>
            )}

            {(txn.status === "cancelled" || txn.status === "rejected") && (
              <div className="text-center py-4">
                <XCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground/80 capitalize">{txn.status}</p>
              </div>
            )}

            {!["completed", "cancelled", "rejected"].includes(txn.status) && (
              <div className="pt-3 border-t border-border space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note (optional)"
                  aria-label="Add a note"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none resize-none"
                />
                <button
                  onClick={() => {
                    if (!window.confirm("Cancel this transaction? This cannot be undone.")) return;
                    handleStatusUpdate("cancelled", undefined, notes || "Cancelled by admin");
                  }}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-sm font-medium text-muted-foreground bg-accent rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-colors"
                >
                  Cancel Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
