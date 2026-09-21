// Ingredient flavor-intensity multipliers for the Taste Profile gauges.
//
// Source: docs/taste-profile-research-2026-07.md, Deliverable 1. That report
// audited the naive "sum ounces, divide by total" formula against real
// bartending/mixology knowledge and found it treats every ingredient in a
// role bucket as equally intense per ounce — e.g. 1 oz of simple syrup
// "counts" the same as 1 oz of Campari, and a 1/4 oz float of peated Scotch
// counts for almost nothing even though it's designed to dominate the drink.
//
// Each multiplier below is transcribed from that report's sourced table
// (39 ingredients: base spirits, liqueurs/amari, syrups, citrus). Anything
// NOT covered here — because the research report explicitly flagged it as
// "not confidently corrected" (crème de violette, coffee liqueur, cream,
// tonic water, ginger beer, prosecco/champagne, pisco, amaretto, Calvados,
// Lillet Blanc, orange juice, cranberry juice, raspberry syrup, etc.) —
// intentionally has no rule here and falls back to the neutral 1.0x default
// in getIntensityMultiplier(). This preserves the research report's own
// honest "we don't have data for this" posture rather than inventing false
// precision.
//
// Matching is done against real ingredient strings from src/data/cocktails.ts
// and src/utils/cocktailDetailFallbackData.ts (e.g. "Islay single malt
// Scotch" must hit the peated-Scotch rule, not fall through to generic
// Scotch), not just the report's shorthand ingredient names.

export type TasteAxisKey = 'spiritForward' | 'sweetness' | 'acidity' | 'bitterness';

interface IntensityRule {
  /** Matches against the lowercased, trimmed ingredient name. */
  test: (lowerName: string) => boolean;
  multiplier: number;
}

// --- Spirit Forward (proof/congener character) ---------------------------
// Baseline = vodka, standard 40% ABV = 1.0x (not listed below; it's the
// implicit default for anything that doesn't match a rule).
const SPIRIT_FORWARD_RULES: IntensityRule[] = [
  // Peated/Islay single malt Scotch — checked before the generic Scotch rule.
  { test: (l) => l.includes('islay') || l.includes('peated'), multiplier: 1.8 },
  { test: (l) => l.includes('mezcal'), multiplier: 1.4 },
  // Tequila añejo — checked before reposado/generic tequila.
  { test: (l) => l.includes('anejo') || l.includes('añejo'), multiplier: 1.3 },
  // Aged/Jamaican pot-still rum — checked before generic dark rum.
  {
    test: (l) => l.includes('jamaican rum') || (l.includes('aged') && l.includes('rum')),
    multiplier: 1.3,
  },
  { test: (l) => l.includes('rye'), multiplier: 1.3 },
  { test: (l) => l.includes('reposado'), multiplier: 1.15 },
  { test: (l) => l.includes('dark rum'), multiplier: 1.15 },
  { test: (l) => l.includes('bourbon'), multiplier: 1.2 },
  // Generic/blended Scotch — only reached if the peated/Islay rule above
  // didn't already match.
  { test: (l) => l.includes('scotch'), multiplier: 1.15 },
  // Grape brandy (cognac / VS/VSOP brandy) — explicitly excludes fruit
  // brandies (apple, peach, Calvados) which the research report did not
  // source a multiplier for.
  {
    test: (l) =>
      (l.includes('cognac') || l.includes('brandy')) &&
      !l.includes('apple brandy') &&
      !l.includes('peach brandy') &&
      !l.includes('calvados'),
    multiplier: 1.1,
  },
  { test: (l) => l.includes('gin'), multiplier: 1.1 },
  { test: (l) => l.includes('white rum'), multiplier: 0.9 },
];

// --- Bitterness (bitter liqueurs/amari poured in real ounces — NOT the
// tiny-volume aromatic dash-bitters bucket, which stays unweighted) --------
const BITTERNESS_RULES: IntensityRule[] = [
  { test: (l) => l.includes('fernet'), multiplier: 2.8 },
  { test: (l) => l.includes('campari'), multiplier: 2.2 },
  // Green Chartreuse — yellow Chartreuse is routed to the sweetness axis by
  // the classifier in tasteProfileAxes.ts and never reaches this table.
  { test: (l) => l.includes('chartreuse'), multiplier: 1.6 },
  { test: (l) => l.includes('cynar'), multiplier: 1.3 },
  { test: (l) => l.includes('nonino'), multiplier: 1.3 },
  { test: (l) => l.includes('amer picon') || l.includes('picon'), multiplier: 1.3 },
  // Generic amaro catch-all (moderate amaro/bittersweet bucket).
  { test: (l) => l.includes('amaro'), multiplier: 1.3 },
  { test: (l) => l.includes('aperol'), multiplier: 1.0 },
];

// --- Sweetness (syrups/sweeteners, sweet vermouth, orange liqueurs and
// maraschino) ---------------------------------------------------------------
const SWEETNESS_RULES: IntensityRule[] = [
  { test: (l) => l.includes('maraschino'), multiplier: 1.3 },
  { test: (l) => l.includes('agave'), multiplier: 1.15 },
  { test: (l) => l.includes('honey'), multiplier: 1.1 },
  { test: (l) => l.includes('grand marnier'), multiplier: 1.05 },
  { test: (l) => l.includes('demerara'), multiplier: 1.05 },
  { test: (l) => l.includes('orgeat'), multiplier: 0.9 },
  { test: (l) => l.includes('chartreuse') && l.includes('yellow'), multiplier: 0.9 },
  // Triple sec / Cointreau / curaçao / orange liqueur / grenadine / sweet
  // vermouth / simple syrup all sit at the 1.0x baseline — no rule needed,
  // they fall through to the default.
];

// --- Acidity (citrus, dry vermouth) ----------------------------------------
const ACIDITY_RULES: IntensityRule[] = [
  { test: (l) => l.includes('grapefruit'), multiplier: 0.7 },
  { test: (l) => l.includes('dry vermouth'), multiplier: 1.1 },
  // Lemon/lime juice sit at the 1.0x baseline — no rule needed.
];

const RULES_BY_AXIS: Record<TasteAxisKey, IntensityRule[]> = {
  spiritForward: SPIRIT_FORWARD_RULES,
  bitterness: BITTERNESS_RULES,
  sweetness: SWEETNESS_RULES,
  acidity: ACIDITY_RULES,
};

/**
 * Looks up the flavor-intensity multiplier for an ingredient on a given
 * axis. Defaults to 1.0x (neutral) for anything not covered by the sourced
 * research table — including every ingredient the research report explicitly
 * flagged as "not confidently corrected" — rather than inventing a number.
 */
export function getIntensityMultiplier(name: string, axis: TasteAxisKey): number {
  const lower = String(name || '')
    .toLowerCase()
    .trim();
  if (!lower) return 1.0;
  const rules = RULES_BY_AXIS[axis];
  const match = rules.find((rule) => rule.test(lower));
  return match ? match.multiplier : 1.0;
}
