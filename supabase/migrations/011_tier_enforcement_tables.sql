-- ============================================================================
-- Migration 011: Tier Enforcement & AI Usage Tracking
-- Supports server-side tier validation for the AI proxy Edge Function.
-- ============================================================================

-- User subscription state (synced from RevenueCat webhooks)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'koope_plus', 'koope_pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  product_id TEXT,            -- RevenueCat product identifier
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active subscription per user
  UNIQUE (user_id, status)
);

-- AI usage log for rate limiting
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,       -- 'bartender_chat', 'recipe_generation', etc.
  tier TEXT NOT NULL,          -- tier at time of request
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shopping cart (persisted server-side for sync)
CREATE TABLE IF NOT EXISTS user_shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One cart per user
  UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_day ON ai_usage_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_shopping_cart_user_id ON user_shopping_cart(user_id);

-- RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shopping_cart ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can write subscriptions (via webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own usage
CREATE POLICY "Users can read own AI usage"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role writes usage (via edge function)
CREATE POLICY "Service role can log AI usage"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true); -- Edge function runs as service role

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart"
  ON user_shopping_cart FOR ALL
  USING (auth.uid() = user_id);

-- RPC: Get daily AI usage count for a user
CREATE OR REPLACE FUNCTION get_daily_ai_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM ai_usage_log
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now());
$$;

-- RPC: Get user tier
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT tier FROM user_subscriptions
     WHERE user_id = p_user_id AND status = 'active'
     ORDER BY created_at DESC LIMIT 1),
    'free'
  );
$$;
