-- =====================================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor to set up all tables
-- =====================================================

-- This script combines all migrations in the correct order:
-- 1. Base triggers and functions
-- 2. User profiles
-- 3. Progress tracking
-- 4. Vault economy
-- 5. Vault RPC functions

-- =====================================================
-- STEP 0: Base Functions & Triggers
-- =====================================================

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

-- =====================================================
-- STEP 1: User Profiles Schema
-- From: 005_users_profile_schema.sql
-- =====================================================

-- Create users_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users_profiles (
  -- Primary key references Supabase auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Taste Profile (JSONB for flexibility)
  taste_profile JSONB DEFAULT '{
    "spiritWeights": {
      "vodka": 1.0,
      "gin": 1.0,
      "rum": 1.0,
      "tequila": 1.0,
      "whiskey": 1.0,
      "bourbon": 1.0,
      "scotch": 1.0,
      "brandy": 1.0,
      "cognac": 1.0,
      "liqueur": 1.0
    },
    "flavorWeights": {
      "sweet": 1.0,
      "sour": 1.0,
      "bitter": 1.0,
      "spicy": 1.0,
      "fruity": 1.0,
      "herbal": 1.0,
      "creamy": 1.0,
      "smoky": 1.0
    },
    "preferredComplexity": "medium",
    "preferredStrength": "medium"
  }'::jsonb,

  -- Bar Inventory (JSONB array)
  bar_inventory JSONB DEFAULT '[]'::jsonb,

  -- Saved Recipes (array of UUIDs)
  saved_recipes TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Interaction History (JSONB for detailed tracking)
  interaction_history JSONB DEFAULT '{
    "lastUpdated": null,
    "viewedRecipes": [],
    "savedRecipes": [],
    "completedRecipes": []
  }'::jsonb,

  -- Mood Preferences (JSONB for tracking)
  mood_preferences JSONB DEFAULT '{}'::jsonb,

  -- Gamification
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  keys INTEGER NOT NULL DEFAULT 0,
  vault_cash NUMERIC(10, 2) DEFAULT 0.00,

  -- Streaks
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,

  -- Subscription & Premium
  is_premium BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'elite')),
  subscription_expires_at TIMESTAMPTZ,

  -- Unlocked Vault Items (array of item IDs)
  unlocked_vault_items TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Onboarding
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  onboarding_step TEXT,

  -- Settings
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_profiles_last_active ON public.users_profiles(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_profiles_xp ON public.users_profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_profiles_level ON public.users_profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_profiles_premium ON public.users_profiles(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_users_profiles_saved_recipes ON public.users_profiles USING GIN(saved_recipes);

-- Trigger for updated_at
CREATE TRIGGER set_users_profiles_updated_at
  BEFORE UPDATE ON public.users_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, created_at, last_active_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON public.users_profiles TO authenticated;
GRANT SELECT ON public.users_profiles TO anon;

-- =====================================================
-- STEP 2: User Progress Schema
-- From: 004_user_progress_schema.sql
-- =====================================================

-- Create user_lesson_progress table
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  module_id TEXT,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Performance metrics
  items_attempted INTEGER NOT NULL DEFAULT 0,
  items_correct INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5, 2) DEFAULT 0,
  best_accuracy NUMERIC(5, 2) DEFAULT 0,

  -- XP and rewards
  xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,

  -- Attempts tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, lesson_id)
);

-- Create user_module_progress table
CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Progress metrics
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  completion_percentage NUMERIC(5, 2) DEFAULT 0,

  -- XP tracking
  total_xp_earned INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, module_id)
);

