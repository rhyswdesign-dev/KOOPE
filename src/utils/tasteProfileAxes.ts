// Derives the five "Taste Profile" slider values (Spirit Forward, Sweetness,
// Acidity, Bitterness, Finish) shown on CocktailDetailScreen from a recipe's
// ingredient list. This is a heuristic ESTIMATE from ingredient composition —
// it is not a tasted or verified score.
//
// The amount parsing (parseAmountOz) is shared with the ratio editor in
// ratioEngine.ts — there is exactly one place in the codebase that turns an
// amount string like "3/4 oz" into a number. Role CLASSIFICATION, however,
// is intentionally NOT shared with ratioEngine's inferRole(): that function
// is also used by the live ratio-editor/party-scaling feature, and its
// keyword lists are missing whole categories of ingredient (Campari, Aperol,
// Cynar, Fernet-Branca, Chartreuse, Amaro Nonino, triple sec, Cointreau,
// Grand Marnier, maraschino liqueur, vermouth) that today fall through to
// 'other' and become invisible to every gauge except as dilution. See
// docs/taste-profile-research-2026-07.md for the full research behind this.
//
// Each ingredient's ounces are also weighted by a flavor-intensity
// multiplier (see tasteIngredientIntensity.ts) before being summed into an
// axis — so a small pour of an intense ingredient (Campari, Fernet, peated
// Scotch) can move a gauge far more than its raw ounce share would suggest,
// matching how these drinks actually taste.
import { parseAmountOz } from './ratioEngine';
import { getIntensityMultiplier } from './tasteIngredientIntensity';

export interface TasteProfileAxes {
  spiritForward: number; // 0-1
  sweetness: number; // 0-1
  acidity: number; // 0-1
  bitterness: number; // 0-1
  finish: number; // 0-1
}

interface AxisIngredient {
  name: string;
  amount: string;
}

/**
 * Taste-profile-specific ingredient role. Distinct from ratioEngine's
 * RatioIngredientRole — broader keyword coverage, and a dedicated
 * 'bitterLiqueur' bucket for bitter liqueurs/amari poured in real ounces
 * (Campari, Fernet, Cynar, Chartreuse, amari). That is a different thing,
 * measured a different way, from 'aromaticBitters' (dash-based Angostura/
 * Peychaud's/orange bitters) — the two are never merged.
 */
type TasteIngredientRole =
  'spirit' | 'sweet' | 'acid' | 'bitterLiqueur' | 'aromaticBitters' | 'mixer' | 'other';

const SPIRIT_KEYWORDS = [
  'vodka',
  'gin',
  'rum',
  'tequila',
  'whiskey',
  'whisky',
  'bourbon',
  'rye',
  'scotch',
  'brandy',
  'cognac',
  'mezcal',
  'cachaça',
  'cachaca',
  'pisco',
];
const ACID_KEYWORDS = ['lime', 'lemon', 'grapefruit', 'citrus', 'yuzu', 'acid'];
// Expanded sweet bucket: syrups/sweeteners plus orange liqueurs and
// maraschino, per the research doc's Deliverable 1 sweetness table.
const SWEET_KEYWORDS = [
  'syrup',
  'honey',
  'agave',
  'grenadine',
  'orgeat',
  'demerara',
  'simple',
  'maple',
  'sugar',
  'triple sec',
  'cointreau',
  'curaçao',
  'curacao',
  'grand marnier',
  'maraschino',
  'orange liqueur',
];
const MIXER_KEYWORDS = [
  'soda',
  'tonic',
  'cola',
  'ginger beer',
  'ginger ale',
  'prosecco',
  'champagne',
  'sparkling',
  'juice',
  'water',
  'topo chico',
  'seltzer',
];
// New bitter-liqueur bucket (bitter liqueurs/amari poured in real ounces).
const BITTER_LIQUEUR_KEYWORDS = [
  'campari',
  'aperol',
  'cynar',
  'fernet',
  'chartreuse',
  'amaro',
  'amer picon',
  'picon',
  'nonino',
];
// Aromatic dash-based bitters (unchanged from today's behavior — tiny-volume,
// feeds the Finish-axis heuristic bump, never the new Bitterness axis).
const AROMATIC_BITTERS_KEYWORDS = ['bitters', 'angostura', 'peychaud'];

