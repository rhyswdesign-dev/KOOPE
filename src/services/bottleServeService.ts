import type {
  ServeGuidance,
  ServeMode,
  ServePriority,
  ServeSpiritFamily,
  Spirit,
} from '../data/spiritsDatabase';
import { PREMIUM_SERVE_GUIDANCE } from '../config/premiumServeGuidance';
import type { UserTier } from '../store/useUserTier';

export interface BottleServeModeRecommendation {
  mode: ServeMode;
  label: string;
  description: string;
}

export interface BottleServeRecommendation {
  priority: ServePriority;
  spiritFamily: ServeSpiritFamily | null;
  heroTitle: string;
  heroSubtitle: string;
  why: string;
  cocktailUse: string;
  serveModes: BottleServeModeRecommendation[];
  firstPour: ServeMode;
  cocktailPlacement: 'primary' | 'secondary';
  isPremiumExperience: boolean;
  upgradePrompt?: string;
}

const MODE_LABELS: Record<ServeMode, string> = {
  neat: 'Neat',
  'water-drops': 'A Few Drops of Water',
  'large-rock': 'On a Large Rock',
  cocktail: 'Classic Cocktail',
};

const PRICE_TIER_SCORE: Record<Spirit['priceTier'], number> = {
  budget: 20,
  'mid-range': 45,
  premium: 75,
  'ultra-premium': 95,
};

const PREMIUM_FAMILIES = new Set<ServeSpiritFamily>([
  'scotch',
  'bourbon',
  'rye',
  'tequila',
  'mezcal',
  'cognac',
  'aged-rum',
  'japanese-whisky',
]);

function getSearchBlob(spirit: Spirit): string {
  return [spirit.name, spirit.brand, spirit.origin, ...spirit.searchTerms].join(' ').toLowerCase();
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function detectSpiritFamily(spirit: Spirit): ServeSpiritFamily | null {
  if (spirit.serveGuidance?.spiritFamily) return spirit.serveGuidance.spiritFamily;

  const blob = getSearchBlob(spirit);

  if (includesAny(blob, ['scotch', 'islay', 'speyside', 'highland', 'single malt', 'blended scotch'])) return 'scotch';
  if (includesAny(blob, ['japanese whisky', 'japanese whiskey', 'hibiki', 'yamazaki', 'hakushu', 'nikka'])) return 'japanese-whisky';
  if (includesAny(blob, ['cognac'])) return 'cognac';
  if (spirit.type === 'mezcal') return 'mezcal';
  if (spirit.type === 'tequila') return 'tequila';
  if (spirit.type === 'rum' && includesAny(blob, ['aged', 'anejo', 'añejo', '12 year', '15 year', 'xo', 'reserve'])) return 'aged-rum';
  if (includesAny(blob, ['rye'])) return 'rye';
  if (includesAny(blob, ['bourbon'])) return 'bourbon';
  if (includesAny(blob, ['irish whiskey', 'irish whisky'])) return 'irish-whiskey';

  return null;
}

function inferPriority(spirit: Spirit, family: ServeSpiritFamily | null): ServePriority {
  if (spirit.serveGuidance?.priority) return spirit.serveGuidance.priority;

  const premiumScore = spirit.serveGuidance?.premiumScore ?? PRICE_TIER_SCORE[spirit.priceTier];
  if (premiumScore >= 95 && spirit.type !== 'liqueur' && spirit.type !== 'other') return 'serve-first';
  if (family && PREMIUM_FAMILIES.has(family) && premiumScore >= 75) return 'serve-first';
  if (premiumScore >= 75 && spirit.type !== 'liqueur' && spirit.type !== 'other') return 'balanced';
  if (family && premiumScore >= 45) return 'balanced';
  if (spirit.type === 'whiskey' && premiumScore >= 75) return 'balanced';
  return 'cocktail-first';
}

function getFallbackModes(spirit: Spirit, family: ServeSpiritFamily | null, priority: ServePriority): ServeMode[] {
  if (spirit.serveGuidance?.recommendedModes?.length) return spirit.serveGuidance.recommendedModes;
  if (priority === 'cocktail-first') return ['cocktail', 'large-rock', 'neat'];
  if (family && PREMIUM_SERVE_GUIDANCE[family]) return ['neat', 'water-drops', 'large-rock', 'cocktail'];
  if (spirit.type === 'whiskey' || spirit.type === 'tequila' || spirit.type === 'mezcal' || spirit.type === 'brandy') {
    return ['neat', 'large-rock', 'cocktail'];
  }
  return ['cocktail', 'neat', 'large-rock'];
}

function getFirstPour(spirit: Spirit, recommendedModes: ServeMode[]): ServeMode {
  return spirit.serveGuidance?.firstPour || recommendedModes[0] || 'cocktail';
}

function getWhy(spirit: Spirit, family: ServeSpiritFamily | null, tier: UserTier): string {
  if (spirit.serveGuidance?.why) return spirit.serveGuidance.why;
  if (family && PREMIUM_SERVE_GUIDANCE[family]) {
    return tier === 'FREE'
      ? PREMIUM_SERVE_GUIDANCE[family].shortWhy
      : PREMIUM_SERVE_GUIDANCE[family].detailedWhy;
  }
  if (spirit.priceTier === 'premium' || spirit.priceTier === 'ultra-premium') {
    return 'This bottle is worth tasting on its own before you decide whether to chill, dilute, or mix it.';
  }
  return 'This bottle can work both as a straightforward pour and as a cocktail base depending on how you want to use it.';
}

function getCocktailUse(spirit: Spirit, family: ServeSpiritFamily | null, priority: ServePriority): string {
  if (spirit.serveGuidance?.cocktailUse) {
    const lookup: Record<NonNullable<ServeGuidance['cocktailUse']>, string> = {
      'best-neat': 'Best enjoyed on its own before mixing.',
      'good-spirit-forward': 'If you mix it, keep the cocktail spirit-forward.',
      'great-for-cocktails': 'Very cocktail-friendly if you want to build around it.',
    };
    return lookup[spirit.serveGuidance.cocktailUse];
  }

  if (priority === 'serve-first') return 'If you make a cocktail, keep it spirit-forward and let the bottle stay obvious.';
  if (family === 'aged-rum' || family === 'bourbon' || family === 'rye') return 'Great in classics, but still worth tasting on its own first.';
  return 'A flexible bottle that can work on its own or in cocktails.';
}

function describeMode(family: ServeSpiritFamily | null, mode: ServeMode, tier: UserTier): string {
  const familyCopy = family ? PREMIUM_SERVE_GUIDANCE[family] : null;
  if (familyCopy) {
    if (tier === 'FREE' && mode === 'water-drops') {
      return 'Try a very small amount of water if you want a softer sip.';
    }
    return familyCopy.modeDescriptions[mode];
  }

  const fallback: Record<ServeMode, string> = {
    neat: 'Pour without ice or dilution if you want the most direct read on the bottle.',
    'water-drops': 'Add a few drops only if the alcohol is masking aroma.',
    'large-rock': 'Use one large cube for slower dilution and a cooler sip.',
    cocktail: 'Use this bottle in a cocktail if that is how you most enjoy the spirit.',
  };

  if (tier === 'FREE' && mode === 'water-drops') {
    return 'Try a small amount of water if you want a softer sip.';
  }

  return fallback[mode];
}

export class BottleServeService {
  static getRecommendation(spirit: Spirit, tier: UserTier): BottleServeRecommendation {
    const family = detectSpiritFamily(spirit);
    const priority = inferPriority(spirit, family);
    const recommendedModes = getFallbackModes(spirit, family, priority);
    const firstPour = getFirstPour(spirit, recommendedModes);
    const familyCopy = family ? PREMIUM_SERVE_GUIDANCE[family] : null;

    return {
      priority,
      spiritFamily: family,
      heroTitle:
        priority === 'serve-first'
          ? familyCopy?.title || 'How to enjoy this bottle'
          : priority === 'balanced'
            ? 'Best first pour'
            : 'Quick serve ideas',
      heroSubtitle:
        priority === 'serve-first'
          ? 'Start with the bottle itself before moving into cocktails.'
          : priority === 'balanced'
            ? 'This bottle can shine on its own and still work in the right cocktails.'
            : 'Use this bottle the way you enjoy it most.',
      why: getWhy(spirit, family, tier),
      cocktailUse: getCocktailUse(spirit, family, priority),
      serveModes: recommendedModes.map((mode) => ({
        mode,
        label: MODE_LABELS[mode],
        description: describeMode(family, mode, tier),
      })),
      firstPour,
      cocktailPlacement: priority === 'serve-first' ? 'secondary' : 'primary',
      isPremiumExperience: priority === 'serve-first',
      upgradePrompt:
        tier === 'FREE'
          ? 'Upgrade to PLUS for deeper tasting guidance on premium bottles.'
          : tier === 'PLUS'
            ? 'PRO can personalize premium bottle guidance to your taste profile.'
            : undefined,
    };
  }
}
