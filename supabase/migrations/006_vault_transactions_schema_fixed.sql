-- VAULT TRANSACTIONS SCHEMA MIGRATION (FIXED)
-- Creates tables for vault economy: profiles, transactions, carts, XP logs

-- ============================================
-- USER VAULT PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_vault_profiles (
  -- Primary key references auth.users
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Economy Balances
  xp_balance INTEGER NOT NULL DEFAULT 0,
  keys_balance INTEGER NOT NULL DEFAULT 0,
  vault_cash_balance NUMERIC(10, 2) DEFAULT 0.00,

  -- Lifetime Stats
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp_spent INTEGER NOT NULL DEFAULT 0,
  total_keys_earned INTEGER NOT NULL DEFAULT 0,
  total_keys_spent INTEGER NOT NULL DEFAULT 0,
  total_cash_spent NUMERIC(10, 2) DEFAULT 0.00,

  -- Unlocked Items (JSONB array for flexibility)
  unlocked_items JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VAULT TRANSACTIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.vault_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('unlock', 'purchase', 'refund')),
  item_id TEXT NOT NULL,
  item_name TEXT,
  cycle_id TEXT,

  -- Costs
  xp_spent INTEGER DEFAULT 0,
  keys_spent INTEGER DEFAULT 0,
  cash_spent NUMERIC(10, 2) DEFAULT 0.00,

  -- Payment Info
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,

  -- Fulfillment
  fulfillment_status TEXT CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- XP TRANSACTIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- e.g., 'lesson_complete', 'achievement', 'vault_unlock'

  -- Context
  source_id TEXT, -- ID of lesson, achievement, etc.
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VAULT CARTS (for incomplete purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vault_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cart Items (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Cart Totals
  total_xp INTEGER DEFAULT 0,
  total_keys INTEGER DEFAULT 0,
  total_cash NUMERIC(10, 2) DEFAULT 0.00,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Auto-cleanup old carts
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vault_transactions_user_id ON public.vault_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_created_at ON public.vault_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON public.vault_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_fulfillment ON public.vault_transactions(fulfillment_status) WHERE fulfillment_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON public.xp_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON public.xp_transactions(source);

CREATE INDEX IF NOT EXISTS idx_vault_carts_user_id ON public.vault_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_carts_status ON public.vault_carts(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own vault profile" ON public.user_vault_profiles;
DROP POLICY IF EXISTS "Users can insert own vault profile" ON public.user_vault_profiles;
DROP POLICY IF EXISTS "Users can update own vault profile" ON public.user_vault_profiles;
DROP POLICY IF EXISTS "Users can view own vault transactions" ON public.vault_transactions;
DROP POLICY IF EXISTS "Users can insert own vault transactions" ON public.vault_transactions;
DROP POLICY IF EXISTS "Users can view own XP transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can insert own XP transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can view own vault carts" ON public.vault_carts;
DROP POLICY IF EXISTS "Users can insert own vault carts" ON public.vault_carts;
DROP POLICY IF EXISTS "Users can update own vault carts" ON public.vault_carts;
DROP POLICY IF EXISTS "Users can delete own vault carts" ON public.vault_carts;

-- User Vault Profiles Policies (with explicit UUID casting)
CREATE POLICY "Users can view own vault profile"
  ON public.user_vault_profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own vault profile"
  ON public.user_vault_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own vault profile"
  ON public.user_vault_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Vault Transactions Policies (with explicit UUID casting)
CREATE POLICY "Users can view own vault transactions"
  ON public.vault_transactions FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own vault transactions"
  ON public.vault_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = user_id);

-- XP Transactions Policies (with explicit UUID casting)
CREATE POLICY "Users can view own XP transactions"
  ON public.xp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own XP transactions"
  ON public.xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = user_id);

-- Vault Carts Policies (with explicit UUID casting)
CREATE POLICY "Users can view own vault carts"
  ON public.vault_carts FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own vault carts"
  ON public.vault_carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own vault carts"
  ON public.vault_carts FOR UPDATE
  TO authenticated
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own vault carts"
  ON public.vault_carts FOR DELETE
  TO authenticated
  USING (auth.uid()::uuid = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp (only create if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_user_vault_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_user_vault_profiles_updated_at
      BEFORE UPDATE ON public.user_vault_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_vault_carts_updated_at'
  ) THEN
    CREATE TRIGGER set_vault_carts_updated_at
      BEFORE UPDATE ON public.vault_carts
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Auto-create vault profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_vault_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_vault_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_vault_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_vault_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_vault_profile();

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON public.user_vault_profiles TO authenticated;
GRANT ALL ON public.vault_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO authenticated;
GRANT ALL ON public.vault_carts TO authenticated;
