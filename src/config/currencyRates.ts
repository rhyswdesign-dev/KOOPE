/**
 * Static currency conversion — pure module, zero imports.
 *
 * Extracted from useCurrencyPreference (Phase 1.2) so pure services
 * (valueVerdictService) can convert without transitively importing
 * expo-localization/AsyncStorage — the same testability extraction
 * pattern as contexts/entitlementMapping.ts. useCurrencyPreference
 * re-exports these for its existing consumers.
 *
 * Approximate rates, no network. Fine for price-range comparisons;
 * not for anything transactional.
 */

export type SupportedCurrency = 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR' | 'NZD';

export const USD_MULTIPLIERS: Record<SupportedCurrency, number> = {
  USD: 1.0,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.55,
  EUR: 0.93,
  NZD: 1.68,
};

/**
 * Convert between any two supported currencies via the static multipliers
 * (two-hop through USD). Unrounded — callers doing comparisons (e.g. the
 * value verdict) shouldn't accumulate rounding; round only at display
 * time. Returns the amount unchanged if either currency code isn't
 * supported (legacy free-text currency entries).
 */
export function convertBetween(amount: number, from: string, to: string): number {
  const fromRate = USD_MULTIPLIERS[from as SupportedCurrency];
  const toRate = USD_MULTIPLIERS[to as SupportedCurrency];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}
