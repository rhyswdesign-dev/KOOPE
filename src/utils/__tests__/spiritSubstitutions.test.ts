/**
 * Regression coverage for a real bug found in the Ingredient Substitutes
 * modal: crème de cacao and nutmeg had no entries in SUBSTITUTION_RULES,
 * so they fell through to a placeholder that the modal rendered as the
 * broken sentence "Try No strong swap found". Fixed by adding real
 * entries for both; this locks in that they actually resolve.
 */
import { describe, it, expect } from 'vitest';
import { getSpiritSubstitutions, getMissingWithSubstitutions } from '../spiritSubstitutions';

describe('getSpiritSubstitutions', () => {
  it('resolves crème de cacao (with accent, as ingredient names are authored)', () => {
    const result = getSpiritSubstitutions('crème de cacao');
    expect(result).not.toBeNull();
    expect(result?.substitutes[0].name).toBe('chocolate liqueur');
  });

  it('resolves a "Fresh nutmeg garnish" ingredient string via the garnish-stripping + partial match', () => {
    const result = getSpiritSubstitutions('Fresh nutmeg garnish');
    expect(result).not.toBeNull();
    expect(result?.substitutes[0].name).toBe('allspice');
  });

  it('still returns null for a genuinely uncovered ingredient (no silent false match)', () => {
    expect(getSpiritSubstitutions('unobtainium bitters')).toBeNull();
  });
});

describe('getMissingWithSubstitutions', () => {
  it('the Alexander recipe gap: crème de cacao and nutmeg now get real substitutes, not a null-ish fallback', () => {
    const results = getMissingWithSubstitutions(['crème de cacao', 'Fresh nutmeg garnish'], []);
    for (const entry of results) {
      expect(entry.substitutions).not.toBeNull();
      expect(entry.substitutions?.substitutes.length).toBeGreaterThan(0);
    }
  });
});
