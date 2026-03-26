/**
 * VAULT CONTENT & ORGANIZATION LAYER
 *
 * This file defines all Vault content types, configurations, and organization helpers.
 * It provides a clean, type-safe interface for the UI to consume without any backend logic.
 */

// ============================================================================
// CORE TYPES & ENUMS
// ============================================================================

export type VaultCategoryId =
  | "COCKTAIL_VARIATIONS"
  | "TECHNIQUE_PLAYBOOKS"
  | "SEASONAL_DROPS"
  | "GAMES";

export type UnlockMethod =
  | "XP_ONLY"
  | "XP_OR_MONEY";

export type UserTier = "FREE" | "PLUS" | "PRO";

export type VariationDifficulty = "simple" | "technique_forward" | "pro";

export type TechniquePlaybookType =
  | "ICE_STRATEGY"
  | "ACID_CONTROL"
  | "BATCH_MATH"
  | "SPEED_SYSTEM";

// ============================================================================
// VAULT CATEGORY CONFIGURATION
// ============================================================================

export interface VaultCategoryConfig {
  id: VaultCategoryId;
  title: string;
  subtitle: string;
  description: string;
  sortOrder: number;
}

export const vaultCategories: VaultCategoryConfig[] = [
  {
    id: "COCKTAIL_VARIATIONS",
    title: "Cocktail Variations",
    subtitle: "Advanced versions of the classics",
    description: "Expand your repertoire with professional variations of classic cocktails. Each variation builds on familiar foundations with new techniques, ingredients, and flavor profiles.",
    sortOrder: 1,
  },
  {
    id: "TECHNIQUE_PLAYBOOKS",
    title: "Technique Playbooks",
    subtitle: "Professional systems & workflows",
    description: "Master the operational systems that separate home bartenders from professionals. These playbooks teach decision frameworks, not just techniques.",
    sortOrder: 2,
  },
  {
    id: "SEASONAL_DROPS",
    title: "Seasonal Drops",
    subtitle: "Limited-time seasonal releases",
    description: "Exclusive seasonal content that rotates throughout the year. Get early access to curated collections of variations, playbooks, and bar features.",
    sortOrder: 4,
  },
  {
    id: "GAMES",
    title: "Drinking Games",
    subtitle: "Classic party games with full rules",
    description: "Unlock official rules, variations, and strategies for the best drinking games. Perfect for parties, game nights, and social gatherings.",
    sortOrder: 5,
  },
];

// ============================================================================
// COCKTAIL VARIATIONS
// ============================================================================

export interface CocktailVariationContent {
  id: string;
  title: string;
  baseClassicId: string;
  shortDescription: string;
  difficulty: VariationDifficulty;
  tags: string[];
  xpCost: number;
  moneyPriceCents?: number;
  unlockMethod: UnlockMethod;
  requiredTier?: UserTier; // Minimum tier required to access this content
}

