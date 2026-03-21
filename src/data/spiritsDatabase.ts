/**
 * Spirits Database
 * Hardcoded database of popular spirits for bottle recognition
 * Includes: name, type, ABV, flavor profile, price tier, tasting notes
 */

export type PriceTier = 'budget' | 'mid-range' | 'premium' | 'ultra-premium';
export type SpiritType = 'gin' | 'vodka' | 'rum' | 'whiskey' | 'tequila' | 'mezcal' | 'brandy' | 'liqueur' | 'other';
export type ServeMode = 'neat' | 'water-drops' | 'large-rock' | 'cocktail';
export type ServePriority = 'cocktail-first' | 'balanced' | 'serve-first';
export type ServeSpiritFamily =
  | 'scotch'
  | 'bourbon'
  | 'rye'
  | 'tequila'
  | 'mezcal'
  | 'cognac'
  | 'aged-rum'
  | 'irish-whiskey'
  | 'japanese-whisky';

export interface ServeGuidance {
  priority: ServePriority;
  premiumScore?: number;
  spiritFamily?: ServeSpiritFamily;
  recommendedModes: ServeMode[];
  firstPour: ServeMode;
  shouldDeprioritizeCocktails: boolean;
  why: string;
  tastingNotesShort?: string;
  cocktailUse?: 'best-neat' | 'good-spirit-forward' | 'great-for-cocktails';
  educationSlug?: string;
}

export interface Spirit {
  id: string;
  name: string;
  brand: string;
  type: SpiritType;
  abv: number;
  priceTier: PriceTier;
  priceEstimate: {
    USD: { min: number; max: number };
    CAD: { min: number; max: number };
    GBP: { min: number; max: number };
  };
  flavorProfile: string[];
  tastingNotes: string;
  origin: string;
  searchTerms: string[]; // Alternative names/spellings for matching
  serveGuidance?: ServeGuidance;
}

