import { searchHistoryService, SearchSuggestion } from './searchHistoryService';
import { ALL_COCKTAILS } from '../data/cocktails';

export interface SearchableItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: 'recipe' | 'spirit' | 'event' | 'user' | 'bar' | 'game';
  tags: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  abv?: number;
  time?: number; // in minutes
  popularity?: number; // 0-100 score
  image?: string;
  data: any; // Original data object
}

export interface FilterOptions {
  categories: string[];
  difficulties: string[];
  // Legacy aliases used by some screens
  category?: string[];
  difficulty?: string[];
  mood?: string[];
  abvRange: [number, number];
  timeRange: [number, number];
  ingredients: string[];
  equipment: string[];
  tags: string[];
  sortBy: 'relevance' | 'popularity' | 'recent' | 'difficulty' | 'time' | 'abv';
  sortOrder: 'asc' | 'desc' | 'alphabetical-asc' | 'alphabetical-desc' | 'rating-asc' | 'rating-desc';
  showOnlyFavorites: boolean;
  showOnlyCompleted: boolean;
}

class SearchService {
  private searchIndex: SearchableItem[] = [];

  // Initialize with sample data
  constructor() {
    this.initializeSearchIndex();
  }

  private initializeSearchIndex() {
    // Sample recipes
    const recipes: SearchableItem[] = [
      {
        id: 'old-fashioned',
        title: 'Old Fashioned',
        subtitle: 'Classic • Whiskey-based',
        description: 'A timeless cocktail made with whiskey, sugar, bitters, and an orange twist.',
        category: 'recipe',
        tags: ['classic', 'whiskey', 'simple', 'stirred'],
        difficulty: 'easy',
        abv: 35,
        time: 3,
        popularity: 95,
        image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=400&q=60',
        data: { ingredients: ['whiskey', 'sugar', 'bitters', 'orange'], type: 'stirred' }
      },
      // All comprehensive cocktail recipes
      ...this.getCocktailRecipes()
    ];

    // Sample spirits
    const spirits: SearchableItem[] = [
      {
        id: 'macallan-18',
        title: 'Macallan 18 Year',
        subtitle: 'Single Malt Scotch Whisky',
        description: 'Rich, complex whisky with notes of dried fruits, honey, and oak.',
        category: 'spirit',
        tags: ['scotch', 'whisky', 'aged', 'premium'],
        abv: 43,
        popularity: 92,
        image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=400&q=60',
        data: { type: 'whisky', origin: 'Scotland', age: 18 }
      },
      {
        id: 'hendricks-gin',
        title: "Hendrick's Gin",
        subtitle: 'Small Batch Gin',
        description: 'Distinctive gin infused with cucumber and rose petals.',
        category: 'spirit',
        tags: ['gin', 'botanical', 'premium', 'unique'],
        abv: 44,
        popularity: 85,
        image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=400&q=60',
        data: { type: 'gin', origin: 'Scotland', botanicals: ['cucumber', 'rose'] }
      }
    ];

    // Sample events
    const events: SearchableItem[] = [
      {
        id: 'mixology-masterclass',
        title: 'Mixology Master Class',
        subtitle: 'March 15, 2025 • 7:00 PM',
        description: 'Learn advanced cocktail techniques from expert mixologists.',
        category: 'event',
        tags: ['education', 'mixology', 'advanced', 'hands-on'],
        difficulty: 'medium',
        time: 120,
        popularity: 78,
        image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?auto=format&fit=crop&w=400&q=60',
        data: { date: '2025-03-15', duration: 120, type: 'workshop' }
      }
    ];

    // Sample users
    const users: SearchableItem[] = [
      {
        id: 'sarah-chen',
        title: 'Sarah Chen',
        subtitle: '@cocktail_sarah',
        description: 'Professional bartender at The Alchemist',
        category: 'user',
        tags: ['bartender', 'professional', 'verified'],
        popularity: 94,
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b359?auto=format&fit=crop&w=400&q=60',
        data: { username: 'cocktail_sarah', verified: true, location: 'New York' }
      }
    ];

    this.searchIndex = [...recipes, ...spirits, ...events, ...users];
  }

