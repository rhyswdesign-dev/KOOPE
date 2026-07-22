-- STEP 3: Vault Profiles Table
-- Copy ONLY this SQL

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