-- Create user_quiz_attempts table
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,

  -- Attempt details
  items_attempted INTEGER NOT NULL,
  items_correct INTEGER NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,

  -- XP awarded
  xp_earned INTEGER NOT NULL DEFAULT 0,

  -- Time metrics
  time_spent_seconds INTEGER,

  -- Attempt metadata
  is_perfect BOOLEAN NOT NULL DEFAULT false,
  is_best_score BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_module_id ON user_lesson_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_completed ON user_lesson_progress(user_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module_id ON user_module_progress(module_id);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_lesson_id ON user_quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_attempted_at ON user_quiz_attempts(attempted_at DESC);

-- Enable RLS
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own lesson progress"
  ON user_lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson progress"
  ON user_lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson progress"
  ON user_lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own module progress"
  ON user_module_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own module progress"
  ON user_module_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module progress"
  ON user_module_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz attempts"
  ON user_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON user_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_user_lesson_progress_updated_at
  BEFORE UPDATE ON user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_module_progress_updated_at
  BEFORE UPDATE ON user_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_lesson_progress TO authenticated;
GRANT ALL ON user_module_progress TO authenticated;
GRANT ALL ON user_quiz_attempts TO authenticated;

-- =====================================================
-- STEP 3: Vault Economy Schema
-- From: 006_vault_transactions_schema.sql
-- =====================================================

-- User Vault Profiles
CREATE TABLE IF NOT EXISTS user_vault_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Balances
  xp_balance INTEGER NOT NULL DEFAULT 0,
  keys_balance INTEGER NOT NULL DEFAULT 0,
  vault_cash_balance NUMERIC(10, 2) DEFAULT 0.00,

  -- Totals (lifetime stats)
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp_spent INTEGER NOT NULL DEFAULT 0,
  total_keys_earned INTEGER NOT NULL DEFAULT 0,
  total_keys_spent INTEGER NOT NULL DEFAULT 0,
  total_cash_spent NUMERIC(10, 2) DEFAULT 0.00,

  -- Unlocked Items (JSONB array of unlocked vault items)
  unlocked_items JSONB DEFAULT '[]'::jsonb,

  -- Active Booster
  booster_type TEXT,
  booster_multiplier NUMERIC(5, 2),
  booster_expires_at TIMESTAMPTZ,
  booster_remaining_uses INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vault Transactions (Purchase/Unlock history)
CREATE TABLE IF NOT EXISTS vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('unlock', 'purchase_keys', 'purchase_booster', 'refund')),

  -- Item details
  item_id TEXT NOT NULL,
  item_name TEXT,
  cycle_id TEXT,

  -- Costs
  xp_cost INTEGER NOT NULL DEFAULT 0,
  keys_cost INTEGER NOT NULL DEFAULT 0,
  cash_cost NUMERIC(10, 2) DEFAULT 0.00,

  -- Payment details
  stripe_payment_intent_id TEXT,

  -- Shipping (for physical items)
  shipping_address JSONB,
  fulfillment_status TEXT CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP Transactions (Detailed XP earning log)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  amount INTEGER NOT NULL,

  -- Source
  source TEXT NOT NULL, -- 'lesson_complete', 'challenge_win', 'daily_login', etc.
  source_id TEXT, -- ID of lesson, challenge, etc.
  description TEXT,

  -- Metadata (JSONB for extra data like multipliers)
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vault Carts (Shopping cart for Keys/Boosters)
CREATE TABLE IF NOT EXISTS vault_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cart items (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Totals
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_keys INTEGER NOT NULL DEFAULT 0,
  total_cash NUMERIC(10, 2) DEFAULT 0.00,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_carts ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view own transactions"
  ON vault_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON vault_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP transactions"
  ON xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cart"
  ON vault_carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON vault_carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON vault_carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vault_transactions_user_id ON vault_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_created_at ON vault_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON vault_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions(source);

CREATE INDEX IF NOT EXISTS idx_vault_carts_user_id ON vault_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_carts_status ON vault_carts(status);

-- Triggers
CREATE TRIGGER set_user_vault_profiles_updated_at
  BEFORE UPDATE ON user_vault_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_vault_carts_updated_at
  BEFORE UPDATE ON vault_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create vault profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_vault_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_vault_profiles (user_id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create vault profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_vault_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_vault_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_vault_profile();

-- Grant permissions
GRANT ALL ON user_vault_profiles TO authenticated;
GRANT ALL ON vault_transactions TO authenticated;
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON vault_carts TO authenticated;

-- =====================================================
-- STEP 4: Vault RPC Functions
-- From: 007_vault_rpc_functions.sql
-- =====================================================

-- Function to decrement vault item stock atomically
CREATE OR REPLACE FUNCTION decrement_vault_item_stock(item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_current_stock INTEGER;
  v_result JSONB;
BEGIN
  -- Get current stock and lock the row
  SELECT current_stock INTO v_current_stock
  FROM vault_items
  WHERE id = item_id
  FOR UPDATE;

  -- Check if item exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'item_not_found'
    );
  END IF;

  -- Check if stock is available
  IF v_current_stock <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'out_of_stock',
      'current_stock', v_current_stock
    );
  END IF;

  -- Decrement stock
  UPDATE vault_items
  SET
    current_stock = current_stock - 1,
    updated_at = NOW()
  WHERE id = item_id;

  -- Return success with new stock level
  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_current_stock - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate booster for a user
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
  v_result JSONB;
BEGIN
  -- Calculate expiration time
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  -- Update user vault profile with active booster
  UPDATE user_vault_profiles
  SET
    booster_type = p_booster_type,
    booster_multiplier = p_multiplier,
    booster_expires_at = v_expires_at,
    booster_remaining_uses = p_remaining_uses,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'booster_type', p_booster_type,
    'multiplier', p_multiplier,
    'expires_at', v_expires_at,
    'remaining_uses', p_remaining_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and expire boosters
CREATE OR REPLACE FUNCTION check_booster_expiry(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booster_expires_at TIMESTAMPTZ;
  v_remaining_uses INTEGER;
BEGIN
  -- Get booster info
  SELECT booster_expires_at, booster_remaining_uses
  INTO v_booster_expires_at, v_remaining_uses
  FROM user_vault_profiles
  WHERE user_id = p_user_id;

  -- Check if booster has expired
  IF v_booster_expires_at IS NOT NULL AND v_booster_expires_at < NOW() THEN
    -- Clear expired booster
    UPDATE user_vault_profiles
    SET
      booster_type = NULL,
      booster_multiplier = NULL,
      booster_expires_at = NULL,
      booster_remaining_uses = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN true;
  END IF;

  -- Check if use-based booster is depleted
  IF v_remaining_uses IS NOT NULL AND v_remaining_uses <= 0 THEN
    -- Clear depleted booster
    UPDATE user_vault_profiles
    SET
      booster_type = NULL,
      booster_multiplier = NULL,
      booster_expires_at = NULL,
      booster_remaining_uses = NULL,
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
  SET
    booster_remaining_uses = CASE
      WHEN booster_remaining_uses IS NOT NULL THEN booster_remaining_uses - 1
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND booster_remaining_uses > 0;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION decrement_vault_item_stock(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booster_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_booster_uses(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Verify tables were created:
SELECT
  'Migration Complete! Tables created:' as message,
  count(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users_profiles',
    'user_lesson_progress',
    'user_module_progress',
    'user_quiz_attempts',
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  );
