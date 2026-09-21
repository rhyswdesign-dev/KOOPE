export type RatioFamily =
  'sour' | 'old_fashioned' | 'manhattan' | 'martini' | 'highball' | 'spritz' | 'other';

export type RatioIngredientRole =
  'spirit' | 'vermouth' | 'acid' | 'sweet' | 'mixer' | 'bitters' | 'modifier' | 'other';

export interface RatioIngredient {
  name: string;
  role: RatioIngredientRole;
  amount_oz: number;
  original_index: number;
}

export interface RatioProfile {
  version: 1;
  family: RatioFamily;
  base_unit: 'oz';
  servings: 1;
  ingredients: RatioIngredient[];
  coupling: {
    acidSweetLocked: boolean;
  };
}

export interface RatioEditorState {
  spirit: number;
  sweet: number;
  acid: number;
  dilution: number;
  lastEditedAt?: string;
}

export interface FormattedIngredient {
  name: string;
  amount: string;
  notes?: string;
}

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
];
const ACID_KEYWORDS = ['lime', 'lemon', 'grapefruit', 'citrus', 'yuzu', 'acid'];
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
];
const BITTERS_KEYWORDS = ['bitters', 'angostura', 'peychaud'];
const VERMOUTH_KEYWORDS = ['vermouth'];

