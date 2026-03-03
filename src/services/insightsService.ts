/**
 * Brand Insights Service
 * Generates aggregated quarterly reports for brand partnership pitches.
 * Powers the $8–15k/quarter insights revenue stream.
 *
 * Privacy guarantees:
 *   - All Supabase RPCs enforce a 50-user minimum before returning data.
 *   - No individual user rows are ever returned — aggregates only.
 *   - Regional data is state-level (e.g. 'US-TX'), never city/zip.
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface RegionalData {
  region: string;     // e.g. 'US-TX', 'US-CA'
  cartAdds: number;
  userCount: number;
}

export interface BrandInsightsReport {
  brandName: string;
  period: {
    startDate: string;    // ISO 8601
    endDate: string;
    quarter: number;      // 1–4
    year: number;
  };
  totalCartAdds: number;
  distinctUsers: number;
  cartAddGrowthPct: number | null;   // null if prior period below privacy floor
  brandPreferenceRate: number;       // 0–1: % who chose this brand when category was present
  affiliateCTR: number;              // cart_adds / impressions
  totalImpressions: number;
  avgRating: number | null;
  isFeaturedCartAdds: number;        // cart adds during a "Featured" month
  topRecipeAssociation: string | null;
  topIngredientSlot: string | null;
  regionalBreakdown: RegionalData[];
  competitiveSharePct: number | null; // share in category; null if below floor
  generatedAt: string;               // ISO timestamp
}

// ============================================================================
// Quarter helpers
// ============================================================================

function quarterDateRange(quarter: number, year: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

function priorQuarter(quarter: number, year: number): { quarter: number; year: number } {
  if (quarter === 1) return { quarter: 4, year: year - 1 };
  return { quarter: quarter - 1, year };
}

// ============================================================================
// Core report generator
// ============================================================================

/**
 * Generate a quarterly brand insights report.
 *
 * @param brandName  - The brand name to report on (e.g. 'Tanqueray')
 * @param quarter    - 1–4
 * @param year       - e.g. 2026
 * @param category   - Spirit category for competitive share (e.g. 'gin'). Optional.
 *
 * Returns null if the current period is below the 50-user privacy floor.
 */
export async function generateQuarterlyReport(
  brandName: string,
  quarter: number,
  year: number,
  category?: string
): Promise<BrandInsightsReport | null> {
  const { start, end } = quarterDateRange(quarter, year);
  const prior = priorQuarter(quarter, year);
  const { start: priorStart, end: priorEnd } = quarterDateRange(prior.quarter, prior.year);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  try {
    // ── 1. Core quarterly stats ──────────────────────────────────────────────
    const { data: coreRows, error: coreError } = await supabase.rpc(
      'get_brand_quarterly_stats',
      {
        p_brand_name: brandName,
        p_start_date: startIso,
        p_end_date: endIso,
        p_min_user_count: 50,
      }
    );

    if (coreError) {
      log.error('InsightsService', 'Error fetching quarterly stats', coreError);
      return null;
    }

    // Empty result means below privacy floor
    if (!coreRows || coreRows.length === 0) {
      log.info('InsightsService', 'Below privacy floor — returning null', { brandName, quarter, year });
      return null;
    }

    const core = coreRows[0];

    // ── 2. Growth comparison vs prior quarter ────────────────────────────────
    const { data: growthRows, error: growthError } = await supabase.rpc(
      'get_brand_growth_comparison',
      {
        p_brand_name: brandName,
        p_current_start: startIso,
        p_current_end: endIso,
        p_prior_start: priorStart.toISOString(),
        p_prior_end: priorEnd.toISOString(),
        p_min_user_count: 50,
      }
    );

    if (growthError) {
      log.warn('InsightsService', 'Growth comparison failed, continuing', growthError);
    }

    const growthPct: number | null =
      growthRows && growthRows.length > 0 ? (growthRows[0].growth_pct ?? null) : null;

    // ── 3. Regional breakdown ────────────────────────────────────────────────
    const { data: regionalRows, error: regionalError } = await supabase.rpc(
      'get_brand_regional_breakdown',
      {
        p_brand_name: brandName,
        p_start_date: startIso,
        p_end_date: endIso,
        p_min_user_count: 50,
      }
    );

    if (regionalError) {
      log.warn('InsightsService', 'Regional breakdown failed, continuing', regionalError);
    }

    const regionalBreakdown: RegionalData[] = (regionalRows || []).map(
      (row: { region: string; cart_adds: number; user_count: number }) => ({
        region: row.region,
        cartAdds: row.cart_adds,
        userCount: row.user_count,
      })
    );

    // ── 4. Competitive share (optional — requires category) ──────────────────
    let competitiveSharePct: number | null = null;

    if (category) {
      const { data: shareRows, error: shareError } = await supabase.rpc(
        'get_category_competitive_share',
        {
          p_category: category,
          p_start_date: startIso,
          p_end_date: endIso,
          p_min_user_count: 50,
        }
      );

      if (shareError) {
        log.warn('InsightsService', 'Competitive share failed, continuing', shareError);
      } else if (shareRows && shareRows.length > 0) {
        const brandRow = shareRows.find(
          (r: { brand_selected: string; share_pct: number }) =>
            r.brand_selected.toLowerCase() === brandName.toLowerCase()
        );
        competitiveSharePct = brandRow?.share_pct ?? null;
      }
    }

    // ── 5. Assemble final report ─────────────────────────────────────────────
    const report: BrandInsightsReport = {
      brandName,
      period: {
        startDate: startIso,
        endDate: endIso,
        quarter,
        year,
      },
      totalCartAdds: Number(core.total_cart_adds) || 0,
      distinctUsers: Number(core.distinct_users) || 0,
      cartAddGrowthPct: growthPct,
      brandPreferenceRate: Number(core.brand_preference_rate) || 0,
      affiliateCTR: Number(core.impression_ctr) || 0,
      totalImpressions: Number(core.total_impressions) || 0,
      avgRating: core.avg_rating != null ? Number(core.avg_rating) : null,
      isFeaturedCartAdds: Number(core.is_featured_cart_adds) || 0,
      topRecipeAssociation: core.top_recipe ?? null,
      topIngredientSlot: core.top_ingredient_slot ?? null,
      regionalBreakdown,
      competitiveSharePct,
      generatedAt: new Date().toISOString(),
    };

    return report;
  } catch (err) {
    log.error('InsightsService', 'Unexpected error generating quarterly report', err);
    return null;
  }
}

// ============================================================================
// Convenience: current quarter report
// ============================================================================

export async function generateCurrentQuarterReport(
  brandName: string,
  category?: string
): Promise<BrandInsightsReport | null> {
  const now = new Date();
  const month = now.getMonth(); // 0–11
  const quarter = Math.floor(month / 3) + 1;
  const year = now.getFullYear();
  return generateQuarterlyReport(brandName, quarter, year, category);
}