const toLower = (value: string) => value.toLowerCase().trim();

/**
 * Classifies an ingredient name into a taste-profile-specific role. Yellow
 * Chartreuse is routed to 'sweet' (honeyed/milder per the research doc)
 * rather than the bitter-liqueur bucket that plain/green Chartreuse hits.
 */
function classifyTasteRole(name: string): TasteIngredientRole {
  const lower = toLower(name);
  if (!lower) return 'other';

  if (lower.includes('chartreuse') && lower.includes('yellow')) return 'sweet';
  if (BITTER_LIQUEUR_KEYWORDS.some((k) => lower.includes(k))) return 'bitterLiqueur';
  if (lower.includes('vermouth')) return lower.includes('dry') ? 'acid' : 'sweet';
  if (AROMATIC_BITTERS_KEYWORDS.some((k) => lower.includes(k))) return 'aromaticBitters';
  if (SPIRIT_KEYWORDS.some((k) => lower.includes(k))) return 'spirit';
  if (ACID_KEYWORDS.some((k) => lower.includes(k))) return 'acid';
  if (SWEET_KEYWORDS.some((k) => lower.includes(k))) return 'sweet';
  if (MIXER_KEYWORDS.some((k) => lower.includes(k))) return 'mixer';
  return 'other';
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Computes the five Taste Profile axis values (each clamped to 0-1) from a
 * recipe's parsed ingredients. Returns null when there isn't enough data to
 * produce a meaningful estimate (no ingredients, or none carry a parseable
 * amount), so the caller can omit the Taste Profile card entirely rather
 * than render misleading all-zero bars.
 */
export function computeTasteProfileAxes(ingredients: AxisIngredient[]): TasteProfileAxes | null {
  if (!ingredients || ingredients.length === 0) return null;

  let totalOz = 0;
  let spiritOz = 0; // intensity-weighted
  let sweetOz = 0; // intensity-weighted
  let acidOz = 0; // intensity-weighted
  let bitterOz = 0; // intensity-weighted (bitter-liqueur bucket only)
  let mixerOz = 0; // unweighted, used only for Finish's dilution heuristic
  let bittersOz = 0; // unweighted, aromatic dash-bitters bucket only

  ingredients.forEach((ingredient) => {
    const oz = parseAmountOz(ingredient.amount || '');
    if (oz <= 0) return;
    const role = classifyTasteRole(ingredient.name || '');

    // Denominator stays raw, unweighted volume — the multiplier only
    // inflates axis numerators, never the total-ounce base.
    totalOz += oz;

    if (role === 'spirit')
      spiritOz += oz * getIntensityMultiplier(ingredient.name, 'spiritForward');
    if (role === 'sweet') sweetOz += oz * getIntensityMultiplier(ingredient.name, 'sweetness');
    if (role === 'acid') acidOz += oz * getIntensityMultiplier(ingredient.name, 'acidity');
    if (role === 'bitterLiqueur')
      bitterOz += oz * getIntensityMultiplier(ingredient.name, 'bitterness');
    if (role === 'mixer') mixerOz += oz;
    if (role === 'aromaticBitters') bittersOz += oz;
  });

  if (totalOz <= 0) return null;

  const spiritForward = clamp01(spiritOz / totalOz);
  const sweetness = clamp01(sweetOz / totalOz);
  const acidity = clamp01(acidOz / totalOz);
  const bitterness = clamp01(bitterOz / totalOz);

  // Finish has no direct ingredient role, so it's approximated rather than
  // measured: a drink that's mostly spirit with little mixer/dilution and a
  // touch of (aromatic, dash-based) bitters tends to finish longer and
  // drier (think Old Fashioned), while a highball diluted with soda/juice
  // finishes short and light. We start from the spirit ratio, add a small
  // bump for aromatic-bitters presence (structure/dryness on the back end —
  // reading from the dash-bitters bucket, not the new bitter-liqueur
  // bucket), and subtract for mixer share (dilution shortens the finish).
  const mixerRatio = clamp01(mixerOz / totalOz);
  const bittersBump = bittersOz > 0 ? 0.12 : 0;
  const finish = clamp01(spiritForward + bittersBump - mixerRatio * 0.6);

  return { spiritForward, sweetness, acidity, bitterness, finish };
}