export const cocktailVariations: CocktailVariationContent[] = [
  // Simple variations (500-700 XP) - FREE tier to attract users
  {
    id: "var_smoked_old_fashioned",
    title: "Smoked Old Fashioned",
    baseClassicId: "old_fashioned",
    shortDescription: "Classic Old Fashioned enhanced with aromatic smoke. Learn wood chip selection and smoking techniques that complement bourbon and rye.",
    difficulty: "simple",
    tags: ["smoked", "bourbon", "aromatic"],
    xpCost: 350,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
    // FREE - accessible to all users as entry point
  },
  {
    id: "var_spicy_margarita",
    title: "Spicy Margarita",
    baseClassicId: "margarita",
    shortDescription: "Margarita with balanced heat from jalapeño or habanero. Master the art of infusing spirits with controlled spice levels.",
    difficulty: "simple",
    tags: ["spicy", "tequila", "citrus"],
    xpCost: 300,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
    // FREE - accessible to all users
  },
  {
    id: "var_brown_butter_old_fashioned",
    title: "Brown Butter Old Fashioned",
    baseClassicId: "old_fashioned",
    shortDescription: "Fat-washed Old Fashioned with nutty brown butter richness. Learn fat-washing fundamentals and flavor extraction.",
    difficulty: "simple",
    tags: ["fat-washed", "rich", "bourbon"],
    xpCost: 400,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PLUS", // PLUS - premium simple variation
  },

  // Technique-forward variations (900-1200 XP) - Mix of PLUS and PRO
  {
    id: "var_clarified_whiskey_sour",
    title: "Clarified Whiskey Sour",
    baseClassicId: "whiskey_sour",
    shortDescription: "Crystal-clear Whiskey Sour using milk clarification. Master this showstopping technique that creates silky texture and extended shelf life.",
    difficulty: "technique_forward",
    tags: ["clarified", "technique", "whiskey", "citrus"],
    xpCost: 650,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PLUS", // PLUS - advanced technique
  },
  {
    id: "var_nitro_espresso_martini",
    title: "Nitro Espresso Martini",
    baseClassicId: "espresso_martini",
    shortDescription: "Nitrogen-infused Espresso Martini with cascading foam. Learn carbonation science and pressure dispensing for home bars.",
    difficulty: "technique_forward",
    tags: ["nitro", "coffee", "foam", "technique"],
    xpCost: 700,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PRO", // PRO - requires special equipment
  },
  {
    id: "var_oleo_saccharum_daiquiri",
    title: "Oleo Saccharum Daiquiri",
    baseClassicId: "daiquiri",
    shortDescription: "Daiquiri enhanced with citrus oil extraction. Master oleo saccharum preparation for depth and aromatics in any citrus cocktail.",
    difficulty: "technique_forward",
    tags: ["citrus", "rum", "technique", "aromatic"],
    xpCost: 600,
    moneyPriceCents: 399,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PLUS", // PLUS - intermediate technique
  },

  // Pro-level variations (1800-2200 XP) - All PRO tier
  {
    id: "var_split_base_negroni",
    title: "Split-Base Negroni",
    baseClassicId: "negroni",
    shortDescription: "Advanced Negroni using multiple base spirits for complexity. Learn spirit splitting theory and how to balance multiple flavor profiles.",
    difficulty: "pro",
    tags: ["split-base", "complex", "bitter", "advanced"],
    xpCost: 900,
    moneyPriceCents: 699,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PRO", // PRO - advanced split-base technique
  },
  {
    id: "var_aged_manhattan",
    title: "Barrel-Aged Manhattan",
    baseClassicId: "manhattan",
    shortDescription: "Manhattan aged in oak barrels for oxidative complexity. Master barrel aging at home, including wood selection and time management.",
    difficulty: "pro",
    tags: ["aged", "oak", "complex", "whiskey"],
    xpCost: 1000,
    moneyPriceCents: 699,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PRO", // PRO - requires barrel aging equipment and time
  },
  {
    id: "var_fermented_pineapple_margarita",
    title: "Fermented Pineapple Margarita",
    baseClassicId: "margarita",
    shortDescription: "Margarita with lacto-fermented pineapple for funky complexity. Learn controlled fermentation for cocktail ingredients.",
    difficulty: "pro",
    tags: ["fermented", "funky", "tequila", "advanced"],
    xpCost: 950,
    moneyPriceCents: 799,
    unlockMethod: "XP_OR_MONEY",
    requiredTier: "PRO", // PRO - advanced fermentation technique
  },

  // Seasonal variations - PLUS tier for standard seasonal content
  {
    id: "var_winter_spiced_negroni",
    title: "Winter Spiced Negroni",
    baseClassicId: "negroni",
    shortDescription: "Negroni infused with warming winter spices like star anise, cinnamon, and cardamom. Perfect for cold weather entertaining.",
    difficulty: "technique_forward",
    tags: ["spiced", "winter", "seasonal", "bitter"],
    xpCost: 500,
    moneyPriceCents: 499,
    unlockMethod: "XP_ONLY",
    requiredTier: "PLUS", // PLUS - seasonal content
  },
  {
    id: "var_summer_berry_daiquiri",
    title: "Summer Berry Daiquiri",
    baseClassicId: "daiquiri",
    shortDescription: "Daiquiri showcasing peak-season berries with proper acid balance. Learn seasonal ingredient integration and preservation.",
    difficulty: "simple",
    tags: ["berry", "summer", "seasonal", "fruit"],
    xpCost: 400,
    moneyPriceCents: 299,
    unlockMethod: "XP_ONLY",
    requiredTier: "PLUS", // PLUS - seasonal content
  },
];

