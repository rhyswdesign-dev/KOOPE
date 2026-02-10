-- VAULT TRANSACTIONS SCHEMA - TABLES ONLY
-- This migration creates just the tables and indexes, NO RLS or policies
-- We'll add RLS in a follow-up migration once tables are confirmed working

-- ============================================
-- CLEANUP
-- ============================================
DROP TRIGGER IF EXISTS set_user_vault_profiles_updated_at ON public.user_vault_profiles;
DROP TRIGGER IF EXISTS set_vault_carts_updated_at ON public.vault_carts;
DROP TRIGGER IF EXISTS on_auth_user_created_vault_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_vault_profile();

DROP TABLE IF EXISTS public.vault_carts CASCADE;
DROP TABLE IF EXISTS public.xp_transactions CASCADE;
DROP TABLE IF EXISTS public.vault_transactions CASCADE;
DROP TABLE IF EXISTS public.user_vault_profiles CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================
CREATE TABLE public.user_vault_profiles (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.vault_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('unlock', 'purchase', 'refund')),
  item_id TEXT NOT NULL,
  item_name TEXT,
  cycle_id TEXT,
  xp_spent INTEGER DEFAULT 0,
  keys_spent INTEGER DEFAULT 0,
  cash_spent NUMERIC(10, 2) DEFAULT 0.00,
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  fulfillment_status TEXT CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.vault_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_xp INTEGER DEFAULT 0,
  total_keys INTEGER DEFAULT 0,
  total_cash NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_vault_transactions_user_id ON public.vault_transactions(user_id);
CREATE INDEX idx_vault_transactions_created_at ON public.vault_transactions(created_at DESC);
CREATE INDEX idx_vault_transactions_type ON public.vault_transactions(transaction_type);
CREATE INDEX idx_vault_transactions_fulfillment ON public.vault_transactions(fulfillment_status) WHERE fulfillment_status IS NOT NULL;

CREATE INDEX idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_type ON public.xp_transactions(transaction_type);
CREATE INDEX idx_xp_transactions_source ON public.xp_transactions(source);

CREATE INDEX idx_vault_carts_user_id ON public.vault_carts(user_id);
CREATE INDEX idx_vault_carts_status ON public.vault_carts(status);

-- ============================================
-- GRANTS (basic access for now)
-- ============================================
GRANT ALL ON public.user_vault_profiles TO authenticated;
GRANT ALL ON public.vault_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO authenticated;
GRANT ALL ON public.vault_carts TO authenticated;