  private getCocktailRecipes(): SearchableItem[] {
    // Dynamically convert ALL_COCKTAILS to SearchableItem format
    return ALL_COCKTAILS.map(cocktail => ({
      id: cocktail.id,
      title: cocktail.name,
      subtitle: cocktail.subtitle || cocktail.era ? `${cocktail.era ? cocktail.era.charAt(0).toUpperCase() + cocktail.era.slice(1) : ''} • ${cocktail.base ? cocktail.base.charAt(0).toUpperCase() + cocktail.base.slice(1) : ''}-based` : undefined,
      description: cocktail.description,
      category: 'recipe' as const,
      tags: [
        cocktail.era || 'classic',
        cocktail.base || 'spirit',
        cocktail.difficulty?.toLowerCase() || 'medium',
        ...(cocktail.ingredients || []).map(ing =>
          typeof ing === 'string'
            ? ing.toLowerCase().split(' ').filter(word => word.length > 3)
            : []
        ).flat(),
        'cocktail'
      ].filter(Boolean),
      difficulty: (cocktail.difficulty?.toLowerCase() as 'easy' | 'medium' | 'hard') || 'medium',
      abv: this.estimateABV(cocktail.ingredients || []),
      time: this.parseTime(cocktail.time || '3 min'),
      popularity: cocktail.rating ? Math.round(cocktail.rating * 20) : Math.round(Math.random() * 30 + 70),
      image: cocktail.image,
      data: cocktail
    }));

    // Remove the old hardcoded recipes
    /*const cocktailRecipes = [
      // Pre-Prohibition & Golden Age
      {
        id: 'boulevardier',
        title: 'Boulevardier',
        subtitle: 'Pre-Prohibition • Whiskey-based',
        description: 'Bourbon-based Negroni variation, created at Chez Fonfon in Paris.',
        category: 'recipe' as const,
        tags: ['pre-prohibition', 'whiskey', 'bourbon', 'bitter', 'stirred', 'classic'],
        difficulty: 'easy' as const,
        abv: 32,
        time: 3,
        popularity: 85,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['bourbon whiskey', 'sweet vermouth', 'campari'],
          type: 'stirred',
          era: 'pre-prohibition',
          base: 'whiskey'
        }
      },
      {
        id: 'sazerac',
        title: 'Sazerac',
        subtitle: 'Pre-Prohibition • Rye-based',
        description: 'New Orleans classic with rye whiskey and absinthe rinse.',
        category: 'recipe' as const,
        tags: ['pre-prohibition', 'rye', 'whiskey', 'absinthe', 'stirred', 'classic', 'new-orleans'],
        difficulty: 'medium' as const,
        abv: 38,
        time: 4,
        popularity: 88,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['rye whiskey', 'sugar cube', 'peychauds bitters', 'absinthe'],
          type: 'stirred',
          era: 'pre-prohibition',
          base: 'whiskey'
        }
      },
      {
        id: 'vieux-carre',
        title: 'Vieux Carré',
        subtitle: 'Pre-Prohibition • Complex',
        description: 'Complex cocktail from Hotel Monteleone in New Orleans.',
        category: 'recipe' as const,
        tags: ['pre-prohibition', 'complex', 'whiskey', 'cognac', 'stirred', 'new-orleans'],
        difficulty: 'hard' as const,
        abv: 35,
        time: 5,
        popularity: 82,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['rye whiskey', 'cognac', 'sweet vermouth', 'benedictine', 'bitters'],
          type: 'stirred',
          era: 'pre-prohibition',
          base: 'whiskey'
        }
      },
      {
        id: 'corpse-reviver-2',
        title: 'Corpse Reviver #2',
        subtitle: 'Pre-Prohibition • Gin-based',
        description: 'Harry Craddock cure-all from The Savoy Cocktail Book.',
        category: 'recipe' as const,
        tags: ['pre-prohibition', 'gin', 'shaken', 'complex', 'hangover-cure'],
        difficulty: 'medium' as const,
        abv: 28,
        time: 4,
        popularity: 86,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'cointreau', 'lillet blanc', 'lemon juice', 'absinthe'],
          type: 'shaken',
          era: 'pre-prohibition',
          base: 'gin'
        }
      },
      {
        id: 'last-word',
        title: 'Last Word',
        subtitle: 'Pre-Prohibition • Gin-based',
        description: 'Equal parts cocktail from Detroit Athletic Club.',
        category: 'recipe' as const,
        tags: ['pre-prohibition', 'gin', 'equal-parts', 'herbal', 'shaken'],
        difficulty: 'medium' as const,
        abv: 30,
        time: 3,
        popularity: 84,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'green chartreuse', 'maraschino liqueur', 'lime juice'],
          type: 'shaken',
          era: 'pre-prohibition',
          base: 'gin'
        }
      },

      // Sour-Style Classics
      {
        id: 'whiskey-sour',
        title: 'Whiskey Sour',
        subtitle: 'Sour Classic • Whiskey-based',
        description: 'The perfect balance of whiskey, lemon, and simple syrup.',
        category: 'recipe' as const,
        tags: ['sour', 'whiskey', 'classic', 'shaken', 'citrus'],
        difficulty: 'easy' as const,
        abv: 25,
        time: 3,
        popularity: 92,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['whiskey', 'lemon juice', 'simple syrup', 'egg white'],
          type: 'shaken',
          style: 'sour',
          base: 'whiskey'
        }
      },
      {
        id: 'sidecar',
        title: 'Sidecar',
        subtitle: 'Sour Classic • Cognac-based',
        description: 'Classic cognac sour with orange liqueur and sugar rim.',
        category: 'recipe' as const,
        tags: ['sour', 'cognac', 'classic', 'shaken', 'citrus', 'sugar-rim'],
        difficulty: 'easy' as const,
        abv: 28,
        time: 3,
        popularity: 87,
        image: 'https://images.unsplash.com/photo-1568286447149-d318ce3067de?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['cognac', 'cointreau', 'lemon juice'],
          type: 'shaken',
          style: 'sour',
          base: 'cognac'
        }
      },
      {
        id: 'pisco-sour',
        title: 'Pisco Sour',
        subtitle: 'Sour Classic • Pisco-based',
        description: 'National cocktail of Peru and Chile, perfectly balanced.',
        category: 'recipe' as const,
        tags: ['sour', 'pisco', 'classic', 'shaken', 'citrus', 'peruvian', 'chilean'],
        difficulty: 'easy' as const,
        abv: 22,
        time: 4,
        popularity: 85,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['pisco', 'lime juice', 'simple syrup', 'egg white', 'bitters'],
          type: 'shaken',
          style: 'sour',
          base: 'pisco'
        }
      },
      {
        id: 'clover-club',
        title: 'Clover Club',
        subtitle: 'Sour Classic • Gin-based',
        description: 'Pre-Prohibition gin sour with raspberry syrup.',
        category: 'recipe' as const,
        tags: ['sour', 'gin', 'classic', 'shaken', 'citrus', 'raspberry', 'pink'],
        difficulty: 'medium' as const,
        abv: 20,
        time: 4,
        popularity: 83,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'lemon juice', 'raspberry syrup', 'egg white'],
          type: 'shaken',
          style: 'sour',
          base: 'gin'
        }
      },
      {
        id: 'caipirinha',
        title: 'Caipirinha',
        subtitle: 'Sour Classic • Cachaça-based',
        description: 'Brazil\'s national cocktail with muddled lime and cachaça.',
        category: 'recipe' as const,
        tags: ['sour', 'cachaca', 'classic', 'muddled', 'citrus', 'brazilian', 'national-cocktail'],
        difficulty: 'easy' as const,
        abv: 25,
        time: 3,
        popularity: 86,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['cachaca', 'lime', 'sugar'],
          type: 'muddled',
          style: 'sour',
          base: 'cachaca'
        }
      },

      // Tiki & Exotic Legends
      {
        id: 'mai-tai',
        title: 'Mai Tai',
        subtitle: 'Tiki Legend • Rum-based',
        description: 'Trader Vic\'s masterpiece, the king of tiki cocktails.',
        category: 'recipe' as const,
        tags: ['tiki', 'rum', 'tropical', 'shaken', 'exotic', 'trader-vic'],
        difficulty: 'medium' as const,
        abv: 25,
        time: 5,
        popularity: 90,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['aged rum', 'orange curacao', 'orgeat syrup', 'lime juice'],
          type: 'shaken',
          style: 'tiki',
          base: 'rum'
        }
      },
      {
        id: 'zombie',
        title: 'Zombie',
        subtitle: 'Tiki Legend • Multiple Rums',
        description: 'Don the Beachcomber\'s potent tiki creation.',
        category: 'recipe' as const,
        tags: ['tiki', 'rum', 'strong', 'complex', 'shaken', 'don-the-beachcomber'],
        difficulty: 'hard' as const,
        abv: 35,
        time: 7,
        popularity: 87,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['white rum', 'golden rum', 'dark rum', 'apricot brandy', 'lime juice', 'falernum'],
          type: 'shaken',
          style: 'tiki',
          base: 'rum'
        }
      },
      {
        id: 'painkiller',
        title: 'Painkiller',
        subtitle: 'Tiki Legend • Dark Rum',
        description: 'Pusser\'s Rum creation from the British Virgin Islands.',
        category: 'recipe' as const,
        tags: ['tiki', 'dark-rum', 'tropical', 'shaken', 'coconut', 'pineapple'],
        difficulty: 'easy' as const,
        abv: 18,
        time: 3,
        popularity: 88,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['dark rum', 'pineapple juice', 'orange juice', 'cream of coconut'],
          type: 'shaken',
          style: 'tiki',
          base: 'rum'
        }
      },
      {
        id: 'jungle-bird',
        title: 'Jungle Bird',
        subtitle: 'Tiki Legend • Campari & Rum',
        description: 'Malaysian tiki cocktail with bitter Campari twist.',
        category: 'recipe' as const,
        tags: ['tiki', 'rum', 'bitter', 'campari', 'shaken', 'malaysian', 'modern-tiki'],
        difficulty: 'medium' as const,
        abv: 22,
        time: 4,
        popularity: 84,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['dark rum', 'campari', 'pineapple juice', 'lime juice', 'simple syrup'],
          type: 'shaken',
          style: 'tiki',
          base: 'rum'
        }
      },

      // Light & Bubbly
      {
        id: 'french-75',
        title: 'French 75',
        subtitle: 'Light & Bubbly • Gin-based',
        description: 'Gin sour topped with champagne, elegant and effervescent.',
        category: 'recipe' as const,
        tags: ['bubbly', 'gin', 'champagne', 'light', 'elegant', 'sparkling'],
        difficulty: 'easy' as const,
        abv: 15,
        time: 3,
        popularity: 89,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'lemon juice', 'simple syrup', 'champagne'],
          type: 'built',
          style: 'sparkling',
          base: 'gin'
        }
      },
      {
        id: 'bellini',
        title: 'Bellini',
        subtitle: 'Light & Bubbly • Prosecco-based',
        description: 'Venetian classic with white peach purée and Prosecco.',
        category: 'recipe' as const,
        tags: ['bubbly', 'prosecco', 'peach', 'light', 'italian', 'brunch'],
        difficulty: 'easy' as const,
        abv: 8,
        time: 2,
        popularity: 85,
        image: 'https://images.unsplash.com/photo-1578849297085-0e5d2eb47b7e?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['prosecco', 'white peach puree'],
          type: 'built',
          style: 'sparkling',
          base: 'wine'
        }
      },
      {
        id: 'mimosa',
        title: 'Mimosa',
        subtitle: 'Light & Bubbly • Champagne-based',
        description: 'Brunch classic with champagne and fresh orange juice.',
        category: 'recipe' as const,
        tags: ['bubbly', 'champagne', 'orange', 'light', 'brunch', 'morning'],
        difficulty: 'easy' as const,
        abv: 8,
        time: 1,
        popularity: 93,
        image: 'https://images.unsplash.com/photo-1578849297085-0e5d2eb47b7e?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['champagne', 'orange juice'],
          type: 'built',
          style: 'sparkling',
          base: 'wine'
        }
      },
      {
        id: 'kir-royale',
        title: 'Kir Royale',
        subtitle: 'Light & Bubbly • Champagne-based',
        description: 'French aperitif with cassis and champagne.',
        category: 'recipe' as const,
        tags: ['bubbly', 'champagne', 'cassis', 'light', 'french', 'aperitif'],
        difficulty: 'easy' as const,
        abv: 10,
        time: 2,
        popularity: 82,
        image: 'https://images.unsplash.com/photo-1578849297085-0e5d2eb47b7e?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['champagne', 'creme de cassis'],
          type: 'built',
          style: 'sparkling',
          base: 'wine'
        }
      },

      // Refreshing Highballs
      {
        id: 'tom-collins',
        title: 'Tom Collins',
        subtitle: 'Refreshing Highball • Gin-based',
        description: 'Tall, refreshing gin cocktail with lemon and soda.',
        category: 'recipe' as const,
        tags: ['highball', 'gin', 'refreshing', 'tall', 'soda', 'citrus'],
        difficulty: 'easy' as const,
        abv: 12,
        time: 3,
        popularity: 87,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'lemon juice', 'simple syrup', 'soda water'],
          type: 'built',
          style: 'highball',
          base: 'gin'
        }
      },
      {
        id: 'paloma',
        title: 'Paloma',
        subtitle: 'Refreshing Highball • Tequila-based',
        description: 'Mexico\'s most popular cocktail with grapefruit and lime.',
        category: 'recipe' as const,
        tags: ['highball', 'tequila', 'refreshing', 'grapefruit', 'mexican', 'popular'],
        difficulty: 'easy' as const,
        abv: 12,
        time: 2,
        popularity: 90,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['tequila', 'grapefruit juice', 'lime juice', 'soda water'],
          type: 'built',
          style: 'highball',
          base: 'tequila'
        }
      },
      {
        id: 'dark-n-stormy',
        title: 'Dark \'n\' Stormy',
        subtitle: 'Refreshing Highball • Dark Rum',
        description: 'Bermuda\'s national drink with dark rum and ginger beer.',
        category: 'recipe' as const,
        tags: ['highball', 'dark-rum', 'refreshing', 'ginger-beer', 'bermuda', 'spicy'],
        difficulty: 'easy' as const,
        abv: 15,
        time: 2,
        popularity: 86,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['dark rum', 'ginger beer', 'lime juice'],
          type: 'built',
          style: 'highball',
          base: 'rum'
        }
      },

      // Digestif & Dessert
      {
        id: 'irish-coffee',
        title: 'Irish Coffee',
        subtitle: 'Digestif & Dessert • Coffee-based',
        description: 'Perfect after-dinner drink combining Irish whiskey and coffee.',
        category: 'recipe' as const,
        tags: ['digestif', 'dessert', 'coffee', 'irish-whiskey', 'hot', 'cream'],
        difficulty: 'medium' as const,
        abv: 15,
        time: 5,
        popularity: 88,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['irish whiskey', 'hot coffee', 'sugar', 'heavy cream'],
          type: 'built',
          style: 'hot',
          base: 'whiskey'
        }
      },
      {
        id: 'white-russian',
        title: 'White Russian',
        subtitle: 'Digestif & Dessert • Vodka-based',
        description: 'Creamy vodka cocktail made famous by The Big Lebowski.',
        category: 'recipe' as const,
        tags: ['digestif', 'dessert', 'vodka', 'cream', 'coffee-liqueur', 'movie-famous'],
        difficulty: 'easy' as const,
        abv: 20,
        time: 2,
        popularity: 89,
        image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['vodka', 'coffee liqueur', 'heavy cream'],
          type: 'built',
          style: 'creamy',
          base: 'vodka'
        }
      },
      {
        id: 'amaretto-sour',
        title: 'Amaretto Sour',
        subtitle: 'Digestif & Dessert • Amaretto-based',
        description: 'Sweet and sour balance with Italian amaretto liqueur.',
        category: 'recipe' as const,
        tags: ['digestif', 'dessert', 'amaretto', 'sweet', 'sour', 'italian'],
        difficulty: 'easy' as const,
        abv: 18,
        time: 3,
        popularity: 84,
        image: 'https://images.unsplash.com/photo-1568286447149-d318ce3067de?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['amaretto', 'lemon juice', 'simple syrup'],
          type: 'shaken',
          style: 'sour',
          base: 'liqueur'
        }
      },

      // Modern Classics
      {
        id: 'penicillin',
        title: 'Penicillin',
        subtitle: 'Modern Classic • Scotch-based',
        description: 'Sam Ross creation that launched the modern classic era.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'scotch', 'honey', 'ginger', 'smoky', 'healing'],
        difficulty: 'medium' as const,
        abv: 25,
        time: 4,
        popularity: 91,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['blended scotch', 'honey syrup', 'lemon juice', 'ginger liqueur', 'islay scotch'],
          type: 'shaken',
          style: 'modern',
          base: 'whiskey'
        }
      },
      {
        id: 'paper-plane',
        title: 'Paper Plane',
        subtitle: 'Modern Classic • Bourbon-based',
        description: 'Sam Ross equal-parts creation, perfectly balanced modern classic.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'bourbon', 'equal-parts', 'bitter', 'citrus'],
        difficulty: 'easy' as const,
        abv: 25,
        time: 3,
        popularity: 87,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['bourbon whiskey', 'aperol', 'amaro nonino', 'lemon juice'],
          type: 'shaken',
          style: 'modern',
          base: 'whiskey'
        }
      },
      {
        id: 'naked-and-famous',
        title: 'Naked and Famous',
        subtitle: 'Modern Classic • Mezcal-based',
        description: 'Joaquín Simó\'s smoky variation of the Paper Plane.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'mezcal', 'smoky', 'equal-parts', 'agave'],
        difficulty: 'medium' as const,
        abv: 28,
        time: 3,
        popularity: 83,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['mezcal', 'yellow chartreuse', 'aperol', 'lime juice'],
          type: 'shaken',
          style: 'modern',
          base: 'mezcal'
        }
      },
      {
        id: 'oaxaca-old-fashioned',
        title: 'Oaxaca Old Fashioned',
        subtitle: 'Modern Classic • Tequila & Mezcal',
        description: 'Phil Ward\'s agave Old Fashioned from Death & Co.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'tequila', 'mezcal', 'agave', 'stirred', 'smoky'],
        difficulty: 'easy' as const,
        abv: 32,
        time: 3,
        popularity: 85,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['reposado tequila', 'mezcal', 'agave nectar', 'bitters'],
          type: 'stirred',
          style: 'modern',
          base: 'agave'
        }
      },
      {
        id: 'tommys-margarita',
        title: 'Tommy\'s Margarita',
        subtitle: 'Modern Classic • Tequila-based',
        description: 'Created by Julio Bermejo at Tommy\'s in San Francisco, pure agave flavors.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'tequila', 'agave', 'citrus', 'pure', 'no-triple-sec'],
        difficulty: 'easy' as const,
        abv: 25,
        time: 2,
        popularity: 90,
        image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['blanco tequila', 'lime juice', 'agave nectar'],
          type: 'shaken',
          style: 'modern',
          base: 'tequila'
        }
      },
      {
        id: 'aviation',
        title: 'Aviation',
        subtitle: 'Modern Classic • Gin-based',
        description: 'Created by Hugo Ensslin in 1916, rediscovered in the cocktail renaissance.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'gin', 'floral', 'violet', 'maraschino', 'renaissance'],
        difficulty: 'medium' as const,
        abv: 28,
        time: 3,
        popularity: 82,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'maraschino liqueur', 'creme de violette', 'lemon juice'],
          type: 'shaken',
          style: 'modern',
          base: 'gin'
        }
      },
      {
        id: 'gold-rush',
        title: 'Gold Rush',
        subtitle: 'Modern Classic • Whiskey-based',
        description: 'Created by T.J. Siegal at Milk & Honey, a modern whiskey sour with honey.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'bourbon', 'honey', 'sour', 'milk-and-honey'],
        difficulty: 'easy' as const,
        abv: 25,
        time: 2,
        popularity: 84,
        image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['bourbon whiskey', 'lemon juice', 'honey syrup'],
          type: 'shaken',
          style: 'modern',
          base: 'whiskey'
        }
      },
      {
        id: 'bees-knees',
        title: 'Bee\'s Knees',
        subtitle: 'Modern Classic • Gin-based',
        description: 'Prohibition-era classic, rediscovered in modern cocktail culture.',
        category: 'recipe' as const,
        tags: ['modern-classic', 'gin', 'honey', 'prohibition', 'rediscovered'],
        difficulty: 'easy' as const,
        abv: 22,
        time: 2,
        popularity: 83,
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
        data: {
          ingredients: ['gin', 'lemon juice', 'honey syrup'],
          type: 'shaken',
          style: 'modern',
          base: 'gin'
        }
      }
    ];

    return cocktailRecipes;
    */
  }