// ============================================================================
// TECHNIQUE PLAYBOOKS
// ============================================================================

export interface TechniquePlaybookContent {
  id: string;
  title: string;
  playbookType: TechniquePlaybookType;
  shortDescription: string;
  keyOutcomes: string[];
  xpCost: number;
  requiredTier?: UserTier; // Minimum tier required to access this content
}

export const techniquePlaybooks: TechniquePlaybookContent[] = [
  // Ice Strategy Playbooks
  {
    id: "playbook_ice_strategy_basics",
    title: "Ice Strategy Fundamentals",
    playbookType: "ICE_STRATEGY",
    shortDescription: "Master ice decision logic for every cocktail type. Learn when size, shape, and clarity actually matter.",
    keyOutcomes: [
      "Decision framework for ice selection by drink type",
      "Old Fashioned ice logic (large cube vs sphere vs crushed)",
      "Visual clear-ice shortcuts without specialty equipment",
      "When crushed ice helps vs hurts dilution and temperature",
    ],
    xpCost: 400,
    // FREE - intro playbook for Ice Strategy
  },
  {
    id: "playbook_ice_party_planning",
    title: "Party Ice Planning System",
    playbookType: "ICE_STRATEGY",
    shortDescription: "Plan ice quantities, storage, and preparation for events of any size. Never run out or waste freezer space.",
    keyOutcomes: [
      "Calculate ice needs for 10, 25, 50+ guests",
      "Cost analysis: bags vs trays vs delivery",
      "Storage optimization for home freezers",
      "Last-minute ice emergency protocols",
    ],
    xpCost: 650,
    requiredTier: "PLUS", // PLUS - advanced ice planning
  },

  // Acid Control Playbooks
  {
    id: "playbook_acid_control_basics",
    title: "Acid Control Fundamentals",
    playbookType: "ACID_CONTROL",
    shortDescription: "Control acid types and ratios to fix flat drinks and achieve perfect balance in any cocktail.",
    keyOutcomes: [
      "Understanding lime vs lemon vs citric acid characteristics",
      "Fix flat drinks instantly by adjusting acid levels",
      "Acid swaps without changing cocktail balance",
      "Storage-safe acid adjustments for batching",
    ],
    xpCost: 500,
    // FREE - intro playbook for Acid Control
  },
  {
    id: "playbook_acid_rebalancing",
    title: "Advanced Acid Rebalancing",
    playbookType: "ACID_CONTROL",
    shortDescription: "Rebalance batched cocktails and fix recipes that taste off. Master acid correction for any situation.",
    keyOutcomes: [
      "Diagnose acid problems in existing recipes",
      "Rebalance pre-batched cocktails without starting over",
      "Seasonal citrus variation compensation",
      "Acid ratio adjustments for dilution levels",
    ],
    xpCost: 800,
    requiredTier: "PRO", // PRO - advanced acid correction
  },

  // Batch Math Playbooks
  {
    id: "playbook_batch_math_basics",
    title: "Batch Math Fundamentals",
    playbookType: "BATCH_MATH",
    shortDescription: "Scale cocktails from 1 to 50+ servings with proper dilution and balance. Essential for parties and prep.",
    keyOutcomes: [
      "Scale recipes accurately (1 → 10 → 50 drinks)",
      "Spirit-forward vs citrus batching formulas",
      "Pre-dilution calculation and shortcuts",
      "Container size planning and yield prediction",
    ],
    xpCost: 550,
    // FREE - intro playbook for Batch Math
  },
  {
    id: "playbook_batch_math_advanced",
    title: "Advanced Batch Systems",
    playbookType: "BATCH_MATH",
    shortDescription: "Master complex batching challenges: separation prevention, shelf life extension, and multi-cocktail prep.",
    keyOutcomes: [
      "Prevent ingredient separation in batches",
      "Extend batch shelf life without quality loss",
      "Multi-cocktail batching strategies",
      "Temperature and dilution drift compensation",
    ],
    xpCost: 900,
    requiredTier: "PLUS", // PLUS - advanced batching
  },

  // Speed Systems Playbooks
  {
    id: "playbook_speed_mise_en_place",
    title: "Speed Mise En Place",
    playbookType: "SPEED_SYSTEM",
    shortDescription: "Design your bar setup for maximum efficiency. Professional station layout adapted for home bartending.",
    keyOutcomes: [
      "Mise en place layouts optimized for home vs bar",
      "Tool placement logic by drink frequency",
      "Ingredient staging for multi-drink service",
      "Setup and breakdown speed workflows",
    ],
    xpCost: 450,
    // FREE - intro playbook for Speed Systems
  },
  {
    id: "playbook_speed_build_order",
    title: "Build Order Systems",
    playbookType: "SPEED_SYSTEM",
    shortDescription: "Learn professional build order logic by drink family. Make multiple drinks faster without sacrificing quality.",
    keyOutcomes: [
      "Build order by drink family (stirred, shaken, built)",
      "Parallel drink construction techniques",
      "Garnish batching and prep workflows",
      "Multi-drink build logic for parties",
    ],
    xpCost: 700,
    requiredTier: "PLUS", // PLUS - advanced speed systems
  },
];

