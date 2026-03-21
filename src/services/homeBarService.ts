import { log } from '../lib/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BarIngredient {
  id: string;
  name: string;
  category: 'spirit' | 'liqueur' | 'mixer' | 'bitters' | 'syrup' | 'garnish' | 'ingredient' | 'other';
  subcategory?: string; // e.g., 'whiskey', 'gin', 'citrus', etc.
  brand?: string;
  abv?: number; // Alcohol by volume percentage
  volume?: number; // Volume in ml
  notes?: string;
  addedAt: Date;
  expiryDate?: Date;
  isFavorite: boolean;
  tags: string[];
  imageUrl?: string;
}

export interface HomeBar {
  id: string;
  userId: string;
  name: string;
  description?: string;
  ingredients: BarIngredient[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

export interface IngredientSuggestion {
  name: string;
  category: BarIngredient['category'];
  subcategory?: string;
  commonBrands: string[];
  description: string;
  averagePrice: number;
  essentialLevel: 'must-have' | 'recommended' | 'nice-to-have';
  usedInCocktails: string[];
}

/**
 * Comprehensive mock inventory for testing all icon variations
 */
export const COMPREHENSIVE_MOCK_INVENTORY: BarIngredient[] = [
  // SPIRITS - All variations
  { id: '1', name: 'Tito\'s Vodka', category: 'spirit', subcategory: 'vodka', brand: 'Tito\'s', abv: 40, volume: 750, addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '2', name: 'Hendrick\'s Gin', category: 'spirit', subcategory: 'gin', brand: 'Hendrick\'s', abv: 44, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '3', name: 'Buffalo Trace Bourbon', category: 'spirit', subcategory: 'whiskey', brand: 'Buffalo Trace', abv: 45, volume: 750, addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '4', name: 'Bacardi White Rum', category: 'spirit', subcategory: 'rum', brand: 'Bacardi', abv: 40, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '5', name: 'Patrón Silver Tequila', category: 'spirit', subcategory: 'tequila', brand: 'Patrón', abv: 40, volume: 750, addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '6', name: 'Mezcal Vida', category: 'spirit', subcategory: 'mezcal', brand: 'Del Maguey', abv: 42, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '7', name: 'Cognac VSOP', category: 'spirit', subcategory: 'cognac', brand: 'Hennessy', abv: 40, volume: 700, addedAt: new Date(), isFavorite: false, tags: [] },

  // LIQUEURS - Different types
  { id: '8', name: 'Cointreau', category: 'liqueur', subcategory: 'triple sec', brand: 'Cointreau', abv: 40, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '9', name: 'Amaretto', category: 'liqueur', subcategory: 'amaretto', brand: 'Disaronno', abv: 28, volume: 700, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '10', name: 'Kahlúa', category: 'liqueur', subcategory: 'coffee liqueur', brand: 'Kahlúa', abv: 20, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '11', name: 'Baileys Irish Cream', category: 'liqueur', subcategory: 'cream liqueur', brand: 'Baileys', abv: 17, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '12', name: 'Campari', category: 'liqueur', subcategory: 'bitter liqueur', brand: 'Campari', abv: 25, volume: 750, addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '13', name: 'St-Germain', category: 'liqueur', subcategory: 'elderflower', brand: 'St-Germain', abv: 20, volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },

  // MIXERS - All types
  { id: '14', name: 'Tonic Water', category: 'mixer', subcategory: 'tonic', brand: 'Fever-Tree', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '15', name: 'Soda Water', category: 'mixer', subcategory: 'soda', brand: 'Perrier', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '16', name: 'Ginger Beer', category: 'mixer', subcategory: 'ginger beer', brand: 'Fever-Tree', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '17', name: 'Cola', category: 'mixer', subcategory: 'cola', brand: 'Coca-Cola', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '18', name: 'Orange Juice', category: 'mixer', subcategory: 'juice', brand: 'Tropicana', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '19', name: 'Cranberry Juice', category: 'mixer', subcategory: 'juice', brand: 'Ocean Spray', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '20', name: 'Pineapple Juice', category: 'mixer', subcategory: 'juice', brand: 'Dole', volume: 1000, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '21', name: 'Coconut Cream', category: 'mixer', subcategory: 'cream', brand: 'Coco López', volume: 425, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '22', name: 'Heavy Cream', category: 'mixer', subcategory: 'cream', brand: 'Organic Valley', volume: 473, addedAt: new Date(), isFavorite: false, tags: [] },

  // SYRUPS - Different flavors
  { id: '23', name: 'Simple Syrup', category: 'syrup', subcategory: 'simple', volume: 375, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '24', name: 'Grenadine', category: 'syrup', subcategory: 'grenadine', brand: 'Monin', volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '25', name: 'Honey Syrup', category: 'syrup', subcategory: 'honey', volume: 375, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '26', name: 'Agave Syrup', category: 'syrup', subcategory: 'agave', brand: 'Organic Blue Agave', volume: 375, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '27', name: 'Orgeat', category: 'syrup', subcategory: 'orgeat', brand: 'Monin', volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '28', name: 'Vanilla Syrup', category: 'syrup', subcategory: 'vanilla', brand: 'Torani', volume: 750, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '29', name: 'Ginger Syrup', category: 'syrup', subcategory: 'ginger', volume: 375, addedAt: new Date(), isFavorite: false, tags: [] },

  // BITTERS - All types
  { id: '30', name: 'Angostura Bitters', category: 'bitters', subcategory: 'aromatic', brand: 'Angostura', volume: 118, addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '31', name: 'Orange Bitters', category: 'bitters', subcategory: 'orange', brand: 'Regan\'s', volume: 148, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '32', name: 'Peychaud\'s Bitters', category: 'bitters', subcategory: 'aromatic', brand: 'Peychaud\'s', volume: 148, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '33', name: 'Chocolate Bitters', category: 'bitters', subcategory: 'chocolate', brand: 'Fee Brothers', volume: 148, addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '34', name: 'Celery Bitters', category: 'bitters', subcategory: 'celery', brand: 'Bitter Truth', volume: 200, addedAt: new Date(), isFavorite: false, tags: [] },

  // GARNISHES - All types
  { id: '35', name: 'Lemons', category: 'garnish', subcategory: 'citrus', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '36', name: 'Limes', category: 'garnish', subcategory: 'citrus', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '37', name: 'Oranges', category: 'garnish', subcategory: 'citrus', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '38', name: 'Maraschino Cherries', category: 'garnish', subcategory: 'cherry', brand: 'Luxardo', addedAt: new Date(), isFavorite: true, tags: [] },
  { id: '39', name: 'Green Olives', category: 'garnish', subcategory: 'olive', brand: 'Castelvetrano', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '40', name: 'Fresh Mint', category: 'garnish', subcategory: 'herbs', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '41', name: 'Fresh Basil', category: 'garnish', subcategory: 'herbs', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '42', name: 'Rosemary', category: 'garnish', subcategory: 'herbs', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '43', name: 'Cucumber', category: 'garnish', subcategory: 'vegetables', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '44', name: 'Celery Stalks', category: 'garnish', subcategory: 'vegetables', addedAt: new Date(), isFavorite: false, tags: [] },

  // INGREDIENTS - Misc
  { id: '45', name: 'Egg Whites', category: 'ingredient', subcategory: 'eggs', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '46', name: 'Sugar', category: 'ingredient', subcategory: 'sweetener', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '47', name: 'Salt', category: 'ingredient', subcategory: 'seasoning', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '48', name: 'Black Pepper', category: 'ingredient', subcategory: 'spice', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '49', name: 'Hot Sauce', category: 'ingredient', subcategory: 'condiment', brand: 'Tabasco', addedAt: new Date(), isFavorite: false, tags: [] },
  { id: '50', name: 'Worcestershire Sauce', category: 'ingredient', subcategory: 'condiment', brand: 'Lea & Perrins', addedAt: new Date(), isFavorite: false, tags: [] },
];

/**
 * Home Bar Service
 * Manages user's home bar inventory and provides cocktail suggestions
 */
export class HomeBarService {
  private static STORAGE_KEY = 'home_bar_ingredients';

  /**
   * Add ingredient to home bar inventory
   */
  static async addIngredient(ingredient: BarIngredient): Promise<void> {
    try {
      const existingIngredients = await this.getStoredIngredients();
      const updatedIngredients = [...existingIngredients, ingredient];

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedIngredients));

      // Track achievement for adding to home bar
      try {
        const { achievementService } = require('./achievementService');
        await achievementService.trackAction('homeBarIngredients', 1);
      } catch {
        // Achievement tracking should never block inventory writes.
      }
    } catch (error) {
      log.error('HomeBarService', 'Failed to add ingredient to home bar', error);
      throw new Error('Failed to add ingredient to home bar');
    }
  }