  private estimateABV(ingredients: string[]): number {
    // Simple ABV estimation based on spirit ingredients
    const spirits = ingredients.filter(ing =>
      typeof ing === 'string' &&
      ing.toLowerCase().match(/(vodka|gin|rum|whiskey|bourbon|rye|tequila|brandy|cognac|mezcal)/i)
    ).length;

    const mixers = ingredients.filter(ing =>
      typeof ing === 'string' &&
      ing.toLowerCase().match(/(juice|soda|syrup|cream|milk)/i)
    ).length;

    // Basic calculation: more spirits = higher ABV
    if (spirits >= 2) return Math.round(Math.random() * 10 + 35); // 35-45%
    if (spirits === 1) return Math.round(Math.random() * 10 + 25); // 25-35%
    return Math.round(Math.random() * 10 + 15); // 15-25%
  }

  private parseTime(timeStr: string): number {
    // Extract number from time string like "3 min", "5 minutes"
    const match = timeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 3;
  }

  // Search with query
  async search(query: string, filters?: Partial<FilterOptions>): Promise<SearchableItem[]> {
    const trimmedQuery = query.trim();

    // Record search in history if query is provided
    if (trimmedQuery) {
      await searchHistoryService.addSearch(trimmedQuery);
    }

    if (!trimmedQuery && !filters) {
      return this.searchIndex.slice(0, 20); // Return top 20 by popularity
    }

    let results = this.searchIndex;

    // Apply text search with enhanced relevance scoring
    if (trimmedQuery) {
      const searchTerms = trimmedQuery.toLowerCase().split(' ');
      results = results.filter(item => {
        const searchableText = [
          item.title,
          item.subtitle,
          item.description,
          ...item.tags
        ].join(' ').toLowerCase();

        // Check if any search term matches
        return searchTerms.some(term => searchableText.includes(term));
      });

      // Add relevance scores
      results = results.map(item => {
        let relevanceScore = 0;
        const titleLower = item.title.toLowerCase();
        const searchLower = trimmedQuery.toLowerCase();

        // Exact title match gets highest score
        if (titleLower === searchLower) relevanceScore += 100;
        // Title starts with query gets high score
        else if (titleLower.startsWith(searchLower)) relevanceScore += 80;
        // Title contains query gets medium score
        else if (titleLower.includes(searchLower)) relevanceScore += 60;
        // Tag matches get lower score
        else if (item.tags.some(tag => tag.toLowerCase().includes(searchLower))) relevanceScore += 40;
        // Description match gets lowest score
        else if (item.description?.toLowerCase().includes(searchLower)) relevanceScore += 20;

        return { ...item, relevanceScore };
      });
    }

    // Apply filters
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    // Apply sorting
    const sortBy = filters?.sortBy || 'relevance';
    const sortOrder = filters?.sortOrder || 'desc';
    results = this.sortResults(results, sortBy, sortOrder, trimmedQuery);

    // Record result count
    if (trimmedQuery) {
      // Update search history with result count (simplified - you'd track the specific search)
      // This could be enhanced to update the specific search entry
    }

    return results.slice(0, 50); // Limit to 50 results
  }