// ============================================================================
// BAR FEATURES — archived pending commercial partnerships
// Reintroduce when bar partnerships are in place. Data structure preserved.
// ============================================================================

export interface BarFeatureContent {
  id: string;
  barName: string;
  city: string;
  vibeDescription: string;
  signatureCocktailName: string;
  whyItWorks: string;
  homeSubstitutions: string;
  thumbnailKey?: string;
  xpCost: number;
  moneyPriceCents: number;
  unlockMethod: UnlockMethod;
  proEarlyAccess: boolean;
  requiredTier?: UserTier;
}

// Bar data preserved — not exported for active use until partnerships are confirmed.
// To reactivate: re-add "BAR_FEATURES" to VaultCategoryId, restore vaultCategories entry,
// re-export barFeatures and getBarFeaturesForDisplay, and restore VaultScreen bars tab.
const _barFeatures: BarFeatureContent[] = [
  { id: "bar_untitled_champagne_lounge", barName: "Untitled Champagne Lounge", city: "Calgary", vibeDescription: "Sophisticated luxury champagne lounge in Downtown Calgary.", signatureCocktailName: "Golden Bubbles", whyItWorks: "Dom Pérignon elevated with elderflower and gold leaf.", homeSubstitutions: "Use Veuve Clicquot or Moët with St-Germain.", thumbnailKey: "untitled", xpCost: 800, moneyPriceCents: 499, unlockMethod: "XP_OR_MONEY", proEarlyAccess: false, requiredTier: "PLUS" },
  { id: "bar_death_and_co", barName: "Death & Co", city: "New York City", vibeDescription: "Intimate cocktail den in the East Village.", signatureCocktailName: "Oaxaca Old Fashioned", whyItWorks: "Split-base tequila/mezcal Old Fashioned.", homeSubstitutions: "Sub Islay Scotch at 25% if no mezcal.", thumbnailKey: "depth_frame_header_25", xpCost: 950, moneyPriceCents: 499, unlockMethod: "XP_OR_MONEY", proEarlyAccess: true, requiredTier: "PLUS" },
  { id: "bar_employees_only", barName: "Employees Only", city: "New York City", vibeDescription: "Classic speakeasy-style bar in the West Village.", signatureCocktailName: "Ginger Smash", whyItWorks: "Fresh ginger and stone fruit with controlled dilution.", homeSubstitutions: "Microplane-grate ginger; apricot liqueur in winter.", thumbnailKey: "depth_frame_header_26", xpCost: 850, moneyPriceCents: 499, unlockMethod: "XP_OR_MONEY", proEarlyAccess: false, requiredTier: "PLUS" },
  { id: "bar_attaboy", barName: "Attaboy", city: "New York City", vibeDescription: "No-menu cocktail bar in the Lower East Side.", signatureCocktailName: "The Bartender's Choice", whyItWorks: "A consultation framework, not a fixed recipe.", homeSubstitutions: "Interview your guest, pick a template, make one custom modification.", thumbnailKey: "depth_frame_header_23", xpCost: 1000, moneyPriceCents: 599, unlockMethod: "XP_OR_MONEY", proEarlyAccess: true, requiredTier: "PLUS" },
  { id: "bar_trick_dog", barName: "Trick Dog", city: "San Francisco", vibeDescription: "Playful neighborhood bar in the Mission District.", signatureCocktailName: "Sherry Cobbler (Pantone 294)", whyItWorks: "Modernized Cobbler showcasing fortified wine.", homeSubstitutions: "Use Amontillado sherry; match fruit to season.", thumbnailKey: "depth_frame_header_22", xpCost: 900, moneyPriceCents: 499, unlockMethod: "XP_OR_MONEY", proEarlyAccess: false, requiredTier: "PLUS" },
];

// ============================================================================
// SEASONAL DROPS
// ============================================================================

export interface SeasonalDropContent {
  id: string;
  seasonName: string;
  description: string;
  includedVariationIds: string[];
  includedPlaybookIds: string[];
  includedBarFeatureIds?: string[];
  availableFrom: string;
  availableUntil: string;
  freePreview: boolean;
  plusAccess: boolean;
  proBonusItemId?: string;
  requiredTier?: UserTier; // Minimum tier required to access this content
  earlyAccessDays?: number; // Days of early access for PRO users
}

export const seasonalDrops: SeasonalDropContent[] = [
  {
    id: "drop_winter_2025",
    seasonName: "Winter Drop 2025",
    description: "Master cold-weather cocktails with warming spices, barrel-aged spirits, and professional batching for holiday parties. Includes exclusive bar feature from NYC's top winter cocktail program.",
    includedVariationIds: [
      "var_winter_spiced_negroni",
      "var_brown_butter_old_fashioned",
      "var_aged_manhattan",
    ],
    includedPlaybookIds: [
      "playbook_batch_math_basics",
      "playbook_ice_party_planning",
    ],
    includedBarFeatureIds: ["bar_death_and_co"],
    availableFrom: "2025-12-01T00:00:00Z",
    availableUntil: "2026-02-28T23:59:59Z",
    freePreview: true,
    plusAccess: true,
    proBonusItemId: "playbook_batch_math_advanced",
    requiredTier: "PLUS", // PLUS - seasonal content
    earlyAccessDays: 14, // PRO users get 14 days early access
  },
  {
    id: "drop_summer_2025",
    seasonName: "Summer Drop 2025",
    description: "Light, refreshing cocktails for warm weather. Learn seasonal fruit integration, batch prep for outdoor entertaining, and speed service systems for parties.",
    includedVariationIds: [
      "var_summer_berry_daiquiri",
      "var_clarified_whiskey_sour",
      "var_oleo_saccharum_daiquiri",
      "var_spicy_margarita",
    ],
    includedPlaybookIds: [
      "playbook_acid_control_basics",
      "playbook_speed_mise_en_place",
    ],
    includedBarFeatureIds: ["bar_trick_dog"],
    availableFrom: "2025-06-01T00:00:00Z",
    availableUntil: "2025-08-31T23:59:59Z",
    freePreview: true,
    plusAccess: true,
    proBonusItemId: "var_nitro_espresso_martini",
    requiredTier: "PLUS", // PLUS - seasonal content
    earlyAccessDays: 14, // PRO users get 14 days early access
  },
  {
    id: "drop_spring_2025",
    seasonName: "Spring Drop 2025",
    description: "Fresh, floral, and citrus-forward cocktails celebrating spring ingredients. Master technique-forward variations and acid control for bright, balanced drinks.",
    includedVariationIds: [
      "var_oleo_saccharum_daiquiri",
      "var_clarified_whiskey_sour",
      "var_fermented_pineapple_margarita",
    ],
    includedPlaybookIds: [
      "playbook_acid_control_basics",
      "playbook_acid_rebalancing",
    ],
    includedBarFeatureIds: ["bar_employees_only"],
    availableFrom: "2025-03-01T00:00:00Z",
    availableUntil: "2025-05-31T23:59:59Z",
    freePreview: true,
    plusAccess: true,
    proBonusItemId: "playbook_ice_strategy_basics",
    requiredTier: "PLUS", // PLUS - seasonal content
    earlyAccessDays: 14, // PRO users get 14 days early access
  },
];

// ============================================================================
// DRINKING GAMES
// ============================================================================

export interface DrinkingGameContent {
  id: string;
  title: string;
  shortDescription: string;
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  origin: string;
  category: "classic" | "cultural" | "app_enhanced" | "party";
  xpCost: number;
  requiredTier?: UserTier;
}

export const drinkingGames: DrinkingGameContent[] = [
  // Classic Games
  {
    id: "game_kings_cup",
    title: "King's Cup",
    shortDescription: "The ultimate card-based drinking game. Draw cards and perform actions based on the card drawn. A must-know for any party host.",
    players: "4–10+",
    difficulty: "Easy",
    origin: "USA",
    category: "classic",
    xpCost: 200,
    // FREE - entry point game
  },
  {
    id: "game_flip_cup",
    title: "Flip Cup",
    shortDescription: "Fast-paced team relay game. Drink and flip your cup before the next player goes. Speed, coordination, and team spirit required.",
    players: "2–4 per team",
    difficulty: "Easy",
    origin: "USA",
    category: "classic",
    xpCost: 200,
    // FREE - entry point game
  },
  {
    id: "game_beer_pong",
    title: "Beer Pong",
    shortDescription: "The iconic party game. Toss ping pong balls into cups across the table. Master your arc and dominate the competition.",
    players: "2–4",
    difficulty: "Medium",
    origin: "USA",
    category: "classic",
    xpCost: 250,
    // FREE - popular game
  },

  // Cultural Games
  {
    id: "game_ring_of_fire",
    title: "Ring of Fire",
    shortDescription: "The British cousin of King's Cup with unique rule variations. Cards placed around a central cup create escalating stakes.",
    players: "2+",
    difficulty: "Medium",
    origin: "UK",
    category: "cultural",
    xpCost: 300,
    requiredTier: "PLUS",
  },
  {
    id: "game_fuzzy_duck",
    title: "Fuzzy Duck",
    shortDescription: "A tongue-twister drinking game that gets hilariously difficult. Say 'fuzzy duck' or 'ducky fuzz' without slipping up.",
    players: "2+",
    difficulty: "Hard",
    origin: "UK",
    category: "cultural",
    xpCost: 300,
    requiredTier: "PLUS",
  },

  // App-Enhanced Games
  {
    id: "game_truth_or_dare",
    title: "Truth or Dare",
    shortDescription: "The classic party game with a drinking twist. Refuse a truth or dare and take a drink. Includes curated question/dare decks.",
    players: "2–10",
    difficulty: "Medium",
    origin: "Global",
    category: "app_enhanced",
    xpCost: 350,
    requiredTier: "PLUS",
  },
  {
    id: "game_most_likely_to",
    title: "Most Likely To",
    shortDescription: "Vote on who in the group is most likely to do something outrageous. The person with the most votes drinks.",
    players: "2–10",
    difficulty: "Easy",
    origin: "Global",
    category: "app_enhanced",
    xpCost: 300,
    requiredTier: "PLUS",
  },

  // Party Games
  {
    id: "game_rage_cage",
    title: "Rage Cage",
    shortDescription: "High-intensity bouncing game with stacking cups. When someone catches up, stack your cup on theirs. Pure chaos.",
    players: "2+",
    difficulty: "Hard",
    origin: "Global",
    category: "party",
    xpCost: 400,
    requiredTier: "PRO",
  },
  {
    id: "game_power_hour",
    title: "Power Hour",
    shortDescription: "Take a shot of beer every minute for 60 minutes. Simple concept, legendary endurance challenge. Includes a built-in timer.",
    players: "2+",
    difficulty: "Easy",
    origin: "Global",
    category: "party",
    xpCost: 350,
    requiredTier: "PLUS",
  },
];

