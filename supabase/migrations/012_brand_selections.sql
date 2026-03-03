-- ============================================================================
-- Migration 012: Brand Selections & Brand Partnership Infrastructure
-- Records which brands users choose when making cocktails.
-- Feeds the brand partnership data pipeline (brand pitches, quarterly reports).
-- ALL tiers capture data — 25x multiplier vs Pro-only (Update 1 in strategy addendum).
-- ============================================================================

-- Brand selections: records brand used per ingredient per completion
CREATE TABLE IF NOT EXISTS brand_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipe_id TEXT,
  ingredient_slot TEXT NOT NULL,       -- 'Gin', 'Campari', 'Sweet Vermouth', etc.
  brand_selected TEXT NOT NULL,         -- 'Tanqueray', 'Campari', 'Carpano Antica', etc.
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'plus', 'pro')),
  user_region TEXT,                     -- State-level only, e.g. 'US-TX'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_selections_recipe_idx ON brand_selections(recipe_id);
CREATE INDEX IF NOT EXISTS brand_selections_brand_idx ON brand_selections(brand_selected);
CREATE INDEX IF NOT EXISTS brand_selections_ingredient_idx ON brand_selections(ingredient_slot, brand_selected);
CREATE INDEX IF NOT EXISTS brand_selections_created_idx ON brand_selections(created_at);

-- RLS: users can insert their own, nobody can read others' individual rows
ALTER TABLE brand_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own brand selections"
  ON brand_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role reads all for aggregated reports
CREATE POLICY "Service role can read all brand selections"
  ON brand_selections FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Featured Brands: which brand is "featured" per category per month
-- Populated by admin (or future brand partnership dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS featured_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  category TEXT NOT NULL,               -- 'gin', 'bourbon', 'tequila', 'amaro', 'vodka', 'rum', 'liqueur', etc.
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'growth' CHECK (tier IN ('premium', 'growth', 'specialty')),
  badge_label TEXT NOT NULL DEFAULT 'Featured',   -- 'Featured' or 'Sponsored' (FTC-compliant)
  vault_drop_id TEXT,                   -- Associated vault drop (if any)
  challenge_id TEXT,                    -- Associated challenge (if any)
  xp_bonus INTEGER NOT NULL DEFAULT 25, -- Extra XP awarded when user picks this brand
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (category, month, year)        -- One featured brand per category per month
);

-- All users can read featured brands (needed for UI badges)
ALTER TABLE featured_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read featured brands"
  ON featured_brands FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage featured brands"
  ON featured_brands FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Brand Impressions: tracks when users see a "Featured" badge
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES featured_brands(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('recipe_card', 'ingredient_list', 'cart', 'vault', 'challenge')),
  recipe_id TEXT,
  user_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_impressions_brand_idx ON brand_impressions(brand_name, created_at);
CREATE INDEX IF NOT EXISTS brand_impressions_user_idx ON brand_impressions(user_id);

ALTER TABLE brand_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own impressions"
  ON brand_impressions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can read impressions"
  ON brand_impressions FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Brand Cart Adds: tracks when users add an ingredient with a brand to cart
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_cart_adds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_name TEXT,
  ingredient_name TEXT NOT NULL,
  recipe_context TEXT,                  -- Recipe name this was added from
  user_tier TEXT DEFAULT 'free',
  user_region TEXT,
  is_featured_brand BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_cart_adds_brand_idx ON brand_cart_adds(brand_name, created_at);
CREATE INDEX IF NOT EXISTS brand_cart_adds_ingredient_idx ON brand_cart_adds(ingredient_name, created_at);

ALTER TABLE brand_cart_adds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own cart adds"
  ON brand_cart_adds FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can read cart adds"
  ON brand_cart_adds FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RPC: Aggregated brand data for a recipe (used by insights pipeline)
-- Privacy floor: only returns data if >= p_min_count completions exist
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recipe_brand_aggregates(
  p_recipe_id TEXT,
  p_min_count INTEGER DEFAULT 5
)
RETURNS TABLE (ingredient TEXT, brand TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ingredient_slot AS ingredient,
    brand_selected AS brand,
    COUNT(*) AS count
  FROM brand_selections
  WHERE recipe_id = p_recipe_id
  GROUP BY ingredient_slot, brand_selected
  HAVING COUNT(*) >= p_min_count
  ORDER BY count DESC;
$$;

-- ============================================================================
-- Seed: Example featured brands for current month (March 2026)
-- In production, this is managed via admin dashboard / brand partnership contracts
-- ============================================================================

INSERT INTO featured_brands (brand_name, category, month, year, tier, badge_label, xp_bonus, is_active)
VALUES
  ('Tanqueray',        'gin',       3, 2026, 'premium',   'Featured', 25, true),
  ('Patrón',          'tequila',   3, 2026, 'premium',   'Featured', 25, true),
  ('Tito''s',          'vodka',     3, 2026, 'growth',    'Featured', 25, true),
  ('Cointreau',        'liqueur',   3, 2026, 'growth',    'Featured', 25, true),
  ('Campari',          'amaro',     3, 2026, 'premium',   'Featured', 25, true)
ON CONFLICT (category, month, year) DO NOTHING;
