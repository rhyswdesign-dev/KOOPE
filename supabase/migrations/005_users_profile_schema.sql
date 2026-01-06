-- USER PROFILES SCHEMA MIGRATION
-- Creates comprehensive user profiles table with all needed fields

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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON public.users_profiles TO authenticated;
GRANT SELECT ON public.users_profiles TO anon;
