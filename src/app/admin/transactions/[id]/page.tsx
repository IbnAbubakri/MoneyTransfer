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
import { TransactionWithHistory } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  FileImage,
  Send,
  History,
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  waiting_for_payment: { label: "Awaiting Payment", color: "text-amber-600 bg-amber-50", icon: Clock },
  payment_under_review: { label: "Under Review", color: "text-blue-600 bg-blue-50", icon: Clock },
  payment_confirmed: { label: "Payment Confirmed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  awaiting_bank_details: { label: "Awaiting Bank Details", color: "text-purple-600 bg-purple-50", icon: Building2 },
  transfer_in_progress: { label: "Transfer In Progress", color: "text-blue-600 bg-blue-50", icon: Send },
  completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-gray-600 bg-gray-100", icon: XCircle },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50", icon: XCircle },
};

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
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Transaction not found</p>
        <Link href="/admin/transactions" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to transactions
        </Link>
      </div>
    );
  }

  const sc = statusConfig[txn.status] || { label: txn.status, color: "text-gray-600 bg-gray-50", icon: Clock };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Transactions
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{txn.reference}</h1>
          <p className="text-gray-500 mt-1">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium text-gray-900">{txn.profiles?.full_name}</p>
                <p className="text-xs text-gray-500">{txn.profiles?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Exchange Rate</p>
                <p className="font-medium text-gray-900">₦{txn.exchange_rate}/SAR</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SAR Amount</p>
                <p className="text-xl font-bold text-gray-900">{txn.sar_amount.toLocaleString()} SAR</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">NGN Amount</p>
                <p className="text-xl font-bold text-indigo-600">₦{txn.ngn_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {txn.payment_receipt_url && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Receipt</h3>
              <a
                href={txn.payment_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <FileImage className="w-4 h-4" />
                View uploaded receipt
              </a>
            </div>
          )}

          {txn.bank_name && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Bank</p>
                  <p className="font-medium text-gray-900">{txn.bank_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account Number</p>
                  <p className="font-mono font-medium text-gray-900">{txn.bank_account_number}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account Name</p>
                  <p className="font-medium text-gray-900">{txn.bank_account_name}</p>
                </div>
                {txn.transfer_reference && (
                  <div>
                    <p className="text-gray-500">Transfer Reference</p>
                    <p className="font-mono font-medium text-gray-900">{txn.transfer_reference}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {txn.transaction_history && txn.transaction_history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                Status History
              </h3>
              <div className="space-y-3">
                {txn.transaction_history
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-gray-900">
                          {h.old_status ? `${h.old_status.replace(/_/g, " ")}` : "Created"} →{" "}
                          <span className="font-medium">{h.new_status.replace(/_/g, " ")}</span>
                        </p>
                        {h.notes && <p className="text-gray-500 text-xs mt-0.5">{h.notes}</p>}
                        <p className="text-gray-400 text-xs">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Actions</h3>

            {txn.status === "waiting_for_payment" && (
              <p className="text-sm text-gray-500">Waiting for customer to upload payment receipt.</p>
            )}

            {txn.status === "payment_under_review" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Customer has uploaded a payment receipt.</p>
                <button
                  onClick={() =>
                    handleStatusUpdate("payment_confirmed", undefined, "Payment verified by admin")
                  }
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? "Processing..." : "Confirm Payment"}
                </button>
                <button
                  onClick={() =>
                    handleStatusUpdate("rejected", undefined, "Payment not verified")
                  }
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Payment
                </button>
              </div>
            )}

            {txn.status === "payment_confirmed" && (
              <p className="text-sm text-gray-500">
                Payment confirmed. Waiting for customer to provide bank details.
              </p>
            )}

            {txn.status === "awaiting_bank_details" && (
              <p className="text-sm text-gray-500">
                Customer has provided bank details. Ready to process transfer.
              </p>
            )}

            {txn.status === "transfer_in_progress" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Enter the transfer reference to complete.</p>
                <input
                  type="text"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Transfer reference number"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={handleMarkCompleted}
                  disabled={!transferRef.trim() || actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? "Processing..." : "Mark Completed"}
                </button>
              </div>
            )}

            {txn.status === "completed" && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-700">Completed</p>
              </div>
            )}

            {(txn.status === "cancelled" || txn.status === "rejected") && (
              <div className="text-center py-4">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700 capitalize">{txn.status}</p>
              </div>
            )}

            {!["completed", "cancelled", "rejected"].includes(txn.status) && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
                <button
                  onClick={() =>
                    handleStatusUpdate("cancelled", undefined, notes || "Cancelled by admin")
                  }
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
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
