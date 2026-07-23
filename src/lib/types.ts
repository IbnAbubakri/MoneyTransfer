export type UserRole = 'customer' | 'admin';

export type TransactionStatus =
  | 'waiting_for_payment'
  | 'payment_under_review'
  | 'payment_confirmed'
  | 'awaiting_bank_details'
  | 'transfer_in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type KnowledgeCategory = 'policy' | 'faq' | 'hours' | 'payment' | 'general';

export type NotificationType = 'transaction' | 'payment' | 'transfer' | 'system';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  customer_id: string;
  sar_amount: number;
  exchange_rate: number;
  ngn_amount: number;
  status: TransactionStatus;
  payment_receipt_url: string | null;
  payment_verified_at: string | null;
  verified_by: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  transfer_reference: string | null;
  transfer_receipt_url: string | null;
  transfer_completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistory {
  id: string;
  transaction_id: string;
  old_status: TransactionStatus | null;
  new_status: TransactionStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface AiKnowledgeBase {
  id: string;
  category: KnowledgeCategory;
  question: string;
  answer: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  transaction_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface TransactionWithCustomer extends Transaction {
  profiles: Profile;
}

export interface TransactionWithHistory extends Transaction {
  transaction_history: TransactionHistory[];
  profiles: Profile;
}