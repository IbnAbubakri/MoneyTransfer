import { Clock, CheckCircle2, XCircle, Building2, Send } from "lucide-react";
import { TransactionStatus } from "./types";

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  waiting_for_payment: { label: "Awaiting Payment", color: "text-accent-foreground bg-accent", icon: Clock },
  payment_under_review: { label: "Under Review", color: "text-accent-foreground bg-accent", icon: Clock },
  payment_confirmed: { label: "Payment Confirmed", color: "text-primary bg-primary/10", icon: CheckCircle2 },
  awaiting_bank_details: { label: "Awaiting Bank Details", color: "text-accent-foreground bg-accent", icon: Building2 },
  transfer_in_progress: { label: "Transfer In Progress", color: "text-accent-foreground bg-accent", icon: Send },
  completed: { label: "Completed", color: "text-primary bg-primary/10", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-accent", icon: XCircle },
  rejected: { label: "Rejected", color: "text-destructive bg-destructive/10", icon: XCircle },
};

export const STATUS_DESCRIPTIONS: Partial<Record<string, string>> = {
  waiting_for_payment: "Please make your SAR payment and upload the receipt.",
  payment_under_review: "We're verifying your payment. This usually takes 2-3 minutes.",
  payment_confirmed: "Payment confirmed. Please provide your Nigerian bank details.",
  awaiting_bank_details: "Please provide your Nigerian bank account details.",
  transfer_in_progress: "Your Naira transfer is being processed.",
  completed: "Your exchange has been completed successfully!",
  cancelled: "This transaction has been cancelled.",
  rejected: "This transaction was rejected. Please contact support.",
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: "text-muted-foreground bg-accent", icon: Clock };
}

export function getStatusDescription(status: string) {
  return STATUS_DESCRIPTIONS[status] || "";
}

export const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting_for_payment: ["payment_under_review", "cancelled"],
  payment_under_review: ["payment_confirmed", "rejected", "cancelled"],
  payment_confirmed: ["awaiting_bank_details", "cancelled"],
  awaiting_bank_details: ["transfer_in_progress", "cancelled"],
  transfer_in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function isValidTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
