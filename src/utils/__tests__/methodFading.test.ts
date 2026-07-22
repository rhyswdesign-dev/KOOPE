import { describe, it, expect } from 'vitest';
import { resolveMethodRenderMode, buildCondensedSteps, buildMethodSpecLine } from '../methodFading';

describe('methodFading', () => {
  describe('resolveMethodRenderMode', () => {
    it('is always full for Free tier, regardless of make count', () => {
      expect(
        resolveMethodRenderMode({ isFreeTier: true, showFullMethod: false, timesMade: 20 }),
      ).toBe('full');
    });

    it('is full below 2 makes', () => {
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 0 }),
      ).toBe('full');
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 1 }),
      ).toBe('full');
    });

    it('is condensed between 2 and 4 makes', () => {
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 2 }),
      ).toBe('condensed');
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 4 }),
      ).toBe('condensed');
    });

    it('is spec at 5+ makes — the accept criterion', () => {
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 5 }),
      ).toBe('spec');
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: false, timesMade: 50 }),
      ).toBe('spec');
    });

    it('the show-everything escape hatch always wins, even at high make counts', () => {
      expect(
        resolveMethodRenderMode({ isFreeTier: false, showFullMethod: true, timesMade: 50 }),
      ).toBe('full');
    });
  });

  describe('buildCondensedSteps', () => {
    it('trims each step down to the max length', () => {
      const steps = ['Shake all ingredients vigorously with ice for about fifteen seconds.'];
      const condensed = buildCondensedSteps(steps, 20);
      expect(condensed[0].length).toBeLessThanOrEqual(23); // allows for a trailing "..."
    });

    it('drops empty steps', () => {
      expect(buildCondensedSteps(['', '  ', 'Stir well.'])).toEqual(['Stir well.']);
    });
  });

  describe('buildMethodSpecLine', () => {
    it('joins trimmed steps with an arrow separator', () => {
      const line = buildMethodSpecLine(['Shake ingredients with ice.', 'Strain into a coupe.']);
      expect(line).toBe('Shake ingredients with ice → Strain into a coupe');
    });

    it('returns an empty string for no steps', () => {
      expect(buildMethodSpecLine([])).toBe('');
    });
  });
});
