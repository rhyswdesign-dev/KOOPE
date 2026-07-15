-- STEP 4: Transaction Tables
-- Copy ONLY this SQL

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
