export interface FormattedIngredient {
  name: string;
  note?: string;
}

const INGREDIENT_AMOUNT_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+))\s*(oz|ml|dash(?:es)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?)?\s+(.+)$/i;
const AMOUNT_ONLY_NOTE_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+))\s*(oz|ml|dash(?:es)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?)?(?:\s+(.*))?$/i;

const TITLE_CASE_WHITELIST = new Set([
  'fresh',
  'lime',
  'lemon',
  'orange',
  'grapefruit',
  'pineapple',
  'cranberry',
  'apple',
  'cucumber',
  'mint',
  'sage',
  'lavender',
  'ginger',
  'honey',
  'simple',
  'rich',
  'demerara',
  'dry',
  'sweet',
  'blanc',
  'blanco',
  'white',
  'dark',
  'gold',
  'golden',
  'aged',
  'london',
  'old',
  'tom',
  'club',
  'soda',
  'tonic',
  'water',
  'juice',
  'syrup',
  'vermouth',
  'bitters',
  'rum',
  'gin',
  'vodka',
  'tequila',
  'mezcal',
  'whiskey',
  'whisky',
  'bourbon',
  'rye',
  'cognac',
  'brandy',
  'campari',
  'aperol',
  'prosecco',
  'curaçao',
  'cointreau',
  'lillet',
  'falernum',
  'orgeat',
  'chartreuse',
  'curaçao',
  'creme',
  'crème',
  'violette',
  'agave',
  'nectar',
  'wheel',
  'wedge',
  'twist',
  'peel',
  'sprig',
  'slice',
  'coin',
  'rind',
  'garnish',
]);

const INGREDIENT_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bcreme de cacao\b/gi, 'Crème de cacao'],
  [/\bcreme de menthe\b/gi, 'Crème de menthe'],
  [/\bcreme de violette\b/gi, 'Crème de violette'],
  [/\bcafe\b/gi, 'Cafe'],
];

function titleCaseToken(token: string): string {
  if (!token) return token;
  if (/^\d/.test(token)) return token;
  if (token === token.toUpperCase() && token.length > 1) return token;
  if (/^[a-z]+(?:['’-][a-z]+)?$/i.test(token)) {
    const lower = token.toLowerCase();
    if (TITLE_CASE_WHITELIST.has(lower)) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
  }
  return token;
}

function normalizeIngredientName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;

  const titleCased = trimmed
    .split(' ')
    .map((part) => {
      if (part.includes('-')) {
        return part
          .split('-')
          .map((subPart) => titleCaseToken(subPart))
          .join('-');
      }
      return titleCaseToken(part);
    })
    .join(' ');

  return INGREDIENT_PHRASE_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    titleCased
  );
}

function normalizeIngredientNote(rawNote: string | undefined): string | undefined {
  if (!rawNote) return rawNote;
  const normalized = rawNote
    .replace(/^for garnish\b/i, 'For garnish')
    .replace(/^optional\b/i, 'Optional')
    .replace(/^freshly squeezed\b/i, 'Freshly squeezed')
    .replace(/^quality matters\b/i, 'Quality matters')
    .replace(/^fresh only\b/i, 'Fresh only')
    .replace(/^to sweeten\b/i, 'To sweeten')
    .replace(/^for glass\b/i, 'For glass')
    .trim();

  if (!normalized) return undefined;
  if (/^\(.*\)$/.test(normalized)) return normalized;
  return normalized;
}

