/**
 * Value Verdict Service — value-on-scan v1 (Phase 1.2)
 *
 * Pure, synchronous, unit-testable (no store/network/RN imports — the
 * giftVerdictService pattern). Compares a user's spotted price against
 * the bottle's fair-price range and produces the Master Plan's mechanic:
 * "Fair price: $32–38. You saw $32. ✓ Good buy."
 *
 * Currency-aware: the spotted price is converted into the range's
 * currency via the static rates in config/currencyRates.ts before
 * comparison. A 5% tolerance band keeps boundary prices from flapping
 * between verdicts on rounding.
 */

import { convertBetween, type SupportedCurrency } from '../config/currencyRates';

export type ValueVerdictKind = 'good_buy' | 'typical' | 'high';

export interface SpottedPriceInput {
  price: number;
  currency: string;
}

export interface PriceRangeInput {
  min: number;
  max: number;
  currency: SupportedCurrency;
}

export interface ValueVerdict {
  verdict: ValueVerdictKind;
  /** Display copy, e.g. "✓ Good buy — you saw $32" (price shown in the range's currency). */
  headline: string;
}

const TOLERANCE = 1.05;

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  EUR: '€',
  NZD: 'NZ$',
};

export function computeValueVerdict(
  spotted: SpottedPriceInput,
  range: PriceRangeInput | null,
): ValueVerdict | null {
  if (!range || !(spotted.price > 0) || !(range.min > 0) || !(range.max >= range.min)) {
    return null;
  }

  const comparable = convertBetween(spotted.price, spotted.currency, range.currency);
  const symbol = CURRENCY_SYMBOLS[range.currency] ?? '$';
  const shown = `${symbol}${Math.round(comparable)}`;

  if (comparable <= range.min * TOLERANCE) {
    return { verdict: 'good_buy', headline: `✓ Good buy — you saw ${shown}` };
  }
  if (comparable <= range.max * TOLERANCE) {
    return { verdict: 'typical', headline: `Typical price — you saw ${shown}` };
  }
  return { verdict: 'high', headline: `Above the usual range — you saw ${shown}` };
}
