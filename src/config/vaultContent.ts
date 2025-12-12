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
  | "BAR_FEATURES"
  | "SEASONAL_DROPS"
  | "VAULT_KEYS";

export type UnlockMethod =
  | "XP_ONLY"
  | "XP_OR_MONEY"
  | "KEY_ONLY"
  | "KEY_OR_XP"
  | "KEY_OR_MONEY";

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
    id: "BAR_FEATURES",
    title: "Bar Features",
    subtitle: "Signature drinks from real bars",
    description: "Learn from the best bars around the world. Discover their signature cocktails, understand their philosophy, and adapt their techniques for your home bar.",
    sortOrder: 3,
  },
  {
    id: "SEASONAL_DROPS",
    title: "Seasonal Drops",
    subtitle: "Limited-time seasonal releases",
    description: "Exclusive seasonal content that rotates throughout the year. Get early access to curated collections of variations, playbooks, and bar features.",
    sortOrder: 4,
  },
  {
    id: "VAULT_KEYS",
    title: "Vault Keys",
    subtitle: "Privileged access & early unlocks",
    description: "Vault Keys unlock premium content instantly. Use them for seasonal drops, bar features, and curated bundles. Keys represent leverage, not luck.",
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
}

export const cocktailVariations: CocktailVariationContent[] = [
  // Simple variations (500-700 XP)
  {
    id: "var_smoked_old_fashioned",
    title: "Smoked Old Fashioned",
    baseClassicId: "old_fashioned",
    shortDescription: "Classic Old Fashioned enhanced with aromatic smoke. Learn wood chip selection and smoking techniques that complement bourbon and rye.",
    difficulty: "simple",
    tags: ["smoked", "bourbon", "aromatic"],
    xpCost: 600,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_spicy_margarita",
    title: "Spicy Margarita",
    baseClassicId: "margarita",
    shortDescription: "Margarita with balanced heat from jalapeño or habanero. Master the art of infusing spirits with controlled spice levels.",
    difficulty: "simple",
    tags: ["spicy", "tequila", "citrus"],
    xpCost: 550,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_brown_butter_old_fashioned",
    title: "Brown Butter Old Fashioned",
    baseClassicId: "old_fashioned",
    shortDescription: "Fat-washed Old Fashioned with nutty brown butter richness. Learn fat-washing fundamentals and flavor extraction.",
    difficulty: "simple",
    tags: ["fat-washed", "rich", "bourbon"],
    xpCost: 700,
    moneyPriceCents: 299,
    unlockMethod: "XP_OR_MONEY",
  },

  // Technique-forward variations (900-1200 XP)
  {
    id: "var_clarified_whiskey_sour",
    title: "Clarified Whiskey Sour",
    baseClassicId: "whiskey_sour",
    shortDescription: "Crystal-clear Whiskey Sour using milk clarification. Master this showstopping technique that creates silky texture and extended shelf life.",
    difficulty: "technique_forward",
    tags: ["clarified", "technique", "whiskey", "citrus"],
    xpCost: 1100,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_nitro_espresso_martini",
    title: "Nitro Espresso Martini",
    baseClassicId: "espresso_martini",
    shortDescription: "Nitrogen-infused Espresso Martini with cascading foam. Learn carbonation science and pressure dispensing for home bars.",
    difficulty: "technique_forward",
    tags: ["nitro", "coffee", "foam", "technique"],
    xpCost: 950,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_oleo_saccharum_daiquiri",
    title: "Oleo Saccharum Daiquiri",
    baseClassicId: "daiquiri",
    shortDescription: "Daiquiri enhanced with citrus oil extraction. Master oleo saccharum preparation for depth and aromatics in any citrus cocktail.",
    difficulty: "technique_forward",
    tags: ["citrus", "rum", "technique", "aromatic"],
    xpCost: 900,
    moneyPriceCents: 399,
    unlockMethod: "XP_OR_MONEY",
  },

  // Pro-level variations (1800-2200 XP)
  {
    id: "var_split_base_negroni",
    title: "Split-Base Negroni",
    baseClassicId: "negroni",
    shortDescription: "Advanced Negroni using multiple base spirits for complexity. Learn spirit splitting theory and how to balance multiple flavor profiles.",
    difficulty: "pro",
    tags: ["split-base", "complex", "bitter", "advanced"],
    xpCost: 1800,
    moneyPriceCents: 699,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_aged_manhattan",
    title: "Barrel-Aged Manhattan",
    baseClassicId: "manhattan",
    shortDescription: "Manhattan aged in oak barrels for oxidative complexity. Master barrel aging at home, including wood selection and time management.",
    difficulty: "pro",
    tags: ["aged", "oak", "complex", "whiskey"],
    xpCost: 2000,
    moneyPriceCents: 699,
    unlockMethod: "XP_OR_MONEY",
  },
  {
    id: "var_fermented_pineapple_margarita",
    title: "Fermented Pineapple Margarita",
    baseClassicId: "margarita",
    shortDescription: "Margarita with lacto-fermented pineapple for funky complexity. Learn controlled fermentation for cocktail ingredients.",
    difficulty: "pro",
    tags: ["fermented", "funky", "tequila", "advanced"],
    xpCost: 2200,
    moneyPriceCents: 799,
    unlockMethod: "XP_OR_MONEY",
  },

  // Seasonal variations
  {
    id: "var_winter_spiced_negroni",
    title: "Winter Spiced Negroni",
    baseClassicId: "negroni",
    shortDescription: "Negroni infused with warming winter spices like star anise, cinnamon, and cardamom. Perfect for cold weather entertaining.",
    difficulty: "technique_forward",
    tags: ["spiced", "winter", "seasonal", "bitter"],
    xpCost: 1000,
    moneyPriceCents: 499,
    unlockMethod: "KEY_OR_XP",
  },
  {
    id: "var_summer_berry_daiquiri",
    title: "Summer Berry Daiquiri",
    baseClassicId: "daiquiri",
    shortDescription: "Daiquiri showcasing peak-season berries with proper acid balance. Learn seasonal ingredient integration and preservation.",
    difficulty: "simple",
    tags: ["berry", "summer", "seasonal", "fruit"],
    xpCost: 650,
    moneyPriceCents: 299,
    unlockMethod: "KEY_OR_XP",
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
  },
];

