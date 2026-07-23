-- Fix infinite recursion in profiles RLS policies
-- The admin policies query profiles table, causing recursion

-- Step 1: Create a SECURITY DEFINER helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop recursive admin policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Step 3: Recreate them using the helper function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- Step 4: Fix all other admin policies to use is_admin()
-- Transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  USING (public.is_admin());

-- Transaction history
DROP POLICY IF EXISTS "Admins can view all transaction history" ON transaction_history;
DROP POLICY IF EXISTS "Admins can insert transaction history" ON transaction_history;

CREATE POLICY "Admins can view all transaction history"
  ON transaction_history FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert transaction history"
  ON transaction_history FOR INSERT
  WITH CHECK (public.is_admin());

-- Exchange rates
DROP POLICY IF EXISTS "Admins can manage exchange rates" ON exchange_rates;
CREATE POLICY "Admins can manage exchange rates"
  ON exchange_rates FOR ALL
  USING (public.is_admin());

-- Knowledge base
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON ai_knowledge_base;
CREATE POLICY "Admins can manage knowledge base"
  ON ai_knowledge_base FOR ALL
  USING (public.is_admin());

-- Audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_logs;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (public.is_admin());