// ============================================================================
// PRO DISCOUNT
// ============================================================================

/**
 * Pro users pay 25% less XP on all vault content.
 * Basic Vault: 400–600 XP → Pro sees 300–450 XP
 * Pro Vault:   700–1000 XP → Pro sees 525–750 XP
 */
export const PRO_XP_DISCOUNT = 0.75;

/**
 * Returns the XP cost a user actually pays, accounting for their tier.
 * Pass this result to any unlock confirmation or affordability check.
 */
export function getEffectiveXPCost(xpCost: number, userTier: UserTier): number {
  if (userTier === 'PRO') {
    return Math.floor(xpCost * PRO_XP_DISCOUNT);
  }
  return xpCost;
}

// ============================================================================
// HELPER FUNCTIONS FOR ORGANIZATION & NAVIGATION
// ============================================================================

/**
 * Get a Vault category configuration by ID
 */
export function getVaultCategoryById(
  id: VaultCategoryId
): VaultCategoryConfig | undefined {
  return vaultCategories.find((cat) => cat.id === id);
}

/**
 * Get all cocktail variations for display (sorted by effective XP cost for the user's tier).
 * When userTier is provided, Pro users see their discounted prices in the sort order.
 */
export function getVariationsForDisplay(userTier?: UserTier): CocktailVariationContent[] {
  let variations = [...cocktailVariations];

  if (userTier) {
    variations = variations.filter(v => {
      if (!v.requiredTier) return true;
      return getTierLevel(userTier) >= getTierLevel(v.requiredTier);
    });
  }

  return variations.sort((a, b) => {
    const costA = userTier ? getEffectiveXPCost(a.xpCost, userTier) : a.xpCost;
    const costB = userTier ? getEffectiveXPCost(b.xpCost, userTier) : b.xpCost;
    return costA - costB;
  });
}

/**
 * Get technique playbooks filtered by type
 * Can optionally filter by user tier to only show accessible content
 */
export function getTechniquePlaybooksByType(
  type: TechniquePlaybookType,
  userTier?: UserTier
): TechniquePlaybookContent[] {
  let playbooks = techniquePlaybooks.filter((pb) => pb.playbookType === type);

  // Filter by tier if provided
  if (userTier) {
    playbooks = playbooks.filter(pb => {
      if (!pb.requiredTier) return true; // No tier requirement = accessible to all
      return getTierLevel(userTier) >= getTierLevel(pb.requiredTier);
    });
  }

  return playbooks;
}

// Helper function to convert tier to numeric level for comparison
function getTierLevel(tier: UserTier): number {
  switch (tier) {
    case 'FREE': return 0;
    case 'PLUS': return 1;
    case 'PRO': return 2;
  }
}

/**
 * Get a seasonal drop by ID
 */
export function getSeasonalDropById(
  dropId: string
): SeasonalDropContent | undefined {
  return seasonalDrops.find((drop) => drop.id === dropId);
}

/**
 * Get all items included in a seasonal drop
 */
export function getItemsForSeasonalDrop(dropId: string): {
  variations: CocktailVariationContent[];
  playbooks: TechniquePlaybookContent[];
} {
  const drop = getSeasonalDropById(dropId);

  if (!drop) {
    return { variations: [], playbooks: [] };
  }

  const variations = cocktailVariations.filter((v) =>
    drop.includedVariationIds.includes(v.id)
  );

  const playbooks = techniquePlaybooks.filter((pb) =>
    drop.includedPlaybookIds.includes(pb.id)
  );

  return { variations, playbooks };
}