const DEFAULT_EDITOR_STATE: RatioEditorState = {
  spirit: 50,
  sweet: 50,
  acid: 50,
  dilution: 50,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundOz = (value: number) => Math.round(value * 20) / 20;

const formatOz = (value: number) => {
  const rounded = roundOz(value);
  if (rounded % 1 === 0) return `${rounded.toFixed(0)} oz`;
  if ((rounded * 10) % 1 === 0) return `${rounded.toFixed(1)} oz`;
  return `${rounded.toFixed(2)} oz`;
};

const toLower = (value: string) => value.toLowerCase().trim();

export const parseAmountOz = (amount: string): number => {
  if (!amount) return 0;
  const normalized = amount.toLowerCase().trim();
  const numeric = Number.parseFloat(normalized.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  if (normalized.includes('ml')) return numeric / 29.5735;
  if (normalized.includes('cl')) return numeric / 2.95735;
  if (normalized.includes('dash')) return Math.max(0.02, numeric * 0.02);
  if (normalized.includes('drop')) return numeric * 0.003;
  if (normalized.includes('tsp')) return numeric * 0.169;
  if (normalized.includes('tbsp')) return numeric * 0.507;
  // Standard bar-measurement approximation: a sugar cube dissolves to roughly
  // 0.17 oz of simple-syrup-equivalent sweetness (not a precise citable
  // figure, just the conventional bar rule of thumb).
  if (normalized.includes('sugar cube')) return numeric * 0.17;
  // Standard bar convention: 1 barspoon ≈ 1/8 oz (0.125 oz).
  if (normalized.includes('barspoon')) return numeric * 0.125;
  return numeric;
};

export const inferRole = (name: string): RatioIngredientRole => {
  const lower = toLower(name);
  if (VERMOUTH_KEYWORDS.some((k) => lower.includes(k))) return 'vermouth';
  if (BITTERS_KEYWORDS.some((k) => lower.includes(k))) return 'bitters';
  if (SPIRIT_KEYWORDS.some((k) => lower.includes(k))) return 'spirit';
  if (ACID_KEYWORDS.some((k) => lower.includes(k))) return 'acid';
  if (SWEET_KEYWORDS.some((k) => lower.includes(k))) return 'sweet';
  if (MIXER_KEYWORDS.some((k) => lower.includes(k))) return 'mixer';
  return 'other';
};

const findFirstIndex = (ingredients: RatioIngredient[], role: RatioIngredientRole) =>
  ingredients.findIndex((item) => item.role === role);

const setAmountByRole = (
  ingredients: RatioIngredient[],
  role: RatioIngredientRole,
  amount: number,
) => {
  const idx = findFirstIndex(ingredients, role);
  if (idx >= 0) {
    ingredients[idx].amount_oz = amount;
  }
};

export const inferRatioFamily = (
  title: string,
  ingredients: FormattedIngredient[],
): RatioFamily => {
  const lowerTitle = toLower(title || '');
  const names = ingredients.map((item) => toLower(item.name)).join(' ');

  const hasVermouth = names.includes('vermouth');
  const hasWhiskey = ['whiskey', 'whisky', 'bourbon', 'rye', 'scotch'].some((k) =>
    names.includes(k),
  );
  const hasGinVodka = ['gin', 'vodka'].some((k) => names.includes(k));
  const hasAcid = ACID_KEYWORDS.some((k) => names.includes(k));
  const hasSweet = SWEET_KEYWORDS.some((k) => names.includes(k));
  const hasMixer = MIXER_KEYWORDS.some((k) => names.includes(k));
  const hasBitters = BITTERS_KEYWORDS.some((k) => names.includes(k));

  if (hasVermouth && hasWhiskey) return 'manhattan';
  if (hasVermouth && hasGinVodka) return 'martini';
  if (lowerTitle.includes('spritz') || names.includes('prosecco')) return 'spritz';
  if (hasAcid && hasSweet) return 'sour';
  if (hasWhiskey && hasBitters && !hasAcid) return 'old_fashioned';
  if (hasMixer) return 'highball';
  return 'other';
};

const hasMissingMeasurements = (ingredients: FormattedIngredient[]) =>
  ingredients.some((item) => {
    const parsed = parseAmountOz(item.amount || '');
    return parsed <= 0;
  });

const applyFamilyDefaults = (family: RatioFamily, ingredients: RatioIngredient[]) => {
  switch (family) {
    case 'sour':
      setAmountByRole(ingredients, 'spirit', 2);
      setAmountByRole(ingredients, 'acid', 0.5);
      setAmountByRole(ingredients, 'sweet', 0.5);
      if (findFirstIndex(ingredients, 'bitters') === -1) {
        ingredients.push({
          name: 'Aromatic Bitters',
          role: 'bitters',
          amount_oz: 0.05,
          original_index: ingredients.length,
        });
      }
      break;
    case 'old_fashioned':
      setAmountByRole(ingredients, 'spirit', 2);
      setAmountByRole(ingredients, 'sweet', 0.25);
      setAmountByRole(ingredients, 'bitters', 0.05);
      break;
    case 'manhattan':
      setAmountByRole(ingredients, 'spirit', 1.5);
      setAmountByRole(ingredients, 'vermouth', 1.0);
      setAmountByRole(ingredients, 'bitters', 0.05);
      break;
    case 'martini':
      setAmountByRole(ingredients, 'spirit', 2.0);
      setAmountByRole(ingredients, 'vermouth', 0.5);
      break;
    case 'highball':
      setAmountByRole(ingredients, 'spirit', 1.0);
      setAmountByRole(ingredients, 'mixer', 2.5);
      break;
    case 'spritz':
      setAmountByRole(ingredients, 'spirit', 3.0);
      setAmountByRole(ingredients, 'mixer', 2.0);
      break;
    case 'other':
    default:
      if (findFirstIndex(ingredients, 'spirit') >= 0) setAmountByRole(ingredients, 'spirit', 2.0);
      if (findFirstIndex(ingredients, 'acid') >= 0) setAmountByRole(ingredients, 'acid', 0.5);
      if (findFirstIndex(ingredients, 'sweet') >= 0) setAmountByRole(ingredients, 'sweet', 0.5);
      break;
  }
};

const enforceBittersCap = (ingredients: RatioIngredient[]) => {
  ingredients.forEach((ingredient) => {
    if (ingredient.role === 'bitters') {
      ingredient.amount_oz = clamp(ingredient.amount_oz, 0, 0.25);
    }
  });
};

export const createRatioProfile = (
  family: RatioFamily,
  ingredients: FormattedIngredient[],
): RatioProfile => {
  const profileIngredients: RatioIngredient[] = ingredients.map((ingredient, index) => ({
    name: ingredient.name || `Ingredient ${index + 1}`,
    role: inferRole(ingredient.name || ''),
    amount_oz: parseAmountOz(ingredient.amount || ''),
    original_index: index,
  }));

  applyFamilyDefaults(family, profileIngredients);
  enforceBittersCap(profileIngredients);

  const hasAcid = profileIngredients.some((item) => item.role === 'acid');
  const hasSweet = profileIngredients.some((item) => item.role === 'sweet');

  return {
    version: 1,
    family,
    base_unit: 'oz',
    servings: 1,
    ingredients: profileIngredients,
    coupling: {
      acidSweetLocked: hasAcid && hasSweet,
    },
  };
};

export const applyRatioProfileToIngredients = (
  originalIngredients: FormattedIngredient[],
  profile: RatioProfile,
): FormattedIngredient[] => {
  const mapped = profile.ingredients
    .slice()
    .sort((a, b) => a.original_index - b.original_index)
    .map((ingredient) => {
      const original = originalIngredients[ingredient.original_index];
      return {
        name: ingredient.name,
        amount: formatOz(ingredient.amount_oz),
        notes: original?.notes,
      };
    });
  return mapped;
};

const sliderToMultiplier = (value: number) => 0.5 + value / 100;

export const applyGuidedBalance = (
  profile: RatioProfile,
  editorState: RatioEditorState,
): RatioProfile => {
  const spiritMult = sliderToMultiplier(editorState.spirit);
  const dilutionMult = sliderToMultiplier(editorState.dilution);
  const acidMult = sliderToMultiplier(editorState.acid);
  const sweetMult = sliderToMultiplier(editorState.sweet);
  const acidSweetMult = profile.coupling.acidSweetLocked ? (acidMult + sweetMult) / 2 : 1;

  const nextIngredients = profile.ingredients.map((ingredient) => {
    let next = ingredient.amount_oz;
    if (ingredient.role === 'spirit' || ingredient.role === 'vermouth') next *= spiritMult;
    if (ingredient.role === 'mixer') next *= dilutionMult;
    if (ingredient.role === 'acid')
      next *= profile.coupling.acidSweetLocked ? acidSweetMult : acidMult;
    if (ingredient.role === 'sweet')
      next *= profile.coupling.acidSweetLocked ? acidSweetMult : sweetMult;
    if (ingredient.role === 'bitters') next = clamp(next, 0, 0.25);
    return {
      ...ingredient,
      amount_oz: roundOz(next),
    };
  });

  const nextProfile: RatioProfile = {
    ...profile,
    ingredients: nextIngredients,
  };
  enforceBittersCap(nextProfile.ingredients);
  return nextProfile;
};

export const maybeApplyEstimatedRatios = (recipe: {
  title: string;
  ingredients: FormattedIngredient[];
}): {
  ratioEstimated: boolean;
  ratioProfile: RatioProfile | null;
  nextIngredients: FormattedIngredient[];
  editorState: RatioEditorState;
} => {
  if (!recipe?.ingredients?.length || !hasMissingMeasurements(recipe.ingredients)) {
    return {
      ratioEstimated: false,
      ratioProfile: null,
      nextIngredients: recipe.ingredients || [],
      editorState: { ...DEFAULT_EDITOR_STATE },
    };
  }

  const family = inferRatioFamily(recipe.title, recipe.ingredients);
  const ratioProfile = createRatioProfile(family, recipe.ingredients);
  return {
    ratioEstimated: true,
    ratioProfile,
    nextIngredients: applyRatioProfileToIngredients(recipe.ingredients, ratioProfile),
    editorState: {
      ...DEFAULT_EDITOR_STATE,
      lastEditedAt: new Date().toISOString(),
    },
  };
};
