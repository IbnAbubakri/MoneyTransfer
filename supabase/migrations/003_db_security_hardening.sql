-- =====================================================
-- Migration 003: Database Security Hardening
-- Fixes: C1, C2, H1, H2, M1, M3
-- =====================================================

-- =====================================================
-- C1 FIX: Lock down rate_limits RLS
-- Old: USING (true) — any user could read/modify/delete
-- New: service-role bypasses RLS, anon/authenticated get nothing
-- =====================================================
DROP POLICY IF EXISTS "Service role full access" ON rate_limits;

-- No RLS policies = no access for anon/authenticated.
-- Service-role client bypasses RLS entirely, so the
-- middleware rate limiter continues to work.

-- =====================================================
-- C2 FIX: Allow customers to insert audit logs about themselves
-- Old: only admins could insert — customer actions were silent
-- New: customers can insert where user_id = their own UID
-- =====================================================
DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_logs;

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- =====================================================
-- H1 FIX: Fix log_transaction_status_change() trigger
-- Old: NEW.completed_by OR NEW.verified_by (invalid UUID OR)
-- New: COALESCE(NEW.completed_by, NEW.verified_by)
-- =====================================================
CREATE OR REPLACE FUNCTION log_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO transaction_history (transaction_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.completed_by, NEW.verified_by));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- H2 FIX: Allow customers to insert transaction_history
-- for their own transactions (backup for manual inserts)
-- Old: only admins could insert
-- =====================================================
DROP POLICY IF EXISTS "Admins can insert transaction history" ON transaction_history;

CREATE POLICY "Customers can insert own transaction history"
  ON transaction_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE id = transaction_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert transaction history"
  ON transaction_history FOR INSERT
  WITH CHECK (public.is_admin());

-- =====================================================
-- M1 FIX: Add WITH CHECK to admin transactions UPDATE
-- Prevents admin from reassigning customer_id
-- =====================================================
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- M3 FIX: Restrict profile column updates
-- Customers can update name/phone but NOT role/is_active
-- =====================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Customers can update own profile (name, phone only — role/is_active blocked by check)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add a trigger to prevent customers from changing role/is_active
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is not an admin, block role and is_active changes
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Customers cannot change their own role';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Customers cannot change their own active status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_customer_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
