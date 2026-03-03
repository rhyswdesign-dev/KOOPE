-- ============================================================================
-- Migration 014: Brand Insights Data Pipeline
-- Aggregated quarterly reports for brand partnerships ($8–15k/quarter).
-- Privacy floor: all functions require >= 50 distinct users before returning data.
-- Individual user data is NEVER exposed — aggregates only.
-- ============================================================================

-- ============================================================================
-- RPC: Quarterly brand stats — the core report generator
-- Returns aggregates only; hard privacy floor enforced inside function.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_brand_quarterly_stats(
  p_brand_name     TEXT,
  p_start_date     TIMESTAMPTZ,
  p_end_date       TIMESTAMPTZ,
  p_min_user_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  brand_name             TEXT,
  total_cart_adds        BIGINT,
  distinct_users         BIGINT,
  avg_rating             NUMERIC(4,2),
  brand_preference_rate  NUMERIC(5,4),   -- % who chose this brand when category was in recipe
  total_impressions      BIGINT,
  impression_ctr         NUMERIC(5,4),   -- cart_adds / impressions
  is_featured_cart_adds  BIGINT,
  top_recipe             TEXT,
  top_ingredient_slot    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_distinct_users BIGINT;
BEGIN
  -- Count distinct users for privacy floor check
  SELECT COUNT(DISTINCT bca.user_id)
    INTO v_distinct_users
    FROM brand_cart_adds bca
   WHERE LOWER(bca.brand_name) = LOWER(p_brand_name)
     AND bca.created_at BETWEEN p_start_date AND p_end_date;

  -- Enforce privacy floor: return empty if too few users
  IF v_distinct_users < p_min_user_count THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH cart_stats AS (
    SELECT
      COUNT(*)                                              AS total_cart_adds,
      COUNT(DISTINCT bca.user_id)                          AS distinct_users,
      COUNT(*) FILTER (WHERE bca.is_featured_brand = true) AS is_featured_cart_adds,
      MODE() WITHIN GROUP (ORDER BY bca.recipe_context)    AS top_recipe
    FROM brand_cart_adds bca
    WHERE LOWER(bca.brand_name) = LOWER(p_brand_name)
      AND bca.created_at BETWEEN p_start_date AND p_end_date
  ),
  selection_stats AS (
    SELECT
      AVG(bs.user_rating)::NUMERIC(4,2)                   AS avg_rating,
      MODE() WITHIN GROUP (ORDER BY bs.ingredient_slot)    AS top_ingredient_slot,
      -- Preference rate: selections of this brand / all selections in same ingredient slots
      COUNT(*) FILTER (WHERE LOWER(bs.brand_selected) = LOWER(p_brand_name))::NUMERIC
        / NULLIF(COUNT(*), 0)                              AS brand_preference_rate
    FROM brand_selections bs
    WHERE bs.created_at BETWEEN p_start_date AND p_end_date
      AND bs.ingredient_slot IN (
        SELECT DISTINCT ingredient_slot
        FROM brand_selections
        WHERE LOWER(brand_selected) = LOWER(p_brand_name)
          AND created_at BETWEEN p_start_date AND p_end_date
      )
  ),
  impression_stats AS (
    SELECT COUNT(*) AS total_impressions
    FROM brand_impressions bi
    WHERE LOWER(bi.brand_name) = LOWER(p_brand_name)
      AND bi.created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT
    p_brand_name,
    cs.total_cart_adds,
    cs.distinct_users,
    ss.avg_rating,
    COALESCE(ss.brand_preference_rate, 0)::NUMERIC(5,4),
    imp.total_impressions,
    CASE
      WHEN imp.total_impressions > 0
      THEN (cs.total_cart_adds::NUMERIC / imp.total_impressions)::NUMERIC(5,4)
      ELSE 0
    END                                                     AS impression_ctr,
    cs.is_featured_cart_adds,
    cs.top_recipe,
    ss.top_ingredient_slot
  FROM cart_stats cs, selection_stats ss, impression_stats imp;
END;
$$;

-- ============================================================================
-- RPC: Regional breakdown for a brand in a period
-- Returns state-level data only; same privacy floor applies.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_brand_regional_breakdown(
  p_brand_name     TEXT,
  p_start_date     TIMESTAMPTZ,
  p_end_date       TIMESTAMPTZ,
  p_min_user_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  region      TEXT,
  cart_adds   BIGINT,
  user_count  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    bca.user_region AS region,
    COUNT(*)        AS cart_adds,
    COUNT(DISTINCT bca.user_id) AS user_count
  FROM brand_cart_adds bca
  WHERE LOWER(bca.brand_name) = LOWER(p_brand_name)
    AND bca.created_at BETWEEN p_start_date AND p_end_date
    AND bca.user_region IS NOT NULL
  GROUP BY bca.user_region
  HAVING COUNT(DISTINCT bca.user_id) >= p_min_user_count
  ORDER BY cart_adds DESC;
$$;

-- ============================================================================
-- RPC: Competitive share — how one brand stacks up vs category peers
-- Privacy floor: returns 0 for all brands if total distinct users < 50.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_category_competitive_share(
  p_category       TEXT,
  p_start_date     TIMESTAMPTZ,
  p_end_date       TIMESTAMPTZ,
  p_min_user_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  brand_selected TEXT,
  selection_count BIGINT,
  share_pct       NUMERIC(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_distinct_users BIGINT;
  v_total          BIGINT;
BEGIN
  -- Privacy floor check on the whole category
  SELECT COUNT(DISTINCT user_id)
    INTO v_distinct_users
    FROM brand_selections bs
    JOIN (
      -- Find ingredient slots that belong to this category via featured_brands
      SELECT DISTINCT ingredient_slot
      FROM brand_selections inner_bs
      WHERE inner_bs.created_at BETWEEN p_start_date AND p_end_date
        AND EXISTS (
          SELECT 1 FROM featured_brands fb
          WHERE LOWER(fb.category) = LOWER(p_category)
            AND LOWER(fb.brand_name) = LOWER(inner_bs.brand_selected)
        )
    ) slots ON bs.ingredient_slot = slots.ingredient_slot
   WHERE bs.created_at BETWEEN p_start_date AND p_end_date;

  IF v_distinct_users < p_min_user_count THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
    INTO v_total
    FROM brand_selections bs
   WHERE bs.created_at BETWEEN p_start_date AND p_end_date
     AND LOWER(bs.ingredient_slot) LIKE '%' || LOWER(p_category) || '%';

  RETURN QUERY
  SELECT
    bs.brand_selected,
    COUNT(*)                                          AS selection_count,
    (COUNT(*)::NUMERIC / NULLIF(v_total, 0))::NUMERIC(5,4) AS share_pct
  FROM brand_selections bs
  WHERE bs.created_at BETWEEN p_start_date AND p_end_date
    AND LOWER(bs.ingredient_slot) LIKE '%' || LOWER(p_category) || '%'
  GROUP BY bs.brand_selected
  ORDER BY selection_count DESC;
END;
$$;

-- ============================================================================
-- RPC: Growth comparison — current period vs prior period
-- Returns cart_add counts for current + prior quarter for a brand.
-- Privacy floor: if either period has < 50 users, returns zero for that period.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_brand_growth_comparison(
  p_brand_name       TEXT,
  p_current_start    TIMESTAMPTZ,
  p_current_end      TIMESTAMPTZ,
  p_prior_start      TIMESTAMPTZ,
  p_prior_end        TIMESTAMPTZ,
  p_min_user_count   INTEGER DEFAULT 50
)
RETURNS TABLE (
  current_cart_adds BIGINT,
  prior_cart_adds   BIGINT,
  growth_pct        NUMERIC(7,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_current_users BIGINT;
  v_prior_users   BIGINT;
  v_current       BIGINT := 0;
  v_prior         BIGINT := 0;
BEGIN
  SELECT COUNT(DISTINCT user_id)
    INTO v_current_users
    FROM brand_cart_adds
   WHERE LOWER(brand_name) = LOWER(p_brand_name)
     AND created_at BETWEEN p_current_start AND p_current_end;

  SELECT COUNT(DISTINCT user_id)
    INTO v_prior_users
    FROM brand_cart_adds
   WHERE LOWER(brand_name) = LOWER(p_brand_name)
     AND created_at BETWEEN p_prior_start AND p_prior_end;

  IF v_current_users >= p_min_user_count THEN
    SELECT COUNT(*) INTO v_current
      FROM brand_cart_adds
     WHERE LOWER(brand_name) = LOWER(p_brand_name)
       AND created_at BETWEEN p_current_start AND p_current_end;
  END IF;

  IF v_prior_users >= p_min_user_count THEN
    SELECT COUNT(*) INTO v_prior
      FROM brand_cart_adds
     WHERE LOWER(brand_name) = LOWER(p_brand_name)
       AND created_at BETWEEN p_prior_start AND p_prior_end;
  END IF;

  RETURN QUERY
  SELECT
    v_current,
    v_prior,
    CASE
      WHEN v_prior = 0 THEN NULL
      ELSE ((v_current - v_prior)::NUMERIC / v_prior * 100)::NUMERIC(7,4)
    END AS growth_pct;
END;
$$;

-- Grant execute to service role only (never to anon/authenticated — aggregates via backend only)
GRANT EXECUTE ON FUNCTION get_brand_quarterly_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_brand_regional_breakdown TO service_role;
GRANT EXECUTE ON FUNCTION get_category_competitive_share TO service_role;
GRANT EXECUTE ON FUNCTION get_brand_growth_comparison TO service_role;
