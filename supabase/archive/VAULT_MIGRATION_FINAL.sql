-- VAULT MIGRATION - FINAL VERSION
-- This version uses explicit type casts for compatibility

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VAULT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_vault_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_balance INTEGER NOT NULL DEFAULT 0,
  keys_balance INTEGER NOT NULL DEFAULT 0,
  vault_cash_balance NUMERIC(10, 2) DEFAULT 0.00,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp_spent INTEGER NOT NULL DEFAULT 0,
  total_keys_earned INTEGER NOT NULL DEFAULT 0,
  total_keys_spent INTEGER NOT NULL DEFAULT 0,
  total_cash_spent NUMERIC(10, 2) DEFAULT 0.00,
  unlocked_items JSONB DEFAULT '[]'::jsonb,
  booster_type TEXT,
  booster_multiplier NUMERIC(5, 2),
  booster_expires_at TIMESTAMPTZ,
  booster_remaining_uses INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT,
  cycle_id TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 0,
  keys_cost INTEGER NOT NULL DEFAULT 0,
  cash_cost NUMERIC(10, 2) DEFAULT 0.00,
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  fulfillment_status TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_keys INTEGER NOT NULL DEFAULT 0,
  total_cash NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_carts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP OLD POLICIES
-- =====================================================

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

-- =====================================================
-- CREATE POLICIES (with explicit casts)
-- =====================================================

CREATE POLICY "Users can view own vault profile"
  ON user_vault_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vault profile"
  ON user_vault_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vault profile"
  ON user_vault_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vault_transactions_user_id ON vault_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_created_at ON vault_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_carts_user_id ON vault_carts(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS set_user_vault_profiles_updated_at ON user_vault_profiles;
CREATE TRIGGER set_user_vault_profiles_updated_at
  BEFORE UPDATE ON user_vault_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_vault_carts_updated_at ON vault_carts;
CREATE TRIGGER set_vault_carts_updated_at
  BEFORE UPDATE ON vault_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- AUTO-CREATE VAULT PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_vault_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_vault_profiles (user_id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_vault_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_vault_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_vault_profile();

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION activate_user_booster(
  p_user_id UUID,
  p_booster_type TEXT,
  p_multiplier NUMERIC,
  p_duration_hours INTEGER,
  p_remaining_uses INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  UPDATE user_vault_profiles
  SET
    booster_type = p_booster_type,
    booster_multiplier = p_multiplier,
    booster_expires_at = v_expires_at,
    booster_remaining_uses = p_remaining_uses,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booster_type', p_booster_type,
    'multiplier', p_multiplier,
    'expires_at', v_expires_at,
    'remaining_uses', p_remaining_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_booster_expiry(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booster_expires_at TIMESTAMPTZ;
  v_remaining_uses INTEGER;
BEGIN
  SELECT booster_expires_at, booster_remaining_uses
  INTO v_booster_expires_at, v_remaining_uses
  FROM user_vault_profiles
  WHERE user_id = p_user_id;

  IF v_booster_expires_at IS NOT NULL AND v_booster_expires_at < NOW() THEN
    UPDATE user_vault_profiles
    SET booster_type = NULL, booster_multiplier = NULL,
        booster_expires_at = NULL, booster_remaining_uses = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  IF v_remaining_uses IS NOT NULL AND v_remaining_uses <= 0 THEN
    UPDATE user_vault_profiles
    SET booster_type = NULL, booster_multiplier = NULL,
        booster_expires_at = NULL, booster_remaining_uses = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_booster_uses(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_vault_profiles
  SET booster_remaining_uses = CASE
      WHEN booster_remaining_uses IS NOT NULL THEN booster_remaining_uses - 1
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id AND booster_remaining_uses > 0;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON user_vault_profiles TO authenticated;
GRANT ALL ON vault_transactions TO authenticated;
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON vault_carts TO authenticated;

GRANT EXECUTE ON FUNCTION activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booster_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_booster_uses(UUID) TO authenticated;

-- =====================================================
-- VERIFY
-- =====================================================

SELECT
  'Vault migration complete! Tables:' as status,
  count(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts');
