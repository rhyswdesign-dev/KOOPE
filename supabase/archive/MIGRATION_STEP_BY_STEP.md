# Step-by-Step Migration Guide

**If the all-in-one migration isn't working, follow these steps individually.**

---

## Step 1: Base Functions (RUN FIRST)

Copy and paste this into Supabase SQL Editor:

```sql
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Expected Result**: "Success. No rows returned"

---

## Step 2: User Profiles Table

```sql
-- Create users_profiles table
CREATE TABLE IF NOT EXISTS public.users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  taste_profile JSONB DEFAULT '{"spiritWeights":{"vodka":1.0,"gin":1.0,"rum":1.0,"tequila":1.0,"whiskey":1.0,"bourbon":1.0,"scotch":1.0,"brandy":1.0,"cognac":1.0,"liqueur":1.0},"flavorWeights":{"sweet":1.0,"sour":1.0,"bitter":1.0,"spicy":1.0,"fruity":1.0,"herbal":1.0,"creamy":1.0,"smoky":1.0},"preferredComplexity":"medium","preferredStrength":"medium"}'::jsonb,
  bar_inventory JSONB DEFAULT '[]'::jsonb,
  saved_recipes TEXT[] DEFAULT ARRAY[]::TEXT[],
  interaction_history JSONB DEFAULT '{"lastUpdated":null,"viewedRecipes":[],"savedRecipes":[],"completedRecipes":[]}'::jsonb,
  mood_preferences JSONB DEFAULT '{}'::jsonb,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  keys INTEGER NOT NULL DEFAULT 0,
  vault_cash NUMERIC(10, 2) DEFAULT 0.00,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'elite')),
  subscription_expires_at TIMESTAMPTZ,
  unlocked_vault_items TEXT[] DEFAULT ARRAY[]::TEXT[],
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  onboarding_step TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  analytics_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.users_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_profiles_last_active ON public.users_profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_profiles_xp ON public.users_profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_profiles_level ON public.users_profiles(level DESC);

-- Trigger
CREATE TRIGGER set_users_profiles_updated_at
  BEFORE UPDATE ON public.users_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, created_at, last_active_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON public.users_profiles TO authenticated;
GRANT SELECT ON public.users_profiles TO anon;
```

**Expected Result**: Table created, check in Table Editor

---

## Step 3: Vault Profiles Table

```sql
-- User Vault Profiles
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

-- Enable RLS
ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vault profile"
  ON user_vault_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault profile"
  ON user_vault_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault profile"
  ON user_vault_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER set_user_vault_profiles_updated_at
  BEFORE UPDATE ON user_vault_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create vault profile
CREATE OR REPLACE FUNCTION public.handle_new_user_vault_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_vault_profiles (user_id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_vault_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_vault_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_vault_profile();

-- Grant permissions
GRANT ALL ON user_vault_profiles TO authenticated;
```

**Expected Result**: Table created

---

## Step 4: Transaction Tables

```sql
-- Vault Transactions
CREATE TABLE IF NOT EXISTS vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('unlock', 'purchase_keys', 'purchase_booster', 'refund')),
  item_id TEXT NOT NULL,
  item_name TEXT,
  cycle_id TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 0,
  keys_cost INTEGER NOT NULL DEFAULT 0,
  cash_cost NUMERIC(10, 2) DEFAULT 0.00,
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  fulfillment_status TEXT CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP Transactions
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vault Carts
CREATE TABLE IF NOT EXISTS vault_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_keys INTEGER NOT NULL DEFAULT 0,
  total_cash NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Vault Transactions
CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies - XP Transactions
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies - Vault Carts
CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_vault_transactions_user_id ON vault_transactions(user_id);
CREATE INDEX idx_vault_transactions_created_at ON vault_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_vault_carts_user_id ON vault_carts(user_id);

-- Trigger
CREATE TRIGGER set_vault_carts_updated_at
  BEFORE UPDATE ON vault_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON vault_transactions TO authenticated;
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON vault_carts TO authenticated;
```

**Expected Result**: 3 tables created

---

## Step 5: RPC Functions

```sql
-- Function to activate booster
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

-- Function to check booster expiry
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

-- Function to decrement booster uses
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booster_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_booster_uses(UUID) TO authenticated;
```

**Expected Result**: Functions created

---

## Verification

After all steps, run this to verify:

```sql
SELECT
  'Tables created:' as status,
  count(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users_profiles',
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  );
```

**Expected Result**: count = 5

---

## What if you get errors?

**Error**: "relation already exists"
- Skip that step, table is already created

**Error**: "permission denied"
- Make sure you're the project owner in Supabase

**Error**: "auth.users does not exist"
- Auth is not enabled, go to Authentication in Supabase first

**Error**: "function does not exist"
- Run Step 1 first (base functions)
