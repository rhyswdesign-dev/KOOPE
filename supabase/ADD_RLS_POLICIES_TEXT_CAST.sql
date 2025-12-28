-- ADD RLS POLICIES WITH TEXT CASTING
-- This version casts both auth.uid() and user_id to text to avoid type mismatch

-- Enable RLS on all vault tables
ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_carts ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can insert own vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can update own vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can view their vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can insert their vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can update their vault profile" ON user_vault_profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON vault_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON vault_transactions;

DROP POLICY IF EXISTS "Users can view own XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can insert own XP transactions" ON xp_transactions;

DROP POLICY IF EXISTS "Users can view own cart" ON vault_carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON vault_carts;
DROP POLICY IF EXISTS "Users can update own cart" ON vault_carts;

-- user_vault_profiles policies (with text casting)
CREATE POLICY "Users can view own vault profile"
  ON user_vault_profiles FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can insert own vault profile"
  ON user_vault_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can update own vault profile"
  ON user_vault_profiles FOR UPDATE
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text)
  WITH CHECK ((auth.uid())::text = (user_id)::text);

-- vault_transactions policies
CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = (user_id)::text);

-- xp_transactions policies
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = (user_id)::text);

-- vault_carts policies
CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text)
  WITH CHECK ((auth.uid())::text = (user_id)::text);

SELECT 'RLS policies added successfully with text casting' as status;
