-- =====================================================
-- MoneyTransfer Database Schema
-- AI-Powered SAR to NGN Exchange Platform
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. EXCHANGE RATES TABLE
-- =====================================================
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency TEXT NOT NULL DEFAULT 'SAR',
  to_currency TEXT NOT NULL DEFAULT 'NGN',
  rate DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default exchange rate
INSERT INTO exchange_rates (from_currency, to_currency, rate, is_active)
VALUES ('SAR', 'NGN', 430.00, true);

-- =====================================================
-- 3. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  sar_amount DECIMAL(12,2) NOT NULL,
  exchange_rate DECIMAL(10,2) NOT NULL,
  ngn_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_for_payment' CHECK (
    status IN (
      'waiting_for_payment',
      'payment_under_review',
      'payment_confirmed',
      'awaiting_bank_details',
      'transfer_in_progress',
      'completed',
      'cancelled',
      'rejected'
    )
  ),
  payment_receipt_url TEXT,
  payment_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  transfer_reference TEXT,
  transfer_receipt_url TEXT,
  transfer_completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TRANSACTION STATUS HISTORY
-- =====================================================
CREATE TABLE transaction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. AI KNOWLEDGE BASE TABLE
-- =====================================================
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('policy', 'faq', 'hours', 'payment', 'general')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default knowledge base entries
INSERT INTO ai_knowledge_base (category, question, answer) VALUES
('hours', 'What are your business hours?', 'We operate 24/7. Our AI assistant is always available to help you with your exchange. For manual support, our team is available Sunday-Thursday, 9 AM - 6 PM (AST).'),
('payment', 'How do I make a payment?', 'After confirming your exchange rate, you will see our bank account details. Transfer the exact SAR amount to the provided account, then upload your payment receipt for verification.'),
('policy', 'How long does verification take?', 'Payment verification typically takes 2-3 minutes. Once verified, our team will process your Naira transfer within 30 minutes.'),
('faq', 'What is the minimum exchange amount?', 'The minimum exchange amount is 100 SAR. There is no maximum limit for verified accounts.');

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('transaction', 'payment', 'transfer', 'system')),
  is_read BOOLEAN DEFAULT false,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for better performance
-- =====================================================
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transaction_history_transaction_id ON transaction_history(transaction_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_exchange_rates_is_active ON exchange_rates(is_active);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON ai_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    CASE
      WHEN NEW.email = 'admin@moneytransfer.com' THEN 'admin'
      ELSE 'customer'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to log transaction status changes
CREATE OR REPLACE FUNCTION log_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO transaction_history (transaction_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.completed_by OR NEW.verified_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for transaction status changes
CREATE TRIGGER on_transaction_status_change
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_status_change();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================
CREATE POLICY "Customers can view own transactions"
  ON transactions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- TRANSACTION HISTORY POLICIES
-- =====================================================
CREATE POLICY "Customers can view own transaction history"
  ON transaction_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE id = transaction_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transaction history"
  ON transaction_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert transaction history"
  ON transaction_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- EXCHANGE RATES POLICIES
-- =====================================================
CREATE POLICY "Anyone can view active exchange rates"
  ON exchange_rates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage exchange rates"
  ON exchange_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- AI KNOWLEDGE BASE POLICIES
-- =====================================================
CREATE POLICY "Anyone can view active knowledge base"
  ON ai_knowledge_base FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage knowledge base"
  ON ai_knowledge_base FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create notifications for anyone"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =====================================================
-- Create storage buckets for:
-- 1. payment-receipts (customer payment screenshots)
-- 2. transfer-receipts (admin transfer confirmations)

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Payment receipts: Customers can upload, Admins can view
CREATE POLICY "Customers can upload payment receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Customers can view own payment receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all payment receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Transfer receipts: Admins can upload, Customers can view
CREATE POLICY "Admins can upload transfer receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transfer-receipts'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Customers can view own transfer receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transfer-receipts'
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.customer_id = auth.uid()
      AND t.transfer_receipt_url LIKE '%' || name || '%'
    )
  );

CREATE POLICY "Admins can view all transfer receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transfer-receipts'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );