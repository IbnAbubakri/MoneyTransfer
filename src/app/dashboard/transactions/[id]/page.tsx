"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowser } from "@/lib/supabase";
import { isValidTransition } from "@/lib/status-config";
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
import { getStatusConfig, getStatusDescription } from "@/lib/status-config";

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
  "Providus Bank",
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
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAcct, setCopiedAcct] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submittingBank, setSubmittingBank] = useState(false);
  const [receiptError, setReceiptError] = useState("");

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

    if (file.size > 10 * 1024 * 1024) {
      setReceiptError("File is too large. Maximum size is 10MB.");
      setUploading(false);
      return;
    }
    setReceiptError("");

    if (!isValidTransition(txn.status, "payment_under_review")) {
      setReceiptError("This transaction can no longer accept receipt uploads.");
      setUploading(false);
      return;
    }

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

    await supabase
      .from("transactions")
      .update({
        payment_receipt_url: filePath,
        status: "payment_under_review",
      })
      .eq("id", txn.id)
      .eq("status", txn.status);

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
      old_status: txn.status,
      new_status: "payment_under_review",
      changed_by: profile.id,
      notes: "Payment receipt uploaded",
    });

    refetch();
    setUploading(false);
  };

  const handleBankDetails = async () => {
    if (!txn || !profile || !bankName || !accountNumber || !accountName) return;
    if (!isValidTransition(txn.status, "awaiting_bank_details")) return;
    setSubmittingBank(true);

    await supabase
      .from("transactions")
      .update({
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_account_name: accountName,
        status: "awaiting_bank_details",
      })
      .eq("id", txn.id)
      .eq("status", txn.status);

    await supabase.from("transaction_history").insert({
      transaction_id: txn.id,
      old_status: txn.status,
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

  const copyToClipboard = async (text: string, which: "ref" | "acct") => {
    await navigator.clipboard.writeText(text);
    if (which === "ref") {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedAcct(true);
      setTimeout(() => setCopiedAcct(false), 2000);
    }
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
        <Link href="/dashboard/transactions" className="text-primary hover:underline mt-2 inline-block">
          Back to transactions
        </Link>
      </div>
    );
  }

  const sc = getStatusConfig(txn.status);
  const scDescription = getStatusDescription(txn.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm opacity-80">{scDescription}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Transaction Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Reference</p>
            <div className="flex items-center gap-2">
              <p className="font-mono font-medium text-foreground">{txn.reference}</p>
              <button
                onClick={() => copyToClipboard(txn.reference, "ref")}
                className="p-1 rounded hover:bg-muted"
                aria-label="Copy reference"
              >
                {copiedRef ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">
              {new Date(txn.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">You Send</p>
            <p className="text-xl font-bold text-foreground">{txn.sar_amount.toLocaleString()} SAR</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">You Receive</p>
            <p className="text-xl font-bold text-primary">₦{txn.ngn_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exchange Rate</p>
            <p className="font-medium text-foreground">₦{txn.exchange_rate}/SAR</p>
          </div>
        </div>
      </div>

      {txn.status === "waiting_for_payment" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            Payment Instructions
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-muted-foreground">
              Transfer <strong>{txn.sar_amount.toLocaleString()} SAR</strong> to:
            </p>
            <div className="bg-card rounded-lg p-3 border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Bank Name</p>
              <p className="font-medium text-foreground">Al Rajhi Bank</p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Account Number</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-medium text-foreground">SA03 8000 0000 6080 1016 7519</p>
                <button onClick={() => copyToClipboard("SA0380000000608010167519", "acct")} className="p-1 rounded hover:bg-muted" aria-label="Copy account number">
                  {copiedAcct ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Account Name</p>
              <p className="font-medium text-foreground">IbnAbubakri Trading LLC</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Upload Payment Receipt
            </label>
            <label
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              htmlFor="receipt-upload"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                  <span className="text-xs text-muted-foreground/60">PNG, JPG, PDF (max 10MB)</span>
                </div>
              )}
              <input
                id="receipt-upload"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleReceiptUpload}
                disabled={uploading}
                aria-label="Upload payment receipt"
              />
            </label>
            {receiptError && (
              <p className="text-sm text-destructive mt-2">{receiptError}</p>
            )}
          </div>
        </div>
      )}

      {txn.status === "payment_under_review" && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-foreground animate-pulse" />
            </div>
            <div>
              <p className="font-medium text-foreground">Verification in Progress</p>
              <p className="text-sm text-muted-foreground">
                Your payment is being reviewed. This usually takes 2-3 minutes.
              </p>
            </div>
          </div>
          {txn.payment_receipt_url && (() => {
            const bucketMarker = "payment-receipts/"
            const markerIndex = txn.payment_receipt_url.indexOf(bucketMarker)
            const receiptPath = markerIndex !== -1
              ? txn.payment_receipt_url.substring(markerIndex + bucketMarker.length)
              : txn.payment_receipt_url
            return receiptPath ? (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Uploaded receipt:</p>
                <a
                  href={`/api/receipt?path=${encodeURIComponent(receiptPath)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileImage className="w-4 h-4" />
                  View receipt
                </a>
              </div>
            ) : null
          })()}
        </div>
      )}

      {txn.status === "payment_confirmed" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            Provide Your Bank Details
          </h3>
          <p className="text-sm text-muted-foreground">
            Your payment has been confirmed. Please provide your Nigerian bank account details for the transfer.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="bank-select" className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
              <select
                id="bank-select"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm bg-card text-foreground"
              >
                <option value="">Select your bank</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="10-digit account number"
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account holder name"
                className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none text-sm"
              />
            </div>
            <button
              onClick={handleBankDetails}
              disabled={!bankName || !accountNumber || !accountName || submittingBank}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingBank ? "Submitting..." : "Submit Bank Details"}
            </button>
          </div>
        </div>
      )}

      {(txn.status === "transfer_in_progress" || txn.status === "completed") && txn.bank_name && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Bank Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Bank</p>
              <p className="font-medium text-foreground">{txn.bank_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account Number</p>
              <p className="font-mono font-medium text-foreground">{txn.bank_account_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account Name</p>
              <p className="font-medium text-foreground">{txn.bank_account_name}</p>
            </div>
            {txn.transfer_reference && (
              <div>
                <p className="text-muted-foreground">Transfer Reference</p>
                <p className="font-mono font-medium text-foreground">{txn.transfer_reference}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {txn.status === "completed" && (
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Exchange Completed!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            ₦{txn.ngn_amount.toLocaleString()} has been transferred to your bank account.
          </p>
          <Link
            href="/dashboard/new-transaction"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            New Exchange
          </Link>
        </div>
      )}

      {txn.notes && (
        <div className="bg-muted/50 rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-1">Note</p>
          <p className="text-sm text-muted-foreground">{txn.notes}</p>
        </div>
      )}
    </div>
  );
}
