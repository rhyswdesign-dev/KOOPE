/**
 * Canonical flavour taxonomy — the single vocabulary every taste signal
 * is expressed in.
 *
 * The app grew three incompatible flavour vocabularies:
 *   - 18-tag `FlavourTag`  (store/useTasteModel.ts)      — bottle scans
 *   - 7-axis `FlavorProfile` (types/userProfile.ts)      — recipes
 *   - 8-key  `FlavorKey`   (services/onboardingQuestionnaireService.ts)
 *
 * The 7-axis set wins as canonical because it already has every consumer
 * that does real matching maths: Recipe.flavorProfiles, computeFlavorVector,
 * TasteProfile.flavorWeights, tasteMatchService, tasteGraphService,
 * recommendationEngine, predictiveEngine, hostingPlannerService,
 * optimizeMyBarService and giftVerdictService. Adopting it means the
 * recipe-matching maths does not change at all — the two richer/looser
 * vocabularies map *down* onto it here.
 *
 * This module is also the one place flavour is extracted from a recipe.
 * It replaces three separate ad hoc implementations that disagreed with
 * each other (see extractRecipeFlavorVector below).
 */

import type { FlavorProfile } from '../types/userProfile';
import type { Recipe, FlavorVector, Ingredient } from '../types/recipe';
import { computeFlavorVector } from '../types/recipe';
import type { FlavourTag } from '../store/useTasteModel';
import { normaliseFlavours } from '../store/useTasteModel';

export const CANONICAL_FLAVORS: FlavorProfile[] = [
  'citrus',
  'herbal',
  'bitter',
  'sweet',
  'smoky',
  'floral',
  'spiced',
];

// ── 18-tag scan vocabulary → 7-axis ──────────────────────────────────────────
// Tags with no honest 7-axis equivalent map to null and are dropped rather
// than forced into a neighbouring axis. `aged`, `rich`, `light`, `dry` and
// `creamy` describe body/texture, not flavour direction; inventing a mapping
// for them would inject noise into every scan-derived signal.

const TAG_TO_AXIS: Record<FlavourTag, FlavorProfile | null> = {
  smoky: 'smoky',
  peaty: 'smoky',
  citrus: 'citrus',
  floral: 'floral',
  sweet: 'sweet',
  bitter: 'bitter',
  herbal: 'herbal',
  spiced: 'spiced',
  botanical: 'herbal',
  fruity: 'sweet',
  nutty: 'sweet',
  earthy: 'herbal',
  briny: 'bitter',
  aged: null,
  rich: null,
  light: null,
  creamy: null,
  dry: null,
};

/** Map the 18-tag scan vocabulary onto canonical axes. */
export function tagsToCanonical(tags: FlavourTag[]): FlavorProfile[] {
  const out = new Set<FlavorProfile>();
  for (const tag of tags) {
    const axis = TAG_TO_AXIS[tag];
    if (axis) out.add(axis);
  }
  return Array.from(out);
}

/**
 * Map a bottle's raw `flavorProfile: string[]` (free-text words from
 * spiritsDatabase, e.g. ['Juniper', 'Citrus', 'Spice']) onto canonical axes.
 * Reuses useTasteModel's existing word list for the string → tag step so
 * there is still only one place that knows what "juniper" means.
 */
export function bottleFlavorsToCanonical(rawFlavors: string[]): FlavorProfile[] {
  return tagsToCanonical(normaliseFlavours(rawFlavors));
}

// ── 8-key onboarding vocabulary → 7-axis ─────────────────────────────────────
// `smooth` and `spirit_forward` describe strength/texture rather than a
// flavour direction, so they carry no axis — the onboarding questionnaire
// already captures that intent separately via ABV and complexity answers.

const ONBOARDING_KEY_TO_AXIS: Record<string, FlavorProfile | null> = {
  citrus: 'citrus',
  sweet: 'sweet',
  bitter: 'bitter',
  smoky: 'smoky',
  spicy: 'spiced',
  creamy: null,
  smooth: null,
  spirit_forward: null,
};

/** Map the 8-key onboarding vocabulary onto canonical axes. */
export function onboardingKeysToCanonical(keys: string[]): FlavorProfile[] {
  const out = new Set<FlavorProfile>();
  for (const key of keys) {
    const axis = ONBOARDING_KEY_TO_AXIS[String(key).toLowerCase()];
    if (axis) out.add(axis);
  }
  return Array.from(out);
}

// ── The one recipe flavour extractor ─────────────────────────────────────────

function emptyVector(): FlavorVector {
  return CANONICAL_FLAVORS.reduce((acc, flavor) => {
    acc[flavor] = 0;
    return acc;
  }, {} as FlavorVector);
}

/**
 * Canonical flavour vector for a recipe, 0–1 per axis.
 *
 * Precedence:
 *   1. `recipe.flavorVector` if already computed and stored.
 *   2. `recipe.flavorProfiles` — the recipe's own declared axes (authoritative).
 *   3. Ingredient keyword matching via computeFlavorVector — the fallback.
 *
 * Replaces three disagreeing implementations:
 *   - feedbackLearningService.extractCocktailMetadata, which substring-matched
 *     the cocktail's *name* (a "Last Word" taught it nothing; a "Smoky
 *     Margarita" taught it the wrong thing).
 *   - recipeActions.extractFlavors, which substring-matched the description.
 *   - direct computeFlavorVector calls, which ignored declared flavorProfiles.
 *
 * Accepts a loose shape because callers hold several different recipe/cocktail
 * representations (Recipe, DetailedCocktail, raw card data).
 */
export function extractRecipeFlavorVector(
  recipe: Partial<Recipe> & { flavorProfiles?: string[]; ingredients?: Ingredient[] },
): FlavorVector {
  if (recipe?.flavorVector) {
    return { ...emptyVector(), ...recipe.flavorVector };
  }

  const declared = Array.isArray(recipe?.flavorProfiles) ? recipe.flavorProfiles : [];
  if (declared.length > 0) {
    const vector = emptyVector();
    for (const raw of declared) {
      const axis = String(raw).toLowerCase() as FlavorProfile;
      if (CANONICAL_FLAVORS.includes(axis)) vector[axis] = 1;
    }
    // Only trust the declared list if at least one entry was a real axis;
    // otherwise fall through to ingredient matching.
    if (Object.values(vector).some((v) => v > 0)) return vector;
  }

  if (Array.isArray(recipe?.ingredients) && recipe.ingredients.length > 0) {
    return computeFlavorVector(recipe.ingredients);
  }

  return emptyVector();
}

/**
 * The dominant axes of a recipe, strongest first. Convenience wrapper for
 * callers that want labels rather than a vector (feedback learning, "because
 * you lean smoky" copy).
 */
export function dominantFlavors(
  recipe: Parameters<typeof extractRecipeFlavorVector>[0],
  limit = 3,
): FlavorProfile[] {
  const vector = extractRecipeFlavorVector(recipe);
  return (Object.entries(vector) as [FlavorProfile, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([flavor]) => flavor);
}
