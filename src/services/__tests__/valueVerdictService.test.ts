import { describe, it, expect } from 'vitest';
import { computeValueVerdict } from '../valueVerdictService';

const usdRange = { min: 32, max: 38, currency: 'USD' as const };

describe('computeValueVerdict', () => {
  it('returns good_buy at or below the range minimum (the Master Plan example)', () => {
    const verdict = computeValueVerdict({ price: 32, currency: 'USD' }, usdRange);
    expect(verdict?.verdict).toBe('good_buy');
    expect(verdict?.headline).toBe('✓ Good buy — you saw $32');
  });

  it('applies the 5% tolerance band at the good-buy boundary', () => {
    // 32 * 1.05 = 33.6 — 33 is inside the band, 34 is out
    expect(computeValueVerdict({ price: 33, currency: 'USD' }, usdRange)?.verdict).toBe('good_buy');
    expect(computeValueVerdict({ price: 34, currency: 'USD' }, usdRange)?.verdict).toBe('typical');
  });

  it('returns typical inside the range', () => {
    const verdict = computeValueVerdict({ price: 36, currency: 'USD' }, usdRange);
    expect(verdict?.verdict).toBe('typical');
    expect(verdict?.headline).toContain('Typical price');
  });

  it('applies the 5% tolerance band at the high boundary', () => {
    // 38 * 1.05 = 39.9 — 39 is still typical, 40 is high
    expect(computeValueVerdict({ price: 39, currency: 'USD' }, usdRange)?.verdict).toBe('typical');
    expect(computeValueVerdict({ price: 40, currency: 'USD' }, usdRange)?.verdict).toBe('high');
  });

  it('returns high above the range', () => {
    const verdict = computeValueVerdict({ price: 55, currency: 'USD' }, usdRange);
    expect(verdict?.verdict).toBe('high');
    expect(verdict?.headline).toContain('Above the usual range');
  });

  it('converts a cross-currency spotted price before comparing', () => {
    // £26 ≈ $32.9 (26 / 0.79) — inside the good-buy tolerance of a $32–38 range
    const verdict = computeValueVerdict({ price: 26, currency: 'GBP' }, usdRange);
    expect(verdict?.verdict).toBe('good_buy');
    // Headline shows the converted price in the RANGE's currency
    expect(verdict?.headline).toContain('$33');
  });

  it('formats the headline in the range currency symbol', () => {
    const gbpRange = { min: 22, max: 28, currency: 'GBP' as const };
    const verdict = computeValueVerdict({ price: 25, currency: 'GBP' }, gbpRange);
    expect(verdict?.headline).toContain('£25');
  });

  it('passes an unknown legacy currency through unconverted rather than failing', () => {
    const verdict = computeValueVerdict({ price: 35, currency: 'XYZ' }, usdRange);
    expect(verdict?.verdict).toBe('typical');
  });

  it('returns null with no range', () => {
    expect(computeValueVerdict({ price: 30, currency: 'USD' }, null)).toBeNull();
  });

  it('returns null for non-positive or inverted inputs', () => {
    expect(computeValueVerdict({ price: 0, currency: 'USD' }, usdRange)).toBeNull();
    expect(
      computeValueVerdict({ price: 30, currency: 'USD' }, { min: 40, max: 30, currency: 'USD' }),
    ).toBeNull();
  });
});