  /**
   * Get stored ingredients from AsyncStorage
   */
  static async getStoredIngredients(): Promise<BarIngredient[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);

      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      }));
    } catch (error) {
      log.error('HomeBarService', 'Failed to load stored ingredients', error);
      return [];
    }
  }

  /**
   * Clear stored ingredients (for testing)
   */
  static async clearStoredIngredients(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      log.error('HomeBarService', 'Failed to clear stored ingredients', error);
    }
  }

  /**
   * Remove ingredient(s) from local home bar storage by name and optional category.
   */
  static async removeIngredientByName(name: string, category?: string): Promise<void> {
    try {
      const existingIngredients = await this.getStoredIngredients();
      const targetName = name.trim().toLowerCase();
      const targetCategory = category?.trim().toLowerCase();

      const filtered = existingIngredients.filter((item) => {
        const sameName = item.name.trim().toLowerCase() === targetName;
        const sameCategory = !targetCategory || (item.category || '').toLowerCase() === targetCategory;
        return !(sameName && sameCategory);
      });

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      log.error('HomeBarService', 'Failed to remove ingredient from local storage', error);
      throw new Error('Failed to remove ingredient from local storage');
    }
  }

  /**
   * Update a locally stored ingredient by name/category.
   */
  static async updateStoredIngredient(
    name: string,
    category: string | undefined,
    updates: Partial<Pick<BarIngredient, 'notes' | 'isFavorite' | 'tags' | 'brand' | 'volume' | 'abv'>>
  ): Promise<void> {
    try {
      const existingIngredients = await this.getStoredIngredients();
      const targetName = name.trim().toLowerCase();
      const targetCategory = category?.trim().toLowerCase();

      const updatedIngredients = existingIngredients.map((item) => {
        const sameName = item.name.trim().toLowerCase() === targetName;
        const sameCategory = !targetCategory || (item.category || '').toLowerCase() === targetCategory;
        if (!sameName || !sameCategory) return item;

        return {
          ...item,
          ...updates,
        };
      });

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedIngredients));
    } catch (error) {
      log.error('HomeBarService', 'Failed to update local ingredient', error);
      throw new Error('Failed to update local ingredient');
    }
  }

  /**
   * Load comprehensive mock inventory (for testing all icon variations)
   */
  static async loadComprehensiveMockInventory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(COMPREHENSIVE_MOCK_INVENTORY));
      log.info('HomeBarService', 'Comprehensive mock inventory loaded', { count: COMPREHENSIVE_MOCK_INVENTORY.length });
    } catch (error) {
      log.error('HomeBarService', 'Failed to load comprehensive mock inventory', error);
    }
  }

  /**
   * Get essential ingredients for a starter bar
   */
  static getStarterBarIngredients(): IngredientSuggestion[] {
    return [
      // Must-have Spirits
      {
        name: 'Vodka',
        category: 'spirit',
        subcategory: 'vodka',
        commonBrands: ['Tito\'s', 'Grey Goose', 'Belvedere', 'Absolut'],
        description: 'Neutral spirit perfect for many cocktails',
        averagePrice: 25,
        essentialLevel: 'must-have',
        usedInCocktails: ['Moscow Mule', 'Cosmopolitan', 'Bloody Mary', 'Martini']
      },
      {
        name: 'Gin',
        category: 'spirit',
        subcategory: 'gin',
        commonBrands: ['Hendrick\'s', 'Bombay Sapphire', 'Tanqueray', 'Beefeater'],
        description: 'Juniper-forward spirit for classic cocktails',
        averagePrice: 30,
        essentialLevel: 'must-have',
        usedInCocktails: ['Gin & Tonic', 'Martini', 'Negroni', 'Tom Collins']
      },
      {
        name: 'White Rum',
        category: 'spirit',
        subcategory: 'rum',
        commonBrands: ['Bacardi', 'Havana Club', 'Mount Gay', 'Flor de Caña'],
        description: 'Light rum for tropical and classic cocktails',
        averagePrice: 20,
        essentialLevel: 'must-have',
        usedInCocktails: ['Mojito', 'Daiquiri', 'Piña Colada', 'Cuba Libre']
      },
      {
        name: 'Bourbon Whiskey',
        category: 'spirit',
        subcategory: 'whiskey',
        commonBrands: ['Buffalo Trace', 'Maker\'s Mark', 'Wild Turkey', 'Bulleit'],
        description: 'American whiskey for classic whiskey cocktails',
        averagePrice: 35,
        essentialLevel: 'must-have',
        usedInCocktails: ['Old Fashioned', 'Whiskey Sour', 'Mint Julep', 'Manhattan']
      },

      // Must-have Mixers & Modifiers
      {
        name: 'Dry Vermouth',
        category: 'mixer',
        subcategory: 'vermouth',
        commonBrands: ['Dolin', 'Noilly Prat', 'Martini & Rossi'],
        description: 'Essential for martinis and other cocktails',
        averagePrice: 15,
        essentialLevel: 'must-have',
        usedInCocktails: ['Martini', 'Gibson', 'Vesper']
      },
      {
        name: 'Sweet Vermouth',
        category: 'mixer',
        subcategory: 'vermouth',
        commonBrands: ['Carpano Antica', 'Dolin Rouge', 'Cinzano'],
        description: 'Key ingredient for Manhattans and Negronis',
        averagePrice: 18,
        essentialLevel: 'must-have',
        usedInCocktails: ['Manhattan', 'Negroni', 'Rob Roy']
      },

      // Must-have Bitters
      {
        name: 'Angostura Bitters',
        category: 'bitters',
        subcategory: 'aromatic',
        commonBrands: ['Angostura'],
        description: 'The most essential bitters for any home bar',
        averagePrice: 8,
        essentialLevel: 'must-have',
        usedInCocktails: ['Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Pink Gin']
      },

      // Must-have Syrups
      {
        name: 'Simple Syrup',
        category: 'syrup',
        commonBrands: ['Monin', 'Torani', 'Homemade'],
        description: 'Basic sweetener for countless cocktails',
        averagePrice: 5,
        essentialLevel: 'must-have',
        usedInCocktails: ['Mojito', 'Daiquiri', 'Whiskey Sour', 'Tom Collins']
      },

      // Recommended additions
      {
        name: 'Tequila Blanco',
        category: 'spirit',
        subcategory: 'tequila',
        commonBrands: ['Espolòn', 'Olmeca Altos', 'Cimarrón', 'Fortaleza'],
        description: 'Silver tequila for margaritas and agave cocktails',
        averagePrice: 25,
        essentialLevel: 'recommended',
        usedInCocktails: ['Margarita', 'Paloma', 'Tommy\'s Margarita']
      },
      {
        name: 'Orange Liqueur',
        category: 'liqueur',
        subcategory: 'orange',
        commonBrands: ['Cointreau', 'Grand Marnier', 'Triple Sec', 'Pierre Ferrand'],
        description: 'Essential for margaritas and many classics',
        averagePrice: 40,
        essentialLevel: 'recommended',
        usedInCocktails: ['Margarita', 'Cosmopolitan', 'Sidecar', 'Long Island']
      },
      {
        name: 'Fresh Lime Juice',
        category: 'mixer',
        subcategory: 'citrus',
        commonBrands: ['Fresh limes'],
        description: 'Fresh citrus is crucial for quality cocktails',
        averagePrice: 3,
        essentialLevel: 'recommended',
        usedInCocktails: ['Margarita', 'Mojito', 'Gimlet', 'Moscow Mule']
      },
      {
        name: 'Fresh Lemon Juice',
        category: 'mixer',
        subcategory: 'citrus',
        commonBrands: ['Fresh lemons'],
        description: 'Essential citrus for whiskey and gin cocktails',
        averagePrice: 3,
        essentialLevel: 'recommended',
        usedInCocktails: ['Whiskey Sour', 'Tom Collins', 'Bee\'s Knees', 'Aviation']
      }
    ];
  }

  /**
   * Check which cocktails can be made with available ingredients
   */
  static getAvailableCocktails(homeBar: HomeBar): Array<{
    name: string;
    ingredients: string[];
    missingIngredients: string[];
    canMake: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
  }> {
    const availableIngredients = homeBar.ingredients.map(i => i.name.toLowerCase());

    const cocktailRecipes = this.getCocktailDatabase();

    return cocktailRecipes.map(cocktail => {
      const requiredIngredients = cocktail.ingredients.map(ing => ing.toLowerCase());
      const missingIngredients = requiredIngredients.filter(
        ingredient => !availableIngredients.some(available =>
          available.includes(ingredient) || ingredient.includes(available)
        )
      );

      return {
        name: cocktail.name,
        ingredients: cocktail.ingredients,
        missingIngredients,
        canMake: missingIngredients.length === 0,
        difficulty: cocktail.difficulty,
        category: cocktail.category,
      };
    });
  }

  /**
   * Get cocktail suggestions based on user's taste profile
   */
  static getCocktailSuggestions(
    homeBar: HomeBar,
    tasteProfile: {
      preferredSpirits: string[];
      flavorProfile: ('sweet' | 'sour' | 'bitter' | 'herbal' | 'fruity' | 'spicy')[];
      drinkStrength: 'light' | 'medium' | 'strong';
      experience: 'beginner' | 'intermediate' | 'expert';
    }
  ) {
    const availableCocktails = this.getAvailableCocktails(homeBar);
    const canMakeCocktails = availableCocktails.filter(c => c.canMake);
    const almostCanMake = availableCocktails.filter(c => c.missingIngredients.length === 1);

    // Score cocktails based on taste profile
    const scoredCocktails = [...canMakeCocktails, ...almostCanMake].map(cocktail => {
      let score = 0;

      // Preferred spirits bonus
      const hasPreferredSpirit = tasteProfile.preferredSpirits.some(spirit =>
        cocktail.ingredients.some(ing => ing.toLowerCase().includes(spirit.toLowerCase()))
      );
      if (hasPreferredSpirit) score += 3;

      // Experience level matching
      if (tasteProfile.experience === 'beginner' && cocktail.difficulty === 'easy') score += 2;
      if (tasteProfile.experience === 'expert' && cocktail.difficulty === 'hard') score += 1;

      // Can make vs almost can make
      if (cocktail.canMake) score += 5;
      else score += 2; // Almost can make

      return {
        ...cocktail,
        score,
        recommendation: cocktail.canMake ? 'can_make' : 'missing_one' as 'can_make' | 'missing_one'
      };
    });

    return scoredCocktails
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Suggest ingredients to buy next
   */
  static getIngredientSuggestions(homeBar: HomeBar): IngredientSuggestion[] {
    const currentIngredients = homeBar.ingredients.map(i => i.name.toLowerCase());
    const starterIngredients = this.getStarterBarIngredients();

    // Filter out ingredients already in bar
    const missingSuggestions = starterIngredients.filter(suggestion =>
      !currentIngredients.some(current =>
        current.includes(suggestion.name.toLowerCase()) ||
        suggestion.name.toLowerCase().includes(current)
      )
    );

    // Sort by essential level and potential cocktail impact
    return missingSuggestions.sort((a, b) => {
      const levelPriority = { 'must-have': 3, 'recommended': 2, 'nice-to-have': 1 };
      const aPriority = levelPriority[a.essentialLevel];
      const bPriority = levelPriority[b.essentialLevel];

      if (aPriority !== bPriority) return bPriority - aPriority;

      // Secondary sort by number of cocktails it enables
      return b.usedInCocktails.length - a.usedInCocktails.length;
    });
  }

  /**
   * Get a basic cocktail database
   */
  private static getCocktailDatabase() {
    return [
      {
        name: 'Old Fashioned',
        ingredients: ['bourbon whiskey', 'simple syrup', 'angostura bitters', 'orange peel'],
        difficulty: 'easy' as const,
        category: 'Whiskey Cocktails'
      },
      {
        name: 'Manhattan',
        ingredients: ['bourbon whiskey', 'sweet vermouth', 'angostura bitters', 'cherry'],
        difficulty: 'easy' as const,
        category: 'Whiskey Cocktails'
      },
      {
        name: 'Negroni',
        ingredients: ['gin', 'sweet vermouth', 'campari', 'orange peel'],
        difficulty: 'easy' as const,
        category: 'Gin Cocktails'
      },
      {
        name: 'Gin & Tonic',
        ingredients: ['gin', 'tonic water', 'lime'],
        difficulty: 'easy' as const,
        category: 'Gin Cocktails'
      },
      {
        name: 'Martini',
        ingredients: ['gin', 'dry vermouth', 'olive'],
        difficulty: 'medium' as const,
        category: 'Gin Cocktails'
      },
      {
        name: 'Mojito',
        ingredients: ['white rum', 'fresh lime juice', 'simple syrup', 'mint', 'soda water'],
        difficulty: 'medium' as const,
        category: 'Rum Cocktails'
      },
      {
        name: 'Daiquiri',
        ingredients: ['white rum', 'fresh lime juice', 'simple syrup'],
        difficulty: 'easy' as const,
        category: 'Rum Cocktails'
      },
      {
        name: 'Rum Punch',
        ingredients: ['white rum', 'dark rum', 'pineapple juice', 'orange juice', 'fresh lime juice', 'grenadine'],
        difficulty: 'easy' as const,
        category: 'Rum Cocktails'
      },
      {
        name: 'Margarita',
        ingredients: ['tequila blanco', 'orange liqueur', 'fresh lime juice', 'salt'],
        difficulty: 'easy' as const,
        category: 'Tequila Cocktails'
      },
      {
        name: 'Moscow Mule',
        ingredients: ['vodka', 'fresh lime juice', 'ginger beer'],
        difficulty: 'easy' as const,
        category: 'Vodka Cocktails'
      },
      {
        name: 'Whiskey Sour',
        ingredients: ['bourbon whiskey', 'fresh lemon juice', 'simple syrup', 'egg white'],
        difficulty: 'medium' as const,
        category: 'Whiskey Cocktails'
      }
    ];
  }

  /**
   * Parse spirit from image recognition result
   */
  static parseRecognizedSpirit(recognitionResult: {
    labels: string[];
    text?: string[];
    confidence: number;
  }): Partial<BarIngredient> | null {
    const { labels, text, confidence } = recognitionResult;

    if (confidence < 0.7) {
      return null; // Low confidence
    }

    // Combine labels and text for analysis
    const allText = [...labels, ...(text || [])].join(' ').toLowerCase();

    // Detect spirit category
    let category: BarIngredient['category'] = 'other';
    let subcategory: string | undefined;
    let name = '';

    // Spirit detection
    if (allText.match(/(vodka|absolut|grey goose|belvedere|tito)/)) {
      category = 'spirit';
      subcategory = 'vodka';
      name = this.extractBrandName(allText, ['absolut', 'grey goose', 'belvedere', 'tito', 'smirnoff']);
    } else if (allText.match(/(gin|hendrick|bombay|tanqueray|beefeater)/)) {
      category = 'spirit';
      subcategory = 'gin';
      name = this.extractBrandName(allText, ['hendrick', 'bombay sapphire', 'tanqueray', 'beefeater']);
    } else if (allText.match(/(whiskey|bourbon|rye|buffalo trace|maker|wild turkey)/)) {
      category = 'spirit';
      subcategory = 'whiskey';
      name = this.extractBrandName(allText, ['buffalo trace', 'maker\'s mark', 'wild turkey', 'bulleit']);
    } else if (allText.match(/(rum|bacardi|havana|mount gay)/)) {
      category = 'spirit';
      subcategory = 'rum';
      name = this.extractBrandName(allText, ['bacardi', 'havana club', 'mount gay']);
    } else if (allText.match(/(tequila|patron|don julio|herradura)/)) {
      category = 'spirit';
      subcategory = 'tequila';
      name = this.extractBrandName(allText, ['patron', 'don julio', 'herradura']);
    }

    if (name) {
      return {
        name: name || 'Unknown Spirit',
        category,
        subcategory,
        addedAt: new Date(),
        isFavorite: false,
        tags: ['recognized', 'camera'],
      };
    }

    return null;
  }

  /**
   * Extract brand name from text
   */
  private static extractBrandName(text: string, brands: string[]): string {
    for (const brand of brands) {
      if (text.includes(brand.toLowerCase())) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    return '';
  }

  /**
   * Get default taste profile questions
   */
  static getTasteProfileQuestions() {
    return [
      {
        id: 'preferred_spirits',
        question: 'Which spirits do you enjoy most?',
        type: 'multiple_choice' as const,
        options: [
          { value: 'vodka', label: 'Vodka' },
          { value: 'gin', label: 'Gin' },
          { value: 'whiskey', label: 'Whiskey/Bourbon' },
          { value: 'rum', label: 'Rum' },
          { value: 'tequila', label: 'Tequila' },
          { value: 'brandy', label: 'Brandy/Cognac' },
        ]
      },
      {
        id: 'flavor_profile',
        question: 'What flavors do you prefer?',
        type: 'multiple_choice' as const,
        options: [
          { value: 'sweet', label: 'Sweet' },
          { value: 'sour', label: 'Sour/Tart' },
          { value: 'bitter', label: 'Bitter' },
          { value: 'herbal', label: 'Herbal' },
          { value: 'fruity', label: 'Fruity' },
          { value: 'spicy', label: 'Spicy' },
        ]
      },
      {
        id: 'drink_strength',
        question: 'How strong do you like your drinks?',
        type: 'single_choice' as const,
        options: [
          { value: 'light', label: 'Light & Easy' },
          { value: 'medium', label: 'Medium Strength' },
          { value: 'strong', label: 'Strong & Boozy' },
        ]
      },
      {
        id: 'experience',
        question: 'What\'s your bartending experience?',
        type: 'single_choice' as const,
        options: [
          { value: 'beginner', label: 'Beginner - Simple cocktails' },
          { value: 'intermediate', label: 'Intermediate - Some experience' },
          { value: 'expert', label: 'Expert - Complex cocktails' },
        ]
      }
    ];
  }

  /**
   * Get mock home bar data for testing
   */
  static async getMockHomeBar(): Promise<HomeBar> {
    return {
      id: 'mock-bar-1',
      userId: 'mock-user',
      name: 'My Home Bar',
      description: 'Starter home bar collection',
      ingredients: [
        {
          id: 'vodka-1',
          name: 'Tito\'s Vodka',
          category: 'spirit',
          subcategory: 'vodka',
          brand: 'Tito\'s',
          abv: 40,
          volume: 750,
          addedAt: new Date(),
          isFavorite: true,
          tags: ['neutral', 'versatile'],
        },
        {
          id: 'gin-1',
          name: 'Hendrick\'s Gin',
          category: 'spirit',
          subcategory: 'gin',
          brand: 'Hendrick\'s',
          abv: 44,
          volume: 750,
          addedAt: new Date(),
          isFavorite: false,
          tags: ['botanical', 'cucumber'],
        },
        {
          id: 'bourbon-1',
          name: 'Buffalo Trace Bourbon',
          category: 'spirit',
          subcategory: 'whiskey',
          brand: 'Buffalo Trace',
          abv: 45,
          volume: 750,
          addedAt: new Date(),
          isFavorite: true,
          tags: ['smooth', 'caramel'],
        },
        {
          id: 'vermouth-1',
          name: 'Dolin Dry Vermouth',
          category: 'mixer',
          subcategory: 'vermouth',
          brand: 'Dolin',
          abv: 17.5,
          volume: 375,
          addedAt: new Date(),
          isFavorite: false,
          tags: ['herbaceous', 'dry'],
        },
        {
          id: 'bitters-1',
          name: 'Angostura Bitters',
          category: 'bitters',
          subcategory: 'aromatic',
          brand: 'Angostura',
          abv: 44.7,
          volume: 200,
          addedAt: new Date(),
          isFavorite: false,
          tags: ['essential', 'aromatic'],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
    };
  }

  /**
   * Get educational content about spirits
   */
  static async getSpiritEducation(spiritCategory: string): Promise<{
    name: string;
    description: string;
    origin: string;
    production: string;
    characteristics: string[];
    cocktails: string[];
    education: {
      beginner: string;
      intermediate: string;
      expert: string;
    };
  }> {
    const educationData: { [key: string]: any } = {
      vodka: {
        name: 'Vodka',
        description: 'A clear, neutral spirit that originated in Eastern Europe. Vodka is prized for its purity and versatility in cocktails, allowing other flavors to shine through.',
        origin: 'Russia/Poland (disputed origin)',
        production: 'Distilled from fermented grains or potatoes, then filtered for purity',
        characteristics: ['neutral flavor', 'smooth texture', 'high proof', 'versatile'],
        cocktails: ['Moscow Mule', 'Bloody Mary', 'Martini', 'Cosmopolitan'],
        education: {
          beginner: 'Vodka is perfect for beginners because it mixes well with almost anything and has a clean taste.',
          intermediate: 'Learn about different vodka styles - grain vs potato, and how filtration affects taste.',
          expert: 'Explore premium vodkas and understand terroir in neutral spirits. Master classic vodka cocktails.'
        }
      },
      gin: {
        name: 'Gin',
        description: 'A juniper-forward spirit with botanical complexity. Gin\'s unique flavor profile makes it essential for classic cocktails and modern craft creations.',
        origin: 'Netherlands, perfected in England',
        production: 'Neutral spirit redistilled with botanicals, primarily juniper berries',
        characteristics: ['juniper forward', 'botanical complexity', 'aromatic', 'versatile'],
        cocktails: ['Gin & Tonic', 'Martini', 'Negroni', 'Tom Collins'],
        education: {
          beginner: 'Start with London Dry gin for classic cocktails. The juniper flavor is gin\'s signature.',
          intermediate: 'Explore different gin styles - London Dry, Plymouth, New Western, and Old Tom.',
          expert: 'Understand botanical profiles and how different gins work with various mixers and cocktails.'
        }
      },
      whiskey: {
        name: 'Whiskey',
        description: 'A complex spirit aged in wooden barrels, developing rich flavors over time. Whiskey varieties include bourbon, rye, Scotch, and Irish whiskey.',
        origin: 'Ireland/Scotland (disputed), with American variations',
        production: 'Distilled from fermented grain mash, aged in wooden barrels',
        characteristics: ['complex flavors', 'barrel aged', 'warming', 'sophisticated'],
        cocktails: ['Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Mint Julep'],
        education: {
          beginner: 'Start with bourbon for cocktails - it\'s sweet and approachable. Try an Old Fashioned.',
          intermediate: 'Learn the differences between bourbon, rye, Scotch, and Irish whiskey.',
          expert: 'Understand age statements, proof, and how different barrels affect flavor profiles.'
        }
      },
      rum: {
        name: 'Rum',
        description: 'A tropical spirit made from sugarcane, ranging from light and crisp to dark and molasses-rich. Essential for tiki and Caribbean cocktails.',
        origin: 'Caribbean islands',
        production: 'Distilled from sugarcane juice or molasses',
        characteristics: ['sweet undertones', 'tropical', 'diverse styles', 'mixable'],
        cocktails: ['Mojito', 'Daiquiri', 'Piña Colada', 'Dark \'n\' Stormy'],
        education: {
          beginner: 'White rum is perfect for tropical cocktails like Mojitos and Daiquiris.',
          intermediate: 'Explore aged rums and understand how different countries produce different styles.',
          expert: 'Master tiki culture and understand how different rum styles build complex cocktail profiles.'
        }
      },
      tequila: {
        name: 'Tequila',
        description: 'An agave-based spirit from Mexico with earthy, vegetal notes. Quality tequila showcases the unique terroir of the agave plant.',
        origin: 'Mexico (Tequila region)',
        production: 'Distilled from blue agave hearts (piñas)',
        characteristics: ['agave forward', 'earthy', 'vegetal', 'complex'],
        cocktails: ['Margarita', 'Paloma', 'Tommy\'s Margarita', 'Tequila Sunrise'],
        education: {
          beginner: 'Start with blanco (silver) tequila for margaritas. Look for 100% agave on the label.',
          intermediate: 'Learn about reposado and añejo aging, and how it affects flavor.',
          expert: 'Understand different agave regions and how terroir affects taste. Explore mezcal.'
        }
      }
    };

    return educationData[spiritCategory.toLowerCase()] || educationData.vodka;
  }
}
