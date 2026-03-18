// @ts-nocheck
import { HomeBar, HomeBarService } from './homeBarService';

export interface UserTasteProfile {
  preferredSpirits: string[];
  flavorProfile: ('sweet' | 'sour' | 'bitter' | 'herbal' | 'fruity' | 'spicy' | 'smoky' | 'citrusy')[];
  drinkStrength: 'light' | 'medium' | 'strong';
  experience: 'beginner' | 'intermediate' | 'expert';
  preferredGlass: ('rocks' | 'coupe' | 'martini' | 'highball' | 'wine' | 'shot')[];
  occasion: ('casual' | 'formal' | 'party' | 'romantic' | 'solo')[];
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  seasonPreference: ('spring' | 'summer' | 'fall' | 'winter')[];
  dietaryRestrictions: ('vegan' | 'gluten-free' | 'low-sugar' | 'keto')[];
}

export interface SmartRecommendation {
  cocktail: {
    name: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    garnish: string;
    glass: string;
    difficulty: 'beginner' | 'intermediate' | 'expert';
    prepTime: number; // minutes
    alcoholContent: 'low' | 'medium' | 'high';
    flavorProfile: string[];
    category: string;
    origin?: string;
    imageUrl?: string;
  };
  matchScore: number; // 0-100
  reasoning: {
    whyRecommended: string[];
    tasteMatch: string[];
    availabilityMatch: string;
    experienceMatch: string;
  };
  canMakeNow: boolean;
  missingIngredients: string[];
  similarCocktails: string[];
  tips: string[];
}

/**
 * AI-Powered Cocktail Recommendation Engine
 * Combines user taste profile, home bar inventory, and contextual factors
 */
export class AIRecommendationEngine {