// ============================================================================
// BAR FEATURES
// ============================================================================

export interface BarFeatureContent {
  id: string;
  barName: string;
  city: string;
  vibeDescription: string;
  signatureCocktailName: string;
  whyItWorks: string;
  homeSubstitutions: string;
  xpCost: number;
  moneyPriceCents: number;
  unlockMethod: UnlockMethod;
  proEarlyAccess: boolean;
}

export const barFeatures: BarFeatureContent[] = [
  {
    id: "bar_death_and_co",
    barName: "Death & Co",
    city: "New York City",
    vibeDescription: "Intimate, dimly-lit cocktail den in the East Village. Known for meticulous technique, house-made ingredients, and theatrical presentation. The gold standard for modern American cocktail bars.",
    signatureCocktailName: "Oaxaca Old Fashioned",
    whyItWorks: "Split-base technique using tequila and mezcal creates depth while maintaining Old Fashioned structure. The agave spirits bring smoke and complexity without overwhelming the template. This drink taught a generation of bartenders how to split bases effectively.",
    homeSubstitutions: "Can't find mezcal? Use a smoky Islay Scotch (like Laphroaig) at 25% of the base. For tequila, reposado works better than blanco here—you want some oak to bridge the gap with traditional whiskey Old Fashioneds.",
    xpCost: 1400,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
    proEarlyAccess: true,
  },
  {
    id: "bar_employees_only",
    barName: "Employees Only",
    city: "New York City",
    vibeDescription: "Classic speakeasy-style bar in the West Village serving elevated cocktails in a neighborhood bar atmosphere. Known for their 'Amuse-Bouche' program and late-night service. The bartenders are as much therapists as mixologists.",
    signatureCocktailName: "Ginger Smash",
    whyItWorks: "Fresh ginger, muddled with stone fruit, creates complexity without muddling technique errors. The key is pre-juicing ginger and controlling dilution. This drink proves that fresh ingredients don't need to be complicated—they need to be handled correctly.",
    homeSubstitutions: "No fresh ginger juice? Grate ginger on a microplane and strain through cheesecloth. For stone fruit (apricot or peach), quality apricot liqueur (Rothman & Winter) can substitute in winter months. The technique matters more than the exact fruit.",
    xpCost: 1300,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
    proEarlyAccess: false,
  },
  {
    id: "bar_attaboy",
    barName: "Attaboy",
    city: "New York City",
    vibeDescription: "No-menu cocktail bar in the Lower East Side where bartenders create custom drinks based on your preferences. Tiny space, world-class technique. The ultimate bartender's bar—every drink is a conversation.",
    signatureCocktailName: "The Bartender's Choice",
    whyItWorks: "Not a recipe, but a framework. Sam Ross and Michael McIlroy teach bartenders to listen first, then build. The process: spirit preference → flavor profile → technique selection → garnish. This isn't a cocktail—it's a consultation system that scales to any skill level.",
    homeSubstitutions: "To recreate the Attaboy experience at home: interview your guest (sweet/dry? spirit preference? any dislikes?), select a classic template that fits, make one modification (different citrus, infused spirit, unique bitter), present it as custom. You're not faking it—you're practicing their framework.",
    xpCost: 1500,
    moneyPriceCents: 599,
    unlockMethod: "XP_OR_MONEY",
    proEarlyAccess: true,
  },
  {
    id: "bar_trick_dog",
    barName: "Trick Dog",
    city: "San Francisco",
    vibeDescription: "Playful neighborhood bar in the Mission District famous for themed, rotating menus. Every 6 months, a completely new menu with creative presentation (menus designed as Pantone swatches, Chinese takeout, etc.). Serious technique hidden behind whimsy.",
    signatureCocktailName: "Sherry Cobbler (Pantone 294)",
    whyItWorks: "Trick Dog modernized the forgotten Cobbler template with quality sherry, seasonal fruit, and proper dilution. The key insight: Cobblers aren't just crushed ice drinks—they're showcases for fortified wines. This version balances sherry's oxidative notes with bright fruit without over-sweetening.",
    homeSubstitutions: "Use Amontillado or Palo Cortado sherry (not cooking sherry). If you can't find quality sherry, try Madeira or tawny port as the base. For fruit, match seasonality: berries in summer, citrus in winter, stone fruit in spring. The template is flexible—crushed ice, fortified wine, fruit, light sweetener.",
    xpCost: 1350,
    moneyPriceCents: 499,
    unlockMethod: "XP_OR_MONEY",
    proEarlyAccess: false,
  },
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
  },
];