function parseFractionToken(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [whole, fraction] = trimmed.split(/\s+/);
    const [numerator, denominator] = fraction.split('/').map(Number);
    if (!denominator) return null;
    return Number(whole) + numerator / denominator;
  }

  if (/^\d+\/\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split('/').map(Number);
    if (!denominator) return null;
    return numerator / denominator;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAsBartenderFraction(value: number): string {
  const whole = Math.floor(value);
  const fraction = value - whole;
  const roundedQuarter = Math.round(fraction * 4) / 4;
  const displayFraction = roundedQuarter === 1 ? 0 : roundedQuarter;
  const adjustedWhole = roundedQuarter === 1 ? whole + 1 : whole;

  const fractionLabel =
    displayFraction === 0.25 ? '1/4' :
    displayFraction === 0.5 ? '1/2' :
    displayFraction === 0.75 ? '3/4' :
    '';

  if (!fractionLabel) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  if (adjustedWhole === 0) return fractionLabel;
  return `${adjustedWhole} ${fractionLabel}`;
}

function normalizeUnit(unit: string | undefined, numericValue: number): string {
  const normalized = (unit || 'oz').toLowerCase();
  if (normalized === 'dash' || normalized === 'dashes') {
    return Math.abs(numericValue - 1) < 0.001 ? 'dash' : 'dashes';
  }
  if (normalized === 'cup' || normalized === 'cups') {
    return Math.abs(numericValue - 1) < 0.001 ? 'cup' : 'cups';
  }
  if (normalized === 'part' || normalized === 'parts') {
    return Math.abs(numericValue - 1) < 0.001 ? 'part' : 'parts';
  }
  return normalized;
}

export function formatIngredientAmount(rawAmount: string, rawUnit?: string): string {
  const combined = `${rawAmount || ''} ${rawUnit || ''}`.trim();
  if (!combined) return '';

  const match = combined.match(/^((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+))\s*(oz|ml|dash(?:es)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?)?$/i);
  if (!match) return combined.replace(/\s+/g, ' ').trim();

  const numericValue = parseFractionToken(match[1]);
  if (numericValue == null) return combined.replace(/\s+/g, ' ').trim();

  return `${formatAsBartenderFraction(numericValue)} ${normalizeUnit(match[2], numericValue)}`.trim();
}

export function formatIngredientDisplay(item: any): FormattedIngredient {
  if (typeof item === 'string') {
    const cleaned = item.trim().replace(/\s+/g, ' ');
    const match = cleaned.match(INGREDIENT_AMOUNT_REGEX);
    if (!match) {
      return { name: cleaned, note: undefined };
    }

    const amount = formatIngredientAmount(match[1], match[2]);
    return {
      name: `${amount} ${normalizeIngredientName(match[3].trim())}`.trim(),
      note: undefined,
    };
  }

  const amountRaw = String(item?.amount || item?.qty || item?.quantity || '').trim();
  const unitRaw = String(item?.unit || '').trim();
  const itemName = String(item?.name || item?.item || '').trim();
  const note = item?.note || item?.notes || undefined;

  if (!amountRaw && itemName) {
    const formattedName = formatIngredientDisplay(itemName).name;

    if (typeof note === 'string') {
      const noteMatch = note.trim().match(AMOUNT_ONLY_NOTE_REGEX);
      if (noteMatch && !INGREDIENT_AMOUNT_REGEX.test(itemName)) {
        const amountFromNote = formatIngredientAmount(noteMatch[1], noteMatch[2]);
        const noteRemainder = String(noteMatch[3] || '').trim();
        return {
          name: `${amountFromNote} ${normalizeIngredientName(itemName)}`.trim(),
          note: normalizeIngredientNote(noteRemainder || undefined),
        };
      }
    }

    return {
      name: normalizeIngredientName(formattedName),
      note: normalizeIngredientNote(note),
    };
  }

  const amount = formatIngredientAmount(amountRaw, unitRaw);
  return {
    name: amount ? `${amount} ${normalizeIngredientName(itemName)}`.trim() : normalizeIngredientName(itemName),
    note: normalizeIngredientNote(note),
  };
}

export function ingredientListToSearchText(ingredients: any[] | undefined): string {
  if (!Array.isArray(ingredients)) return '';
  return ingredients
    .map((ingredient) => formatIngredientDisplay(ingredient).name.toLowerCase())
    .join(' ');
}
