-- Persistent rate limiting table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  window_start BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Allow anonymous inserts/updates for rate limiting (RLS policies)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Clean up old entries older than 1 hour
DELETE FROM rate_limits WHERE window_start < EXTRACT(EPOCH FROM (now() - interval '1 hour')) * 1000;
