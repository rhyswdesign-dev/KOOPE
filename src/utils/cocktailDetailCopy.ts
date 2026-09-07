/**
 * Pure text-processing helpers for CocktailDetailScreen — recipe copy
 * generation (tasting notes, "best for" blurbs, tip enhancement, ingredient
 * label parsing). No React, no hooks; extracted verbatim from
 * CocktailDetailScreen.tsx (Phase 5, god-file breakup) so the screen file
 * only has to hold rendering/state concerns.
 */
import { formatIngredientAmount, formatIngredientDisplay } from './ingredientFormatting';

export const DETAIL_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=80';
const DETAIL_AMOUNT_PREFIX_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+)\s*(?:oz|ml|dash(?:es)?|drop(?:s)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?)?)\s+(.+)$/i;
const DETAIL_AMOUNT_ONLY_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+)\s*(?:oz|ml|dash(?:es)?|drop(?:s)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?|top)?)\s*$/i;
const DETAIL_HAS_UNIT_REGEX =
  /(?:oz|ml|dash(?:es)?|drop(?:s)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?|top)\b/i;

export function trimSentence(value: string, maxLength: number): string {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).match(/^(.*?[.!?])\s/);
  if (sentenceBreak?.[1]) return sentenceBreak[1];

  const truncated = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}...`;
}

export function slugifyRecipeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitIngredientAmount(displayName: string): { amount: string; name: string } | null {
  const match = String(displayName || '')
    .trim()
    .match(DETAIL_AMOUNT_PREFIX_REGEX);
  if (!match) return null;

  const rawAmount = String(match[1] || '').trim();
  return {
    amount: DETAIL_HAS_UNIT_REGEX.test(rawAmount) ? formatIngredientAmount(rawAmount) : rawAmount,
    name: match[2].trim(),
  };
}

function splitAmountOnlyNote(note: string): { amount: string; note?: string } | null {
  const trimmed = String(note || '').trim();
  if (!trimmed) return null;

  const amountOnly = trimmed.match(DETAIL_AMOUNT_ONLY_REGEX);
  if (amountOnly) {
    const rawAmount = String(amountOnly[1] || '').trim();
    return {
      amount: DETAIL_HAS_UNIT_REGEX.test(rawAmount) ? formatIngredientAmount(rawAmount) : rawAmount,
    };
  }

  const prefixed = trimmed.match(DETAIL_AMOUNT_PREFIX_REGEX);
  if (!prefixed) return null;

  return {
    amount: DETAIL_HAS_UNIT_REGEX.test(String(prefixed[1] || '').trim())
      ? formatIngredientAmount(prefixed[1])
      : String(prefixed[1] || '').trim(),
    note: prefixed[2].trim() || undefined,
  };
}

export function normalizeDetailIngredient(item: any) {
  const formatted = formatIngredientDisplay(item);
  const splitName = splitIngredientAmount(formatted.name);
  const splitNote = !splitName ? splitAmountOnlyNote(String(formatted.note || '')) : null;

  return {
    name: splitName?.name || formatted.name || '',
    amount: splitName?.amount || splitNote?.amount || '',
    note: splitName ? formatted.note : splitNote?.note || formatted.note || '',
    matchName: splitName?.name || formatted.name || '',
  };
}

export function isWeakTastingNote(value: string): boolean {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) return true;

  if (/\d/.test(normalized)) return true; // likely a spec or numbered instruction
  if (normalized.includes('•')) return true; // usually category/base labels, not tasting copy
  if (/\b[a-z-]+\s+based\b/.test(normalized)) return true; // e.g. "mixed-based"

  const methodyWords = [
    'recipe',
    'spec',
    'build',
    'built',
    'shaken',
    'shake',
    'stirred',
    'stir',
    'strain',
    'double strain',
    'garnish',
    'serve',
    'pour',
    'finish',
  ];

  if (methodyWords.some((needle) => normalized.includes(needle))) return true;

  return [
    'a classic cocktail recipe.',
    'a classic cocktail recipe',
    'custom cocktail recipe',
    'custom recipe',
    'ai generated',
    'classic',
    'modern',
  ].includes(normalized);
}

function titleCaseLabel(value: string): string {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function buildHeroKicker(cocktail: any): string {
  if (!cocktail) return 'Curated Pour';
  if (cocktail.isNonAlcoholic) return 'Mocktails';
  if (cocktail.category) return String(cocktail.category);

  const era = String(cocktail.era || '').trim();
  const base = String(cocktail.base || cocktail.baseSpirit || '').trim();
  if (era && base) {
    return `${titleCaseLabel(era)} • ${titleCaseLabel(base)}-based`;
  }

  const subtitle = String(cocktail.subtitle || '').trim();
  if (subtitle && !isWeakTastingNote(subtitle)) return subtitle;

  return 'Curated Pour';
}

export function ensureSentenceEnding(value: string): string {
  const trimmed = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function sentenceCase(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeMethodStep(step: string): string {
  const cleaned = sentenceCase(
    String(step || '')
      .replace(/^\d+[\.\)]\s*/, '')
      .trim(),
  );
  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();
  if (lower === 'shake vigorously') {
    return 'Shake vigorously with ice until the drink is thoroughly chilled.';
  }
  if (lower === 'stir gently') {
    return 'Stir gently just to combine and keep the texture clean.';
  }
  if (lower === 'top with club soda') {
    return 'Top with club soda and stir lightly to preserve the lift.';
  }
  if (lower === 'top with prosecco') {
    return 'Top with prosecco and keep the stir light so the bubbles stay lively.';
  }
  if (lower === 'top with soda water') {
    return 'Top with soda water and give it a short, gentle stir.';
  }

  if (/^strain into .*glass$/i.test(cleaned) && !/chilled/i.test(cleaned)) {
    return ensureSentenceEnding(cleaned.replace(/glass$/i, 'glass for a cleaner serve'));
  }

  if (/^garnish with /i.test(cleaned) && !/before serving/i.test(cleaned)) {
    return ensureSentenceEnding(`${cleaned} before serving`);
  }

  return ensureSentenceEnding(cleaned);
}

function hasAnyText(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

export function deriveTastingNote(
  cocktail: any,
  parsedIngredients: any[],
  parsedInstructions: string[],
  parsedTips: string[],
): string {
  const cocktailId = String(cocktail?.id || '').toLowerCase();
  if (cocktailId === 'caipirinha') {
    return 'Muddled lime oils hit first, cane sweetness rounds the center, and cachaça leaves a grassy, dry finish.';
  }

  const infoText = [
    cocktail?.title,
    cocktail?.subtitle,
    cocktail?.description,
    ...(parsedIngredients || []).map(
      (ingredient: any) => `${ingredient.name} ${ingredient.amount} ${ingredient.note}`,
    ),
    ...(parsedInstructions || []),
    ...(parsedTips || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isAperitif = hasAnyText(infoText, ['campari', 'aperol', 'vermouth', 'aperitif']);
  const isMintCitrus = hasAnyText(infoText, ['mint', 'lime', 'mojito']);
  const isCoffeeDessert = hasAnyText(infoText, [
    'coffee',
    'espresso',
    'cacao',
    'chocolate',
    'dairy cream',
    'heavy cream',
    'half-and-half',
  ]);
  const isTropical = hasAnyText(infoText, [
    'pineapple',
    'coconut',
    'tropical',
    'orgeat',
    'passion fruit',
    'falernum',
  ]);
  const isGinBotanical = hasAnyText(infoText, ['gin', 'juniper']);
  const isDarkSpirit = hasAnyText(infoText, ['whiskey', 'bourbon', 'rye', 'cognac', 'brandy']);
  const isSparkling = hasAnyText(infoText, ['sparkling', 'soda', 'prosecco', 'tonic']);

  if (isAperitif) {
    return 'Bitter citrus leads up front, a softer sweet middle follows, and the finish stays brisk and appetite-sharpening.';
  }
  if (isMintCitrus) {
    return 'Bright lime lands first, fresh mint keeps the middle cool, and the finish stays crisp, lifted, and clean.';
  }
  if (isTropical) {
    return 'Tropical fruit arrives first, sweetness stays rounded through the middle, and the finish remains bright rather than heavy.';
  }
  if (isCoffeeDessert) {
    return 'Silky and dessert-leaning up front, with a rounded middle and a soft, lingering finish.';
  }
  if (isGinBotanical) {
    return 'Botanical lift opens the drink, citrus keeps the middle focused, and the finish lands crisp and structured.';
  }
  if (isDarkSpirit) {
    return 'Warm spirit character leads, the middle stays rounded and composed, and the finish lands dry and polished.';
  }
  if (isSparkling) {
    return 'Light aromatics show first, a clean middle keeps the drink easygoing, and the finish stays lifted and refreshing.';
  }

  return `${cocktail?.title || 'This drink'} lands balanced, polished, and easy to come back to.`;
}

function pickVariantById(cocktailId: string, variants: string[]): string {
  if (!variants.length) return '';
  const seed = cocktailId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return variants[seed % variants.length];
}

export function deriveBestFor(
  cocktail: any,
  parsedIngredients: any[],
  parsedInstructions: string[] = [],
  parsedTips: string[] = [],
): string {
  const cocktailId = String(cocktail?.id || '').toLowerCase();
  if (cocktailId === 'caipirinha') {
    return 'Best for drinkers who like bold lime, rustic cane character, and less polished sweetness.';
  }

  const infoText = [
    cocktail?.title,
    cocktail?.subtitle,
    cocktail?.description,
    cocktail?.category,
    cocktail?.method,
    cocktail?.glassware,
    cocktail?.glass,
    ...(parsedIngredients || []).map(
      (ingredient: any) => `${ingredient.name} ${ingredient.amount} ${ingredient.note}`,
    ),
    ...(parsedInstructions || []),
    ...(parsedTips || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isNonAlcoholic =
    cocktail?.isNonAlcoholic || hasAnyText(infoText, ['zero-proof', 'non-alcoholic', 'mocktail']);
  const isAperitif = hasAnyText(infoText, [
    'negroni',
    'campari',
    'amaro',
    'aperitif',
    'bitter',
    'spritz',
  ]);
  const isSpiritForward = hasAnyText(infoText, [
    'martini',
    'manhattan',
    'old fashioned',
    'stirred',
  ]);
  const isCitrusLed = hasAnyText(infoText, ['sour', 'lemon', 'lime', 'citrus', 'grapefruit']);
  const isTropical = hasAnyText(infoText, ['tiki', 'pineapple', 'coconut', 'tropical', 'orgeat']);
  const isDessert = hasAnyText(infoText, [
    'espresso',
    'coffee',
    'dessert',
    'cacao',
    'chocolate',
    'dairy cream',
    'heavy cream',
    'half-and-half',
    'ice cream',
  ]);
  const isHighball = hasAnyText(infoText, [
    'highball',
    'collins',
    'soda',
    'tonic',
    'ginger beer',
    'sparkling',
  ]);

  const spirit = String(cocktail?.base || cocktail?.baseSpirit || '').toLowerCase();
  const spiritLabel =
    spirit === 'whiskey' || spirit === 'bourbon' || spirit === 'rye'
      ? 'whiskey'
      : spirit === 'tequila' || spirit === 'mezcal'
        ? 'agave'
        : spirit === 'rum' || spirit === 'cachaca' || spirit === 'cachaça'
          ? 'rum'
          : spirit === 'gin'
            ? 'gin'
            : spirit || 'balanced';

  if (isNonAlcoholic) {
    return pickVariantById(cocktailId, [
      'Best for guests who want a grown-up zero-proof drink with real structure, not just sweetness.',
      'Best for low/no-alcohol nights when you still want layered flavor and a proper cocktail feel.',
      'Best for guests who want alcohol-free options that still drink crisp, balanced, and intentional.',
    ]);
  }
  if (isAperitif && isHighball) {
    return pickVariantById(cocktailId, [
      'Best for pre-dinner sipping when you want bitterness, bubbles, and a lighter overall weight.',
      'Best for early-evening service when you want an aperitif profile without heavy sweetness.',
      'Best for guests who like bitter-citrus structure in a long, sparkling format.',
    ]);
  }
  if (isAperitif) {
    return pickVariantById(cocktailId, [
      'Best for drinkers who like bittersweet, appetite-sharpening cocktails with a drier finish.',
      'Best for guests who prefer firm bitter structure over sweeter fruit-forward profiles.',
      'Best for aperitif drinkers who want layered botanical depth and a clean finish.',
    ]);
  }
  if (isSpiritForward) {
    return pickVariantById(cocktailId, [
      `Best for ${spiritLabel}-forward drinkers who prefer clean structure and restrained sweetness.`,
      'Best for slow sipping when you want clarity, depth, and a polished spirit-led profile.',
      'Best for guests who prefer stirred-style structure with a drier, more composed finish.',
    ]);
  }
  if (isDessert) {
    return pickVariantById(cocktailId, [
      'Best for after-dinner drinkers who want richer flavor, softer texture, and a round finish.',
      'Best for dessert-cocktail fans who like plush texture without losing structure.',
      'Best for guests who want coffee/cream-leaning depth in a polished late-night serve.',
    ]);
  }
  if (isTropical) {
    return pickVariantById(cocktailId, [
      'Best for drinkers who want tropical intensity with balanced sweetness and bright acidity.',
      'Best for guests who like vacation-style flavor but still want a structured finish.',
      'Best for fruit-forward palates that prefer layered rum/tiki character over simple sweetness.',
    ]);
  }
  if (isCitrusLed && isHighball) {
    return pickVariantById(cocktailId, [
      'Best for drinkers who want crisp citrus refreshment in a lighter, longer format.',
      'Best for warm-weather service when you want acidity, lift, and easy sipping.',
      'Best for guests who like bright citrus profiles with sparkling or soda-driven length.',
    ]);
  }
  if (isCitrusLed) {
    return pickVariantById(cocktailId, [
      'Best for drinkers who like bright acidity and a crisp, refreshing profile.',
      'Best for guests who prefer citrus-led balance with a clean, snappy finish.',
      'Best for palates that want freshness and tension over round sweetness.',
    ]);
  }
  if (isHighball) {
    return pickVariantById(cocktailId, [
      'Best for easy social sipping when you want lower perceived intensity and high refreshment.',
      'Best for longer service windows where crisp temperature and carbonation matter.',
      'Best for guests who want a lighter, session-friendly cocktail with clear flavor definition.',
    ]);
  }

  return `Best for drinkers exploring ${spiritLabel} cocktails with clear flavor definition.`;
}

export function isLikelySpiritIngredient(name: string): boolean {
  const value = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!value) return false;
  return [
    /\bvodka\b/,
    /\bgin\b/,
    /\brum\b/,
    /\bcachaca\b/,
    /\btequila\b/,
    /\bmezcal\b/,
    /\bwhiskey\b/,
    /\bwhisky\b/,
    /\bbourbon\b/,
    /\brye\b/,
    /\bscotch\b/,
    /\bbrandy\b/,
    /\bcognac\b/,
    /\barmagnac\b/,
    /\bpisco\b/,
  ].some((pattern) => pattern.test(value));
}

export const TASTING_NOTE_OVERRIDES: Record<string, string> = {
  'moscow-mule':
    'Crackling ginger and lime open bright, vodka keeps the core clean and neutral, and the finish stays icy, dry, and snappy.',
  'dark-stormy':
    'Fresh lime and fiery ginger hit first, dark rum brings caramel-molasses depth through the middle, and the finish stays dry, peppery, and brisk.',
  'kentucky-mule':
    'Ginger bite hits first, bourbon vanilla and oak round the middle, and the finish lands crisp with warm spice.',
  'gin-rickey':
    'Juniper and sharp lime lead immediately, soda keeps the body feather-light, and the finish lands bone-dry and brisk.',
  'john-collins':
    'Lemon opens tart, bourbon adds soft caramel through the middle, and soda lifts the finish so it stays bright and easy.',
  'vodka-soda':
    'Neutral spirit stays in the background while soda and citrus keep the sip clean, cold, and sharply refreshing.',
  'ranch-water':
    'Bright lime snaps first, tequila minerality runs through the middle, and the finish stays extra-crisp from Topo Chico.',
  highball:
    'Whisky grain and gentle oak open softly, fine bubbles lighten the center, and the finish stays precise, dry, and long.',
  'aperol-spritz':
    'Bright orange peel and gentle bitterness open first, prosecco keeps the middle light, and the finish stays breezy and softly dry.',
  'negroni-sbagliato':
    'Campari bitterness leads, vermouth richness rounds the center, and prosecco lightens the finish without softening the structure.',
  'spritz-veneziano':
    'Zesty orange and herbal bitterness arrive early, the middle stays crisp and fizzy, and the finish lands drier and more savory.',
  'black-russian':
    'Coffee liqueur sweetness opens first, vodka keeps the center leaner than expected, and the finish stays dark, clean, and lightly bitter.',
  'brandy-alexander':
    'Cocoa and nutmeg aromatics arrive first, cognac warmth fills the middle, and the cream finish lands silky and mellow.',
  grasshopper:
    'Cool mint-chocolate sweetness hits immediately, cream softens the middle, and the finish stays frosty, sweet, and nostalgic.',
  mudslide:
    'Coffee and chocolate sweetness open first, Irish cream thickens the middle, and the finish lands rich, creamy, and decadent.',
  'golden-cadillac':
    'Vanilla-anise notes from Galliano open first, cocoa rounds the center, and the finish stays creamy with soft spice.',
  'pink-squirrel':
    'Nutty almond-cherry sweetness opens quickly, cocoa cream fills the middle, and the finish stays candy-like and plush.',
  revolver:
    'Orange bitters and coffee aromas lead, bourbon spice drives the middle, and the finish lands dry, roasty, and assertive.',
  'porto-flip':
    'Port fruit richness opens first, egg yolk gives the center a custard-like body, and the finish stays velvety with warm spice.',
  'brandy-milk-punch':
    'Vanilla and nutmeg open softly, milk smooths the middle, and brandy warmth lingers in a gentle, comforting finish.',
  stinger:
    'Mint coolness lands first, cognac richness follows in the middle, and the finish is brisk, clean, and warming at once.',
  alexander:
    'Cocoa cream arrives first, gin botanicals quietly dry the middle, and the finish lands lighter and crisper than Brandy Alexander.',
};

export function enhanceTips(
  cocktail: any,
  parsedIngredients: any[],
  parsedInstructions: string[],
  parsedTips: string[],
): string[] {
  const existing = (parsedTips || [])
    .map((tip) => ensureSentenceEnding(sentenceCase(String(tip || ''))))
    .filter(Boolean);

  const infoText = [
    cocktail?.title,
    cocktail?.subtitle,
    ...(parsedIngredients || []).map(
      (ingredient: any) => `${ingredient.name} ${ingredient.amount} ${ingredient.note}`,
    ),
    ...(parsedInstructions || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const suggestions: string[] = [];

  if (hasAnyText(infoText, ['shake'])) {
    suggestions.push(
      'Shake until the tin feels cold and tight so the drink lands properly chilled and diluted.',
    );
  }
  if (hasAnyText(infoText, ['stir'])) {
    suggestions.push(
      'Stir only until chilled and integrated so the texture stays clean instead of overworked.',
    );
  }
  if (hasAnyText(infoText, ['club soda', 'soda water', 'prosecco', 'tonic', 'sparkling'])) {
    suggestions.push(
      'Add sparkling ingredients last and stir lightly so you keep the lift in the glass.',
    );
  }
  if (hasAnyText(infoText, ['lime', 'lemon', 'grapefruit', 'orange juice', 'fresh citrus'])) {
    suggestions.push(
      'Fresh citrus will make the drink brighter and more precise than bottled juice.',
    );
  }
  if (hasAnyText(infoText, ['mint'])) {
    suggestions.push(
      'Handle mint gently so it stays aromatic and fresh instead of turning bitter.',
    );
  }
  if (hasAnyText(infoText, ['cream', 'egg white'])) {
    suggestions.push(
      'A colder shake and a well-chilled glass will help creamy builds land smoother and more refined.',
    );
  }
  if (hasAnyText(infoText, ['coupe', 'martini glass'])) {
    suggestions.push(
      'Chill the glass before pouring so the drink stays colder and more polished from the first sip.',
    );
  }

  const combined = [...existing, ...suggestions];
  const seen = new Set<string>();
  return combined
    .filter((tip) => {
      const key = tip.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
