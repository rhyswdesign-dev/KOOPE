/**
 * The taxonomy module is the join between three vocabularies that previously
 * couldn't compound: the 18-tag scan set, the 7-axis recipe set, and the
 * 8-key onboarding set. If a mapping here is wrong, every downstream taste
 * signal is quietly wrong too — the failure is invisible rather than loud,
 * which is exactly what happened with the three ad hoc extractors this
 * module replaced.
 */
import { describe, it, expect } from 'vitest';
import {
  CANONICAL_FLAVORS,
  tagsToCanonical,
  bottleFlavorsToCanonical,
  onboardingKeysToCanonical,
  extractRecipeFlavorVector,
  dominantFlavors,
} from '../flavorTaxonomy';

describe('flavorTaxonomy', () => {
  describe('tagsToCanonical', () => {
    it('maps identity tags to themselves', () => {
      expect(tagsToCanonical(['smoky'])).toEqual(['smoky']);
      expect(tagsToCanonical(['citrus'])).toEqual(['citrus']);
    });

    it('collapses near-synonyms onto one axis', () => {
      // peaty is a kind of smoky; botanical is a kind of herbal
      expect(tagsToCanonical(['peaty'])).toEqual(['smoky']);
      expect(tagsToCanonical(['botanical'])).toEqual(['herbal']);
    });

    it('deduplicates when several tags collapse to the same axis', () => {
      expect(tagsToCanonical(['smoky', 'peaty'])).toEqual(['smoky']);
    });

    it('drops body/texture tags rather than inventing a flavour axis', () => {
      // aged/rich/light/creamy/dry describe mouthfeel, not flavour direction.
      // Forcing them onto an axis would inject noise into every scan signal.
      expect(tagsToCanonical(['aged', 'rich', 'light', 'creamy', 'dry'])).toEqual([]);
    });

    it('only ever emits canonical axes', () => {
      const all = tagsToCanonical([
        'smoky',
        'peaty',
        'citrus',
        'floral',
        'sweet',
        'bitter',
        'herbal',
        'spiced',
        'aged',
        'rich',
        'light',
        'botanical',
        'fruity',
        'nutty',
        'creamy',
        'earthy',
        'briny',
        'dry',
      ]);
      for (const axis of all) {
        expect(CANONICAL_FLAVORS).toContain(axis);
      }
    });
  });

  describe('bottleFlavorsToCanonical', () => {
    it('maps free-text bottle words through to canonical axes', () => {
      // Real spiritsDatabase entry: Tanqueray -> ['Juniper','Citrus','Spice']
      const result = bottleFlavorsToCanonical(['Juniper', 'Citrus', 'Spice']);
      expect(result).toContain('citrus');
      expect(result).toContain('spiced');
      expect(result).toContain('herbal'); // juniper -> botanical -> herbal
    });

    it('ignores words it does not recognise', () => {
      expect(bottleFlavorsToCanonical(['Wibble', 'Nonsense'])).toEqual([]);
    });

    it('is case and punctuation insensitive', () => {
      expect(bottleFlavorsToCanonical(['SMOKE'])).toEqual(['smoky']);
    });
  });

  describe('onboardingKeysToCanonical', () => {
    it('maps the questionnaire vocabulary onto axes', () => {
      expect(onboardingKeysToCanonical(['spicy'])).toEqual(['spiced']);
      expect(onboardingKeysToCanonical(['citrus', 'sweet'])).toEqual(['citrus', 'sweet']);
    });

    it('drops strength/texture answers that are not flavour directions', () => {
      // smooth and spirit_forward are captured separately via ABV/complexity
      expect(onboardingKeysToCanonical(['smooth', 'spirit_forward', 'creamy'])).toEqual([]);
    });
  });

  describe('extractRecipeFlavorVector', () => {
    it("prefers the recipe's own declared flavorProfiles", () => {
      const vector = extractRecipeFlavorVector({
        flavorProfiles: ['smoky', 'citrus'],
        ingredients: [{ name: 'sugar', amount: '1' }],
      } as any);

      expect(vector.smoky).toBe(1);
      expect(vector.citrus).toBe(1);
      // declared list wins outright — sugar must not leak in
      expect(vector.sweet).toBe(0);
    });

    it('falls back to ingredient matching when nothing is declared', () => {
      const vector = extractRecipeFlavorVector({
        ingredients: [
          { name: 'Lemon juice', amount: '1' },
          { name: 'Mezcal', amount: '2' },
        ],
      } as any);

      expect(vector.citrus).toBeGreaterThan(0);
      expect(vector.smoky).toBeGreaterThan(0);
    });

    it('falls back to ingredients when declared flavours are all unrecognised', () => {
      const vector = extractRecipeFlavorVector({
        flavorProfiles: ['zesty-nonsense'],
        ingredients: [{ name: 'Lemon juice', amount: '1' }],
      } as any);

      expect(vector.citrus).toBeGreaterThan(0);
    });

    it('returns an all-zero vector for a recipe with no usable data', () => {
      const vector = extractRecipeFlavorVector({} as any);
      for (const axis of CANONICAL_FLAVORS) {
        expect(vector[axis]).toBe(0);
      }
    });

    it('always returns every canonical axis, never a sparse object', () => {
      const vector = extractRecipeFlavorVector({ flavorProfiles: ['smoky'] } as any);
      for (const axis of CANONICAL_FLAVORS) {
        expect(vector[axis]).toBeTypeOf('number');
      }
    });
  });

  describe('dominantFlavors', () => {
    it('returns strongest axes first and omits zeroes', () => {
      const result = dominantFlavors({ flavorProfiles: ['smoky', 'citrus'] } as any);
      expect(result).toHaveLength(2);
      expect(result).toContain('smoky');
      expect(result).toContain('citrus');
    });

    it('respects the limit', () => {
      const result = dominantFlavors(
        { flavorProfiles: ['smoky', 'citrus', 'sweet', 'bitter'] } as any,
        2,
      );
      expect(result).toHaveLength(2);
    });

    it('is the regression guard for the old name-parsing bug', () => {
      // The previous implementation substring-matched the cocktail NAME.
      // "Last Word" (gin/herbal/citrus) contains no flavour word at all, so
      // it taught the model nothing; a "Smoky Margarita" taught it the wrong
      // thing. Declared data must win over anything in the name.
      const lastWord = dominantFlavors({
        name: 'Last Word',
        flavorProfiles: ['herbal', 'citrus'],
      } as any);
      expect(lastWord).toContain('herbal');
      expect(lastWord).toContain('citrus');
    });
  });
});
