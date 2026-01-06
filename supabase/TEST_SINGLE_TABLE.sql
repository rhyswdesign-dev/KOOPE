-- TEST: Create just ONE table to isolate the issue
-- This will help us identify if the problem is with the policies or something else

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ONLY user_vault_profiles table
CREATE TABLE IF NOT EXISTS user_vault_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_balance INTEGER NOT NULL DEFAULT 0,
  keys_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;

-- Try the simplest possible policy first
DROP POLICY IF EXISTS "vault_select_policy" ON user_vault_profiles;
CREATE POLICY "vault_select_policy"
  ON user_vault_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Verify
SELECT 'Test table created' as status;