export const SPIRITS_DATABASE: Spirit[] = [
  // ===== GIN =====
  {
    id: 'tanqueray-london-dry',
    name: 'Tanqueray London Dry Gin',
    brand: 'Tanqueray',
    type: 'gin',
    abv: 47.3,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 32, max: 38 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Juniper', 'Citrus', 'Spice'],
    tastingNotes: 'Classic London Dry with bold juniper, bright citrus peel, and subtle spice. Crisp and dry finish perfect for gin & tonics and martinis.',
    origin: 'United Kingdom',
    searchTerms: ['tanqueray', 'tanq', 'london dry'],
  },
  {
    id: 'bombay-sapphire',
    name: 'Bombay Sapphire',
    brand: 'Bombay',
    type: 'gin',
    abv: 47,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 30, max: 36 },
      GBP: { min: 17, max: 23 },
    },
    flavorProfile: ['Juniper', 'Lemon', 'Coriander'],
    tastingNotes: 'Smooth and balanced with 10 botanicals. Light juniper with lemon peel, angelica, and coriander. Elegant and versatile.',
    origin: 'United Kingdom',
    searchTerms: ['bombay', 'sapphire', 'bombay sapphire'],
  },
  {
    id: 'hendricks',
    name: "Hendrick's Gin",
    brand: "Hendrick's",
    type: 'gin',
    abv: 44,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 32, max: 38 },
      CAD: { min: 42, max: 48 },
      GBP: { min: 28, max: 34 },
    },
    flavorProfile: ['Cucumber', 'Rose', 'Juniper'],
    tastingNotes: 'Uniquely infused with cucumber and rose petals. Floral, refreshing, and distinctly different from traditional London Dry gins.',
    origin: 'Scotland',
    searchTerms: ['hendricks', 'hendrick', 'cucumber gin'],
  },
  {
    id: 'the-botanist',
    name: 'The Botanist Islay Dry Gin',
    brand: 'The Botanist',
    type: 'gin',
    abv: 46,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 35, max: 42 },
      CAD: { min: 45, max: 52 },
      GBP: { min: 30, max: 37 },
    },
    flavorProfile: ['Herbal', 'Floral', 'Citrus'],
    tastingNotes: '22 hand-foraged Islay botanicals create complex layers of herbs, flowers, and gentle citrus. Smooth and sophisticated.',
    origin: 'Scotland',
    searchTerms: ['botanist', 'islay gin'],
  },

  // ===== VODKA =====
  {
    id: 'titos-handmade',
    name: "Tito's Handmade Vodka",
    brand: "Tito's",
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 25 },
      CAD: { min: 28, max: 33 },
      GBP: { min: 22, max: 27 },
    },
    flavorProfile: ['Clean', 'Smooth', 'Neutral'],
    tastingNotes: 'Six-times distilled from corn. Exceptionally smooth with subtle sweetness. Gluten-free and perfect for vodka sodas.',
    origin: 'United States',
    searchTerms: ['titos', 'tito', 'handmade vodka'],
  },
  {
    id: 'grey-goose',
    name: 'Grey Goose Vodka',
    brand: 'Grey Goose',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 40, max: 48 },
      GBP: { min: 28, max: 35 },
    },
    flavorProfile: ['Clean', 'Citrus', 'Almond'],
    tastingNotes: 'French wheat vodka with soft, smooth character. Hints of almond and fresh bread with a clean, crisp finish.',
    origin: 'France',
    searchTerms: ['grey goose', 'greygoose', 'french vodka'],
  },
  {
    id: 'ketel-one',
    name: 'Ketel One Vodka',
    brand: 'Ketel One',
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 30 },
      CAD: { min: 32, max: 38 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Clean', 'Crisp', 'Citrus'],
    tastingNotes: 'Made in copper pot stills. Crisp with subtle citrus and honey notes. Smooth and sophisticated.',
    origin: 'Netherlands',
    searchTerms: ['ketel one', 'ketel 1', 'dutch vodka'],
  },
  {
    id: 'absolut',
    name: 'Absolut Vodka',
    brand: 'Absolut',
    type: 'vodka',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 15, max: 20 },
      CAD: { min: 22, max: 28 },
      GBP: { min: 14, max: 18 },
    },
    flavorProfile: ['Clean', 'Grain', 'Smooth'],
    tastingNotes: 'Swedish wheat vodka. Rich, full-bodied with notes of dried fruit and subtle grain sweetness. A classic mixer.',
    origin: 'Sweden',
    searchTerms: ['absolut', 'swedish vodka'],
  },

  // ===== RUM =====
  {
    id: 'bacardi-superior',
    name: 'Bacardi Superior White Rum',
    brand: 'Bacardi',
    type: 'rum',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 12, max: 16 },
    },
    flavorProfile: ['Light', 'Vanilla', 'Almond'],
    tastingNotes: 'Light, crisp white rum with notes of vanilla and almond. Perfect for mojitos and daiquiris.',
    origin: 'Puerto Rico',
    searchTerms: ['bacardi', 'white rum', 'superior'],
  },
  {
    id: 'captain-morgan-spiced',
    name: 'Captain Morgan Spiced Rum',
    brand: 'Captain Morgan',
    type: 'rum',
    abv: 35,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 20, max: 26 },
      GBP: { min: 13, max: 18 },
    },
    flavorProfile: ['Vanilla', 'Spice', 'Caramel'],
    tastingNotes: 'Smooth spiced rum with vanilla, caramel, and warming spices. Great with cola or in tropical cocktails.',
    origin: 'Jamaica',
    searchTerms: ['captain morgan', 'captain', 'spiced rum'],
  },
  {
    id: 'mount-gay-eclipse',
    name: 'Mount Gay Eclipse Barbados Rum',
    brand: 'Mount Gay',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 28, max: 34 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Banana', 'Vanilla', 'Spice'],
    tastingNotes: 'Golden rum with tropical fruit, banana, vanilla, and toasted almond notes. Smooth and well-balanced.',
    origin: 'Barbados',
    searchTerms: ['mount gay', 'barbados rum', 'eclipse'],
  },
  {
    id: 'havana-club-7',
    name: 'Havana Club 7 Year',
    brand: 'Havana Club',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 32 },
      CAD: { min: 35, max: 42 },
      GBP: { min: 22, max: 28 },
    },
    flavorProfile: ['Vanilla', 'Tobacco', 'Oak'],
    tastingNotes: 'Aged Cuban rum with rich vanilla, cocoa, tobacco, and oak. Perfect for sipping or in aged rum cocktails.',
    origin: 'Cuba',
    searchTerms: ['havana club', 'cuban rum', '7 year'],
    serveGuidance: {
      priority: 'balanced',
      premiumScore: 68,
      spiritFamily: 'aged-rum',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: false,
      why: 'This aged rum is worth tasting on its own first, then it can move into spirit-forward rum drinks if you want to mix.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'aged-rum-serve',
    },
  },

  // ===== WHISKEY =====
  {
    id: 'jameson',
    name: 'Jameson Irish Whiskey',
    brand: 'Jameson',
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 30, max: 36 },
      GBP: { min: 20, max: 25 },
    },
    flavorProfile: ['Vanilla', 'Honey', 'Smooth'],
    tastingNotes: 'Triple-distilled Irish whiskey. Smooth with notes of vanilla, honey, and toasted wood. Perfect for whiskey sodas or neat.',
    origin: 'Ireland',
    searchTerms: ['jameson', 'irish whiskey'],
  },
  {
    id: 'jack-daniels',
    name: "Jack Daniel's Old No. 7",
    brand: "Jack Daniel's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 28, max: 34 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Caramel', 'Vanilla', 'Oak'],
    tastingNotes: 'Tennessee whiskey with charcoal mellowing. Sweet caramel, vanilla, and toasted oak. Smooth and iconic.',
    origin: 'United States',
    searchTerms: ['jack daniels', 'jack', 'tennessee whiskey', 'old no 7'],
  },
  {
    id: 'bulleit-bourbon',
    name: 'Bulleit Bourbon',
    brand: 'Bulleit',
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 32 },
      CAD: { min: 33, max: 40 },
      GBP: { min: 24, max: 30 },
    },
    flavorProfile: ['Rye Spice', 'Vanilla', 'Oak'],
    tastingNotes: 'High-rye bourbon with bold spice, vanilla, and dried fruit. Smooth with a long, dry finish.',
    origin: 'United States',
    searchTerms: ['bulleit', 'bourbon', 'high rye'],
  },
  {
    id: 'makers-mark',
    name: "Maker's Mark Bourbon",
    brand: "Maker's Mark",
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 26, max: 33 },
      CAD: { min: 34, max: 41 },
      GBP: { min: 24, max: 30 },
    },
    flavorProfile: ['Caramel', 'Vanilla', 'Wheat'],
    tastingNotes: 'Wheated bourbon with soft caramel, vanilla, and fruity notes. Smooth and sweet with a gentle finish.',
    origin: 'United States',
    searchTerms: ['makers mark', 'makers', 'red wax', 'wheated bourbon'],
  },
  {
    id: 'woodford-reserve',
    name: 'Woodford Reserve Bourbon',
    brand: 'Woodford Reserve',
    type: 'whiskey',
    abv: 45.2,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 40, max: 48 },
      GBP: { min: 28, max: 35 },
    },
    flavorProfile: ['Spice', 'Fruit', 'Oak'],
    tastingNotes: 'Small-batch bourbon with rich dried fruit, mint, cocoa, and spice. Complex and full-bodied.',
    origin: 'United States',
    searchTerms: ['woodford reserve', 'woodford', 'small batch bourbon'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 82,
      spiritFamily: 'bourbon',
      recommendedModes: ['neat', 'water-drops', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Start neat to understand the bottle first. A few drops of water can open cocoa, spice, and oak before you decide whether it belongs in a drink.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-bourbon-serve',
    },
  },
  {
    id: 'johnnie-walker-black',
    name: 'Johnnie Walker Black Label',
    brand: 'Johnnie Walker',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 35 },
      CAD: { min: 38, max: 45 },
      GBP: { min: 25, max: 32 },
    },
    flavorProfile: ['Smoke', 'Vanilla', 'Fruit'],
    tastingNotes: '12-year blended Scotch with layers of smoke, vanilla, dried fruit, and sweet spice. Complex and smooth.',
    origin: 'Scotland',
    searchTerms: ['johnnie walker', 'black label', 'blended scotch'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 80,
      spiritFamily: 'scotch',
      recommendedModes: ['neat', 'water-drops', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Start neat so the smoke, fruit, and oak register clearly. Then add a few drops of water only if you want to open aroma and soften the edges.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-scotch-serve',
    },
  },

  // ===== TEQUILA =====
  {
    id: 'patron-silver',
    name: 'Patrón Silver Tequila',
    brand: 'Patrón',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 40, max: 50 },
      CAD: { min: 50, max: 60 },
      GBP: { min: 38, max: 48 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Pepper'],
    tastingNotes: '100% blue agave. Fresh agave, citrus, and white pepper. Smooth and clean, perfect for margaritas or sipping.',
    origin: 'Mexico',
    searchTerms: ['patron', 'silver tequila', 'blanco'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 84,
      spiritFamily: 'tequila',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'This is worth tasting neat before mixing so the agave, citrus, and pepper stay in focus.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-tequila-serve',
    },
  },
  {
    id: 'don-julio-blanco',
    name: 'Don Julio Blanco Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 42, max: 52 },
      CAD: { min: 52, max: 62 },
      GBP: { min: 40, max: 50 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Lime'],
    tastingNotes: 'Crisp agave flavor with hints of citrus and lime. Clean, smooth, and perfect for premium margaritas.',
    origin: 'Mexico',
    searchTerms: ['don julio', 'blanco', '1942'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 86,
      spiritFamily: 'tequila',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Try this neat first so the agave purity and citrus lift are clear before you chill or mix it.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-tequila-serve',
    },
  },
  {
    id: 'espolon-blanco',
    name: 'Espolòn Blanco Tequila',
    brand: 'Espolòn',
    type: 'tequila',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 28, max: 34 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Agave', 'Pepper', 'Tropical Fruit'],
    tastingNotes: 'Bright agave with tropical fruit, black pepper, and light spice. Great value for cocktails.',
    origin: 'Mexico',
    searchTerms: ['espolon', 'espolòn', 'budget tequila'],
  },
  {
    id: 'casamigos-blanco',
    name: 'Casamigos Blanco Tequila',
    brand: 'Casamigos',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 48, max: 58 },
      GBP: { min: 36, max: 46 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Coconut'],
    tastingNotes: 'Ultra-smooth with sweet agave, vanilla, and hints of coconut. Crisp and clean finish.',
    origin: 'Mexico',
    searchTerms: ['casamigos', 'george clooney tequila'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 80,
      spiritFamily: 'tequila',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'This bottle reads best neat first, then on a large rock if you want a softer texture.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-tequila-serve',
    },
  },

  // ===== MEZCAL =====
  {
    id: 'del-maguey-vida',
    name: 'Del Maguey Vida Mezcal',
    brand: 'Del Maguey',
    type: 'mezcal',
    abv: 42,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 40, max: 48 },
      GBP: { min: 28, max: 35 },
    },
    flavorProfile: ['Smoke', 'Agave', 'Citrus'],
    tastingNotes: 'Artisanal mezcal with balanced smoke, roasted agave, and citrus. Versatile for cocktails or sipping.',
    origin: 'Mexico',
    searchTerms: ['del maguey', 'vida', 'mezcal'],
    serveGuidance: {
      priority: 'balanced',
      premiumScore: 72,
      spiritFamily: 'mezcal',
      recommendedModes: ['neat', 'water-drops', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: false,
      why: 'Taste this neat first for smoke and roasted agave, then use it in cocktails where mezcal is meant to stay obvious.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'mezcal-serve',
    },
  },
  {
    id: 'montelobos-mezcal',
    name: 'Montelobos Mezcal Joven',
    brand: 'Montelobos',
    type: 'mezcal',
    abv: 43.2,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 32, max: 40 },
      CAD: { min: 42, max: 50 },
      GBP: { min: 30, max: 38 },
    },
    flavorProfile: ['Smoke', 'Herbal', 'Pepper'],
    tastingNotes: 'Organic mezcal with gentle smoke, herbal notes, and white pepper. Smooth and complex.',
    origin: 'Mexico',
    searchTerms: ['montelobos', 'joven', 'organic mezcal'],
  },

  // ===== BRANDY & COGNAC =====
  {
    id: 'hennessy-vs',
    name: 'Hennessy V.S Cognac',
    brand: 'Hennessy',
    type: 'brandy',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 35, max: 45 },
      CAD: { min: 45, max: 55 },
      GBP: { min: 32, max: 42 },
    },
    flavorProfile: ['Fruit', 'Oak', 'Vanilla'],
    tastingNotes: 'Classic cognac with fruit, toasted oak, and vanilla. Smooth and balanced.',
    origin: 'France',
    searchTerms: ['hennessy', 'vs', 'cognac'],
  },
  {
    id: 'remy-martin-vsop',
    name: 'Rémy Martin VSOP',
    brand: 'Rémy Martin',
    type: 'brandy',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 45, max: 55 },
      CAD: { min: 55, max: 65 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Apricot', 'Vanilla', 'Oak'],
    tastingNotes: 'Fine champagne cognac with apricot, vanilla, and toasted oak. Rich and smooth.',
    origin: 'France',
    searchTerms: ['remy martin', 'rémy', 'vsop', 'cognac'],
    serveGuidance: {
      priority: 'serve-first',
      premiumScore: 88,
      spiritFamily: 'cognac',
      recommendedModes: ['neat', 'water-drops', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'This is best approached as a sipping bottle first so the fruit, oak, and richness show before any dilution or mixing.',
      cocktailUse: 'good-spirit-forward',
      educationSlug: 'premium-cognac-serve',
    },
  },

  // ===== LIQUEURS =====
  {
    id: 'cointreau',
    name: 'Cointreau',
    brand: 'Cointreau',
    type: 'liqueur',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 35 },
      CAD: { min: 38, max: 45 },
      GBP: { min: 26, max: 33 },
    },
    flavorProfile: ['Orange', 'Citrus', 'Sweet'],
    tastingNotes: 'Premium triple sec with intense orange flavor, balanced sweetness, and citrus brightness. Essential for margaritas.',
    origin: 'France',
    searchTerms: ['cointreau', 'triple sec', 'orange liqueur'],
  },
  {
    id: 'st-germain',
    name: 'St-Germain Elderflower Liqueur',
    brand: 'St-Germain',
    type: 'liqueur',
    abv: 20,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 32, max: 40 },
      CAD: { min: 42, max: 50 },
      GBP: { min: 30, max: 38 },
    },
    flavorProfile: ['Elderflower', 'Peach', 'Citrus'],
    tastingNotes: 'Delicate elderflower with hints of peach, pear, and citrus. Floral, sweet, and versatile.',
    origin: 'France',
    searchTerms: ['st germain', 'elderflower', 'st-germain'],
  },
  {
    id: 'aperol',
    name: 'Aperol',
    brand: 'Aperol',
    type: 'liqueur',
    abv: 11,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 30 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Orange', 'Bitter', 'Herbal'],
    tastingNotes: 'Italian aperitif with bitter orange, rhubarb, and herbs. Perfect for spritzes.',
    origin: 'Italy',
    searchTerms: ['aperol', 'spritz', 'italian aperitif'],
  },
  {
    id: 'campari',
    name: 'Campari',
    brand: 'Campari',
    type: 'liqueur',
    abv: 25,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 30 },
      CAD: { min: 32, max: 38 },
      GBP: { min: 22, max: 28 },
    },
    flavorProfile: ['Bitter', 'Orange', 'Herbal'],
    tastingNotes: 'Bold bitter with orange peel, cherry, and herb notes. Essential for Negronis and Americanos.',
    origin: 'Italy',
    searchTerms: ['campari', 'bitter', 'negroni'],
  },
  {
    id: 'kahlua',
    name: 'Kahlúa Coffee Liqueur',
    brand: 'Kahlúa',
    type: 'liqueur',
    abv: 20,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 30 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Coffee', 'Vanilla', 'Caramel'],
    tastingNotes: 'Rich coffee liqueur with vanilla and caramel. Sweet and smooth, perfect for White Russians and espresso martinis.',
    origin: 'Mexico',
    searchTerms: ['kahlua', 'kahlúa', 'coffee liqueur'],
  },
  {
    id: 'baileys',
    name: "Baileys Irish Cream",
    brand: 'Baileys',
    type: 'liqueur',
    abv: 17,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 28, max: 34 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Cream', 'Chocolate', 'Whiskey'],
    tastingNotes: 'Creamy blend of Irish whiskey, cream, and cocoa. Rich, smooth, and indulgent.',
    origin: 'Ireland',
    searchTerms: ['baileys', 'irish cream', 'cream liqueur'],
  },
];

/**
 * Search for a spirit by name
 * Returns best matches based on search terms
 */
export function findSpirit(query: string): Spirit | null {
  const lowerQuery = query.toLowerCase().trim();

  // Exact match on ID or name
  let match = SPIRITS_DATABASE.find(
    spirit => spirit.id === lowerQuery || spirit.name.toLowerCase() === lowerQuery
  );

  if (match) return match;

  // Search in search terms
  match = SPIRITS_DATABASE.find(spirit =>
    spirit.searchTerms.some(term => term.includes(lowerQuery) || lowerQuery.includes(term))
  );

  if (match) return match;

  // Partial brand match
  match = SPIRITS_DATABASE.find(spirit =>
    spirit.brand.toLowerCase().includes(lowerQuery) || lowerQuery.includes(spirit.brand.toLowerCase())
  );

  return match || null;
}

/**
 * Get all spirits of a specific type
 */
export function getSpiritsByType(type: SpiritType): Spirit[] {
  return SPIRITS_DATABASE.filter(spirit => spirit.type === type);
}

/**
 * Get spirits by price tier
 */
export function getSpiritsByPriceTier(tier: PriceTier): Spirit[] {
  return SPIRITS_DATABASE.filter(spirit => spirit.priceTier === tier);
}

/**
 * Get price tier display text
 */
export function getPriceTierDisplay(tier: PriceTier): string {
  const tiers: Record<PriceTier, string> = {
    'budget': 'Budget',
    'mid-range': 'Mid-Range',
    'premium': 'Premium',
    'ultra-premium': 'Ultra-Premium',
  };
  return tiers[tier];
}