// ============================================================================
// VAULT KEY CONFIGURATIONS
// ============================================================================

export interface VaultKeyConfig {
  id: string;
  title: string;
  description: string;
  keysGranted: number;
  proMonthlyIncluded: boolean;
  isPurchasable: boolean;
  moneyPriceCents?: number;
}

export const vaultKeyConfigs: VaultKeyConfig[] = [
  {
    id: "key_pro_monthly",
    title: "PRO Monthly Key",
    description: "Included free with KOOPE PRO subscription. Automatically granted on the 1st of each month. Use for seasonal drops, bar features, or curated bundles.",
    keysGranted: 1,
    proMonthlyIncluded: true,
    isPurchasable: false,
  },
  {
    id: "key_single_purchase",
    title: "Single Vault Key",
    description: "Unlock one premium item instantly. Perfect for accessing a specific bar feature or seasonal drop without waiting.",
    keysGranted: 1,
    proMonthlyIncluded: false,
    isPurchasable: true,
    moneyPriceCents: 299,
  },
  {
    id: "key_three_pack",
    title: "3-Key Bundle",
    description: "Best value for multiple unlocks. Save 25% compared to buying keys individually. Ideal for seasonal drop access.",
    keysGranted: 3,
    proMonthlyIncluded: false,
    isPurchasable: true,
    moneyPriceCents: 699,
  },
  {
    id: "key_five_pack",
    title: "5-Key Power Bundle",
    description: "Maximum leverage for serious bartenders. Save 33% and unlock entire seasonal collections or multiple bar features instantly.",
    keysGranted: 5,
    proMonthlyIncluded: false,
    isPurchasable: true,
    moneyPriceCents: 999,
  },
];

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
 * Get all cocktail variations for display (sorted by XP cost)
 */
export function getVariationsForDisplay(): CocktailVariationContent[] {
  return [...cocktailVariations].sort((a, b) => a.xpCost - b.xpCost);
}

/**
 * Get technique playbooks filtered by type
 */
export function getTechniquePlaybooksByType(
  type: TechniquePlaybookType
): TechniquePlaybookContent[] {
  return techniquePlaybooks.filter((pb) => pb.playbookType === type);
}

/**
 * Get all bar features for display (sorted by XP cost)
 */
export function getBarFeaturesForDisplay(): BarFeatureContent[] {
  return [...barFeatures].sort((a, b) => a.xpCost - b.xpCost);
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
  barFeatures: BarFeatureContent[];
} {
  const drop = getSeasonalDropById(dropId);

  if (!drop) {
    return { variations: [], playbooks: [], barFeatures: [] };
  }

  const variations = cocktailVariations.filter((v) =>
    drop.includedVariationIds.includes(v.id)
  );

  const playbooks = techniquePlaybooks.filter((pb) =>
    drop.includedPlaybookIds.includes(pb.id)
  );

  const barFeatures = barFeatures.filter((bf) =>
    drop.includedBarFeatureIds?.includes(bf.id)
  );

  return { variations, playbooks, barFeatures };
}

/**
 * Get available seasonal drops for a user tier and current date
 *
 * Rules:
 * - Filter by date range (availableFrom / availableUntil)
 * - FREE tier: only drops with freePreview = true
 * - PLUS tier: only drops with plusAccess = true
 * - PRO tier: all valid drops
 */
export function getAvailableSeasonalDropsForTier(
  tier: UserTier,
  now: Date = new Date()
): SeasonalDropContent[] {
  const nowTime = now.getTime();

  return seasonalDrops.filter((drop) => {
    // Check date range
    const availableFrom = new Date(drop.availableFrom).getTime();
    const availableUntil = new Date(drop.availableUntil).getTime();

    if (nowTime < availableFrom || nowTime > availableUntil) {
      return false;
    }

    // Check tier access
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
 * Get bar feature by ID
 */
export function getBarFeatureById(id: string): BarFeatureContent | undefined {
  return barFeatures.find((bf) => bf.id === id);
}

/**
 * Get vault key config by ID
 */
export function getVaultKeyConfigById(
  id: string
): VaultKeyConfig | undefined {
  return vaultKeyConfigs.find((key) => key.id === id);
}

/**
 * Get all purchasable vault keys
 */
export function getPurchasableVaultKeys(): VaultKeyConfig[] {
  return vaultKeyConfigs.filter((key) => key.isPurchasable);
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
