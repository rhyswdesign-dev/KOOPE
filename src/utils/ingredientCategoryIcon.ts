// Small keyword-based mapper from an ingredient name to a MaterialCommunityIcons
// glyph representing its category, used by the ingredient list's dot-leader
// row layout (see CocktailDetailScreen.tsx). No illustrated icon assets exist
// in this repo, so this intentionally stays a simple ordered keyword-regex
// list rather than a real category taxonomy — first match wins.
import { isLikelySpiritIngredient } from './cocktailDetailCopy';

type IngredientIconRule = {
  test: (value: string) => boolean;
  icon: string;
};

const CITRUS_PATTERN = /\b(lemon|lime|citrus|grapefruit|orange)\b/;
const EGG_PATTERN = /\begg/;
const DAIRY_PATTERN = /\b(cream|milk|dairy|half[\s-]and[\s-]half)\b/;
const BITTERS_PATTERN = /\bbitters?\b/;
const SYRUP_PATTERN = /\b(syrup|honey|sugar|agave|orgeat|grenadine|simple|pomegranate)\b/;
// Deliberately excludes plain "water" — a carbonated/flavored-mixer glyph next
// to "1 cup cold water" in a syrup recipe misrepresents the ingredient. Plain
// water gets its own rule (WATER_PATTERN) below, checked after this one so
// "soda water"/"tonic water" still correctly match here via soda/tonic first.
const MIXER_PATTERN = /\b(soda|tonic|cola|ginger beer|ginger ale|club soda|sparkling|seltzer)\b/;
const WATER_PATTERN = /\bwater\b/;
const NUT_PATTERN = /\b(almond|walnut|pecan|hazelnut|cashew|pistachio)s?\b/;
const GARNISH_PATTERN = /\b(garnish|mint|cherry|peel|twist|olive|zest|sprig|wedge|slice)\b/;

const INGREDIENT_ICON_RULES: IngredientIconRule[] = [
  { test: (v) => isLikelySpiritIngredient(v), icon: 'bottle-wine-outline' },
  { test: (v) => CITRUS_PATTERN.test(v), icon: 'fruit-citrus' },
  { test: (v) => EGG_PATTERN.test(v), icon: 'egg-outline' },
  { test: (v) => DAIRY_PATTERN.test(v), icon: 'cup-outline' },
  { test: (v) => BITTERS_PATTERN.test(v), icon: 'bottle-tonic-plus-outline' },
  { test: (v) => SYRUP_PATTERN.test(v), icon: 'bottle-tonic-outline' },
  { test: (v) => MIXER_PATTERN.test(v), icon: 'bottle-soda-classic-outline' },
  { test: (v) => NUT_PATTERN.test(v), icon: 'peanut-outline' },
  { test: (v) => WATER_PATTERN.test(v), icon: 'water-outline' },
  { test: (v) => GARNISH_PATTERN.test(v), icon: 'leaf' },
];

const DEFAULT_INGREDIENT_ICON = 'glass-cocktail';

/**
 * Returns a MaterialCommunityIcons glyph name representing the ingredient's
 * category, based on simple keyword matching against its name. Falls back to
 * a generic glass icon when nothing matches.
 */
export function getIngredientCategoryIcon(name: string): string {
  const value = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!value) return DEFAULT_INGREDIENT_ICON;

  for (const rule of INGREDIENT_ICON_RULES) {
    if (rule.test(value)) return rule.icon;
  }
  return DEFAULT_INGREDIENT_ICON;
}