/**
 * Get available seasonal drops for a user tier and current date
 *
 * Rules:
 * - Filter by date range (availableFrom / availableUntil)
 * - PRO users get early access based on earlyAccessDays
 * - Filter by requiredTier if specified
 * - FREE tier: only drops with freePreview = true
 * - PLUS tier: only drops with plusAccess = true
 * - PRO tier: all valid drops + early access
 */
export function getAvailableSeasonalDropsForTier(
  tier: UserTier,
  now: Date = new Date()
): SeasonalDropContent[] {
  const nowTime = now.getTime();

  return seasonalDrops.filter((drop) => {
    // Check tier requirement
    if (drop.requiredTier && getTierLevel(tier) < getTierLevel(drop.requiredTier)) {
      return false;
    }

    // Calculate effective start date (with early access for PRO users)
    let effectiveStartTime = new Date(drop.availableFrom).getTime();
    if (tier === 'PRO' && drop.earlyAccessDays) {
      const earlyAccessDate = new Date(drop.availableFrom);
      earlyAccessDate.setDate(earlyAccessDate.getDate() - drop.earlyAccessDays);
      effectiveStartTime = earlyAccessDate.getTime();
    }

    // Check date range
    const availableUntil = new Date(drop.availableUntil).getTime();

    if (nowTime < effectiveStartTime || nowTime > availableUntil) {
      return false;
    }

    // Check tier access (legacy fields for backwards compatibility)
    if (tier === "FREE") {
      return drop.freePreview;
    }

    if (tier === "PLUS") {
      return drop.plusAccess;
    }

    // PRO has access to everything
    return true;
  });
}

/**
 * Get all playbook types as an array for filtering
 */
export function getAllPlaybookTypes(): TechniquePlaybookType[] {
  return ["ICE_STRATEGY", "ACID_CONTROL", "BATCH_MATH", "SPEED_SYSTEM"];
}

/**
 * Get variation by ID
 */
export function getVariationById(
  id: string
): CocktailVariationContent | undefined {
  return cocktailVariations.find((v) => v.id === id);
}

/**
 * Get playbook by ID
 */
export function getPlaybookById(
  id: string
): TechniquePlaybookContent | undefined {
  return techniquePlaybooks.find((pb) => pb.id === id);
}

/**
 * Get bar feature by ID — archived, returns undefined until partnerships are active
 */
export function getBarFeatureById(_id: string): BarFeatureContent | undefined {
  return undefined;
}

/**
 * Get all drinking games for display
 * Can optionally filter by user tier
 */
export function getDrinkingGamesForDisplay(userTier?: UserTier): DrinkingGameContent[] {
  let games = [...drinkingGames];

  if (userTier) {
    games = games.filter(g => {
      if (!g.requiredTier) return true;
      return getTierLevel(userTier) >= getTierLevel(g.requiredTier);
    });
  }

  return games.sort((a, b) => a.xpCost - b.xpCost);
}

/**
 * Get drinking game by ID
 */
export function getDrinkingGameById(id: string): DrinkingGameContent | undefined {
  return drinkingGames.find((g) => g.id === id);
}

/**
 * Get drinking games by category
 */
export function getDrinkingGamesByCategory(category: DrinkingGameContent['category']): DrinkingGameContent[] {
  return drinkingGames.filter((g) => g.category === category);
}

/**
 * Get variations by difficulty level
 */
export function getVariationsByDifficulty(
  difficulty: VariationDifficulty
): CocktailVariationContent[] {
  return cocktailVariations.filter((v) => v.difficulty === difficulty);
}

/**
 * Get variations by base classic
 */
export function getVariationsByBaseClassic(
  baseClassicId: string
): CocktailVariationContent[] {
  return cocktailVariations.filter((v) => v.baseClassicId === baseClassicId);
}

/**
 * Search variations by tag
 */
export function searchVariationsByTag(tag: string): CocktailVariationContent[] {
  const lowerTag = tag.toLowerCase();
  return cocktailVariations.filter((v) =>
    v.tags.some((t) => t.toLowerCase().includes(lowerTag))
  );
}
