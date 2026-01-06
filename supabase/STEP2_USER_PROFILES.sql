-- STEP 2: User Profiles Table
-- Copy ONLY this SQL

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
