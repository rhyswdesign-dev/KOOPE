-- ADD RLS POLICIES TO VAULT TABLES
-- Run this AFTER VAULT_NO_RLS.sql has successfully created the tables

-- Enable RLS on all vault tables
ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can insert own vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can update own vault profile" ON user_vault_profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON vault_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON vault_transactions;

DROP POLICY IF EXISTS "Users can view own XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can insert own XP transactions" ON xp_transactions;

DROP POLICY IF EXISTS "Users can view own cart" ON vault_carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON vault_carts;
DROP POLICY IF EXISTS "Users can update own cart" ON vault_carts;

-- user_vault_profiles policies (matching exact pattern from users_profiles)
CREATE POLICY "Users can view own vault profile"
  ON user_vault_profiles FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own vault profile"
  ON user_vault_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own vault profile"
  ON user_vault_profiles FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- vault_transactions policies
CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

-- xp_transactions policies
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

-- vault_carts policies
CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

SELECT 'RLS policies added successfully' as status;
