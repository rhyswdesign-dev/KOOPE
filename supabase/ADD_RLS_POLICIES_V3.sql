-- ADD RLS POLICIES - Final attempt with explicit casting
-- If this doesn't work, policies must be added via Supabase Dashboard UI

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

-- user_vault_profiles policies
CREATE POLICY "Users can view own vault profile"
  ON user_vault_profiles FOR SELECT
  USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own vault profile"
  ON user_vault_profiles FOR INSERT
  WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own vault profile"
  ON user_vault_profiles FOR UPDATE
  USING ((user_id)::text = (auth.uid())::text)
  WITH CHECK ((user_id)::text = (auth.uid())::text);

-- vault_transactions policies
CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT
  USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT
  WITH CHECK ((user_id)::text = (auth.uid())::text);

-- xp_transactions policies
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT
  WITH CHECK ((user_id)::text = (auth.uid())::text);

-- vault_carts policies
CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT
  USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT
  WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE
  USING ((user_id)::text = (auth.uid())::text)
  WITH CHECK ((user_id)::text = (auth.uid())::text);

SELECT 'RLS policies added successfully' as status;
