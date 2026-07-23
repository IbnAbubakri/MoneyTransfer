"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Transaction } from "@/lib/types";
import {
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileImage,
  Building2,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  waiting_for_payment: {
    label: "Awaiting Payment",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: Clock,
    description: "Please make your SAR payment and upload the receipt.",
  },
  payment_under_review: {
    label: "Payment Under Review",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Clock,
    description: "We're verifying your payment. This usually takes 2-3 minutes.",
  },
  payment_confirmed: {
    label: "Payment Confirmed",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
    description: "Payment confirmed. Please provide your Nigerian bank details.",
  },
  awaiting_bank_details: {
    label: "Awaiting Bank Details",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    icon: Clock,
    description: "Please provide your Nigerian bank account details.",
  },
  transfer_in_progress: {
    label: "Transfer In Progress",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Clock,
    description: "Your Naira transfer is being processed.",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
    description: "Your exchange has been completed successfully!",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    icon: XCircle,
    description: "This transaction has been cancelled.",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: XCircle,
    description: "This transaction was rejected. Please contact support.",
  },
};

const bankOptions = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank Nigeria",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Globus Bank",
  "Guaranty Trust Bank",
  "Heritage Bank",
  "Keystone Bank",
  "Kuda Bank",
  "Opay",
  "Palmpay",
  "Polaris Bank",
  " Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa",
  "VFD Microfinance Bank",
  "Wema Bank",
  "Zenith Bank",
];

export default function TransactionDetailPage() {
  const params = useParams();
  const { profile } = useAuth();
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submittingBank, setSubmittingBank] = useState(false);

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!params.id) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", params.id)
        .single();
      if (!cancelled && data) setTxn(data);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !txn || !profile) return;

    setUploading(true);
    const filePath = `${profile.id}/${txn.reference}/receipt-${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("payment-receipts")
      .getPublicUrl(filePath);

    await supabase
      .from("transactions")
      .update({
        payment_receipt_url: urlData.publicUrl,
        status: "payment_under_review",
      })
      .eq("id", txn.id);

    const refetch = async () => {
      if (!params.id) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", params.id)
        .single();
      if (data) setTxn(data);
    };

    await supabase.from("transaction_history").insert({
      transaction_id: txn.id,
      old_status: "waiting_for_payment",
      new_status: "payment_under_review",
      changed_by: profile.id,
      notes: "Payment receipt uploaded",
    });

    refetch();
    setUploading(false);
  };

  const handleBankDetails = async () => {
    if (!txn || !profile || !bankName || !accountNumber || !accountName) return;
    setSubmittingBank(true);

    await supabase
      .from("transactions")
      .update({
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName,
        status: "awaiting_bank_details",
      })
      .eq("id", txn.id);

    await supabase.from("transaction_history").insert({
      transaction_id: txn.id,
      old_status: "payment_confirmed",
      new_status: "awaiting_bank_details",
      changed_by: profile.id,
      notes: "Bank details submitted",
    });

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", txn.id)
      .single();
    if (data) setTxn(data);
    setSubmittingBank(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Transaction not found</p>
        <Link href="/dashboard/transactions" className="text-emerald-600 hover:underline mt-2 inline-block">
          Back to transactions
        </Link>
      </div>
    );
  }

  const sc = statusConfig[txn.status] || statusConfig.waiting_for_payment;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </Link>
      </div>

      <div className={`rounded-xl border p-5 ${sc.color}`}>
        <div className="flex items-center gap-3">
          <sc.icon className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-semibold">{sc.label}</h2>
            <p className="text-sm opacity-80">{sc.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Reference</p>
            <div className="flex items-center gap-2">
              <p className="font-mono font-medium text-gray-900">{txn.reference}</p>
              <button
                onClick={() => copyToClipboard(txn.reference)}
                className="p-1 rounded hover:bg-gray-100"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium text-gray-900">
              {new Date(txn.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">You Send</p>
            <p className="text-xl font-bold text-gray-900">{txn.sar_amount.toLocaleString()} SAR</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">You Receive</p>
            <p className="text-xl font-bold text-emerald-600">₦{txn.ngn_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Exchange Rate</p>
            <p className="font-medium text-gray-900">₦{txn.exchange_rate}/SAR</p>
          </div>
        </div>
      </div>

      {txn.status === "waiting_for_payment" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            Payment Instructions
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-gray-600">
              Transfer <strong>{txn.sar_amount.toLocaleString()} SAR</strong> to:
            </p>
            <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <p className="text-xs text-gray-500">Bank Name</p>
              <p className="font-medium text-gray-900">Al Rajhi Bank</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <p className="text-xs text-gray-500">Account Number</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-medium text-gray-900">SA03 8000 0000 6080 1016 7519</p>
                <button onClick={() => copyToClipboard("SA0380000000608010167519")} className="p-1 rounded hover:bg-gray-100">
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-1">
              <p className="text-xs text-gray-500">Account Name</p>
              <p className="font-medium text-gray-900">IbnAbubakri Trading LLC</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Payment Receipt
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload receipt</span>
                  <span className="text-xs text-gray-400">PNG, JPG, PDF (max 10MB)</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleReceiptUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      )}

      {txn.status === "payment_under_review" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Verification in Progress</p>
              <p className="text-sm text-gray-500">
                Your payment is being reviewed. This usually takes 2-3 minutes.
              </p>
            </div>
          </div>
          {txn.payment_receipt_url && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">Uploaded receipt:</p>
              <a
                href={txn.payment_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline"
              >
                <FileImage className="w-4 h-4" />
                View receipt
              </a>
            </div>
          )}
        </div>
      )}

      {txn.status === "payment_confirmed" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            Provide Your Bank Details
          </h3>
          <p className="text-sm text-gray-500">
            Your payment has been confirmed. Please provide your Nigerian bank account details for the transfer.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              >
                <option value="">Select your bank</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="10-digit account number"
                maxLength={10}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account holder name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              />
            </div>
            <button
              onClick={handleBankDetails}
              disabled={!bankName || !accountNumber || !accountName || submittingBank}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingBank ? "Submitting..." : "Submit Bank Details"}
            </button>
          </div>
        </div>
      )}

      {(txn.status === "transfer_in_progress" || txn.status === "completed") && txn.bank_name && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
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

      {txn.status === "completed" && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-emerald-900">Exchange Completed!</h3>
          <p className="text-sm text-emerald-700 mt-1">
            ₦{txn.ngn_amount.toLocaleString()} has been transferred to your bank account.
          </p>
          <Link
            href="/dashboard/new-transaction"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            New Exchange
          </Link>
        </div>
      )}

      {txn.notes && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Note</p>
          <p className="text-sm text-gray-600">{txn.notes}</p>
        </div>
      )}
    </div>
  );
}