  /**
   * Generate personalized cocktail recommendations
   */
  static async generateRecommendations(
    homeBar: HomeBar,
    tasteProfile: UserTasteProfile,
    context?: {
      occasion?: string;
      weather?: 'hot' | 'cold' | 'mild';
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
      season?: 'spring' | 'summer' | 'fall' | 'winter';
      mood?: 'energetic' | 'relaxed' | 'adventurous' | 'classic';
      guestCount?: number;
    }
  ): Promise<SmartRecommendation[]> {

    // Get base cocktail database
    const cocktailDatabase = this.getExpandedCocktailDatabase();

    // Score each cocktail based on multiple factors
    const scoredRecommendations = cocktailDatabase.map(cocktail => {
      const scores = this.calculateCocktailScore(cocktail, homeBar, tasteProfile, context);
      const canMake = this.checkAvailability(cocktail, homeBar);

      return {
        cocktail,
        matchScore: scores.totalScore,
        reasoning: scores.reasoning,
        canMakeNow: canMake.canMake,
        missingIngredients: canMake.missing,
        similarCocktails: this.findSimilarCocktails(cocktail, cocktailDatabase),
        tips: this.generateTips(cocktail, tasteProfile, context),
      };
    });

    // Sort by match score and return top recommendations
    return scoredRecommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12);
  }

  /**
   * Calculate comprehensive scoring for a cocktail
   */
  private static calculateCocktailScore(
    cocktail: any,
    homeBar: HomeBar,
    tasteProfile: UserTasteProfile,
    context?: any
  ): { totalScore: number; reasoning: SmartRecommendation['reasoning'] } {
    let score = 0;
    const reasoning = {
      whyRecommended: [],
      tasteMatch: [],
      availabilityMatch: '',
      experienceMatch: '',
    };

    // Spirit preference matching (25 points max)
    const hasPreferredSpirit = tasteProfile.preferredSpirits.some(spirit =>
      cocktail.ingredients.some((ing: string) => ing.toLowerCase().includes(spirit.toLowerCase()))
    );
    if (hasPreferredSpirit) {
      score += 25;
      reasoning.whyRecommended.push('Contains your preferred spirits');
    }

    // Flavor profile matching (25 points max)
    const flavorMatches = tasteProfile.flavorProfile.filter(flavor =>
      cocktail.flavorProfile.includes(flavor)
    );
    const flavorScore = (flavorMatches.length / tasteProfile.flavorProfile.length) * 25;
    score += flavorScore;
    if (flavorMatches.length > 0) {
      reasoning.tasteMatch = flavorMatches.map(f => `${f} flavors`);
    }

    // Experience level matching (15 points max)
    const experienceMatch = this.getExperienceMatch(cocktail.difficulty, tasteProfile.experience);
    score += experienceMatch.score;
    reasoning.experienceMatch = experienceMatch.reason;

    // Availability scoring (20 points max)
    const availability = this.checkAvailability(cocktail, homeBar);
    if (availability.canMake) {
      score += 20;
      reasoning.availabilityMatch = 'You have all ingredients';
    } else if (availability.missing.length === 1) {
      score += 15;
      reasoning.availabilityMatch = `Missing only: ${availability.missing[0]}`;
    } else if (availability.missing.length === 2) {
      score += 10;
      reasoning.availabilityMatch = `Missing: ${availability.missing.join(', ')}`;
    } else {
      reasoning.availabilityMatch = `Missing several ingredients`;
    }

    // Context scoring (15 points max)
    const contextScore = this.getContextScore(cocktail, context, tasteProfile);
    score += contextScore.score;
    reasoning.whyRecommended.push(...contextScore.reasons);

    return {
      totalScore: Math.round(score),
      reasoning,
    };
  }

  /**
   * Check ingredient availability in home bar
   */
  private static checkAvailability(cocktail: any, homeBar: HomeBar): {
    canMake: boolean;
    missing: string[];
  } {
    const available = homeBar.ingredients.map(ing => ing.name.toLowerCase());
    const required = cocktail.ingredients.map((ing: string) => ing.toLowerCase());

    const missing = required.filter(ingredient =>
      !available.some(avail =>
        avail.includes(ingredient) ||
        ingredient.includes(avail) ||
        this.areIngredientsEquivalent(ingredient, avail)
      )
    );

    return {
      canMake: missing.length === 0,
      missing: missing,
    };
  }

  /**
   * Check if two ingredients are equivalent
   */
  private static areIngredientsEquivalent(ing1: string, ing2: string): boolean {
    const equivalents = [
      ['simple syrup', 'sugar syrup', 'syrup'],
      ['lime juice', 'fresh lime', 'lime'],
      ['lemon juice', 'fresh lemon', 'lemon'],
      ['angostura bitters', 'bitters'],
      ['dry vermouth', 'white vermouth'],
      ['sweet vermouth', 'red vermouth'],
    ];

    return equivalents.some(group =>
      group.some(item => ing1.includes(item)) &&
      group.some(item => ing2.includes(item))
    );
  }

  /**
   * Calculate experience level matching
   */
  private static getExperienceMatch(
    cocktailDifficulty: string,
    userExperience: string
  ): { score: number; reason: string } {
    const matches = {
      'beginner-beginner': { score: 15, reason: 'Perfect for your experience level' },
      'beginner-intermediate': { score: 12, reason: 'Easy to make' },
      'beginner-expert': { score: 8, reason: 'Simple classic' },
      'intermediate-beginner': { score: 5, reason: 'Slightly challenging but doable' },
      'intermediate-intermediate': { score: 15, reason: 'Great match for your skills' },
      'intermediate-expert': { score: 10, reason: 'Good practice cocktail' },
      'expert-beginner': { score: 2, reason: 'Very challenging for beginners' },
      'expert-intermediate': { score: 8, reason: 'Advanced technique required' },
      'expert-expert': { score: 15, reason: 'Perfect challenge for your expertise' },
    };

    const key = `${cocktailDifficulty}-${userExperience}` as keyof typeof matches;
    return matches[key] || { score: 5, reason: 'Standard difficulty match' };
  }

  /**
   * Calculate contextual scoring
   */
  private static getContextScore(
    cocktail: any,
    context: any = {},
    tasteProfile: UserTasteProfile
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons = [];

    // Season matching
    const seasonalCocktails = {
      summer: ['mojito', 'margarita', 'gin & tonic', 'pina colada'],
      winter: ['hot toddy', 'mulled wine', 'hot chocolate', 'irish coffee'],
      spring: ['aperol spritz', 'hugo', 'elderflower'],
      fall: ['old fashioned', 'manhattan', 'whiskey sour'],
    };

    if (context.season && seasonalCocktails[context.season as keyof typeof seasonalCocktails]) {
      const isSeasonalMatch = seasonalCocktails[context.season as keyof typeof seasonalCocktails]
        .some(name => cocktail.name.toLowerCase().includes(name));
      if (isSeasonalMatch) {
        score += 5;
        reasons.push(`Perfect for ${context.season}`);
      }
    }

    // Time of day matching
    if (context.timeOfDay) {
      const timeMatches = {
        morning: ['bloody mary', 'mimosa', 'irish coffee'],
        afternoon: ['aperitif', 'spritz', 'gin & tonic'],
        evening: ['martini', 'negroni', 'old fashioned'],
        night: ['nightcap', 'brandy', 'whiskey'],
      };

      const isTimeMatch = timeMatches[context.timeOfDay as keyof typeof timeMatches]
        ?.some(term => cocktail.name.toLowerCase().includes(term) ||
                       cocktail.category.toLowerCase().includes(term));
      if (isTimeMatch) {
        score += 5;
        reasons.push(`Great for ${context.timeOfDay} drinking`);
      }
    }

    // Occasion matching
    if (context.occasion) {
      const occasionMatches = {
        formal: cocktail.difficulty === 'intermediate' || cocktail.difficulty === 'expert',
        party: cocktail.category.includes('Party') || cocktail.name.includes('Punch'),
        romantic: cocktail.glass === 'coupe' || cocktail.glass === 'martini',
        casual: cocktail.difficulty === 'beginner',
      };

      if (occasionMatches[context.occasion as keyof typeof occasionMatches]) {
        score += 5;
        reasons.push(`Ideal for ${context.occasion} occasions`);
      }
    }

    return { score, reasons };
  }

  /**
   * Find similar cocktails
   */
  private static findSimilarCocktails(cocktail: any, database: any[]): string[] {
    return database
      .filter(other =>
        other.name !== cocktail.name &&
        (other.category === cocktail.category ||
         other.flavorProfile.some((f: string) => cocktail.flavorProfile.includes(f)))
      )
      .slice(0, 3)
      .map(c => c.name);
  }

  /**
   * Generate helpful tips
   */
  private static generateTips(
    cocktail: any,
    tasteProfile: UserTasteProfile,
    context: any = {}
  ): string[] {
    const tips = [];

    // Experience-based tips
    if (tasteProfile.experience === 'beginner' && cocktail.difficulty !== 'beginner') {
      tips.push('Take your time with the preparation - precision makes the difference');
    }

    // Flavor-based tips
    if (tasteProfile.flavorProfile.includes('sweet') && cocktail.flavorProfile.includes('sour')) {
      tips.push('Add a bit more simple syrup if you prefer sweeter drinks');
    }

    // Seasonal tips
    if (context.season === 'summer') {
      tips.push('Serve extra cold and consider adding extra ice');
    } else if (context.season === 'winter') {
      tips.push('This cocktail is perfect for cozy evenings');
    }

    // Glass-specific tips
    if (cocktail.glass === 'coupe') {
      tips.push('Chill your coupe glass in the freezer for best results');
    }

    // General quality tips
    tips.push('Use fresh ingredients whenever possible');

    if (cocktail.ingredients.some((ing: string) => ing.includes('citrus'))) {
      tips.push('Fresh-squeezed citrus juice makes all the difference');
    }

    return tips.slice(0, 3); // Limit to 3 tips
  }

  /**
   * Get expanded cocktail database with detailed information
   */
  private static getExpandedCocktailDatabase() {
    return [
      {
        name: 'Old Fashioned',
        description: 'The quintessential whiskey cocktail with sugar, bitters, and an orange twist.',
        ingredients: ['2 oz bourbon whiskey', '1/4 oz simple syrup', '2 dashes angostura bitters', 'orange peel'],
        instructions: [
          'Add simple syrup and bitters to a rocks glass',
          'Add ice and whiskey',
          'Stir until well chilled',
          'Express orange peel oils over drink and drop in glass'
        ],
        garnish: 'Orange peel',
        glass: 'rocks',
        difficulty: 'beginner' as const,
        prepTime: 3,
        alcoholContent: 'high' as const,
        flavorProfile: ['sweet', 'bitter', 'smoky'],
        category: 'Whiskey Cocktails',
        origin: 'United States, 1880s',
      },
      {
        name: 'Negroni',
        description: 'A perfect balance of gin, Campari, and sweet vermouth.',
        ingredients: ['1 oz gin', '1 oz campari', '1 oz sweet vermouth', 'orange peel'],
        instructions: [
          'Add all ingredients to a rocks glass filled with ice',
          'Stir until well chilled',
          'Garnish with orange peel'
        ],
        garnish: 'Orange peel',
        glass: 'rocks',
        difficulty: 'beginner' as const,
        prepTime: 2,
        alcoholContent: 'high' as const,
        flavorProfile: ['bitter', 'herbal', 'citrusy'],
        category: 'Gin Cocktails',
        origin: 'Italy, 1919',
      },
      {
        name: 'Espresso Martini',
        description: 'A sophisticated coffee cocktail that bridges the gap between dinner and late night.',
        ingredients: ['2 oz vodka', '1/2 oz coffee liqueur', '1 shot fresh espresso', '1/4 oz simple syrup'],
        instructions: [
          'Add all ingredients to a shaker with ice',
          'Shake vigorously for 10-15 seconds',
          'Double strain into a chilled coupe glass',
          'Garnish with three coffee beans'
        ],
        garnish: 'Three coffee beans',
        glass: 'coupe',
        difficulty: 'intermediate' as const,
        prepTime: 5,
        alcoholContent: 'medium' as const,
        flavorProfile: ['sweet', 'bitter'],
        category: 'Vodka Cocktails',
        origin: 'London, 1980s',
      },
      {
        name: 'Mojito',
        description: 'A refreshing Cuban cocktail with rum, lime, mint, and soda water.',
        ingredients: ['2 oz white rum', '1 oz fresh lime juice', '3/4 oz simple syrup', '8-10 mint leaves', 'soda water'],
        instructions: [
          'Gently muddle mint leaves in the bottom of a highball glass',
          'Add lime juice and simple syrup',
          'Fill glass with crushed ice',
          'Add rum and stir',
          'Top with soda water',
          'Garnish with fresh mint sprig'
        ],
        garnish: 'Fresh mint sprig',
        glass: 'highball',
        difficulty: 'intermediate' as const,
        prepTime: 4,
        alcoholContent: 'medium' as const,
        flavorProfile: ['citrusy', 'herbal', 'sweet'],
        category: 'Rum Cocktails',
        origin: 'Cuba, 16th century',
      },
      {
        name: 'Whiskey Sour',
        description: 'A classic sour cocktail with whiskey, lemon juice, and simple syrup.',
        ingredients: ['2 oz bourbon whiskey', '3/4 oz fresh lemon juice', '3/4 oz simple syrup', 'egg white (optional)'],
        instructions: [
          'Add all ingredients to a shaker',
          'Dry shake (without ice) if using egg white',
          'Add ice and shake vigorously',
          'Strain into a rocks glass over fresh ice',
          'Garnish with lemon wheel and cherry'
        ],
        garnish: 'Lemon wheel and cherry',
        glass: 'rocks',
        difficulty: 'beginner' as const,
        prepTime: 4,
        alcoholContent: 'medium' as const,
        flavorProfile: ['sour', 'sweet'],
        category: 'Whiskey Cocktails',
        origin: 'United States, 1860s',
      },
      {
        name: 'Gin & Tonic',
        description: 'The quintessential highball drink with gin and tonic water.',
        ingredients: ['2 oz gin', '4-6 oz tonic water', 'lime wedge'],
        instructions: [
          'Fill a highball glass with ice',
          'Add gin',
          'Top with tonic water',
          'Stir gently',
          'Garnish with lime wedge'
        ],
        garnish: 'Lime wedge',
        glass: 'highball',
        difficulty: 'beginner' as const,
        prepTime: 1,
        alcoholContent: 'medium' as const,
        flavorProfile: ['herbal', 'citrusy', 'bitter'],
        category: 'Gin Cocktails',
        origin: 'British India, 1850s',
      },
      // Add more cocktails as needed...
    ];
  }

  /**
   * Create personalized cocktail based on exact preferences
   */
  static async createCustomCocktail(
    homeBar: HomeBar,
    tasteProfile: UserTasteProfile,
    preferences: {
      mustInclude?: string[];
      avoid?: string[];
      maxIngredients?: number;
      preferredGlass?: string;
    }
  ): Promise<SmartRecommendation | null> {
    // This would use AI to generate a completely custom cocktail
    // For now, return a mock custom cocktail

    const customCocktail = {
      name: 'Your Perfect Cocktail',
      description: 'A custom cocktail crafted specifically for your taste preferences.',
      ingredients: this.generateCustomIngredients(homeBar, tasteProfile, preferences),
      instructions: [
        'Combine ingredients based on your preferences',
        'Adjust to taste',
        'Serve and enjoy'
      ],
      garnish: 'Based on available ingredients',
      glass: preferences.preferredGlass || 'rocks',
      difficulty: 'intermediate' as const,
      prepTime: 5,
      alcoholContent: tasteProfile.drinkStrength as 'low' | 'medium' | 'high',
      flavorProfile: tasteProfile.flavorProfile,
      category: 'Custom Creation',
      origin: 'Created just for you',
    };

    return {
      cocktail: customCocktail,
      matchScore: 100,
      reasoning: {
        whyRecommended: ['Custom-made for your exact preferences'],
        tasteMatch: tasteProfile.flavorProfile,
        availabilityMatch: 'Uses only your available ingredients',
        experienceMatch: 'Perfectly matched to your skill level',
      },
      canMakeNow: true,
      missingIngredients: [],
      similarCocktails: [],
      tips: ['This is your personalized recipe - feel free to adjust ratios to taste'],
    };
  }

  /**
   * Generate custom ingredients list based on user preferences
   */
  private static generateCustomIngredients(
    homeBar: HomeBar,
    tasteProfile: UserTasteProfile,
    preferences: any
  ): string[] {
    const available = homeBar.ingredients.map(ing => ing.name);
    const ingredients = [];

    // Add preferred spirit
    const preferredSpirits = available.filter(ing =>
      tasteProfile.preferredSpirits.some(pref =>
        ing.toLowerCase().includes(pref.toLowerCase())
      )
    );

    if (preferredSpirits.length > 0) {
      ingredients.push(`2 oz ${preferredSpirits[0]}`);
    }

    // Add flavor components based on profile
    if (tasteProfile.flavorProfile.includes('citrusy')) {
      ingredients.push('3/4 oz fresh lemon juice');
    }

    if (tasteProfile.flavorProfile.includes('sweet')) {
      ingredients.push('1/2 oz simple syrup');
    }

    // Add garnish
    ingredients.push('Garnish of choice');

    return ingredients.slice(0, preferences.maxIngredients || 4);
  }

  /**
   * Get cocktail recommendations specifically for a recognized spirit
   */
  static async getRecommendationsForSpirit(
    spirit: any,
    homeBar: HomeBar,
    tasteProfile: any
  ): Promise<Array<{
    id: string;
    name: string;
    category: string;
    difficulty: string;
    rating: number;
    description: string;
    canMake: boolean;
    missingIngredients: string[];
  }>> {
    // Mock cocktail database filtered by spirit
    const spiritCocktails = {
      vodka: [
        {
          id: 'moscow-mule',
          name: 'Moscow Mule',
          category: 'Vodka Cocktails',
          difficulty: 'Easy',
          rating: 4.6,
          description: 'Refreshing vodka cocktail with ginger beer and lime',
          ingredients: ['vodka', 'ginger beer', 'lime juice']
        },
        {
          id: 'bloody-mary',
          name: 'Bloody Mary',
          category: 'Vodka Cocktails',
          difficulty: 'Medium',
          rating: 4.3,
          description: 'Savory brunch cocktail with tomato juice and spices',
          ingredients: ['vodka', 'tomato juice', 'worcestershire', 'hot sauce']
        },
        {
          id: 'espresso-martini',
          name: 'Espresso Martini',
          category: 'Vodka Cocktails',
          difficulty: 'Medium',
          rating: 4.8,
          description: 'Sophisticated coffee cocktail for evening enjoyment',
          ingredients: ['vodka', 'coffee liqueur', 'espresso', 'simple syrup']
        }
      ],
      gin: [
        {
          id: 'gin-tonic',
          name: 'Gin & Tonic',
          category: 'Gin Cocktails',
          difficulty: 'Easy',
          rating: 4.5,
          description: 'Classic highball with botanical gin and tonic water',
          ingredients: ['gin', 'tonic water', 'lime']
        },
        {
          id: 'negroni',
          name: 'Negroni',
          category: 'Gin Cocktails',
          difficulty: 'Easy',
          rating: 4.7,
          description: 'Bitter and sweet Italian aperitif cocktail',
          ingredients: ['gin', 'campari', 'sweet vermouth']
        },
        {
          id: 'bee-knees',
          name: "Bee's Knees",
          category: 'Gin Cocktails',
          difficulty: 'Easy',
          rating: 4.4,
          description: 'Prohibition-era cocktail with honey syrup',
          ingredients: ['gin', 'honey syrup', 'lemon juice']
        }
      ],
      whiskey: [
        {
          id: 'old-fashioned',
          name: 'Old Fashioned',
          category: 'Whiskey Cocktails',
          difficulty: 'Easy',
          rating: 4.8,
          description: 'Timeless whiskey cocktail with sugar and bitters',
          ingredients: ['whiskey', 'simple syrup', 'angostura bitters']
        },
        {
          id: 'manhattan',
          name: 'Manhattan',
          category: 'Whiskey Cocktails',
          difficulty: 'Easy',
          rating: 4.7,
          description: 'Elegant stirred cocktail with sweet vermouth',
          ingredients: ['whiskey', 'sweet vermouth', 'angostura bitters']
        },
        {
          id: 'whiskey-sour',
          name: 'Whiskey Sour',
          category: 'Whiskey Cocktails',
          difficulty: 'Medium',
          rating: 4.6,
          description: 'Balanced sour cocktail with egg white foam',
          ingredients: ['whiskey', 'lemon juice', 'simple syrup', 'egg white']
        }
      ],
      rum: [
        {
          id: 'mojito',
          name: 'Mojito',
          category: 'Rum Cocktails',
          difficulty: 'Medium',
          rating: 4.5,
          description: 'Fresh Cuban cocktail with mint and lime',
          ingredients: ['white rum', 'lime juice', 'mint', 'simple syrup', 'soda water']
        },
        {
          id: 'daiquiri',
          name: 'Daiquiri',
          category: 'Rum Cocktails',
          difficulty: 'Easy',
          rating: 4.6,
          description: 'Simple and perfect rum sour cocktail',
          ingredients: ['white rum', 'lime juice', 'simple syrup']
        },
        {
          id: 'dark-stormy',
          name: "Dark 'n' Stormy",
          category: 'Rum Cocktails',
          difficulty: 'Easy',
          rating: 4.4,
          description: 'Bermudian highball with dark rum and ginger beer',
          ingredients: ['dark rum', 'ginger beer', 'lime juice']
        }
      ],
      tequila: [
        {
          id: 'margarita',
          name: 'Margarita',
          category: 'Tequila Cocktails',
          difficulty: 'Easy',
          rating: 4.7,
          description: 'Classic Mexican cocktail with lime and orange liqueur',
          ingredients: ['tequila', 'lime juice', 'triple sec', 'salt']
        },
        {
          id: 'paloma',
          name: 'Paloma',
          category: 'Tequila Cocktails',
          difficulty: 'Easy',
          rating: 4.5,
          description: 'Refreshing tequila highball with grapefruit',
          ingredients: ['tequila', 'grapefruit juice', 'lime juice', 'soda water']
        },
        {
          id: 'tommy-margarita',
          name: "Tommy's Margarita",
          category: 'Tequila Cocktails',
          difficulty: 'Easy',
          rating: 4.6,
          description: 'Agave-forward margarita variation with agave nectar',
          ingredients: ['tequila', 'lime juice', 'agave nectar']
        }
      ]
    };

    // Get cocktails for the recognized spirit
    const spiritCategory = spirit.subcategory || spirit.category || 'vodka';
    const cocktails = spiritCocktails[spiritCategory as keyof typeof spiritCocktails] || spiritCocktails.vodka;

    // Check which cocktails can be made with current home bar
    const availableIngredients = homeBar.ingredients.map(ing => ing.name.toLowerCase());

    return cocktails.map(cocktail => {
      const requiredIngredients = cocktail.ingredients.map(ing => ing.toLowerCase());
      const missingIngredients = requiredIngredients.filter(
        ingredient => !availableIngredients.some(available =>
          available.includes(ingredient) || ingredient.includes(available)
        )
      );

      return {
        ...cocktail,
        canMake: missingIngredients.length <= 1, // Allow up to 1 missing ingredient
        missingIngredients
      };
    });
  }
}