  // Get search suggestions
  getSearchSuggestions(query: string): SearchSuggestion[] {
    return searchHistoryService.getSearchSuggestions(query);
  }

  // Get recent searches
  getRecentSearches(): string[] {
    return searchHistoryService.getRecentSearches();
  }

  // Get trending searches
  getTrendingSearches() {
    return searchHistoryService.getTrendingSearches();
  }

  private applyFilters(items: SearchableItem[], filters: Partial<FilterOptions>): SearchableItem[] {
    let filtered = items;
    const categoryFilters = filters.categories || filters.category;
    const difficultyFilters = filters.difficulties || filters.difficulty;

    if (categoryFilters && categoryFilters.length > 0) {
      filtered = filtered.filter(item => categoryFilters.includes(item.category));
    }

    if (difficultyFilters && difficultyFilters.length > 0) {
      filtered = filtered.filter(item =>
        item.difficulty && difficultyFilters.includes(item.difficulty)
      );
    }

    if (filters.abvRange) {
      const [min, max] = filters.abvRange;
      filtered = filtered.filter(item =>
        item.abv !== undefined && item.abv >= min && item.abv <= max
      );
    }

    if (filters.timeRange) {
      const [min, max] = filters.timeRange;
      filtered = filtered.filter(item =>
        item.time !== undefined && item.time >= min && item.time <= max
      );
    }

    // Filter by ingredients
    if (filters.ingredients && filters.ingredients.length > 0) {
      filtered = filtered.filter(item => {
        const itemIngredients = item.data?.ingredients || [];
        return filters.ingredients!.some(ingredient =>
          itemIngredients.some((itemIng: string) =>
            itemIng.toLowerCase().includes(ingredient.toLowerCase())
          )
        );
      });
    }

    // Filter by equipment
    if (filters.equipment && filters.equipment.length > 0) {
      filtered = filtered.filter(item => {
        const itemEquipment = item.data?.equipment || [];
        return filters.equipment!.some(equipment =>
          itemEquipment.some((itemEq: string) =>
            itemEq.toLowerCase().includes(equipment.toLowerCase())
          )
        );
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        filters.tags!.some(tag =>
          item.tags.some(itemTag =>
            itemTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Filter favorites only (mock implementation)
    if (filters.showOnlyFavorites) {
      filtered = filtered.filter(item => {
        // In a real app, this would check user's favorites
        // For demo, we'll assume high popularity items are "favorites"
        return (item.popularity || 0) > 85;
      });
    }

    // Filter completed only (mock implementation)
    if (filters.showOnlyCompleted) {
      filtered = filtered.filter(item => {
        // In a real app, this would check user's completed recipes
        // For demo, we'll use a mock completion status
        return item.data?.completed === true || (item.popularity || 0) > 90;
      });
    }

    return filtered;
  }

  private sortResults(
    items: SearchableItem[], 
    sortBy: FilterOptions['sortBy'], 
    sortOrder: FilterOptions['sortOrder'],
    query?: string
  ): SearchableItem[] {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'popularity':
          comparison = (b.popularity || 0) - (a.popularity || 0);
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          comparison = (difficultyOrder[a.difficulty || 'easy']) - (difficultyOrder[b.difficulty || 'easy']);
          break;
        case 'time':
          comparison = (a.time || 0) - (b.time || 0);
          break;
        case 'abv':
          comparison = (a.abv || 0) - (b.abv || 0);
          break;
        case 'recent':
          // For now, use popularity as proxy for recency
          comparison = (b.popularity || 0) - (a.popularity || 0);
          break;
        case 'relevance':
        default:
          // Simple relevance based on title match
          if (query) {
            const aRelevance = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            const bRelevance = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            comparison = bRelevance - aRelevance;
            if (comparison === 0) {
              comparison = (b.popularity || 0) - (a.popularity || 0);
            }
          } else {
            comparison = (b.popularity || 0) - (a.popularity || 0);
          }
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  // Get filter options based on current search results
  getFilterOptions(query?: string): {
    categories: { key: string; label: string; count: number }[];
    difficulties: { key: string; label: string; count: number }[];
    abvRange: [number, number];
    timeRange: [number, number];
  } {
    const currentResults = query ? this.search(query) : this.searchIndex;

    // Count categories
    const categoryCounts = currentResults.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categories = Object.entries(categoryCounts).map(([key, count]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count
    }));

    // Count difficulties
    const difficultyCounts = currentResults.reduce((acc, item) => {
      if (item.difficulty) {
        acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const difficulties = Object.entries(difficultyCounts).map(([key, count]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count
    }));

    // Calculate ranges
    const abvValues = currentResults.map(item => item.abv).filter(Boolean) as number[];
    const timeValues = currentResults.map(item => item.time).filter(Boolean) as number[];

    const abvRange: [number, number] = abvValues.length > 0 
      ? [Math.min(...abvValues), Math.max(...abvValues)]
      : [0, 50];

    const timeRange: [number, number] = timeValues.length > 0
      ? [Math.min(...timeValues), Math.max(...timeValues)]
      : [0, 60];

    return {
      categories,
      difficulties,
      abvRange,
      timeRange
    };
  }

  // Add new item to search index
  addToIndex(item: SearchableItem): void {
    this.searchIndex.push(item);
  }

  // Update existing item in search index
  updateInIndex(id: string, updates: Partial<SearchableItem>): void {
    const index = this.searchIndex.findIndex(item => item.id === id);
    if (index !== -1) {
      this.searchIndex[index] = { ...this.searchIndex[index], ...updates };
    }
  }

  // Remove item from search index
  removeFromIndex(id: string): void {
    this.searchIndex = this.searchIndex.filter(item => item.id !== id);
  }
}

export const searchService = new SearchService();
