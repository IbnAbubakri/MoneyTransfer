-- Fix: Notifications INSERT policy was unrestricted (WITH CHECK true)
-- Any authenticated user could insert notifications for any user_id.
-- Now restricted to: own notifications (customers) + admin (any user).

-- Drop the old unrestricted policy
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Customers can create notifications for themselves
CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can create notifications for anyone
CREATE POLICY "Admins can create notifications for anyone"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
