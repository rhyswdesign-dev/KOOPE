/**
 * Spirits Database
 * Hardcoded database of popular spirits for bottle recognition
 * Includes: name, type, ABV, flavor profile, price tier, tasting notes
 */
import { SPIRITS_DATABASE_EXTRA } from './spiritsDatabaseExtra';

export type PriceTier = 'budget' | 'mid-range' | 'premium' | 'ultra-premium';
export type SpiritType =
  'gin' | 'vodka' | 'rum' | 'whiskey' | 'tequila' | 'mezcal' | 'brandy' | 'liqueur' | 'other';
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

const SPIRITS_DATABASE_CORE: Spirit[] = [
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
    tastingNotes:
      "Charles Tanqueray developed this recipe in 1830, and it remains one of gin's most minimalist formulas — just four botanicals, juniper, coriander, angelica root, and licorice, distilled together in a copper pot still built to specifications the brand has used since the 19th century. That simplicity is the point: with nothing to hide behind, the juniper has to carry the gin, backed by warm coriander spice and a touch of licorice sweetness at the edges. The nose is resinous and piney, the palate builds bright citrus peel over the juniper base, and the finish is crisp, dry, and clean. It's the reference bottle a lot of bartenders reach for when a recipe just calls for 'London Dry.'",
    origin: 'United Kingdom',
    searchTerms: ['tanqueray london dry', 'tanq london dry', 'tanqueray original'],
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
    flavorProfile: ['Juniper', 'Lemon', 'Coriander', 'Angelica'],
    tastingNotes:
      "Bombay Sapphire is defined by vapor infusion — its 10 botanicals sit in mesh baskets inside a Carterhead still rather than steeping directly in the spirit, so only the lighter, more delicate aromatic compounds carry through. It's distilled at Laverstoke Mill in Hampshire, a former paper mill that once supplied paper for British banknotes before being converted into a distillery. That gentler extraction shows in the glass: soft juniper up front, bright lemon peel and coriander seed through the middle, with angelica lending a faint earthy lift, and a clean, delicate finish with none of the heavier oils a pot-distilled gin can carry. It's built to be light and mixable rather than assertive.",
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
    tastingNotes:
      "Hendrick's blends the output of two different pot stills — a Carter-Head and a small Bennett still — each run on its own recipe of eleven botanicals before the batches are combined. What sets it apart happens after distillation: the blended gin is infused with cucumber and Bulgarian rose essences rather than distilling the produce directly, which is what gives it that unmistakable character. Juniper is present but plays a supporting role beneath a nose of fresh cucumber and rose petal. The palate is cool and floral with a light peppery spice, and the finish is clean and refreshing rather than dry and piney like a traditional London Dry.",
    origin: 'Scotland',
    searchTerms: ['hendricks', 'hendrick', 'ndricks', 'cucumber gin'],
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
    flavorProfile: ['Juniper', 'Floral', 'Citrus'],
    tastingNotes:
      "The Botanist comes from Bruichladdich, the Islay Scotch distillery, and is unusual for a gin in how long it takes: a single slow run in a converted Lomond still nicknamed 'Ugly Betty' can take upwards of 17 hours, far longer than most gins spend on the still. The recipe layers 22 botanicals hand-foraged from the island's machair and hedgerows on top of 9 classic gin botanicals, giving it far more range than a typical juniper-and-citrus formula. Juniper still leads, but it shares space with a genuinely floral, herbaceous character from the foraged additions and a bright citrus lift. The palate is soft and complex, and the finish lingers with grassy, floral notes rather than dry pine.",
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
    tastingNotes:
      "Distilled six times in old-fashioned pot stills from yellow corn, which makes it naturally gluten-free. Founder Bert Butler Beveridge started out hand-bottling batches in an Austin garage in the mid-1990s, well before craft vodka was a category — it's now one of the best-selling American spirits of any kind. The extra distillation passes strip out congeners for an exceptionally clean, neutral profile with just a whisper of corn sweetness and a soft, faintly creamy mouthfeel. No harsh burn, no lingering aftertaste — it's built to disappear into a vodka soda or stand up cleanly over ice.",
    origin: 'United States',
    searchTerms: ['titos', "tito's", 'tito', 'handmade vodka', 'texas vodka'],
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
    flavorProfile: ['Clean', 'Citrus', 'Almond', 'Bread'],
    tastingNotes:
      'Made from single-origin soft winter wheat grown in the Picardy region of northern France, then distilled and blended with spring water sourced from a limestone aquifer in Gensac-la-Pallue, near Cognac. American entrepreneur Sidney Frank launched the brand in 1997 at age 77 and sold it to Bacardi in 2004 for roughly $2.2 billion, still one of the largest prices ever paid for a spirits brand. The wheat base gives it a rounder, softer character than the rye and potato vodkas that dominate Eastern Europe. Expect a clean nose with light citrus and fresh-baked bread, a smooth, almost creamy palate carrying almond, and a crisp finish with minimal burn — the profile that helped define the modern "luxury vodka" category when it launched in the late 1990s.',
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
    flavorProfile: ['Clean', 'Crisp', 'Citrus', 'Honey'],
    tastingNotes:
      "Distilled from European wheat by the Nolet family, who have run their Schiedam, Netherlands distillery since 1691 — the name honors 'Ketel 1,' the original copper pot still still in use for a portion of every batch alongside modern column stills. That pot-still component is what gives Ketel One its texture: rounder and slightly weightier than a fully column-distilled vodka. Expect a crisp nose with light citrus, a smooth mid-palate carrying a touch of honeyed sweetness, and a clean, dry finish with none of the harshness cheaper wheat vodkas can show.",
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
    flavorProfile: ['Clean', 'Grain', 'Smooth', 'Dried Fruit'],
    tastingNotes:
      "Distilled from winter wheat grown around the town of Åhus in southern Sweden, where the brand has been produced continuously since 1879 using a single continuous-distillation process rather than the multiple redistillations many vodkas advertise. In 1985, Absolut commissioned Andy Warhol to paint its bottle, kicking off a decades-long series that would eventually feature over 350 artists — one of the longest-running art-and-advertising partnerships ever. That approach keeps a bit more grain character intact, giving Absolut a fuller body than ultra-filtered competitors — dried fruit and subtle cereal sweetness on the nose, a smooth, slightly rich palate, and a clean finish. It's the vodka that turned bottle design into a marketing category, and remains a reliable, no-nonsense workhorse for mixing.",
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
    tastingNotes:
      'Made from molasses and column-distilled for a clean, light body, then charcoal-filtered before a short rest in oak — the filtering is what strips out color and keeps this rum crisp rather than round. Bacardi has produced it in Puerto Rico since relocating from Cuba in the early 1960s, and it remains the best-selling rum in the world by volume. Expect a light nose of vanilla and toasted almond, a soft, faintly sweet palate, and a clean, short finish with barely any oak presence. It stays out of the way in a mix, which is exactly the point.',
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
    tastingNotes:
      'A blend of Caribbean rums steeped with vanilla, cinnamon, and other warming spices, then sweetened and colored with caramel before bottling — spiced rum is a flavored category built for mixability rather than aging pedigree. It has been produced in the U.S. Virgin Islands since Captain Morgan relocated its distilling there, making it a Virgin Islands rum rather than the Jamaican rum its buccaneer branding implies. The nose leans on vanilla and baking spice, the palate is soft and sweet with caramel and clove, and the finish is short and warm. It is built to disappear into cola or a tiki-leaning cocktail, not to be sipped neat.',
    origin: 'United States Virgin Islands',
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
    flavorProfile: ['Banana', 'Vanilla', 'Toasted Almond'],
    tastingNotes:
      "A blend of column- and pot-still rums aged up to five years in ex-bourbon barrels, married together before bottling. Mount Gay traces its roots to 1703 and is generally credited as the oldest continuously operating rum brand in the world, distilling at its home on the west coast of Barbados. The nose brings ripe banana and vanilla, the palate is smooth with toasted almond and light caramel, and the finish is soft with a gentle oak dryness. It is easy-drinking enough to sip but built with enough backbone to hold up in a rum old fashioned or planter's punch.",
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
    flavorProfile: ['Vanilla', 'Tobacco', 'Oak', 'Cocoa'],
    tastingNotes:
      "A molasses-based Cuban rum aged a minimum of seven years in American oak barrels under the tropical climate that accelerates maturation on the island. Havana Club has distilled in Cuba since 1934 and remains the country's flagship rum, unavailable in the U.S. market due to the trade embargo but a benchmark elsewhere. Expect a nose of vanilla and dried fruit, a rounded palate of cocoa, toasted oak, and a whisper of tobacco leaf, and a warm, lingering finish. It rewards sipping neat but also carries enough structure for an aged daiquiri or a rum old fashioned.",
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
    flavorProfile: ['Vanilla', 'Honey', 'Smooth', 'Nutty'],
    tastingNotes:
      "Jameson blends pot still and grain whiskeys triple-distilled at the Midleton Distillery in County Cork, a process that strips out heavier congeners and gives Irish whiskey its trademark smoothness compared to double-distilled Scotch. The brand traces back to 1780, when John Jameson founded his distillery in Dublin, and it remains the best-selling Irish whiskey in the world. Matured in a mix of bourbon and sherry casks, it opens with soft vanilla and honeyed sweetness, rounds out with a light nuttiness, and finishes clean and easy. It's built for approachability rather than complexity — the whiskey that made Irish whiskey a session pour again.",
    origin: 'Ireland',
    searchTerms: ['jameson', 'irish whiskey'],
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
    tastingNotes:
      "Bulleit uses an unusually high-rye mash bill — around 28% rye — which pushes it toward the spicier, drier end of the bourbon spectrum rather than the soft, corn-forward style most budget bourbons chase. Tom Bulleit revived his family's 19th-century recipe in the 1980s, and the bottle's frontier-apothecary look nods to that history. Expect bold rye spice and pepper up front, sweetened by vanilla and a touch of dried fruit, with oak tannin carrying through a long, dry finish. It's a workhorse bottle that holds its own neat but was built with cocktails in mind.",
    origin: 'United States',
    searchTerms: ['bulleit', 'bourbon', 'high rye'],
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
    flavorProfile: ['Spice', 'Fruit', 'Oak', 'Chocolate'],
    tastingNotes:
      "Woodford Reserve is distilled three times in copper pot stills — a method almost no other American bourbon uses, since most rely on column stills — which gives it a fuller, more textured mouthfeel. The distillery sits on one of the oldest continuously operating bourbon sites in Kentucky, and the current small-batch blend draws from a handful of distinct mash bills. Dried fruit, cocoa, mint, and baking spice layer over a backbone of oak, with a rich, chewy body that belies its fairly standard proof. It's a complex, full-flavored bourbon built to be sipped slowly.",
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
    tastingNotes:
      "Black Label blends malt and grain whiskies from across Scotland — Speyside, Highland, and a touch of smoky Islay character — with every component aged at least 12 years before blending, unusual rigor for a whisky at this price point. Johnnie Walker's striding-man logo has its own origin story: in 1908 the Walker family challenged cartoonist Tom Browne to sketch their new mascot on the spot over lunch, and legend has it he had the design finished in under five minutes. Black Label has been the brand's flagship expression ever since. Gentle smoke threads through vanilla, dried fruit, and warm spice, with a smooth, rounded body that shows real depth for a blend. It's the benchmark a lot of drinkers use to judge every other blended Scotch.",
    origin: 'Scotland',
    searchTerms: ['johnnie walker black', 'black label scotch', 'jw black'],
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
    tastingNotes:
      "Patrón is 100% Weber blue agave, cooked in small brick ovens and roller-milled the traditional way before being triple-distilled — an extra pass most blancos skip — then rested only briefly in stainless steel before bottling. Founded in the early 1990s, Patrón helped launch the ultra-premium tequila category in the US and remains the reference point a lot of drinkers reach for first. The nose is fresh-cut agave and lime peel, the palate is soft and rounded with white pepper prickling underneath the citrus, and the triple distillation shows in a finish that's clean rather than sharp. It's smooth enough to sip neat but built to carry a margarita without disappearing into it.",
    origin: 'Mexico',
    searchTerms: ['patron silver', 'patrón silver', 'patron blanco', 'silver tequila'],
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
    flavorProfile: ['Agave', 'Citrus', 'Lime', 'Pepper'],
    tastingNotes:
      "Don Julio González started distilling in Jalisco's highlands in the 1940s, and the Blanco remains the house style built around that highland fruitiness — 100% blue agave, slow-cooked and rested only briefly in stainless steel so the raw agave character stays front and center. The nose is bright with fresh agave and lime zest, the palate carries clean citrus over a peppery backbone with almost no wood influence, and the finish is crisp and short. It's built to show agave purity rather than complexity, which is exactly why it's become a default premium margarita pour.",
    origin: 'Mexico',
    searchTerms: ['don julio blanco', 'don julio silver', 'dj blanco'],
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
    tastingNotes:
      "Espolòn is distilled in the lowlands of Jalisco from 100% blue agave and rested only briefly before bottling, keeping the raw, grassy agave character upfront rather than softening it with wood. The brand built its identity on Mexican folk-art label design as much as the liquid, but the blanco holds its own: black pepper and a burst of tropical fruit — pineapple, mango — sit over a peppery agave core, with a clean, slightly hot finish typical of an unaged tequila at this price. It's raw enough to notice in a shot but versatile enough to disappear into a well-built margarita, which is where most of it ends up.",
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
    flavorProfile: ['Agave', 'Vanilla', 'Coconut', 'Citrus'],
    tastingNotes:
      "Casamigos Blanco is 100% blue agave from the highlands of Jalisco, cooked slowly and rested only briefly in stainless steel before bottling — the founders, including George Clooney and Rande Gerber, reportedly spent years dialing in the recipe specifically to be smooth enough to drink without salt or lime. Sweet cooked agave leads the nose, with vanilla and a faint coconut note carrying through the palate ahead of a clean citrus lift, and the finish is soft and short rather than peppery. It's one of the gentler blancos on the market, built explicitly for easy sipping rather than showing off raw agave bite.",
    origin: 'Mexico',
    searchTerms: ['casamigos blanco', 'casa amigos blanco', 'george clooney tequila'],
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
    flavorProfile: ['Smokey', 'Agave', 'Citrus', 'Espadín'],
    tastingNotes:
      "Del Maguey was founded by artist Ron Cooper in 1995 and is widely credited with introducing single-village mezcal to the US market, working directly with small palenques rather than blending across producers. Vida is sourced from San Luis del Río, Oaxaca, made from Espadín agave that's roasted in traditional earthen pits lined with volcanic rock before being crushed and distilled in copper stills — the classic mezcal process, just built for everyday use rather than a special occasion. The nose carries roasted agave and campfire smoke, the palate is balanced rather than aggressive with citrus brightness cutting through, and the finish is clean and moderately smoky. It's built specifically to work in mezcal cocktails without fighting the other ingredients.",
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
    flavorProfile: ['Smokey', 'Herbal', 'Pepper', 'Espadín'],
    tastingNotes:
      "Montelobos is produced by mezcalier Iván Saldaña, who also created Ancho Reyes chile liqueur, and is certified organic — a rarity in a category where agave farming isn't always documented that rigorously. It's made from Espadín agave, roasted in traditional earthen pits and distilled in copper alembic stills, following the same base process as most artisanal mezcal but with more attention paid to sourcing and consistency. The nose is gently smoky with fresh green herbs, the palate carries white pepper and a mineral edge alongside the roasted agave, and the finish is smooth and moderately long rather than sharp.",
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
    tastingNotes:
      "The entry point into the world's best-selling cognac house, blending eaux-de-vie double-distilled in traditional Charentais pot stills before resting a minimum of two years in French oak — the youngest legal age for the VS (Very Special) designation. Founded in 1765 by an Irish soldier-turned-merchant, Hennessy remains the largest cognac producer by volume. Expect fresh grape fruitiness up front, toasted oak and vanilla building through the middle, and a smooth, moderately short finish — built for mixing as much as sipping.",
    origin: 'France',
    searchTerms: ['hennessy vs', 'hennessy very special', 'henny vs'],
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
    flavorProfile: ['Apricot', 'Vanilla', 'Oak', 'Cinnamon'],
    tastingNotes:
      "A 'Fine Champagne' cognac, meaning the blend draws only from the Grande and Petite Champagne crus — the two chalkiest, most prized growing zones in the Charente. The house's centaur logo dates to 1870, adopted by then-director Paul-Émile Rémy Martin as a nod to his own zodiac sign, Sagittarius. Double pot-still distilled and aged a minimum of four years (well beyond the VSOP floor) in French oak, it carries more structure and depth than a standard VS. Ripe apricot and baking spice lead on the nose, with vanilla, cinnamon, and toasted oak developing through a rich, rounded palate and a warm, lingering finish.",
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
    tastingNotes:
      'A neutral sugar-beet spirit redistilled with the dried peels of sweet and bitter orange, a recipe the Cointreau brothers developed in Angers, France, in 1875 and have kept essentially unchanged since. Unlike cheaper triple secs, it is distilled rather than simply flavored, which gives it a cleaner, more concentrated orange character instead of syrupy sweetness. The nose is bright with fresh and candied orange peel, the palate balances citrus oils against sugar without tipping saccharine, and the finish is clean and lingering. It is the reference-standard triple sec for margaritas, sidecars, and cosmopolitans.',
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
    flavorProfile: ['Elderflower', 'Peach', 'Citrus', 'Pear'],
    tastingNotes:
      'Made from handpicked elderflower blossoms, harvested in a roughly three-week window each June in the foothills of the French Alps and macerated in neutral spirit before a light distillation. It launched in 2007 and quickly became a bartender staple, earning a reputation as "bartender\'s ketchup" for how easily it lifts cocktails built around gin, sparkling wine, or vodka. The nose is intensely floral with ripe stone fruit, the palate carries pear and citrus around a honeyed elderflower core, and the finish is soft and lightly sweet. Its low proof and delicate character make it easy to overpour, so it rewards a light hand.',
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
    flavorProfile: ['Orange', 'Bitter', 'Herbal', 'Rhubarb'],
    tastingNotes:
      'A neutral spirit base infused with a secret blend of herbs, roots, and bitter and sweet oranges, colored with its signature vivid orange hue. It was developed in Padua in 1919 by the Barbieri brothers and sits at a lower proof and gentler bitterness than its cousin Campari, which is what let it become the anchor of the Aperol Spritz, now one of the most-ordered cocktails in the world. The nose is bright with orange peel, the palate opens sweet before rhubarb and gentian bitterness settle in, and the finish is short and refreshing rather than assertive. It is built to be cut with prosecco and soda, not sipped alone.',
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
    flavorProfile: ['Bitter', 'Orange', 'Herbal', 'Cherry'],
    tastingNotes:
      "An infusion of herbs, aromatic plants, and bitter orange peel in alcohol and water, a recipe created by Gaspare Campari in Novara in 1860 and still produced to a closely guarded formula. Its trademark deep red color once came from crushed cochineal insects, a detail the brand phased out in favor of artificial coloring years ago, though the bitter profile hasn't changed. The nose is heavy with orange peel and dark herbs, the palate is assertively bitter with cherry and root notes underneath, and the finish is long and drying. It is the backbone of the Negroni and the Americano, built to cut through sweetness rather than blend into it.",
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
    tastingNotes:
      "A sugarcane spirit base steeped with Arabica coffee grown in Veracruz, then rounded out with vanilla and caramel notes before bottling. It was first produced in 1936 near Córdoba, Mexico, in a region long known for its coffee, and remains one of the best-selling liqueurs in the world. The nose is deep roasted coffee with a sweet vanilla lift, the palate is thick and syrupy with caramel and dark coffee bitterness kept in check by sugar, and the finish lingers with toasted, slightly nutty coffee. It's the standard-bearer for White Russians and espresso martinis for good reason.",
    origin: 'Mexico',
    searchTerms: ['kahlua', 'kahlúa', 'coffee liqueur'],
  },
  {
    id: 'baileys',
    name: 'Baileys Irish Cream',
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
    tastingNotes:
      'A blend of Irish whiskey and fresh Irish dairy cream, emulsified with cocoa and vanilla flavoring using a process the brand developed to keep the cream stable in bottle for up to two years without refrigeration. Created in Dublin in 1974, it effectively invented the cream liqueur category and remains the template every competitor is measured against. The nose is milky with cocoa and a light whiskey warmth, the palate is thick and smooth with chocolate, vanilla, and a gentle whiskey bite underneath, and the finish is long, sweet, and creamy. It works poured over ice, in coffee, or as a dessert cocktail component.',
    origin: 'Ireland',
    searchTerms: ['baileys original', 'baileys irish cream', 'irish cream liqueur'],
  },

  // ===== GIN (expanded) =====
  {
    id: 'monkey-47',
    name: 'Monkey 47 Schwarzwald Dry Gin',
    brand: 'Monkey 47',
    type: 'gin',
    abv: 47,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 45, max: 55 },
      CAD: { min: 58, max: 70 },
      GBP: { min: 38, max: 48 },
    },
    flavorProfile: ['Juniper', 'Citrus', 'Cranberry'],
    tastingNotes:
      "Monkey 47 is distilled in the Black Forest from a recipe of 47 botanicals, including lingonberry and pomelo alongside the classic juniper — a combination that's part of why it stands out even in a crowded craft-gin field. As the brand's own lore tells it, the name traces back to Max, a monkey said to have lived to 47 at a Black Forest zoo in the years after WWII. Juniper and pine lead the nose, layered with tart lingonberry and bright citrus peel, while the palate is dense and complex with a peppery, resinous quality, and the finish is long, dry, and citrus-bright. It's frequently cited as one of the most complex gins on the market, and the 47-botanical count is very much earned rather than a marketing number.",
    origin: 'Germany',
    searchTerms: ['monkey 47', 'monkey47', 'schwarzwald', 'black forest gin'],
  },
  {
    id: 'beefeater',
    name: 'Beefeater London Dry Gin',
    brand: 'Beefeater',
    type: 'gin',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 24, max: 30 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Juniper', 'Citrus', 'Angelica', 'Licorice'],
    tastingNotes:
      "Beefeater is one of the last major gins still distilled within London city limits, at a distillery in Kennington that traces back to James Burrough's original 1863 recipe. Its nine botanicals, including juniper, angelica root, and licorice, are steeped in neutral spirit for a full 24 hours before distillation rather than vapor-infused, a slower, more traditional maceration that pulls deeper flavor out of the botanicals. The nose is resinous with pine and citrus peel, the palate carries bold juniper against warm licorice and earthy angelica, and the finish is dry and clean with a lingering citrus snap.",
    origin: 'United Kingdom',
    searchTerms: ['beefeater', 'beefeater gin', 'london dry'],
  },
  {
    id: 'aviation-gin',
    name: 'Aviation American Gin',
    brand: 'Aviation',
    type: 'gin',
    abv: 42,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 32 },
      CAD: { min: 35, max: 42 },
      GBP: { min: 22, max: 28 },
    },
    flavorProfile: ['Lavender', 'Cardamom', 'Citrus'],
    tastingNotes:
      "Aviation was one of the gins that helped define the 'New Western' style in the mid-2000s, built by bartender Ryan Magarian in Portland, Oregon, specifically to work in cocktails rather than lean on the pine-forward profile of a classic London Dry. Juniper is in the botanical bill but deliberately dialed back, sitting quietly underneath lavender, cardamom, and dried orange peel rather than leading the nose. The palate opens floral and warmly spiced, with citrus peel and a soft anise note from the sarsaparilla and coriander, and the finish is smooth with barely any pine bite. Ryan Reynolds' 2018 investment and marketing push brought it to a much wider audience, but the recipe itself predates that by over a decade.",
    origin: 'United States',
    searchTerms: ['aviation', 'aviation gin', 'ryan reynolds gin'],
  },
  {
    id: 'sipsmith',
    name: 'Sipsmith London Dry Gin',
    brand: 'Sipsmith',
    type: 'gin',
    abv: 41.6,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 40, max: 48 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Juniper', 'Lemon', 'Honey'],
    tastingNotes:
      'Sipsmith opened in Hammersmith in 2009, the first new copper-pot distillery in London in almost 200 years — getting there meant lobbying to change a law that had effectively required a minimum still size too large for a small operation to afford. Everything is distilled in a single run rather than made as a concentrate and cut down afterward, in a still nicknamed Prudence, using ten botanicals built around a juniper-forward London Dry backbone. The nose is bright with juniper and lemon zest, the palate carries citrus and a gentle honeyed sweetness through the middle, and the finish is smooth and clean.',
    origin: 'United Kingdom',
    searchTerms: ['sipsmith', 'sipsmith gin'],
  },
  {
    id: 'malfy-limone',
    name: 'Malfy Gin Con Limone',
    brand: 'Malfy',
    type: 'gin',
    abv: 41,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 35 },
      CAD: { min: 38, max: 46 },
      GBP: { min: 24, max: 30 },
    },
    flavorProfile: ['Lemon', 'Juniper', 'Fresh'],
    tastingNotes:
      "Malfy is distilled just outside Turin in Moncalieri, and the Con Limone expression is built around whole Italian lemon peels macerated and distilled alongside a classic juniper-based botanical bill, rather than relying on added flavoring or essence. The brand's name is itself a nod to the Amalfi Coast, famed for its fragrant lemons, even though the gin is actually distilled well to the north. That real-peel distillation is why the lemon character reads as true and intense rather than candied. The nose is a wave of fresh lemon zest over a resinous juniper base, the palate stays citrus-forward with just enough juniper structure to keep it recognizably gin, and the finish is bright, zesty, and refreshing.",
    origin: 'Italy',
    searchTerms: ['malfy', 'malfy gin', 'malfy limone', 'con limone', 'italian gin'],
  },

  // ===== VODKA (expanded) =====
  {
    id: 'belvedere',
    name: 'Belvedere Vodka',
    brand: 'Belvedere',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 42, max: 50 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Vanilla', 'Almond', 'Cream'],
    tastingNotes:
      "Made from a single variety of Polish Dankowskie rye, quadruple-distilled and cut with water drawn from the estate's own well, a point of pride for a brand built around the idea of terroir in a category that rarely talks about it. It's named for Belweder Palace, the official residence of Poland's president in Warsaw, which is illustrated on every bottle. Rye gives Belvedere a naturally creamier, slightly spicier backbone than wheat or potato vodkas. The result is a soft, rounded palate with vanilla and marzipan-like almond, minimal grain bite, and a long, satiny finish.",
    origin: 'Poland',
    searchTerms: ['belvedere', 'belvedere vodka', 'polish vodka'],
  },
  {
    id: 'stolichnaya',
    name: 'Stolichnaya Premium Vodka',
    brand: 'Stolichnaya',
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 26, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Grain', 'Citrus', 'Clean'],
    tastingNotes:
      "A blend of winter wheat and rye, distilled four times and filtered through quartz and charcoal — a production method the brand has used since it launched in Moscow in 1938, though the spirit and its production have shifted to Riga, Latvia in recent years. Stolichnaya was at the center of one of the Cold War's strangest trade deals: in 1972, with no convertible currency to pay for Pepsi, the USSR bartered exclusive U.S. distribution rights to this vodka in exchange for Pepsi concentrate. The wheat-rye combination gives it a slightly fuller body than pure wheat vodkas, with subtle grain sweetness, a touch of light citrus, and a clean, crisp, faintly peppery finish. One of the vodkas that first built the category's reputation for quality outside its home region.",
    origin: 'Latvia',
    searchTerms: ['stolichnaya', 'stoli', 'stoli vodka'],
  },
  {
    id: 'ciroc',
    name: 'Cîroc Ultra-Premium Vodka',
    brand: 'Cîroc',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 42, max: 50 },
      GBP: { min: 28, max: 34 },
    },
    flavorProfile: ['Grape', 'Citrus', 'Floral'],
    tastingNotes:
      "Distilled from Mauzac and Ugni Blanc grapes grown in Gaillac, in southwest France, rather than the grain or potato base most vodkas use — a choice that leans on the same fruit that goes into brandy production. Sean 'Diddy' Combs became the face of Cîroc under a 2007 marketing deal, and the partnership drove a roughly 40-fold jump in the brand's annual sales volume over the years that followed. The grape base carries through as a genuine fruity freshness rather than added flavoring, with bright citrus and light floral notes on the nose and a clean, smooth finish with almost no grain character at all. It's one of the few widely available vodkas where the base ingredient is actually detectable in the glass.",
    origin: 'France',
    searchTerms: ['ciroc', 'cîroc', 'grape vodka', 'french vodka'],
  },
  {
    id: 'smirnoff',
    name: 'Smirnoff No. 21 Vodka',
    brand: 'Smirnoff',
    type: 'vodka',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 10, max: 16 },
    },
    flavorProfile: ['Neutral', 'Clean', 'Grain'],
    tastingNotes:
      "Distilled from corn and triple-filtered through charcoal, following the recipe Pyotr Smirnov built into a Moscow institution in the 19th century before the family fled the Russian Revolution and relicensed the brand from Paris. It's the world's best-selling vodka by volume, and the formula reflects that mass appeal: neutral, clean grain character with no single note dominating, a light body, and a dry, no-frills finish. Not built for sipping neat — it's the reference-point mixer that most cocktail vodkas get measured against.",
    origin: 'United States',
    searchTerms: ['smirnoff', 'smirnoff no 21', 'smirnoff vodka'],
  },

  // ===== RUM (expanded) =====
  {
    id: 'diplomatico-reserva',
    name: 'Diplomático Reserva Exclusiva',
    brand: 'Diplomático',
    type: 'rum',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 35, max: 45 },
      CAD: { min: 48, max: 58 },
      GBP: { min: 32, max: 40 },
    },
    flavorProfile: ['Dried Fruit', 'Chocolate', 'Caramel', 'Orange Peel'],
    tastingNotes:
      "A blend of column- and pot-still rums from sugarcane molasses, aged up to twelve years in a mix of ex-bourbon and other casks before final blending in Venezuela's Andes foothills. Part of that blend comes off a rare batch kettle copper still, a piece of equipment more commonly associated with cognac production than rum and one of only a handful in use anywhere, which is part of what gives Diplomático (formerly Ron Diplomático) its unusually rich, dessert-like style — closer to a sipping spirit than a mixing rum. The nose is deep with dried fig and raisin, the palate layers dark chocolate, toffee, and orange peel over a soft, almost oily texture, and the finish is long and warmly sweet. It holds up neat or over a single large rock better than in most cocktails.",
    origin: 'Venezuela',
    searchTerms: ['diplomatico', 'diplomático', 'reserva exclusiva', 'venezuelan rum'],
  },
  {
    id: 'zacapa-23',
    name: 'Ron Zacapa 23 Solera',
    brand: 'Zacapa',
    type: 'rum',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 42, max: 52 },
      CAD: { min: 55, max: 68 },
      GBP: { min: 38, max: 48 },
    },
    flavorProfile: ['Vanilla', 'Honey', 'Spice', 'Oak'],
    tastingNotes:
      "Rum solera-aged using a fractional blending system borrowed from sherry production, where younger rum is fed into barrels holding older rum rather than aged as a single vintage — the '23' refers to the oldest rum in the blend, not a uniform age statement. It matures in a warehouse more than 2,300 meters up in the Guatemalan highlands, where the cooler mountain air slows evaporation and extraction compared to aging at sea level. The nose is rich with honey and vanilla, the palate brings soft baking spice, dried fruit, and toasted oak, and the finish is long and sweet with barely any burn. It is built for sipping neat.",
    origin: 'Guatemala',
    searchTerms: ['zacapa', 'ron zacapa', 'zacapa 23', 'guatemalan rum'],
  },
  {
    id: 'kraken',
    name: 'The Kraken Black Spiced Rum',
    brand: 'Kraken',
    type: 'rum',
    abv: 47,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 28, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Spice', 'Black Pepper', 'Molasses', 'Vanilla'],
    tastingNotes:
      'A Trinidadian molasses rum blended with a spice mix of cinnamon, clove, ginger, and vanilla, then deeply colored with caramel and spice extraction to produce its near-black appearance — the styling leans hard into its Kraken sea-monster branding, right down to the embossed tentacle bottle. It is bottled at a higher-than-typical 47% ABV for a spiced rum, which gives it more punch than lighter competitors like Captain Morgan. The nose is heavy with clove and molasses, the palate brings dark spice, black pepper heat, and vanilla sweetness, and the finish is long and warming. It holds its own in a dark and stormy or a spiced rum cola.',
    origin: 'Trinidad',
    searchTerms: ['kraken', 'kraken rum', 'black spiced rum'],
  },
  {
    id: 'rum-bar-white-overproof',
    name: 'Rum-Bar White Overproof Rum',
    brand: 'Rum-Bar',
    type: 'rum',
    abv: 63,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 38 },
      CAD: { min: 38, max: 50 },
      GBP: { min: 24, max: 34 },
    },
    flavorProfile: ['Overproof Heat', 'Raw Cane', 'Tropical Fruit', 'Funky Pot Still'],
    tastingNotes:
      "Distilled from molasses on Worthy Park Estate's pot stills in high-ester style, then bottled unaged and overproof at 63% ABV rather than diluted down to standard strength. Worthy Park is one of Jamaica's oldest working sugar estates, dating to the 1670s, and its pot-still rums are prized for the funky, high-ester character that comes from long fermentation and minimal filtering. The nose hits with raw cane and tropical fruit funk, the palate is intensely hot with ripe banana and pineapple pushing through the overproof burn, and the finish is long, fruity, and assertive. It has real depth for an overproof, whether sipped carefully or used to punch up a Jamaican-style tiki drink.",
    origin: 'Jamaica',
    searchTerms: [
      'rum bar white',
      'rum-bar white',
      'worthy park white rum',
      'jamaica overproof',
      'pot still rum',
      'white overproof rum',
      'guaranteed strength rum',
    ],
  },
  {
    id: 'rum-bar-gold',
    name: 'Rum-Bar Gold Rum',
    brand: 'Rum-Bar',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 35 },
      CAD: { min: 33, max: 45 },
      GBP: { min: 22, max: 30 },
    },
    flavorProfile: ['Toffee', 'Vanilla', 'Banana', 'Oak'],
    tastingNotes:
      "Pot-still molasses rum from Worthy Park Estate, aged in ex-bourbon barrels and brought down to a standard 40% ABV rather than bottled overproof, giving it a gentler profile than its Rum-Bar White sibling while keeping some of the estate's signature funk underneath. Worthy Park distills and ages entirely on its own estate in Jamaica's interior, a rarer setup than the island's blending-house-supplied brands. The nose is smooth with toffee and vanilla, the palate carries ripe banana and light oak spice over a soft funky backbone, and the finish is gentle with a warm caramel fade. It is a good entry point into Jamaican pot-still character without the overproof intensity.",
    origin: 'Jamaica',
    searchTerms: ['rum bar gold', 'rum-bar gold', 'worthy park gold', 'jamaica gold rum bar'],
  },
  {
    id: 'kingston-62-gold',
    name: 'Kingston 62 Jamaica Gold Rum',
    brand: 'Kingston 62',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 35 },
      CAD: { min: 33, max: 45 },
      GBP: { min: 22, max: 30 },
    },
    flavorProfile: ['Molasses', 'Tropical Fruit', 'Vanilla', 'Light Spice'],
    tastingNotes:
      'A blended Jamaican gold rum built from molasses-based column and pot-still rum, aged briefly in oak before bottling at standard proof. Its name is a nod to 1962, the year Jamaica gained independence, and the bottle leans into that national pride with its lion crest and green glass. The nose carries rich molasses and ripe tropical fruit, the palate is smooth with vanilla and light baking spice over the characteristic Jamaican funk, and the finish is soft with a gentle oak warmth. It mixes well in a rum punch or a simple rum and ginger without overwhelming either.',
    origin: 'Jamaica',
    searchTerms: [
      'kingston 62',
      'kingston62',
      'k62',
      'jamaica gold rum',
      'kingston rum',
      'lion rum',
      'k62 rum',
      'kingston 62 gold',
    ],
  },

  // ===== WHISKEY — BOURBON (expanded) =====
  {
    id: 'makers-mark',
    name: "Maker's Mark Bourbon",
    brand: "Maker's Mark",
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 32 },
      CAD: { min: 35, max: 42 },
      GBP: { min: 22, max: 28 },
    },
    flavorProfile: ['Caramel', 'Vanilla', 'Wheat'],
    tastingNotes:
      "Maker's Mark swaps rye for winter wheat as its secondary grain, the defining choice that gives it a soft, mellow sweetness without the spicy bite of a rye-heavy bourbon. Founded by Bill Samuels Sr. in Loretto, Kentucky in the 1950s, it was one of the first bourbons to market itself on craft and consistency, right down to every bottle still being hand-dipped in red wax. Caramel and vanilla lead the way, with a round, honeyed body and no sharp edges, finishing warm rather than hot. It's the approachable, always-reliable bourbon that introduced a lot of people to the category.",
    origin: 'United States',
    searchTerms: ["maker's mark", 'makers mark', 'makers', 'wheated bourbon'],
    serveGuidance: {
      priority: 'balanced',
      spiritFamily: 'bourbon',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: false,
      why: 'Soft and approachable neat. Excellent in Old Fashioneds and Whiskey Sours.',
      cocktailUse: 'good-spirit-forward',
    },
  },
  {
    id: 'buffalo-trace',
    name: 'Buffalo Trace Bourbon',
    brand: 'Buffalo Trace',
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Vanilla', 'Toffee', 'Anise', 'Mint'],
    tastingNotes:
      "Buffalo Trace comes off the distillery's standard low-rye mash bill, made at one of the oldest continuously operating distilleries in America, a site that survived Prohibition by producing whiskey for medicinal purposes. It's a straightforward recipe, but careful barrel selection gives it more complexity than its price would suggest. Vanilla and toffee sweetness sit alongside anise and dark fruit, with a soft, balanced finish that never gets hot despite a fairly standard 90 proof. It's the bourbon most bartenders reach for first because it does everything well without demanding a premium price.",
    origin: 'United States',
    searchTerms: ['buffalo trace', 'buffalo trace bourbon'],
    serveGuidance: {
      priority: 'balanced',
      spiritFamily: 'bourbon',
      recommendedModes: ['neat', 'large-rock', 'cocktail'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: false,
      why: 'Exceptional value neat. Works beautifully in classic cocktails.',
      cocktailUse: 'good-spirit-forward',
    },
  },
  {
    id: 'jim-beam',
    name: 'Jim Beam White Label Bourbon',
    brand: 'Jim Beam',
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 22, max: 28 },
      GBP: { min: 12, max: 18 },
    },
    flavorProfile: ['Corn', 'Oak', 'Vanilla'],
    tastingNotes:
      "Jim Beam is a straightforward, corn-forward bourbon distilled on a column still and aged a minimum of four years — nothing flashy, just the high-volume backbone of the Beam family's Kentucky operation, whose roots trace back to Jacob Beam in the 1790s. Light corn sweetness, a little vanilla, and oak tannin make up most of the profile, with a clean, moderate finish. It doesn't have much complexity to unpack, but that's by design — it's built to disappear into a mixer or a highball rather than demand attention on its own. As the world's bestselling bourbon, it's also the reference point most other budget bourbons get measured against.",
    origin: 'United States',
    searchTerms: ['jim beam', 'jim beam white', 'beam bourbon'],
  },
  {
    id: 'wild-turkey-101',
    name: 'Wild Turkey 101 Bourbon',
    brand: 'Wild Turkey',
    type: 'whiskey',
    abv: 50.5,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Bold Spice', 'Caramel', 'Oak'],
    tastingNotes:
      "Bottled at a robust 101 proof rather than the industry-standard 80, Wild Turkey leans into a higher-rye mash bill that gives it real backbone. The Lawrenceburg, Kentucky distillery has been shaped for decades by Jimmy Russell, one of the longest-serving master distillers in the industry, whose barrel selection favors bold, full-flavored whiskey over polish. Rich caramel and vanilla meet peppery rye spice and toasted oak, with the higher proof carrying the flavors through a long, warming finish. It's an assertive, no-apologies bourbon that holds up well both neat and in stirred cocktails.",
    origin: 'United States',
    searchTerms: ['wild turkey', 'wild turkey 101', 'wt101'],
  },
  {
    id: 'four-roses',
    name: 'Four Roses Bourbon',
    brand: 'Four Roses',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Floral', 'Fruit', 'Spice'],
    tastingNotes:
      "Four Roses is unique among bourbons in that it blends up to ten distinct recipes — five mash bills crossed with two proprietary yeast strains each — giving its distillers unusual flexibility to shape the final blend's character. That yeast-driven approach is largely responsible for the floral quality that sets it apart from denser, oak-forward bourbons, along with the distillery's use of single-story rickhouses in Lawrenceburg, Kentucky, which age whiskey more evenly than tall multi-story warehouses. Red berry and light floral notes lead, backed by gentle spice and soft oak, finishing delicate rather than heavy. It's a bourbon built for nuance more than power.",
    origin: 'United States',
    searchTerms: ['four roses', 'four roses bourbon'],
  },

  // ===== WHISKEY — SCOTCH =====
  {
    id: 'glenfiddich-12',
    name: 'Glenfiddich 12 Year Old',
    brand: 'Glenfiddich',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 35, max: 45 },
      CAD: { min: 48, max: 58 },
      GBP: { min: 28, max: 36 },
    },
    flavorProfile: ['Pear', 'Oak', 'Malt'],
    tastingNotes:
      "Glenfiddich has been distilled at the family-owned William Grant & Sons distillery in Dufftown, Speyside since 1887, and it remains one of the few Scotch distilleries still run by descendants of its founder. The 12 Year Old is matured in a combination of American bourbon barrels and European oak sherry casks, giving it a lighter, fruitier profile than sherry-dominant Speysiders. Fresh pear and apple lead, with sweet oak and a soft hint of malt underneath, finishing smooth and easy. Its ubiquity sometimes gets held against it, but it's genuinely one of the most approachable, well-made entry points into single malt Scotch.",
    origin: 'Scotland',
    searchTerms: ['glenfiddich 12', 'glenfiddich twelve', 'glen fiddich 12'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'A 12-year single malt deserves to be sipped neat first. A few drops of water open the floral notes.',
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'glenlivet-12',
    name: 'The Glenlivet 12 Year Old',
    brand: 'The Glenlivet',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 35, max: 44 },
      CAD: { min: 46, max: 56 },
      GBP: { min: 28, max: 36 },
    },
    flavorProfile: ['Vanilla', 'Fruit', 'Floral', 'Pineapple'],
    tastingNotes:
      'The Glenlivet holds the distinction of being the first legally licensed distillery in Speyside, registered in 1824 after decades of illicit production in the glen, and its name became so synonymous with quality whisky that other producers tacked "Glenlivet" onto their own labels until the law stepped in. The 12 Year Old is matured mainly in American oak, producing a lighter, fruitier style than its sherry-heavy neighbors. Soft vanilla, orchard and tropical fruit — a signature note of pineapple — and light florals define the palate, finishing clean and gently sweet. It\'s the archetype of the elegant, easy-drinking Speyside style.',
    origin: 'Scotland',
    searchTerms: ['glenlivet', 'the glenlivet', 'glenlivet 12'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Classic Speyside — light enough to enjoy neat straight away.',
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'laphroaig-10',
    name: 'Laphroaig 10 Year Old',
    brand: 'Laphroaig',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 42, max: 52 },
      CAD: { min: 56, max: 68 },
      GBP: { min: 36, max: 46 },
    },
    flavorProfile: ['Peat', 'Smoke', 'Medicinal', 'Iodine'],
    tastingNotes:
      "Laphroaig malts a portion of its own barley on traditional floor maltings and dries it over intensely peated fires, then matures it largely in ex-bourbon casks — a combination that produces one of the most aggressively phenolic whiskies in Scotland. It holds a Royal Warrant, a genuinely unusual distinction for a whisky this uncompromising, and its Islay coastal location adds a briny, maritime edge to the smoke. Bonfire smoke and medicinal iodine dominate the nose and palate, with seaweed and a surprising undercurrent of sweet vanilla holding it together. It's polarizing by design, but for peat lovers it's close to the platonic ideal of the style.",
    origin: 'Scotland',
    searchTerms: ['laphroaig', 'laphroaig 10', 'islay whisky', 'peated whisky'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      premiumScore: 82,
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: "Peat this intense is a full sensory experience. Neat first — water softens the smoke if it's too fierce.",
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'macallan-12',
    name: 'The Macallan 12 Year Old',
    brand: 'The Macallan',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 70 },
      CAD: { min: 72, max: 88 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Sherry', 'Dried Fruit', 'Spice', 'Ginger'],
    tastingNotes:
      "The Macallan ages its spirit almost entirely in sherry-seasoned oak casks — a costlier, slower process than the ex-bourbon route most distilleries take — sourced from Spain and filled at the distillery's historic Easter Elchies estate in Speyside. Its unusually small stills, among the smallest in the region, concentrate copper contact and contribute to the make's rich, oily character before the sherry wood does its work. Rich dried fruit, Christmas spice, and ginger build over a base of warming oak, with real depth for a 12-year expression. It's one of the most recognized names in Scotch, and the sherry-cask style largely defined what \"premium Speyside\" means to a lot of drinkers.",
    origin: 'Scotland',
    searchTerms: ['macallan 12', 'the macallan 12', 'macallan twelve'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      premiumScore: 88,
      recommendedModes: ['neat', 'water-drops', 'large-rock'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Sherry-cask complexity this good should be experienced neat. A large rock is acceptable; cocktails are not.',
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'monkey-shoulder',
    name: 'Monkey Shoulder Blended Malt',
    brand: 'Monkey Shoulder',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Vanilla', 'Spice', 'Malt', 'Honey'],
    tastingNotes:
      "Monkey Shoulder is a blended malt — three Speyside single malts vatted together with no grain whisky in the mix, which sets it apart from most blends on the shelf. The name references a repetitive-strain injury once common among distillery workers who turned malting barley by hand, a nod to the old-school production it was built to modernize. It's soft and approachable by design, with vanilla, honey, and gentle malt sweetness carrying a light spice kick, and it holds up unusually well when mixed rather than getting lost. It's become the go-to blended malt behind a lot of cocktail bars for exactly that reason.",
    origin: 'Scotland',
    searchTerms: ['monkey shoulder', 'monkey shoulder whisky', 'blended malt'],
  },
  {
    id: 'jack-daniels',
    name: "Jack Daniel's Old No. 7",
    brand: "Jack Daniel's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Charcoal', 'Caramel', 'Vanilla', 'Banana'],
    tastingNotes:
      "Jack Daniel's is filtered through ten feet of sugar-maple charcoal before it ever touches a barrel — the Lincoln County Process that legally distinguishes Tennessee whiskey from bourbon, even though the mash bill and aging are otherwise bourbon-style. Distilled in Lynchburg, Tennessee since Jasper Newton \"Jack\" Daniel registered the distillery in 1866, it's often cited as the oldest registered distillery in the US. The charcoal mellowing softens the spirit and adds a distinct smoky-sweet character on top of caramel, vanilla, and a note of ripe banana. It finishes smooth with minimal heat, a big part of why it's one of the most recognized whiskey brands on earth.",
    origin: 'United States',
    searchTerms: ['jack daniels', "jack daniel's", 'jack', 'jd', 'tennessee whiskey', 'old no 7'],
  },
  {
    id: 'tullamore-dew',
    name: 'Tullamore D.E.W. Irish Whiskey',
    brand: 'Tullamore D.E.W.',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 26 },
    },
    flavorProfile: ['Honey', 'Malt', 'Vanilla'],
    tastingNotes:
      "Tullamore D.E.W. is a blend of pot still, malt, and grain whiskeys, all triple distilled in the Irish style, produced in County Offaly at a distillery founded in 1829. The \"D.E.W.\" initials belong to Daniel E. Williams, a former distillery owner credited with much of its early growth and the source of the brand's tagline. It's a light, easy-drinking style — gentle honey and soft malt sweetness with a touch of vanilla, closing on a mild floral finish. Built for mixability more than contemplation, it's a reliable base for an Irish whiskey highball or a simple whiskey soda.",
    origin: 'Ireland',
    searchTerms: ['tullamore', 'tullamore dew', 'tullamore d.e.w.', 'irish whiskey'],
  },
  {
    id: 'redbreast-12',
    name: 'Redbreast 12 Year Old',
    brand: 'Redbreast',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 68 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Sherry', 'Dried Fruit', 'Toasted Wood'],
    tastingNotes:
      "Redbreast is a single pot still whiskey, distilled from a mix of malted and unmalted barley at Midleton in County Cork — a style unique to Ireland that predates the column-still grain whiskey used in most blends. The name dates to 1912, when the wine and spirits merchant W&A Gilbey renamed its Midleton-sourced whiskey after the robin redbreast, continuing a house tradition of naming their bonded stock after birds. Matured in a combination of ex-bourbon and oloroso sherry casks, it draws real depth from the sherry wood without losing the pot still's signature spicy, oily texture. Rich dried fruit and sherry sweetness meet toasted wood and a hint of baking spice, finishing long and warming. It's widely considered Ireland's benchmark sipping whiskey, the bottle most often used to argue Irish whiskey belongs in the same conversation as top-tier Scotch.",
    origin: 'Ireland',
    searchTerms: ['redbreast', 'redbreast 12', 'pot still whiskey'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'irish-whiskey',
      premiumScore: 85,
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: "Ireland's benchmark sipping whiskey. Treat it like a premium Scotch — neat, maybe a drop of water.",
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'suntory-toki',
    name: 'Suntory Toki Japanese Whisky',
    brand: 'Suntory',
    type: 'whiskey',
    abv: 43,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 35, max: 44 },
      CAD: { min: 46, max: 56 },
      GBP: { min: 30, max: 38 },
    },
    flavorProfile: ['Honey', 'Citrus', 'Subtle Smoke', 'Green Apple'],
    tastingNotes:
      "Toki blends whisky from all three of Suntory's distilleries — Yamazaki malt, Hakushu malt, and Chita grain whisky — a combination unique to this bottling and designed specifically for the Japanese highball culture it was built to serve. Suntory was Japan's first whisky producer, founded in the 1920s by Shinjiro Torii, and Toki represents the brand's modern, lighter house style. Honey and citrus zest lead, with a whisper of smoke from the Hakushu component and a crisp green apple note, all wrapped in a clean, light body. It genuinely comes alive over ice and soda — this is a whisky built for the glass it was designed for, not the neat pour.",
    origin: 'Japan',
    searchTerms: ['toki', 'suntory toki', 'japanese whisky', 'suntory whisky'],
    serveGuidance: {
      priority: 'balanced',
      spiritFamily: 'japanese-whisky',
      recommendedModes: ['cocktail', 'large-rock'],
      firstPour: 'cocktail',
      shouldDeprioritizeCocktails: false,
      why: 'Toki was designed for the highball. Ice cold soda, tall glass, lemon twist.',
      cocktailUse: 'great-for-cocktails',
    },
  },
  {
    id: 'hibiki-harmony',
    name: 'Hibiki Japanese Harmony',
    brand: 'Hibiki',
    type: 'whiskey',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 65, max: 80 },
      CAD: { min: 82, max: 100 },
      GBP: { min: 56, max: 70 },
    },
    flavorProfile: ['Rose', 'Honey', 'White Oak', 'Orange Peel'],
    tastingNotes:
      "Hibiki Harmony blends malt and grain whiskies from Suntory's Yamazaki, Hakushu, and Chita distilleries, including a portion aged in Japanese mizunara oak, a wood so porous and prone to leaking it's notoriously difficult to work with but prized for the incense-like sandalwood notes it imparts. The 24-faceted bottle is meant to echo Japan's 24 traditional seasons, reflecting the harmony-with-nature philosophy behind the blend. Rose and honey lead the nose, with white chocolate, orange peel, and a whisper of oak underneath, all remarkably seamless for a whisky built from three very different distillery characters. It's less about any single bold note and more about how effortlessly the components lock together.",
    origin: 'Japan',
    searchTerms: ['hibiki', 'hibiki harmony', 'japanese harmony'],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'japanese-whisky',
      premiumScore: 90,
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Hibiki Harmony is too nuanced to mask in a cocktail. Enjoy it quietly, neat.',
      cocktailUse: 'best-neat',
    },
  },

  // ===== TEQUILA (expanded) =====
  {
    id: 'jose-cuervo-silver',
    name: 'Jose Cuervo Especial Silver',
    brand: 'Jose Cuervo',
    type: 'tequila',
    abv: 38,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 26, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Mild'],
    tastingNotes:
      "Jose Cuervo Especial Silver is a mixto tequila — blended from a minimum of 51% blue agave spirit with other sugars rather than the 100% agave used in premium bottlings — which is what keeps the flavor light and the price low. Cuervo has been distilling in Jalisco since the 1790s, making it one of the oldest tequila houses still operating, though this expression trades on volume and consistency rather than complexity. Mild agave and citrus lead a short, easy palate with barely any pepper bite, and the finish is clean and fast. It's built for shots and mixed drinks rather than sipping, and its ubiquity is exactly the point.",
    origin: 'Mexico',
    searchTerms: ['jose cuervo', 'cuervo', 'cuervo silver', 'cuervo especial'],
  },
  {
    id: 'olmeca-altos',
    name: 'Olmeca Altos Plata Tequila',
    brand: 'Olmeca Altos',
    type: 'tequila',
    abv: 38,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Pepper'],
    tastingNotes:
      "Olmeca Altos Plata is 100% blue agave grown in the highlands of Jalisco around Arandas, crafted with input from acclaimed bartender Henry Besant, which is part of why it built a reputation among cocktail professionals despite its modest price. Highland agave tends to run sweeter and more citrus-forward than lowland fruit, and that shows here: bright lime and orange peel over fresh-cut agave, with a white pepper kick keeping it lively, and a clean, fairly short finish. It's an unusually well-made blanco for the price point, built to hold its own in a margarita rather than just filling one out.",
    origin: 'Mexico',
    searchTerms: ['olmeca', 'altos', 'olmeca altos', 'altos plata'],
  },
  // ===== COGNAC/BRANDY (expanded) =====
  {
    id: 'courvoisier-vs',
    name: 'Courvoisier VS Cognac',
    brand: 'Courvoisier',
    type: 'brandy',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Oak', 'Dried Fruit', 'Spice', 'Apple'],
    tastingNotes:
      "Double-distilled in Charentais pot stills and aged the VS minimum of two years, drawing on eaux-de-vie from across the Charente region rather than just the top two crus. Courvoisier built its reputation on a claimed connection to Napoleon Bonaparte, who is said to have brought casks aboard his ship into exile — the brand still trades on the 'Cognac of Napoleon' identity today. Expect a light, fruity profile with apple and dried fruit up front, gentle oak and baking spice underneath, and a short, clean finish that mixes easily in cognac-based cocktails like the Sidecar.",
    origin: 'France',
    searchTerms: ['courvoisier', 'courvoisier vs', 'napoleon cognac'],
  },
  {
    id: 'martell-vs',
    name: 'Martell VS Single Distillery',
    brand: 'Martell',
    type: 'brandy',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 26, max: 34 },
      CAD: { min: 36, max: 46 },
      GBP: { min: 22, max: 30 },
    },
    flavorProfile: ['Plum', 'Pear', 'Oak'],
    tastingNotes:
      "Founded in 1715, Martell is the oldest of the major cognac houses, and this VS is distilled entirely from its own eaux-de-vie rather than blended-in outside stock, which the 'Single Distillery' name refers to. Martell favors denser Tronçais oak over the more common Limousin, which tends to produce a lighter, more floral style than its rivals even at the VS level. Expect light plum and pear on the nose, gentle floral notes underneath, and warm, moderate oak on the palate with a clean, unhurried finish.",
    origin: 'France',
    searchTerms: ['martell vs', 'martell very special', 'martell cognac vs'],
  },

  // ===== LIQUEUR (expanded) =====
  {
    id: 'amaretto-disaronno',
    name: 'Disaronno Originale Amaretto',
    brand: 'Disaronno',
    type: 'liqueur',
    abv: 28,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 26 },
    },
    flavorProfile: ['Almond', 'Cherry', 'Marzipan', 'Apricot'],
    tastingNotes:
      "Despite the almond-forward flavor, Disaronno's base is a neutral spirit steeped with apricot kernel oil rather than actual almonds — the marzipan-like character comes from that kernel oil, a quirk of the recipe that traces back to Saronno, Lombardy, in the 16th century. It is bottled at a relatively high 28% ABV for a liqueur, giving it more backbone than most fruit or nut liqueurs. The nose is heavy with sweet almond and marzipan, the palate brings cherry and apricot pit sweetness with a faint bitter edge, and the finish is warm and lingering. It works equally well on ice, in an amaretto sour, or splashed into coffee.",
    origin: 'Italy',
    searchTerms: ['disaronno', 'amaretto', 'amaretto disaronno', 'almond liqueur'],
  },
  {
    id: 'frangelico',
    name: 'Frangelico Hazelnut Liqueur',
    brand: 'Frangelico',
    type: 'liqueur',
    abv: 20,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 28, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Hazelnut', 'Cocoa', 'Vanilla'],
    tastingNotes:
      "A neutral spirit infused with toasted hazelnuts native to Italy's Piedmont region, rounded out with cocoa, vanilla, and a light herbal base, then bottled in the distinctive friar-shaped bottle tied to a bell rope — packaging meant to evoke the monks once credited with the original recipe. Piedmont hazelnuts (the same variety behind Nutella and gianduja chocolate) give it a rounder, less bitter nuttiness than amaretto's almond profile. The nose is warm toasted hazelnut and cocoa, the palate is rich and sweet with vanilla and a faint coffee note, and the finish is smooth and lingering. It works well on ice, in coffee, or in dessert cocktails.",
    origin: 'Italy',
    searchTerms: ['frangelico', 'hazelnut liqueur', 'frangelico hazelnut'],
  },
  {
    id: 'grand-marnier',
    name: 'Grand Marnier Cordon Rouge',
    brand: 'Grand Marnier',
    type: 'liqueur',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 32, max: 42 },
      CAD: { min: 44, max: 54 },
      GBP: { min: 28, max: 38 },
    },
    flavorProfile: ['Orange', 'Cognac', 'Vanilla'],
    tastingNotes:
      'A blend of cognac and distilled bitter-orange essence, aged in oak before bottling — the cognac base is what separates it from neutral-spirit triple secs like Cointreau and gives it a warmer, more spirit-forward character. Created in 1880 by Louis-Alexandre Marnier Lapostolle, it was reportedly among the first liqueurs the Ritz Paris served, and the brand still ages its cognac component itself rather than sourcing a finished spirit. The nose carries bitter orange peel and cognac warmth, the palate layers vanilla and oak against the citrus, and the finish is dry and long compared to sweeter orange liqueurs. It shines in a margarita, a sidecar, or poured over ice.',
    origin: 'France',
    searchTerms: ['grand marnier', 'grand marnier cordon rouge', 'gm'],
  },
  {
    id: 'triple-sec',
    name: 'Triple Sec Orange Liqueur',
    brand: 'Generic',
    type: 'liqueur',
    abv: 30,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 8, max: 16 },
      CAD: { min: 12, max: 22 },
      GBP: { min: 8, max: 14 },
    },
    flavorProfile: ['Orange', 'Sweet', 'Citrus'],
    tastingNotes:
      'Generic-label triple sec, a category name for orange-flavored liqueurs originating in 19th-century France, made by macerating or infusing dried orange peel into a neutral spirit base and sweetening it — a cheaper, lower-proof shortcut compared to the actual redistillation Cointreau uses. Quality and orange character vary widely between producers at this budget tier, and the sweetness tends to run higher to compensate for thinner citrus oil extraction. Expect a straightforward nose of candied orange, a syrupy-sweet palate, and a short, simple finish. It gets the job done as a mixer in a margarita or cosmopolitan but lacks the depth of a premium orange liqueur.',
    origin: 'France',
    searchTerms: ['triple sec', 'orange liqueur', 'orange curacao'],
  },
  {
    id: 'chambord',
    name: 'Chambord Black Raspberry Liqueur',
    brand: 'Chambord',
    type: 'liqueur',
    abv: 16.5,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 26 },
    },
    flavorProfile: ['Black Raspberry', 'Vanilla', 'Honey'],
    tastingNotes:
      "Black raspberries and Madagascar vanilla macerated into a neutral spirit base, sweetened with honey and finished with a touch of citrus and herbs — the roughly spherical, crown-topped bottle is meant to evoke a 17th-century French chateau flask. It takes its name from the Château de Chambord in the Loire Valley, where the historical recipe it's based on is said to have originated. The nose is deeply fruity with black raspberry and honeyed vanilla, the palate is rich and jammy with a light herbal edge underneath, and the finish is sweet and lingering. It's what gives the French Martini its signature raspberry punch.",
    origin: 'France',
    searchTerms: ['chambord', 'black raspberry liqueur', 'chambord liqueur'],
  },
  {
    id: 'chartreuse-green',
    name: 'Green Chartreuse',
    brand: 'Chartreuse',
    type: 'liqueur',
    abv: 55,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 68 },
      CAD: { min: 70, max: 85 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Herbal', 'Mint', 'Spice', 'Pine'],
    tastingNotes:
      'A maceration and distillation of 130 herbs, plants, and flowers in a wine-alcohol base, made by Carthusian monks near the Chartreuse mountain range outside Grenoble according to a manuscript recipe dating to 1737. The exact formula is known at any time to only two monks, making it one of the few historic liqueurs whose production has never been reverse-engineered by competitors. The nose is intensely herbal and green, the palate brings mint, pine, and warming baking spice layered over an almost saline herbal bitterness, and the finish is long, complex, and unlike anything else in the liqueur category. It rewards sipping slowly, neat or over ice.',
    origin: 'France',
    searchTerms: [
      'green chartreuse',
      'chartreuse verte',
      'verte',
      'chartreuse green',
      'vep chartreuse',
    ],
  },
  {
    id: 'jagermeister',
    name: 'Jägermeister',
    brand: 'Jägermeister',
    type: 'liqueur',
    abv: 35,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 26 },
      CAD: { min: 26, max: 34 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Herbal', 'Anise', 'Bitter', 'Citrus Peel'],
    tastingNotes:
      "A neutral spirit infused with 56 herbs, roots, fruits, and spices — including licorice, anise, saffron, and ginger — then rested in oak vats for roughly a year before bottling, a maturation step that softens the herbal blend into a rounder liqueur. Created in Germany in 1934, its stag's-head logo references a hunting legend about Saint Hubertus, and the brand's marketing has long leaned into that hunting heritage even as its main audience today is nightlife rather than the forest. The nose is heavy with anise and citrus peel, the palate is bittersweet with licorice and warming spice, and the finish is syrupy and lingering. It is built to be served ice-cold as a shot, which mutes the sweetness and sharpens the herbal bitterness.",
    origin: 'Germany',
    searchTerms: ['jagermeister', 'jägermeister', 'jager', 'jäger'],
  },
  {
    id: 'fernet-branca',
    name: 'Fernet-Branca',
    brand: 'Fernet-Branca',
    type: 'liqueur',
    abv: 39,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 32 },
      CAD: { min: 32, max: 42 },
      GBP: { min: 22, max: 30 },
    },
    flavorProfile: ['Bitter', 'Menthol', 'Herbal'],
    tastingNotes:
      'A closely guarded infusion of roughly 27 herbs, roots, and spices — myrrh, saffron, chamomile, and gentian among them — macerated and then aged in oak casks for at least a year, a step that mellows the intensity slightly before bottling. The Branca family has produced it in Milan since 1845, originally marketed as a digestive tonic, and it has since become such a fixture behind the bar that a round of Fernet shots is known industry-wide as "the bartender\'s handshake." The nose is medicinal and herbal, the palate is intensely bitter with cooling menthol and dark root notes, and the finish is long, bracing, and an acquired taste by design. It is traditionally taken as a digestif, neat or with a splash of cola in Argentina\'s fernet-and-cola tradition.',
    origin: 'Italy',
    searchTerms: ['fernet', 'fernet branca', 'fernet-branca'],
  },
  {
    id: 'midori',
    name: 'Midori Melon Liqueur',
    brand: 'Midori',
    type: 'liqueur',
    abv: 20,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 22, max: 30 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Melon', 'Sweet', 'Tropical'],
    tastingNotes:
      'A neutral spirit base flavored with muskmelon extract and given its trademark vivid green color, produced by Suntory since 1978. It was launched in the U.S. with a splashy party at Studio 54 in New York, which cemented its association with over-the-top 1980s cocktail culture. The nose is bright with honeydew and cantaloupe, the palate is sweet and juicy with tropical melon flavor and little bitterness, and the finish is short and candy-like. It leans hard into novelty and color more than complexity, which is exactly its appeal in drinks like the Midori Sour.',
    origin: 'Japan',
    searchTerms: [
      'midori',
      'melon liqueur',
      'midori melon',
      'midori liqueur',
      'green melon liqueur',
    ],
  },
  {
    id: 'baileys-almande',
    name: 'Baileys Almande',
    brand: 'Baileys',
    type: 'liqueur',
    abv: 13,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 28, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Almond', 'Vanilla', 'Light'],
    tastingNotes:
      "Baileys' dairy-free line, built on almond milk rather than the fresh cream and Irish whiskey base of the Original, which drops the ABV noticeably lower and shifts the flavor away from whiskey and cocoa toward nuttier, lighter sweetness. Launched in 2016, it was the first plant-based variant the brand had released since inventing the cream liqueur category back in 1974, developed to reach vegan and lactose-intolerant drinkers without stepping away from that cream-liqueur styling, and uses a blend of almond, oat, and hazelnut. The nose is light almond and vanilla, the palate is smooth and less rich than the original with a delicate nutty sweetness, and the finish is clean and silky rather than heavy. It works the same ways as classic Baileys — over ice, in coffee, or in dessert cocktails — just lighter across the board.",
    origin: 'Ireland',
    searchTerms: ['baileys almande', 'almond baileys', 'dairy free baileys'],
  },

  // ── Iconic & Decorative Bottles ───────────────────────────────────────────
  // Bottles with no flat label or highly ornate packaging. searchTerms include
  // visual descriptors that Google Vision LABEL_DETECTION may return (skull,
  // ceramic, etc.) so matchBottle() can fire on labels alone without OCR text.

  // -- Crystal Head Vodka series (skull-shaped glass bottle, no flat label) --
  {
    id: 'crystal-head-vodka',
    name: 'Crystal Head Vodka',
    brand: 'Crystal Head',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 45, max: 60 },
      CAD: { min: 55, max: 75 },
      GBP: { min: 38, max: 52 },
    },
    flavorProfile: ['Clean', 'Smooth', 'Neutral', 'Subtle Vanilla'],
    tastingNotes:
      "Distilled from Canadian corn and quadruple-filtered, with the final passes run through crushed Herkimer diamond crystals — a filtration gimmick, but a real one, that the brand ties to the skull's namesake legend of the mythical 13 crystal skulls. Co-founded by Dan Aykroyd, the skull-shaped glass bottle (with no printed label at all) is as much the point as what's inside. The liquid itself is deliberately unshowy: ultra-clean and neutral with a soft, faintly sweet vanilla note and a smooth, low-burn finish built for sipping straight from the freezer.",
    origin: 'Canada',
    searchTerms: [
      'crystal head original',
      'skull vodka',
      'dan aykroyd vodka',
      'skull bottle vodka',
      'crystal skull vodka',
      'herkimer diamond vodka',
    ],
  },
  {
    id: 'crystal-head-aurora',
    name: 'Crystal Head Aurora Vodka',
    brand: 'Crystal Head',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 70 },
      CAD: { min: 65, max: 85 },
      GBP: { min: 45, max: 60 },
    },
    flavorProfile: ['Clean', 'Smooth', 'Grain', 'Subtle Sweetness'],
    tastingNotes:
      "A variant on the original Crystal Head recipe co-founded by actor and comedian Dan Aykroyd, swapping the corn base for English wheat, which softens the grain character and gives Aurora a rounder, gentler palate than its sibling. It's filtered the same way as the flagship, through crushed Herkimer diamonds, so the emphasis stays on purity over complexity — clean grain sweetness, a smooth, slightly creamy texture, and a mellow, low-heat finish. The frosted, colour-shifting skull bottle is the more collectible half of the appeal here.",
    origin: 'Canada',
    searchTerms: [
      'crystal head aurora',
      'aurora vodka',
      'iridescent skull',
      'rainbow skull vodka',
      'purple skull vodka',
      'blue skull bottle',
      'crystal head wheat',
    ],
  },
  {
    id: 'crystal-head-onyx',
    name: 'Crystal Head Onyx Vodka',
    brand: 'Crystal Head',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 70 },
      CAD: { min: 65, max: 85 },
      GBP: { min: 45, max: 60 },
    },
    flavorProfile: ['Agave', 'Earthy', 'Smoke', 'Pepper'],
    tastingNotes:
      "The outlier of the Crystal Head range co-founded by actor Dan Aykroyd, distilled from a spirit-of-agave base rather than grain, which pushes it closer to an unaged agave spirit than a classic vodka. That base carries through clearly: earthy, vegetal agave character with light smoke and a real peppery bite on the finish, in place of the neutral profile the other Crystal Heads chase. Housed in a matte-black version of the brand's signature skull bottle, it's built for drinkers who want vodka-strength proof with agave-driven personality rather than a blank canvas.",
    origin: 'Canada',
    searchTerms: [
      'crystal head onyx',
      'black skull vodka',
      'black crystal head',
      'onyx vodka',
      'agave vodka skull',
      'dark skull bottle',
    ],
  },
  {
    id: 'crystal-head-bone',
    name: 'Crystal Head Bone Vodka',
    brand: 'Crystal Head',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 70 },
      CAD: { min: 65, max: 85 },
      GBP: { min: 45, max: 60 },
    },
    flavorProfile: ['Clean', 'Soft', 'Mineral', 'Neutral'],
    tastingNotes:
      'Distilled from a single grain and filtered through the same crushed Herkimer diamonds as the rest of the Crystal Head lineup co-founded by actor Dan Aykroyd, Bone leans into a drier, more mineral-driven profile than its siblings — closer to the flinty character some single-grain vodkas take on when the wheat or corn sweetness is stripped back hard. Clean and neutral on the nose, with a soft, bone-dry palate and a subtle mineral edge through the finish. The pale, cream-coloured skull bottle rounds out the collectible set alongside the clear, aurora, and onyx editions.',
    origin: 'Canada',
    searchTerms: [
      'crystal head bone',
      'bone vodka',
      'cream skull vodka',
      'white skull bottle',
      'crystal head pale',
    ],
  },

  // -- Clase Azul series (hand-painted ceramic decanter, no flat label) --
  {
    id: 'clase-azul-plata',
    name: 'Clase Azul Plata Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 95, max: 115 },
      CAD: { min: 120, max: 145 },
      GBP: { min: 85, max: 105 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Tropical Fruit', 'Citrus'],
    tastingNotes:
      "Clase Azul Plata is 100% blue agave, slow-cooked and rested only briefly before bottling, so the emphasis stays on pure, unaged agave character rather than wood. What sets the brand apart is presentation as much as liquid — each bottle is a hand-painted ceramic decanter made by artisans in Guanajuato, no two exactly alike, which is why Clase Azul built such a strong following among collectors as much as drinkers. On the palate expect sweet cooked agave, ripe tropical fruit, and a touch of vanilla, with a silky, almost creamy texture and a smooth, lingering finish that shows very little of the peppery heat found in cheaper blancos. It's built to be sipped slowly and appreciated, not shot.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul plata',
      'clase azul silver',
      'clase azul blanco',
      'clase azul tequila',
      'ceramic tequila',
      'hand painted decanter',
      'talavera tequila',
    ],
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'tequila',
      premiumScore: 88,
      recommendedModes: ['neat', 'large-rock'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'At this price point, sip it neat to appreciate the silky texture and pure agave character.',
      cocktailUse: 'best-neat',
    },
  },
  {
    id: 'clase-azul-reposado',
    name: 'Clase Azul Reposado Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 160, max: 180 },
      CAD: { min: 200, max: 240 },
      GBP: { min: 140, max: 165 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Oak', 'Spice'],
    tastingNotes:
      "Clase Azul Reposado rests eight months in American oak barrels, long enough to pick up real vanilla and caramel color without losing the agave underneath, and like every Clase Azul release it comes in a hand-painted ceramic decanter crafted by artisans in Guanajuato. The nose carries cooked agave and vanilla, the palate layers in caramel and warm baking spice over a smooth, rounded body, and the finish lingers with a gentle oak sweetness rather than sharp tannin. It's built as a sipping tequila first, with the eight-month rest giving it noticeably more depth than the two-month legal minimum for the category.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul reposado',
      'clase azul rested',
      'hand painted tequila',
      'blue white ceramic bottle',
    ],
  },
  {
    id: 'clase-azul-anejo',
    name: 'Clase Azul Añejo Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 290, max: 320 },
      CAD: { min: 350, max: 400 },
      GBP: { min: 255, max: 285 },
    },
    flavorProfile: ['Agave', 'Dark Chocolate', 'Dried Fruit', 'Oak', 'Spice'],
    tastingNotes:
      'Clase Azul Añejo spends 25 months in American whiskey barrels — well beyond the one-year minimum for the añejo category — which pulls it much closer to whiskey-adjacent depth than any blanco or reposado in the range. Dark chocolate and dried fruit dominate the nose, the palate carries that richness through with warm baking spice and a substantial oak backbone, and the finish is long and warming. The gold-trimmed ceramic decanter, hand-painted by artisans in Guanajuato, is part of the appeal, but the liquid itself is genuinely one of the more complex añejos on the market.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul anejo',
      'clase azul añejo',
      'clase azul gold ceramic',
      'clase azul aged',
      'clase azul 25 months',
    ],
  },
  {
    id: 'clase-azul-ultra',
    name: 'Clase Azul Ultra Añejo Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 1600, max: 1800 },
      CAD: { min: 2000, max: 2200 },
      GBP: { min: 1400, max: 1600 },
    },
    flavorProfile: ['Agave', 'Cognac', 'Sherry', 'Vanilla', 'Dried Fruit'],
    tastingNotes:
      "Clase Azul Ultra Añejo is a blend of some of the brand's oldest añejo tequilas, finished across sherry, cognac, and whiskey casks — an unusually elaborate cask program for a category that's typically kept simpler. That multi-cask finishing shows in the glass: dried fruit and vanilla sit alongside genuine sherry-like richness and a cognac-adjacent depth, layered over the deep agave and oak base you'd expect from extended aging. The finish is long, warm, and complex, closer in character to a fine aged spirit than to a typical tequila. The black-and-gold, platinum-adorned ceramic decanter is a showpiece in its own right, reflecting the price and rarity of what's inside.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul ultra',
      'clase azul ultra anejo',
      'black gold ceramic tequila',
      'clase azul platinum',
      'ultra anejo tequila',
    ],
  },
  {
    id: 'clase-azul-gold',
    name: 'Clase Azul Gold Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 400, max: 450 },
      CAD: { min: 500, max: 560 },
      GBP: { min: 360, max: 400 },
    },
    flavorProfile: ['Agave', 'Honey', 'Toffee', 'Oak', 'Citrus'],
    tastingNotes:
      'Clase Azul Gold blends extra añejo, añejo, and reposado tequilas, so it carries more structural complexity than a single-aging-tier bottling — the extra añejo component alone requires a minimum of three years in oak. Honey and toffee lead the nose, with citrus blossom brightening what could otherwise be a heavy, oak-driven profile, and the palate is rich and warm with a long finish that balances sweetness against genuine barrel depth. The all-gold ceramic decanter, hand-painted by Guanajuato artisans, is among the most recognizable bottles in the ultra-premium tequila world.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul gold',
      'gold ceramic tequila',
      'clase azul dorado',
      'clase azul gold edition',
    ],
  },
  {
    id: 'clase-azul-mezcal-guerrero',
    name: 'Clase Azul Mezcal Guerrero',
    brand: 'Clase Azul',
    type: 'mezcal',
    abv: 42,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 290, max: 330 },
      CAD: { min: 360, max: 410 },
      GBP: { min: 255, max: 295 },
    },
    flavorProfile: ['Grapefruit', 'Rosemary', 'Sea Salt', 'Smokey'],
    tastingNotes:
      'Made from wild Papalote agave from the mountain range of Guerrero. Grapefruit skin, fresh rosemary, and sea salt lead to a lightly smoky, herbal finish. The distinctive hand-painted teal ceramic bottle is unlike any other mezcal.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul mezcal guerrero',
      'clase azul guerrero',
      'clase azul mezcal',
      'papalote agave mezcal',
      'black teal ceramic mezcal',
      'guerrero mezcal',
    ],
  },
  {
    id: 'clase-azul-mezcal-durango',
    name: 'Clase Azul Mezcal Durango',
    brand: 'Clase Azul',
    type: 'mezcal',
    abv: 42,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 290, max: 330 },
      CAD: { min: 360, max: 410 },
      GBP: { min: 255, max: 295 },
    },
    flavorProfile: ['Cenizo Agave', 'Mineral', 'Dried Herbs', 'Earthiness', 'Light Smoke'],
    tastingNotes:
      "Clase Azul's mezcal line is built around showcasing regional agave diversity across Mexico, and the Durango expression uses wild Cenizo agave, a variety suited to the state's extreme high-altitude desert climate with big day-to-night temperature swings. That harsh growing environment concentrates the agave's character before it's pit-roasted and distilled using traditional methods. The nose is mineral and dry, with dried herbs and a stony earthiness that reads distinctly different from the fruitier, brighter profile of Oaxacan mezcal, and the palate carries that earthy character through with just a light touch of smoke rather than a heavy char. As with the rest of the line, the hand-painted ceramic decanter is meant to reflect the region's artistic traditions.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul durango',
      'clase azul mezcal durango',
      'cenizo agave mezcal',
      'durango mezcal',
      'clase azul durango mezcal',
    ],
  },
  {
    id: 'clase-azul-mezcal-san-luis-potosi',
    name: 'Clase Azul Mezcal San Luis Potosí',
    brand: 'Clase Azul',
    type: 'mezcal',
    abv: 42,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 290, max: 330 },
      CAD: { min: 360, max: 410 },
      GBP: { min: 255, max: 295 },
    },
    flavorProfile: ['Salmiana Agave', 'Desert Florals', 'Citrus', 'Herbs', 'Mineral'],
    tastingNotes:
      "This expression uses Agave salmiana, grown on the desert slopes of San Luis Potosí in central Mexico, a tougher, slower-maturing agave suited to the region's arid, mineral-rich soil. It follows the same traditional pit-roasting and distillation process as the rest of Clase Azul's mezcal line, letting the specific character of the Salmiana varietal and its high-desert terroir come through rather than masking it. The nose opens with desert florals and citrus, the palate carries herbal notes over a distinctly mineral backbone, and the finish is dry and lingering. The hand-painted ceramic bottle, like the others in the series, celebrates the artistic traditions of the region the agave was grown in.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul san luis potosi',
      'clase azul san luis',
      'salmiana agave mezcal',
      'clase azul mezcal slp',
      'san luis potosi mezcal',
    ],
  },

  // -- Clase Azul Limited Editions --
  {
    id: 'clase-azul-dia-de-muertos-2019',
    name: 'Clase Azul Día de Muertos 2019 Limited Edition',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 1200, max: 1800 },
      CAD: { min: 1500, max: 2200 },
      GBP: { min: 1050, max: 1600 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Light Oak'],
    tastingNotes:
      "The inaugural Día de Muertos release blends Clase Azul's unaged Plata with its Reposado, so it lands as a joven — young in classification but carrying real oak influence from the reposado component's eight months in American barrels. Fresh cooked agave and vanilla lead, with caramel and a light touch of oak rounding out the mid-palate, and the finish stays smooth and relatively short rather than pushing toward añejo-level richness. Limited to 1,800 hand-painted ceramic bottles, it set the template for what became Clase Azul's most closely followed annual collector series.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul dia de muertos',
      'clase azul dia de los muertos',
      'clase azul day of dead',
      'clase azul muertos 2019',
      'clase azul skull design',
      'clase azul collector edition',
    ],
  },
  {
    id: 'clase-azul-dia-de-muertos-2021',
    name: 'Clase Azul Día de Muertos Sabores 2021',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 800, max: 1100 },
      CAD: { min: 1000, max: 1380 },
      GBP: { min: 700, max: 970 },
    },
    flavorProfile: ['Agave', 'Dark Chocolate', 'Dried Fruit', 'Warming Spice', 'Oak'],
    tastingNotes:
      "The first release under the Nuestros Recuerdos banner is a full añejo, meaning it spends at least a year in American oak rather than the brief rest of the joven-blend editions that came before it. Dark chocolate and dried fruit dominate the nose, warming baking spice and deep oak carry through the palate, and the finish is long and rich — closer to a fine aged spirit than to a typical tequila. The ceramic decanter's design draws on the traditional foods and sweets associated with Día de Muertos, tying the packaging directly to the liquid's own darker, more dessert-adjacent character.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul sabores',
      'clase azul dia de muertos 2021',
      'clase azul nuestros recuerdos',
      'clase azul anejo limited',
      'clase azul muertos sabores',
    ],
  },
  {
    id: 'clase-azul-dia-de-muertos-2022',
    name: 'Clase Azul Día de Muertos Colores 2022',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 700, max: 950 },
      CAD: { min: 880, max: 1200 },
      GBP: { min: 615, max: 840 },
    },
    flavorProfile: ['Agave', 'Dark Fruit', 'Vanilla', 'Caramel', 'Oak'],
    tastingNotes:
      "The second Nuestros Recuerdos release continues the series in añejo form, aged at least a year in American oak for real depth beyond the brand's joven and reposado tiers. Dark fruit and vanilla lead the nose, caramel and a solid oak backbone fill out the palate, and the finish is warm and lingering rather than sharp. The multi-coloured ceramic decanter, inspired by the sugar-skull calaveritas of Día de Muertos, is hand-painted by artisans in Guanajuato and has become one of the more collected bottles in the annual series.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul colores',
      'clase azul dia de muertos 2022',
      'clase azul sugar skull bottle',
      'clase azul colourful bottle',
      'clase azul muertos colores',
    ],
  },
  {
    id: 'clase-azul-dia-de-muertos-2023',
    name: 'Clase Azul Día de Muertos Aromas 2023',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 700, max: 950 },
      CAD: { min: 880, max: 1200 },
      GBP: { min: 615, max: 840 },
    },
    flavorProfile: ['Agave', 'Marigold', 'Floral', 'Vanilla', 'Dried Fruit'],
    tastingNotes:
      'The third Nuestros Recuerdos release is again a full añejo, aged a minimum of a year in American oak, and limited to just 2,000 bottles — the smallest run in the series to that point. Floral marigold notes, a nod to the cempasúchil flowers associated with Día de Muertos altars, lift the nose alongside vanilla, with dried fruit and warm oak carrying through a rich, rounded palate and a long finish. The marigold-glazed decanter, finished with a 24-karat gold ornament, is the most elaborate the brand had produced up to that release.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul aromas',
      'clase azul dia de muertos 2023',
      'clase azul marigold bottle',
      'clase azul 24k gold bottle',
      'clase azul gold ornament',
      'clase azul muertos aromas',
    ],
  },
  {
    id: 'clase-azul-dia-de-muertos-2024',
    name: 'Clase Azul Día de Muertos Música 2024',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 600, max: 850 },
      CAD: { min: 750, max: 1060 },
      GBP: { min: 528, max: 750 },
    },
    flavorProfile: ['Agave', 'Plum', 'Vanilla', 'Lilac', 'Oak'],
    tastingNotes:
      "The fourth Nuestros Recuerdos release keeps the series' añejo backbone — a minimum of a year in American oak — while shifting the flavor register slightly toward stone fruit: ripe plum and a faint lilac florality sit over the expected vanilla and oak depth, with a smooth, gently spiced finish. The deep plum ceramic decanter is hand-painted with gold and lilac illustrations of a musical ensemble, tying the packaging to the role music plays in Día de Muertos celebrations. It's a softer, more aromatic take on añejo than some of the darker, chocolate-forward editions earlier in the series.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul musica',
      'clase azul dia de muertos 2024',
      'clase azul plum bottle',
      'clase azul purple bottle',
      'clase azul music edition',
      'clase azul muertos musica',
    ],
  },
  {
    id: 'clase-azul-dia-de-muertos-2025',
    name: 'Clase Azul Día de Muertos Recuerdos 2025',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 600, max: 850 },
      CAD: { min: 750, max: 1060 },
      GBP: { min: 528, max: 750 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Dark Fruit', 'Cinnamon', 'Oak'],
    tastingNotes:
      'The fifth and final release in the Nuestros Recuerdos series is a full añejo, closing out a run that began in 2021 with a minimum year in American oak behind it. Dark fruit and vanilla lead the nose, cinnamon and warm baking spice thread through the palate, and the finish is long and rounded with real oak structure. Limited to 10,000 one-litre hand-painted ceramic decanters, it caps one of the most closely followed annual collector series in modern tequila.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul recuerdos',
      'clase azul dia de muertos 2025',
      'clase azul final edition',
      'clase azul nuestros recuerdos final',
      'clase azul muertos recuerdos',
    ],
  },
  {
    id: 'clase-azul-20th-anniversary',
    name: 'Clase Azul 20th Anniversary Limited Edition Reposado',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 4500, max: 5500 },
      CAD: { min: 5600, max: 6800 },
      GBP: { min: 3950, max: 4850 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Oak', 'Warm Spice'],
    tastingNotes:
      "Released to mark 20 years of Clase Azul, this reposado is 100% Blue Weber agave, slow-cooked and rested eight months in American oak — the same core recipe as the standard Reposado, but bottled as a one-time collector's edition. Vanilla and caramel lead the nose, warm baking spice and a clean oak backbone fill the palate, and the finish is smooth and lingering rather than heavy. What justifies the price beyond the liquid is the decanter itself — among the most elaborate hand-painted ceramic pieces the brand has produced, reportedly requiring extensive artisan hours per bottle.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul 20th anniversary',
      'clase azul 20 aniversario',
      'clase azul veinte',
      'clase azul anniversary reposado',
      'clase azul aniversario',
    ],
  },
  {
    id: 'clase-azul-25th-anniversary',
    name: 'Clase Azul 25th Anniversary Limited Edition Reposado',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 800, max: 1100 },
      CAD: { min: 1000, max: 1380 },
      GBP: { min: 705, max: 970 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Light Oak', 'Citrus'],
    tastingNotes:
      "Marking 25 years of Clase Azul, this reposado rests eight months across two different first-use American whiskey casks rather than one, giving it slightly more layered oak character than the standard Reposado bottling. Vanilla and caramel lead, with a light citrus lift keeping the profile from tipping too heavy, and a clean, gently oaked finish. Bottled as a 1-litre hand-painted ceramic decanter, it's built as a milestone piece for the brand's collector base rather than an everyday sipper.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul 25th anniversary',
      'clase azul 25 aniversario',
      'clase azul veinticinco',
      'clase azul 25 year',
      'clase azul 25',
    ],
  },
  {
    id: 'clase-azul-pink-2023',
    name: 'Clase Azul Pink Breast Cancer Edition 2023',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 800, max: 1000 },
      CAD: { min: 1000, max: 1250 },
      GBP: { min: 705, max: 880 },
    },
    flavorProfile: ['Agave', 'Port Wine', 'Dark Fruit', 'Vanilla', 'Caramel'],
    tastingNotes:
      'This joven blend combines añejo aged in port wine casks with añejo aged in American whiskey casks and a portion of unaged Plata, giving it more layered depth than a typical joven despite the young classification. Dark fruit and a genuine port-wine richness lead the nose, vanilla and caramel round out the palate, and the finish carries real warmth from the aged components underneath. The pink ceramic decanter, hand-painted by Guanajuato artisans and sold with matching sipping cups, ties the release to its purpose — proceeds support breast cancer awareness.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul pink',
      'clase azul rosa',
      'pink tequila bottle',
      'clase azul breast cancer',
      'clase azul pink 2023',
      'clase azul pink ceramic',
      'pink ceramic tequila',
    ],
  },
  {
    id: 'clase-azul-pink-2024',
    name: 'Clase Azul Pink Breast Cancer Edition 2024',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 800, max: 1000 },
      CAD: { min: 1000, max: 1250 },
      GBP: { min: 705, max: 880 },
    },
    flavorProfile: ['Agave', 'Port Wine', 'Dark Fruit', 'Vanilla', 'Caramel'],
    tastingNotes:
      "The 2024 pink charity release repeats the formula that built the series — a joven blend of port-wine-cask añejo and American-whiskey-cask añejo layered over unaged Plata — so the same balance of dark fruit, vanilla, and caramel carries through, with the port cask influence giving it more depth than a straight joven. The palate is rich for a young classification, and the finish holds onto that aged warmth rather than fading quickly. The hand-painted pink ceramic decanter, updated from the prior year's design, continues to raise funds for RETO breast cancer awareness.",
    origin: 'Mexico',
    searchTerms: [
      'clase azul pink 2024',
      'clase azul rosa 2024',
      'clase azul breast cancer 2024',
      'clase azul pink joven',
      'clase azul charity edition',
    ],
  },
  {
    id: 'clase-azul-spirit-of-champions',
    name: 'Clase Azul Spirit of Champions Joven Tequila',
    brand: 'Clase Azul',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 1800, max: 2200 },
      CAD: { min: 2250, max: 2750 },
      GBP: { min: 1580, max: 1940 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Oak', 'French Wood'],
    tastingNotes:
      'This release ages 28 months in French wooden vats sourced from the Forest of Tronçais — a wood source more associated with cognac and fine wine than tequila — before being blended with a dash of unaged Plata to soften the finish. Rich caramel and vanilla lead, with French oak lending a more delicate spice than the American-oak-driven Clase Azuls typically show, and the finish carries genuine complexity from that extended cask time. Limited to 10,000 one-litre decanters and certified Kosher, the trophy-shaped bottle makes no secret of its collector-market ambitions.',
    origin: 'Mexico',
    searchTerms: [
      'clase azul spirit of champions',
      'clase azul campeones',
      'clase azul world cup',
      'clase azul trophy bottle',
      'clase azul 2026',
      'clase azul french oak',
      'clase azul champions',
    ],
  },

  // -- Don Julio series (tall narrow bottle, distinctive blue label) -- (tall narrow bottle, distinctive blue label) --
  {
    id: 'don-julio-reposado',
    name: 'Don Julio Reposado Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 38,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 50, max: 60 },
      CAD: { min: 65, max: 78 },
      GBP: { min: 45, max: 55 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Light Oak'],
    tastingNotes:
      "Don Julio Reposado rests eight months in American white oak — well past the two-month legal minimum for the category — which is enough to build real vanilla and caramel character without burying the highland agave underneath. Don Julio González began distilling in Jalisco's highlands in the 1940s, and the brand's reposado has become the benchmark a lot of drinkers use to judge others in the category. The nose carries cooked agave and vanilla, the palate is smooth with light oak and caramel, and the finish stays clean rather than heavy. The squat, blue-labeled bottle is as recognizable as the liquid itself.",
    origin: 'Mexico',
    searchTerms: ['don julio reposado', 'dj reposado', 'don julio rested'],
  },
  {
    id: 'don-julio-anejo',
    name: 'Don Julio Añejo Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 38,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 60, max: 72 },
      CAD: { min: 78, max: 92 },
      GBP: { min: 52, max: 62 },
    },
    flavorProfile: ['Agave', 'Chocolate', 'Vanilla', 'Oak', 'Dried Fruit'],
    tastingNotes:
      "Aged 18 months in American white oak, Don Julio Añejo pushes well past reposado territory into genuinely whiskey-adjacent richness — chocolate and dried fruit lead the nose, vanilla and warm oak spice fill out the palate, and the finish is smooth and lingering. It's built from the same highland agave base as the rest of the Don Julio range, but the extended aging brings out a depth the Blanco and Reposado don't have. Don Julio González is often credited as the first producer to bottle his tequila in glass for retail sale rather than selling it by the barrel, a shift that helped set the template for the modern premium tequila category. Best sipped neat rather than mixed, given how much oak character the 18 months has built in.",
    origin: 'Mexico',
    searchTerms: ['don julio anejo', 'don julio añejo', 'don julio aged', 'dj anejo'],
  },
  {
    id: 'don-julio-1942',
    name: 'Don Julio 1942 Añejo Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 38,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 155, max: 175 },
      CAD: { min: 195, max: 225 },
      GBP: { min: 135, max: 158 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Caramel', 'Oak', 'Honey'],
    tastingNotes:
      "Don Julio 1942 ages a minimum of two and a half years in American oak, named for the year Don Julio González is said to have begun distilling in Jalisco's highlands. That extended aging brings it close to extra añejo depth: roasted agave, vanilla, and caramel sit over a substantial toasted oak backbone, with honey sweetness rounding out a smooth, warming finish. It became one of the most recognized ultra-premium tequilas largely on the strength of that balance between richness and drinkability, helped along by the tall, narrow bottle that's instantly identifiable behind any bar.",
    origin: 'Mexico',
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'tequila',
      premiumScore: 92,
      recommendedModes: ['neat', 'large-rock'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'A sipping tequila first — the price and quality demand you taste it neat before mixing.',
      cocktailUse: 'best-neat',
    },
    searchTerms: [
      'don julio 1942',
      'dj 1942',
      '1942 tequila',
      'tall tequila bottle',
      'don julio nineteen forty two',
      '1942',
    ],
  },
  {
    id: 'don-julio-real',
    name: 'Don Julio Real Extra Añejo Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 38,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 400, max: 450 },
      CAD: { min: 500, max: 570 },
      GBP: { min: 360, max: 410 },
    },
    flavorProfile: ['Agave', 'Dark Chocolate', 'Vanilla', 'Dried Fruit', 'Cinnamon'],
    tastingNotes:
      "Don Julio Real ages three to five years in American white oak barrels, firmly in extra añejo territory, and undergoes a proprietary distillation process the brand doesn't fully disclose that's meant to smooth out the tannin that long aging usually brings. Dark chocolate and dried fruit dominate the nose, vanilla and warm cinnamon spice carry through a luxuriously smooth palate, and the finish is long without the drying oak bite you'd expect from that much barrel time. The crystal-clear decanter with its agave-leaf stopper matches the price point, positioning it as one of the most polished extra añejos on the market.",
    origin: 'Mexico',
    searchTerms: [
      'don julio real',
      'dj real',
      'don julio extra anejo',
      'don julio crystal decanter',
      'don julio agave stopper',
    ],
  },
  {
    id: 'don-julio-70',
    name: 'Don Julio 70 Añejo Cristalino Tequila',
    brand: 'Don Julio',
    type: 'tequila',
    abv: 35,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 75, max: 90 },
      CAD: { min: 95, max: 115 },
      GBP: { min: 65, max: 80 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Light Oak', 'Citrus'],
    tastingNotes:
      "Don Julio 70 is an añejo — aged the requisite minimum of a year in American oak — that's then charcoal-filtered to strip out its color, a process called cristalino that leaves the barrel-derived flavor largely intact while making the spirit look like a blanco. That means real vanilla and light oak character alongside a citrus brightness that pure añejos usually lose, giving it a lighter, more approachable profile than the darker Añejo or 1942 in the lineup. Created for the brand's 70th anniversary, it helped popularize cristalino as a category in its own right.",
    origin: 'Mexico',
    searchTerms: [
      'don julio 70',
      'dj 70',
      'don julio cristalino',
      'cristalino tequila',
      'don julio seventy',
      'clear anejo',
    ],
  },

  // -- Patrón series (short squat bottle, natural raffia/cork top) --
  {
    id: 'patron-reposado',
    name: 'Patrón Reposado Tequila',
    brand: 'Patrón',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 58 },
      CAD: { min: 62, max: 75 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Agave', 'Oak', 'Vanilla', 'Caramel', 'Citrus'],
    tastingNotes:
      'Patrón Reposado rests a minimum of two months in oak barrels, the legal floor for the category, but the 100% Weber blue agave base — cooked in small brick ovens and triple-distilled — carries plenty of character on its own. Vanilla and caramel build over a clean agave backbone, with a citrus lift keeping the profile from feeling heavy, and the oak influence stays subtle given the short rest. The hand-blown glass bottle with its cork-and-raffia tie has become nearly as recognizable as the tequila itself.',
    origin: 'Mexico',
    searchTerms: ['patron reposado', 'patrón reposado', 'patron rested', 'patron cork bottle'],
  },
  {
    id: 'patron-anejo',
    name: 'Patrón Añejo Tequila',
    brand: 'Patrón',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 85 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Dark Fruit', 'Oak', 'Honey'],
    tastingNotes:
      "Patrón Añejo ages at least 12 months across a mix of French oak, Hungarian oak, and used American whiskey barrels — an unusually varied cask program for the category that adds layers most single-cask añejos don't have. Vanilla and dark fruit lead the nose, honey sweetness and warm oak spice fill out a rich, complex palate, and the finish carries real depth from that mixed-cask aging. It's a noticeably more structured pour than the Silver or Reposado in the range, built for sipping rather than mixing.",
    origin: 'Mexico',
    searchTerms: ['patron anejo', 'patrón añejo', 'patron aged', 'patron anejo tequila'],
  },
  {
    id: 'gran-patron-platinum',
    name: 'Gran Patrón Platinum Silver Tequila',
    brand: 'Patrón',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 220, max: 250 },
      CAD: { min: 275, max: 315 },
      GBP: { min: 195, max: 225 },
    },
    flavorProfile: ['Agave', 'White Pepper', 'Citrus', 'Smooth', 'Mineral'],
    tastingNotes:
      'Gran Patrón Platinum is triple-distilled 100% blue agave, briefly rested in platinum stainless steel tanks rather than wood, so it stays a blanco in character despite the elevated price and packaging. Fresh agave and citrus blossom lead the nose, white pepper adds lift through the palate, and a faint mineral note rounds out a silky, exceptionally smooth finish for an unaged tequila. The extra distillation pass is what buys that smoothness — it strips out more of the raw agave harshness that a standard double-distilled blanco keeps. The frosted square decanter is one of the more distinctive shapes in ultra-premium tequila.',
    origin: 'Mexico',
    searchTerms: [
      'gran patron platinum',
      'gran patrón platinum',
      'patron platinum',
      'frosted square tequila bottle',
      'gran patron silver',
    ],
  },
  {
    id: 'gran-patron-burdeos',
    name: 'Gran Patrón Burdeos Añejo Tequila',
    brand: 'Patrón',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 450, max: 500 },
      CAD: { min: 560, max: 620 },
      GBP: { min: 400, max: 450 },
    },
    flavorProfile: ['Agave', 'Bordeaux', 'Dark Fruit', 'Oak', 'Chocolate'],
    tastingNotes:
      "Gran Patrón Burdeos is distilled and initially aged before finishing in single-vintage Bordeaux wine barrels, a technique borrowed directly from winemaking and unusual even among ultra-premium tequilas. That Bordeaux finish brings genuine dark fruit and a faint tannic wine character to the glass, layered over chocolate and warm oak from the underlying agave spirit, with an extraordinarily long, complex finish. It's one of the more ambitious cask-finishing experiments in the category, built for slow sipping rather than any kind of mixing.",
    origin: 'Mexico',
    searchTerms: [
      'gran patron burdeos',
      'gran patrón burdeos',
      'patron burdeos',
      'bordeaux tequila',
      'gran patron anejo',
    ],
  },

  // -- Casamigos full range --
  {
    id: 'casamigos-reposado',
    name: 'Casamigos Reposado Tequila',
    brand: 'Casamigos',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 58 },
      CAD: { min: 62, max: 75 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Agave', 'Caramel', 'Cocoa', 'Vanilla'],
    tastingNotes:
      "Casamigos Reposado rests seven months in American white oak, built by founders George Clooney and Rande Gerber around the same goal as the rest of the range — a tequila smooth enough to drink without salt or lime. Caramel and cocoa lead the nose, vanilla rounds out a clean agave backbone through the palate, and the finish stays soft and short rather than pushing heavy oak tannin. It's become one of the best-selling premium reposados largely on the strength of that easy-drinking profile.",
    origin: 'Mexico',
    searchTerms: ['casamigos reposado', 'casa amigos reposado', 'clooney tequila reposado'],
  },
  {
    id: 'casamigos-anejo',
    name: 'Casamigos Añejo Tequila',
    brand: 'Casamigos',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Dark Caramel', 'Dried Fruit', 'Spice'],
    tastingNotes:
      'Casamigos Añejo ages 14 months in American white oak, noticeably longer than the reposado in the range, and it shows in a deeper, more dessert-leaning profile: dark caramel and dried fruit dominate the nose, vanilla and warm baking spice fill out the palate, and the finish lingers with real oak sweetness. It carries more structure than the Blanco or Reposado while keeping the same easy-drinking philosophy the founders built the brand around.',
    origin: 'Mexico',
    searchTerms: [
      'casamigos anejo',
      'casamigos añejo',
      'casa amigos anejo',
      'clooney tequila anejo',
    ],
  },
  {
    id: 'casamigos-mezcal',
    name: 'Casamigos Mezcal Joven',
    brand: 'Casamigos',
    type: 'mezcal',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Smokey', 'Agave', 'Citrus', 'Earthy'],
    tastingNotes:
      "Casamigos was founded by George Clooney, Rande Gerber, and Mike Meldman, and built its reputation on tequila before extending into mezcal with this Joven, made from hand-selected Espadín agave grown in Oaxaca. It follows the traditional process — agave hearts roasted in underground pits before distillation — but is tuned for a gentler, more approachable smoke than a lot of artisanal mezcal aims for. The nose is lightly smoky with roasted agave and citrus, the palate stays smooth with fresh agave sweetness and an earthy undertone, and the finish is soft rather than assertive. It's a solid entry point for tequila drinkers curious about mezcal who don't want to jump straight into something aggressively smoky.",
    origin: 'Mexico',
    searchTerms: ['casamigos mezcal', 'casa amigos mezcal', 'casamigos oaxaca mezcal'],
  },

  // -- Herradura series --
  {
    id: 'herradura-silver',
    name: 'Herradura Silver Tequila',
    brand: 'Herradura',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 40, max: 50 },
      CAD: { min: 52, max: 64 },
      GBP: { min: 35, max: 45 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Light Pepper', 'Floral'],
    tastingNotes:
      "Herradura Silver rests 45 days before bottling — most blancos rest zero — which gives it noticeably more roundness and complexity than a typical unaged tequila. Herradura has distilled at its Hacienda San José del Refugio in Amatitán, Jalisco since the 1870s, one of the older continuously operating tequila estates. Fresh agave and citrus blossom lead the nose, with a light floral note and a gentle white pepper finish rather than the sharper bite of a zero-rest blanco. It's built to bridge blanco freshness with reposado-level smoothness.",
    origin: 'Mexico',
    searchTerms: ['herradura silver', 'herradura blanco', 'herradura tequila silver'],
  },
  {
    id: 'herradura-reposado',
    name: 'Herradura Reposado Tequila',
    brand: 'Herradura',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 45, max: 55 },
      CAD: { min: 58, max: 70 },
      GBP: { min: 39, max: 48 },
    },
    flavorProfile: ['Agave', 'Oak', 'Vanilla', 'Caramel'],
    tastingNotes:
      "Herradura Reposado ages 11 months, far beyond the two-month legal minimum for the category, and that extra time shows in noticeably more oak influence than most reposados carry. Rich agave sits under real vanilla and caramel, with the oak reading as substantial rather than a light dusting, and the finish is warm and rounded. It's one of the more traditionally made reposados on the market, distilled at Herradura's historic Amatitán estate using the brand's characteristically long fermentation.",
    origin: 'Mexico',
    searchTerms: ['herradura reposado', 'herradura rested'],
  },
  {
    id: 'herradura-anejo',
    name: 'Herradura Añejo Tequila',
    brand: 'Herradura',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Agave', 'Dark Fruit', 'Chocolate', 'Oak', 'Spice'],
    tastingNotes:
      "Herradura Añejo ages 25 months in American white oak, well past the category's one-year minimum, giving it real depth and structure. Dark fruit and chocolate dominate the nose, warm oak spice carries through a rich, complex palate, and the finish is long and warming. Distilled at the brand's historic Amatitán hacienda in Jalisco, it's considered one of the more traditionally crafted añejos available, built for unhurried neat sipping.",
    origin: 'Mexico',
    searchTerms: ['herradura anejo', 'herradura añejo', 'herradura aged'],
  },
  {
    id: 'herradura-ultra',
    name: 'Herradura Ultra Añejo Tequila',
    brand: 'Herradura',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 90, max: 110 },
      CAD: { min: 115, max: 140 },
      GBP: { min: 80, max: 98 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Butterscotch', 'Oak', 'Cinnamon'],
    tastingNotes:
      "Herradura Ultra is an extra añejo — aged 49 months in oak — that's then charcoal-filtered to near-total clarity, a cristalino treatment that keeps the barrel-built flavor while giving it the visual lightness of a blanco. Butterscotch and vanilla lead the nose, warm cinnamon spice threads through a rich palate built on nearly four years of oak contact, and the finish stays smooth despite the extended aging. It's one of the more convincing arguments for cristalino as a genuine style rather than a marketing gimmick, given how much real barrel character survives the filtration.",
    origin: 'Mexico',
    searchTerms: [
      'herradura ultra',
      'herradura ultra anejo',
      'herradura cristalino',
      'clear herradura',
    ],
  },

  // -- Other premium / distinctive tequilas --
  {
    id: 'casa-dragones-joven',
    name: 'Casa Dragones Joven Tequila',
    brand: 'Casa Dragones',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 280, max: 320 },
      CAD: { min: 350, max: 400 },
      GBP: { min: 250, max: 285 },
    },
    flavorProfile: ['Agave', 'Pear', 'Vanilla', 'Almond', 'Light Oak'],
    tastingNotes:
      'Casa Dragones Joven is a blend of silver and extra-aged tequila, built by Bertha González Nieves — the first woman certified as a Tequila Master — specifically to be sipped neat rather than mixed. The joven blend brings together the fresh agave brightness of the unaged component with the vanilla and light oak of the aged portion, producing pear and almond notes over a silky, well-integrated palate and a clean, extended finish. The tall, frosted glass bottle with its curved neck is meant to read as fine spirits packaging rather than typical tequila branding, matching the price and positioning.',
    origin: 'Mexico',
    searchTerms: [
      'casa dragones',
      'casa dragones joven',
      'frosted tequila bottle',
      'tall frosted tequila',
      'dragones tequila',
    ],
  },
  {
    id: 'cincoro-anejo',
    name: 'Cincoro Añejo Tequila',
    brand: 'Cincoro',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 200, max: 230 },
      CAD: { min: 250, max: 285 },
      GBP: { min: 178, max: 205 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Dark Caramel', 'Toasted Oak', 'Cacao'],
    tastingNotes:
      "Cincoro was founded by five NBA team owners, and the Añejo ages 24 to 28 months in American oak, putting it well into whiskey-adjacent richness. Dark caramel and cacao dominate the nose, toasted oak and vanilla build through a dense, warming palate, and the finish is long with real barrel depth. The oval, egg-shaped bottle is one of the more distinctive silhouettes in modern tequila, matching the brand's ultra-premium positioning.",
    origin: 'Mexico',
    searchTerms: [
      'cincoro anejo',
      'cincoro añejo',
      'oval tequila bottle',
      'egg shaped tequila bottle',
    ],
  },
  {
    id: 'lobos-1707-reposado',
    name: 'Lobos 1707 Reposado Tequila',
    brand: 'Lobos 1707',
    type: 'tequila',
    abv: 38,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 58 },
      CAD: { min: 62, max: 75 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Agave', 'Pedro Ximénez', 'Vanilla', 'Dark Fruit'],
    tastingNotes:
      "Lobos 1707 Reposado finishes in Pedro Ximénez sherry casks, a technique borrowed straight from winemaking that's uncommon in tequila production. That PX finish brings genuine sweet dark fruit and raisined sherry character to the glass, layered over the base agave and vanilla, producing a noticeably richer, dessert-leaning profile than a standard reposado. LeBron James co-owns the brand, which has leaned into that unusual cask-finishing approach as its point of difference in a crowded premium tequila market.",
    origin: 'Mexico',
    searchTerms: [
      'lobos 1707',
      'lobos tequila',
      'lobos reposado',
      'lobos 1707 tequila',
      'lebron tequila',
    ],
  },
  {
    id: '818-reposado',
    name: '818 Reposado Tequila',
    brand: '818',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 42, max: 52 },
      CAD: { min: 54, max: 66 },
      GBP: { min: 37, max: 47 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Butter', 'Caramel'],
    tastingNotes:
      "818 Reposado, Kendall Jenner's tequila brand sourced from the Los Altos highlands of Jalisco, ages six months in American white oak. Buttery vanilla and caramel build over a clean highland agave backbone, with the relatively short rest keeping the oak influence gentle rather than dominant. It's an approachable, easy-drinking reposado built for a broad audience rather than tequila purists, and has become one of the more widely distributed celebrity-founded bottlings.",
    origin: 'Mexico',
    searchTerms: ['818 reposado', 'eight one eight reposado', 'kendall jenner tequila reposado'],
  },
  {
    id: 'codigo-1530-rosa',
    name: 'Código 1530 Rosa Blanco Tequila',
    brand: 'Código 1530',
    type: 'tequila',
    abv: 35,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Agave', 'Rose', 'Strawberry', 'Light Oak'],
    tastingNotes:
      "Código 1530 Rosa rests 30 days in uncharred Napa Cabernet Sauvignon barrels — the wine residue rather than any added coloring is what gives the tequila its natural pink blush, a genuinely unusual technique for the category. Strawberry and rose petal notes emerge from that brief wine-barrel contact, layered over a clean agave base with just a whisper of oak, and the finish stays light and fruity rather than tannic. It's one of the more visually and technically distinctive tequilas on any back bar, built around a real production quirk rather than added flavoring.",
    origin: 'Mexico',
    searchTerms: [
      'codigo 1530',
      'codigo rosa',
      'pink tequila',
      'rose tequila',
      'codigo 1530 rosa',
      'pink bottle tequila',
    ],
  },
  {
    id: 'fortaleza-blanco',
    name: 'Fortaleza Blanco Tequila',
    brand: 'Fortaleza',
    type: 'tequila',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 65 },
      CAD: { min: 70, max: 84 },
      GBP: { min: 48, max: 58 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Pepper', 'Mineral', 'Floral'],
    tastingNotes:
      "Fortaleza is one of the last tequilas made using a tahona — a massive volcanic stone wheel that crushes cooked agave rather than the shredder-and-diffuser methods most modern distilleries use — a slower, more labor-intensive process that keeps more of the agave fiber and natural sugars in the ferment. The Sauza family distills it at their historic La Fortaleza estate in Tequila, Jalisco, using traditional wood-fired ovens to cook the agave beforehand. The result is intensely raw and agave-forward: bright citrus and black pepper over a genuinely earthy, mineral core, with a floral lift that more industrially produced blancos rarely show. It's become a cult favorite specifically because of how uncompromising that traditional process is.",
    origin: 'Mexico',
    searchTerms: [
      'fortaleza',
      'fortaleza blanco',
      'fortaleza tequila',
      'tahona tequila',
      'stone wheel tequila',
    ],
  },

  // -- Distinctive Scotch & Whisky --
  {
    id: 'glenfiddich-18',
    name: 'Glenfiddich 18 Year Single Malt Scotch',
    brand: 'Glenfiddich',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 80, max: 100 },
      CAD: { min: 100, max: 125 },
      GBP: { min: 70, max: 88 },
    },
    flavorProfile: ['Dried Fruit', 'Oak', 'Dark Chocolate', 'Warming Spice'],
    tastingNotes:
      "Glenfiddich's 18 Year marries American bourbon casks with Oloroso sherry butts, a small-batch vatting overseen for consistency across each release rather than a single-cask expression. It comes from the same Dufftown, Speyside distillery that's been in continuous, family-owned production since 1887, and the triangular bottle — designed decades ago to evoke the three pillars of production — remains one of the most recognizable shapes on any back bar. Rich dried fruit and dark chocolate sit over a solid oak backbone, with warming baking spice building through a long finish. It's noticeably deeper and more structured than the 12, without tipping into the heavier, all-sherry style of some Speyside rivals.",
    origin: 'Scotland',
    searchTerms: [
      'glenfiddich 18',
      'glenfiddich eighteen',
      'glenfiddich 18 year',
      'fiddich 18',
      'glenfiddich small batch',
    ],
  },
  {
    id: 'glenfiddich-21',
    name: 'Glenfiddich 21 Year Gran Reserva Scotch',
    brand: 'Glenfiddich',
    type: 'whiskey',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 180, max: 210 },
      CAD: { min: 225, max: 265 },
      GBP: { min: 158, max: 185 },
    },
    flavorProfile: ['Tropical Fruit', 'Toffee', 'Oak', 'Rum Finish'],
    tastingNotes:
      "Glenfiddich 21 spends its base maturation in American bourbon and Spanish sherry oak before a finishing period of up to four months in casks that previously held Caribbean rum — an unusual finishing choice that sets it apart from the sherry- or wine-finished expressions most distilleries reach for. The result leans tropical rather than dark and brooding: ripe tropical fruit and toffee up front, with the rum cask lending a silky, faintly molasses-like sweetness to the finish. Oak is present but doesn't dominate, letting the fruit and rum influence carry the whisky. It's one of the more distinctive premium age statements from a distillery known for experimenting with cask finishes.",
    origin: 'Scotland',
    searchTerms: [
      'glenfiddich 21',
      'glenfiddich twenty one',
      'glenfiddich gran reserva',
      'fiddich 21',
      'rum cask scotch',
    ],
  },
  {
    id: 'macallan-18',
    name: 'The Macallan 18 Year Double Cask Scotch',
    brand: 'The Macallan',
    type: 'whiskey',
    abv: 43,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 320, max: 380 },
      CAD: { min: 400, max: 470 },
      GBP: { min: 280, max: 335 },
    },
    flavorProfile: ['Sherry', 'Dark Fruit', 'Chocolate', 'Oak', 'Spice'],
    tastingNotes:
      "The Macallan 18 Double Cask is matured in a combination of European and American oak casks, both seasoned with sherry before filling — the American oak softens the intensity of the European wood while still delivering real sherry-driven depth. It comes from the same small-stills, sherry-first philosophy that built Macallan's reputation as one of Speyside's most collected names, aged nearly two decades before bottling. Dark chocolate, Christmas cake, and dried dark fruit dominate, layered with warming cinnamon and clove spice and a persistent oak backbone. It's a serious, contemplative pour, and its scarcity has made it one of the most sought-after age-stated Scotches on the secondary market.",
    origin: 'Scotland',
    searchTerms: [
      'macallan 18',
      'macallan eighteen',
      'macallan 18 double cask',
      'macallan 18 year',
      'the macallan 18',
    ],
  },
  {
    id: 'dalmore-12',
    name: 'The Dalmore 12 Year Single Malt Scotch',
    brand: 'The Dalmore',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 68 },
      CAD: { min: 70, max: 86 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Orange', 'Chocolate', 'Vanilla', 'Sherry', 'Spice'],
    tastingNotes:
      "The Dalmore ages its spirit in American white oak before finishing in hand-selected Oloroso sherry casks, a two-stage process the Highland distillery has built its reputation on. The stag emblem on the bottle references a story dating to 1263, when a clan chief is said to have saved King Alexander III from a charging stag — a heraldic mark the distillery has carried ever since. Rich orange and dark chocolate meet vanilla and warming sherry spice, with real weight for a 12-year expression. It's one of the more opulent-tasting standard-tier single malts on the shelf, and the stag bottle is instantly recognizable even to non-whisky drinkers.",
    origin: 'Scotland',
    searchTerms: [
      'dalmore 12',
      'dalmore twelve',
      'dalmore',
      'stag bottle scotch',
      'deer bottle whisky',
      'the dalmore',
    ],
  },
  {
    id: 'balvenie-12-doublewood',
    name: 'The Balvenie DoubleWood 12 Year Scotch',
    brand: 'The Balvenie',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 68 },
      CAD: { min: 70, max: 85 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Honey', 'Vanilla', 'Fruit', 'Cinnamon', 'Sherry'],
    tastingNotes:
      "Balvenie DoubleWood was one of the whiskies that helped popularize cask finishing as a technique, developed by David Stewart — one of the longest-serving malt masters in Scotch whisky — who ages the spirit first in traditional oak casks before transferring it to first-fill European sherry butts for a final period of maturation. The Dufftown distillery, William Grant's sister site to Glenfiddich, still runs its own malting floor, one of the few in Scotland that does. Honey, ripe fruit, and vanilla from the initial maturation meet cinnamon spice and sherry sweetness from the second cask, giving it real layering for its age. It's a benchmark example of how a second cask can add complexity without overwhelming the base whisky.",
    origin: 'Scotland',
    searchTerms: [
      'balvenie 12',
      'balvenie doublewood',
      'the balvenie',
      'balvenie double wood',
      'balvenie twelve',
    ],
  },
  {
    id: 'yamazaki-12',
    name: 'Yamazaki 12 Year Single Malt Japanese Whisky',
    brand: 'Yamazaki',
    type: 'whiskey',
    abv: 43,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 160, max: 200 },
      CAD: { min: 200, max: 250 },
      GBP: { min: 140, max: 178 },
    },
    flavorProfile: ['Peach', 'Plum', 'Coconut', 'Vanilla', 'Light Smoke'],
    tastingNotes:
      "Yamazaki was Japan's first malt whisky distillery, founded by Shinjiro Torii in 1923 in a valley outside Kyoto chosen for its water and dense morning mists. The 12 Year draws on a range of cask types, including Spanish oak, American oak, and Japan's native mizunara oak, whose loose grain lets in more air and imparts an incense-like sandalwood character over time. Peach, plum, and coconut lead the palate, with a delicate vanilla sweetness and a light wisp of smoke in the background. It became the whisky that put Japanese single malt on the world stage after winning international blind-tasting awards, and demand has kept it scarce and expensive ever since.",
    origin: 'Japan',
    searchTerms: [
      'yamazaki 12',
      'yamazaki twelve',
      'yamazaki single malt',
      'yamazaki japanese whisky',
      'suntory yamazaki',
      '山崎',
    ],
  },
  {
    id: 'nikka-from-the-barrel',
    name: 'Nikka From the Barrel Japanese Whisky',
    brand: 'Nikka',
    type: 'whiskey',
    abv: 51.4,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 65, max: 80 },
      CAD: { min: 82, max: 100 },
      GBP: { min: 57, max: 70 },
    },
    flavorProfile: ['Dried Fruit', 'Spice', 'Vanilla', 'Smoke', 'Chocolate'],
    tastingNotes:
      "Nikka From the Barrel blends malt and grain whiskies from both of Nikka's distilleries — Yoichi and Miyagikyo, which have distinctly different house styles — vatted together, married, and bottled at cask strength without chill-filtration for maximum flavor concentration. Nikka was founded by Masataka Taketsuru, who trained in Scotland before returning to Japan to help build the country's whisky industry, and this bottling reflects the blending expertise the company has built since. At 51.4% it's dense and powerful: dried fruit, dark chocolate, and warm baking spice, with real weight and length. The squat rectangular bottle was designed to stand out on a crowded bar shelf, and it does.",
    origin: 'Japan',
    searchTerms: [
      'nikka from the barrel',
      'nikka ftb',
      'nikka barrel',
      'nikka japanese whisky',
      'rectangular whisky bottle',
      'nikka',
    ],
  },

  // -- Distinctive cognac --
  {
    id: 'hennessy-xo',
    name: 'Hennessy XO Cognac',
    brand: 'Hennessy',
    type: 'brandy',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 200, max: 240 },
      CAD: { min: 250, max: 300 },
      GBP: { min: 178, max: 215 },
    },
    flavorProfile: ['Dark Chocolate', 'Dried Fruit', 'Leather', 'Oak', 'Spice'],
    tastingNotes:
      'A blend of over 100 eaux-de-vie sourced across all four Charente crus, some aged decades in French oak, giving XO far more depth and complexity than the VS or VSOP tiers below it. Created in 1870 for the personal use of Maurice Hennessy, it effectively defined the XO (Extra Old) category before regulators formalized minimum aging requirements around it. Dark chocolate, leather, and dried fruit dominate the nose and palate, with toasted oak and warming baking spice carrying through a long, rich finish. The decanter-style bottle and distinctive stopper have stayed recognizable for well over a century.',
    origin: 'France',
    searchTerms: [
      'hennessy xo',
      'hennessy x.o',
      'hennessy extra old',
      'henny xo',
      'cognac xo',
      'hennessy decanter',
    ],
  },
  {
    id: 'remy-martin-xo',
    name: 'Rémy Martin XO Cognac',
    brand: 'Rémy Martin',
    type: 'brandy',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 220, max: 260 },
      CAD: { min: 275, max: 325 },
      GBP: { min: 195, max: 230 },
    },
    flavorProfile: ['Plum', 'Dark Chocolate', 'Hazelnut', 'Oak', 'Dried Fruit'],
    tastingNotes:
      "An assembly of up to 400 eaux-de-vie, drawn exclusively from Grande and Petite Champagne — the same 'Fine Champagne' designation as the house's VSOP, but built here from much older stock aged well past the XO minimum. Created in 1981 by master blender André Giraud, it was Rémy Martin's answer to rival houses' XO ranges, decades after the company's earlier cellar master, André Renaud, had pioneered the VSOP Fine Champagne category itself in 1927. That focus on the two top-tier crus gives it a fruitier, more elegant style than blends pulling from the wider Charente region. Ripe plum, hazelnut, and dark chocolate lead the palate, backed by soft oak and dried fruit, resolving into a remarkably silky, long finish. The curved, organic bottle shape has become as much a signature as the liquid itself.",
    origin: 'France',
    searchTerms: [
      'remy martin xo',
      'rémy martin xo',
      'remy xo',
      'remy martin extra old',
      'remy cognac xo',
    ],
  },
  {
    id: 'louis-xiii',
    name: 'Louis XIII Cognac',
    brand: 'Rémy Martin',
    type: 'brandy',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 3500, max: 4200 },
      CAD: { min: 4300, max: 5200 },
      GBP: { min: 3100, max: 3700 },
    },
    flavorProfile: ['Dried Rose', 'Myrrh', 'Honey', 'Dark Fruit', 'Spice'],
    tastingNotes:
      'A blend of up to 1,200 eaux-de-vie, some reportedly aged for decades in tierçon casks made from centuries-old Limousin oak, drawn entirely from the Grande Champagne cru first bottled by the house in 1874 in tribute to the French king. The extreme average age and rare cask stock push it into a different register from any standard XO — extraordinarily layered, with dried rose petals, myrrh, honey, and dark dried fruit woven through warm spice on a long, evolving finish. Each bottle is hand-numbered and housed in a Baccarat crystal decanter, and it remains one of the most expensive spirits produced anywhere.',
    origin: 'France',
    searchTerms: [
      'louis xiii',
      'louis 13',
      'louis xiii cognac',
      'baccarat decanter cognac',
      'remy louis xiii',
      'most expensive cognac',
    ],
  },

  // -- Other distinctive/notable additions --
  {
    id: 'absolut-elyx',
    name: 'Absolut Elyx Vodka',
    brand: 'Absolut',
    type: 'vodka',
    abv: 42.3,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 48, max: 60 },
      GBP: { min: 33, max: 42 },
    },
    flavorProfile: ['Silky', 'Wheat', 'Toffee', 'Cream'],
    tastingNotes:
      "Distilled from single-estate winter wheat grown at Åhus, the same source farms behind Absolut, but run through a restored 1921 copper column still that's hand-operated rather than automated — a slower, more hands-on process than the modern equipment most large vodka brands use. That copper contact and the old-still character give Elyx real weight and texture: a silky, almost oily mouthfeel with wheat-driven toffee and cream notes, and a long, clean finish without the thinness common at this proof. The copper-toned bottle nods directly to the still it's named after.",
    origin: 'Sweden',
    searchTerms: ['absolut elyx', 'elyx vodka', 'copper vodka bottle', 'absolut copper', 'elyx'],
  },
  {
    id: 'haku-vodka',
    name: 'Haku Japanese Craft Vodka',
    brand: 'Haku',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 26, max: 33 },
    },
    flavorProfile: ['Rice', 'Floral', 'Subtle Sweetness', 'Smooth'],
    tastingNotes:
      "Distilled entirely from Japanese white rice by Suntory — the House founded in 1899 by Shinjiro Torii that would go on to build Japan's whisky industry — drawing on the same base and some of the fermentation know-how the company applies to shochu production, then filtered through bamboo charcoal. 'Haku' means both 'white,' for the rice, and 'brilliant,' for the clarity the brand chases. Rice as a base produces a naturally softer, more delicate spirit than the wheat, corn, or rye typical of Western vodkas — subtly sweet with light floral notes and almost no grain sharpness. The palate is smooth and rounded with a clean, gentle finish, and the frosted bottle with Japanese script stands out on any back bar.",
    origin: 'Japan',
    searchTerms: [
      'haku vodka',
      'haku japanese vodka',
      'haku',
      'japanese rice vodka',
      'suntory haku',
      '白',
    ],
  },

  // -- Olmeca entries --
  {
    id: 'olmeca-reposado',
    name: 'Olmeca Reposado Tequila',
    brand: 'Olmeca',
    type: 'tequila',
    abv: 38,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 28, max: 38 },
      GBP: { min: 18, max: 25 },
    },
    flavorProfile: ['Agave', 'Light Oak', 'Citrus', 'Vanilla'],
    tastingNotes:
      "Olmeca Reposado rests in oak for the category's minimum stretch, picking up light oak and vanilla character without losing its clean agave backbone. Distilled in Jalisco, it's built as an accessible, mixing-friendly reposado rather than a sipping showpiece — a gentle citrus finish keeps it easy-drinking, and the modest oak influence means it works well in a margarita or paloma without fighting the other ingredients.",
    origin: 'Mexico',
    searchTerms: ['olmeca', 'olmeca reposado', 'olmeca tequila', 'olmeca gold'],
  },

  // ===== TOP 100 EXPANSION — HIGH-VOLUME RETAIL SPIRITS =====
  // Brands most likely to be scanned at home bars, events, and retail.
  // Covers gaps in Canadian, UK, and US markets.

  // -- Canadian Whisky (top-selling in Canada) --
  {
    id: 'crown-royal',
    name: 'Crown Royal Canadian Whisky',
    brand: 'Crown Royal',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 35, max: 45 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Vanilla', 'Oak', 'Caramel', 'Fruit'],
    tastingNotes:
      "Crown Royal blends dozens of different whiskies distilled at the company's Gimli, Manitoba plant, a scale of blending that's unusual even by Canadian whisky standards, which leans heavily on blending by design. It was created in 1939 to mark the Canadian royal visit of King George VI and Queen Elizabeth, and the purple velvet bag has stayed part of the packaging ever since. Smooth and approachable, with vanilla, caramel, and light orchard fruit carrying through to a clean, easy finish. It remains the best-selling whisky in Canada and one of the most recognized bottles in North America.",
    origin: 'Canada',
    searchTerms: [
      'crown royal deluxe',
      'crown royal original',
      'purple bag whisky',
      'canadian crown whisky',
    ],
  },
  {
    id: 'crown-royal-apple',
    name: 'Crown Royal Regal Apple',
    brand: 'Crown Royal',
    type: 'whiskey',
    abv: 35,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 35, max: 45 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Apple', 'Vanilla', 'Caramel', 'Crisp'],
    tastingNotes:
      "Crown Royal Regal Apple takes the base Crown Royal blend and infuses it with natural apple flavoring, part of the brand's push into flavored variants that has become one of the fastest-growing corners of the whisky category. It's built for immediate approachability rather than complexity — crisp green apple and caramel dominate over a softened whisky backbone, with the underlying blend mostly there to add warmth and body. The finish is smooth and sweet with minimal whisky bite, making it an easy entry point for drinkers who find standard whisky too assertive. It's become one of the best-selling flavored whiskies in North America.",
    origin: 'Canada',
    searchTerms: ['crown royal apple', 'crown apple', 'cr apple', 'regal apple whisky'],
  },
  {
    id: 'jp-wisers',
    name: "J.P. Wiser's Deluxe Canadian Whisky",
    brand: "J.P. Wiser's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 22, max: 30 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Grain', 'Vanilla', 'Light Oak', 'Mild Spice'],
    tastingNotes:
      "J.P. Wiser's traces back to 1857, when John Philip Wiser began distilling in Prescott, Ontario, making it one of Canada's oldest continuously used whisky names. The Deluxe expression is a blend built in the light, grain-forward style that defines mainstream Canadian whisky. Light grain sweetness, soft vanilla, and mild spice carry through to a clean, easy finish with very little heat. It's an unpretentious, everyday whisky that's long been a fixture behind Canadian bars.",
    origin: 'Canada',
    searchTerms: ['jp wisers', 'j.p. wiser', 'wisers deluxe', 'wisers canadian whisky', 'wisers'],
  },
  {
    id: 'canadian-club',
    name: 'Canadian Club Classic 12 Year',
    brand: 'Canadian Club',
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 22, max: 30 },
      GBP: { min: 15, max: 20 },
    },
    flavorProfile: ['Rye', 'Vanilla', 'Oak', 'Mild Spice'],
    tastingNotes:
      "Canadian Club dates back to 1858, when Hiram Walker founded his distillery in Walkerville, Ontario, just across the river from Detroit — a location that made the brand notorious during Prohibition as one of the most heavily smuggled whiskies into the US. The Classic 12 Year is aged in white oak barrels for over a decade, unusually long for a Canadian blend at this price point. Light rye spice, vanilla, and oak carry through to a smooth, clean finish with very little burn. It's a genuine piece of whisky history that still overdelivers for the price.",
    origin: 'Canada',
    searchTerms: ['canadian club', 'cc', 'cc whisky', 'canadian club classic', 'canadian club 12'],
  },
  {
    id: 'forty-creek',
    name: 'Forty Creek Copper Pot Canadian Whisky',
    brand: 'Forty Creek',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 28, max: 38 },
      GBP: { min: 20, max: 27 },
    },
    flavorProfile: ['Rye', 'Corn', 'Barley', 'Fruit', 'Honey'],
    tastingNotes:
      "Forty Creek distills rye, corn, and barley separately, ages each grain individually in its own barrels, and only blends them together near the end of maturation — a labor-intensive approach that departs from how most Canadian whisky is made. Founder John Hall started the brand in Grimsby, Ontario in the early 1990s after years in the wine industry, and that background shows in the winemaker's attention to blending. The result carries real fruit and honey sweetness alongside gentle spice, with more layering than most whiskies in its price bracket. It's routinely one of the most awarded Canadian whiskies at international competitions.",
    origin: 'Canada',
    searchTerms: ['forty creek', '40 creek', 'forty creek whisky', 'copper pot whisky'],
  },
  {
    id: 'black-velvet',
    name: 'Black Velvet Canadian Whisky',
    brand: 'Black Velvet',
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 11, max: 16 },
    },
    flavorProfile: ['Grain', 'Light Vanilla', 'Mild', 'Smooth'],
    tastingNotes:
      "Black Velvet is a light, grain-forward Canadian blend produced at the Black Velvet Distillery in Lethbridge, Alberta, built for maximum smoothness and mixability rather than complexity. It takes its name from the Black Velvet cocktail — stout topped with champagne — because master blender Jack Napier, who created the whisky in 1951, wanted a name that captured how smooth he'd made it. It uses a high proportion of column-distilled grain whisky, which keeps the flavor light and the finish exceptionally clean. Soft grain and a touch of vanilla are about as far as the profile goes, with almost no burn even at standard proof. It's one of the best-selling value whiskies in North America precisely because it never gets in the way of a mixer.",
    origin: 'Canada',
    searchTerms: ['black velvet', 'black velvet whisky', 'bv canadian whisky'],
  },

  // -- Scotch Blends (top-selling UK/global) --
  {
    id: 'famous-grouse',
    name: 'The Famous Grouse Blended Scotch Whisky',
    brand: 'Famous Grouse',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 18, max: 25 },
    },
    flavorProfile: ['Dried Fruit', 'Sherry', 'Oak', 'Spice'],
    tastingNotes:
      "The Famous Grouse has been Scotland's best-selling whisky for decades, a blend built around Highland malts like The Macallan and Highland Park alongside grain whisky, matured mostly in ex-sherry and ex-bourbon casks. The brand traces back to Perth grocer Matthew Gloag, who created the blend in 1896 and named it after the game bird native to the Scottish moors. It pours with rounded sherry sweetness up front, dried fruit and a gentle nuttiness through the middle, and warm oak spice on the finish — nothing sharp or challenging about it. It's the whisky most Scottish households actually keep in the cupboard, built for everyday drinking rather than occasion sipping.",
    origin: 'Scotland',
    searchTerms: ['famous grouse', 'the famous grouse', 'grouse whisky', 'red grouse scotch'],
  },
  {
    id: 'bells-scotch',
    name: "Bell's Original Blended Scotch Whisky",
    brand: "Bell's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 32 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Heather', 'Honey', 'Vanilla', 'Light Peat'],
    tastingNotes:
      "Bell's is one of the UK's oldest and best-selling Scotch blends, first sold by Arthur Bell in Perth in the 1850s and built from a wide range of Highland and Speyside malts backed by grain whisky. It's a blend designed for consistency across decades rather than showing off any single distillery's character, matured in a mix of ex-bourbon and refill casks. On the palate it's soft honey and heather sweetness with a whisper of peat smoke underneath, rounding into vanilla, and finishing light and easy rather than lingering. It's the kind of everyday pub pour that's been poured into more Scottish glasses than almost anything else on the shelf.",
    origin: 'Scotland',
    searchTerms: ['bells scotch', "bell's whisky", 'bells original', 'bells blended'],
  },
  {
    id: 'teachers-scotch',
    name: "Teacher's Highland Cream Blended Scotch",
    brand: "Teacher's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 22, max: 30 },
      GBP: { min: 13, max: 18 },
    },
    flavorProfile: ['Peat', 'Malt', 'Honey', 'Oak'],
    tastingNotes:
      "Teacher's Highland Cream carries a notably higher malt content than most blended Scotches — historically built around Ardmore's peated Highland malt as its backbone, which gives it more smoky character than typical blends at this price. William Teacher started out selling whisky from Glasgow grocery shops in the 1830s before the family moved into blending, and the brand's signature stopper cork (rather than a screw cap) was an early innovation meant to prove the bottle hadn't been refilled with cheaper stock. In the glass it leads with honey and malt sweetness, picks up a distinct thread of Highland peat smoke through the middle, and finishes on dry oak. It's a firmer, smokier pour than its blended peers, which is exactly what's made it a long-running staple of UK pubs.",
    origin: 'Scotland',
    searchTerms: [
      "teacher's",
      'teachers highland cream',
      'teachers scotch',
      'highland cream whisky',
    ],
  },
  {
    id: 'chivas-regal-12',
    name: 'Chivas Regal 12 Year Blended Scotch',
    brand: 'Chivas Regal',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 30, max: 40 },
      CAD: { min: 40, max: 52 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Honey', 'Vanilla', 'Apple', 'Hazelnut'],
    tastingNotes:
      "Chivas Regal 12 is one of the world's most recognisable blended Scotches, built around Speyside malts like Strathisla — the brand's spiritual home distillery — alongside grain whisky, all matured a minimum of 12 years. The Chivas brothers were Aberdeen grocers who started blending whisky for well-heeled clients in the 1800s, and the brand later became one of the first Scotch whiskies marketed specifically as a luxury export to America. It's rich and rounded on the palate, with honey and vanilla sweetness, a distinct hazelnut note, and soft ripe apple, closing smooth and creamy rather than dry. The gold-accented bottle has stayed instantly recognisable for generations, which is no small part of why it remains a gifting standard.",
    origin: 'Scotland',
    searchTerms: ['chivas regal', 'chivas 12', 'chivas regal 12', 'chivas blended'],
  },
  {
    id: 'dewars-white-label',
    name: "Dewar's White Label Blended Scotch",
    brand: "Dewar's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 32 },
      CAD: { min: 32, max: 42 },
      GBP: { min: 20, max: 28 },
    },
    flavorProfile: ['Light Fruit', 'Honey', 'Vanilla', 'Crisp'],
    tastingNotes:
      "Dewar's built its reputation on double-ageing, or \"marrying\" — blending malt and grain whiskies together, then returning the finished blend to oak casks for several months before bottling, a process meant to smooth out the rough edges between components. Founded by John Dewar in Perth in 1846, the brand was among the first to aggressively export Scotch abroad, and its White Label became one of the best-selling Scotches in the United States. The result of that extra marrying time shows in the glass as light orchard fruit and honeyed sweetness, soft vanilla, and a clean, crisp finish without much smoke or heaviness. It's an easygoing, mixable blend that's built its whole identity around approachability.",
    origin: 'Scotland',
    searchTerms: ["dewar's", 'dewars', 'dewars white label', 'dewar scotch'],
  },
  {
    id: 'grants-family-reserve',
    name: "Grant's Family Reserve Blended Scotch",
    brand: "Grant's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 22, max: 30 },
      GBP: { min: 13, max: 18 },
    },
    flavorProfile: ['Vanilla', 'Fruit', 'Honey', 'Light Oak'],
    tastingNotes:
      "Grant's Family Reserve is a blend of malt and grain whiskies from William Grant & Sons, the family-owned company behind Glenfiddich and Balvenie, which means it draws on some genuinely well-regarded Speyside malt in its base. It's been produced continuously since 1898 and the distinctive triangular bottle, designed to maximize light refraction, has stayed largely unchanged for decades. It's a light, accessible pour — soft vanilla, orchard fruit, and honey sweetness with barely any smoke, finishing smooth and easy. Unpretentious by design, it's one of the best-selling Scotches on earth precisely because it never asks much of the drinker.",
    origin: 'Scotland',
    searchTerms: ["grant's", 'grants scotch', 'grants family reserve', 'william grants'],
  },
  {
    id: 'johnnie-walker-red',
    name: 'Johnnie Walker Red Label Blended Scotch',
    brand: 'Johnnie Walker',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 18, max: 25 },
    },
    flavorProfile: ['Smoke', 'Vanilla', 'Spice', 'Citrus'],
    tastingNotes:
      "Johnnie Walker Red Label is the world's best-selling Scotch by volume, a blend of around 35 malt and grain whiskies assembled to hit a bold, consistent flavor no matter where in the world it's bottled. It descends from the blending work John Walker's son Alexander began in Kilmarnock in the 1860s, and the square bottle with the slanted label — designed to fit more bottles per shelf and survive shipping — became one of the most recognized packaging designs in spirits. It's built with more punch than most entry blends: bold smoke up front, vanilla and citrus zest through the middle, and a warm, spicy finish. It's made for mixing into a highball rather than sipping neat, and it holds up to that job better than most whiskies at its price.",
    origin: 'Scotland',
    searchTerms: ['johnnie walker red', 'jw red', 'johnnie walker red label', 'red label scotch'],
  },
  {
    id: 'johnnie-walker-gold',
    name: 'Johnnie Walker Gold Label Reserve',
    brand: 'Johnnie Walker',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 68 },
      CAD: { min: 70, max: 85 },
      GBP: { min: 48, max: 60 },
    },
    flavorProfile: ['Honey', 'Vanilla', 'Cream', 'Dried Fruit'],
    tastingNotes:
      "Johnnie Walker Gold Label Reserve was created to celebrate the brand's 200th anniversary and sits above Black Label in the range, built around Clynelish as its signature malt along with other well-aged Speyside and Highland whiskies. Clynelish, on Scotland's northeast coast, is known for a waxy, honeyed character that gives this blend much of its richness. It pours creamy and full-bodied, with honey and vanilla pod up front, dried fruit and a touch of orchard sweetness through the middle, and a smooth, lingering finish with no rough edges. It's positioned as an everyday-luxury bottle — indulgent enough for a special pour without the price tag of the top-tier labels.",
    origin: 'Scotland',
    searchTerms: [
      'johnnie walker gold',
      'jw gold',
      'gold label reserve',
      'johnnie walker gold label',
    ],
  },
  {
    id: 'johnnie-walker-blue',
    name: 'Johnnie Walker Blue Label Blended Scotch',
    brand: 'Johnnie Walker',
    type: 'whiskey',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 180, max: 220 },
      CAD: { min: 225, max: 275 },
      GBP: { min: 155, max: 195 },
    },
    flavorProfile: ['Dark Fruit', 'Smoke', 'Spice', 'Honey', 'Velvet'],
    tastingNotes:
      "Johnnie Walker Blue Label carries no age statement because it doesn't need one — it's blended from a small pool of rare, exceptionally aged whiskies, some reportedly over 60 years old, selected from casks that master blenders judge to have reached peak character rather than a fixed number of years. Only around one in ten thousand casks in Diageo's stocks is deemed good enough to go into it, which is the whole premise of the label. It's extraordinarily smooth for something this intense — dark dried fruit and gentle wisps of smoke up front, warm honey and baking spice through the middle, finishing long and layered without a hint of harshness. The blue glass bottle and individually numbered label have made it one of the most gifted luxury spirits in the world.",
    origin: 'Scotland',
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      premiumScore: 96,
      recommendedModes: ['neat', 'large-rock'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: "At this price point, drink it neat. Adding mixers would mask the complexity you've paid for.",
      cocktailUse: 'best-neat',
    },
    searchTerms: [
      'johnnie walker blue',
      'jw blue',
      'blue label scotch',
      'johnnie walker blue label',
    ],
  },

  // -- Single Malts (popular additions) --
  {
    id: 'glenmorangie-10',
    name: 'Glenmorangie The Original 10 Year',
    brand: 'Glenmorangie',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 50, max: 62 },
      GBP: { min: 33, max: 42 },
    },
    flavorProfile: ['Citrus', 'Peach', 'Vanilla', 'Floral'],
    tastingNotes:
      "Glenmorangie distills entirely in ex-bourbon casks and runs the tallest stills in Scotland — over 16 feet — which forces only the lightest, most delicate vapors up and over, giving the spirit its signature floral, fruity character before it even touches wood. The distillery, on the Dornoch Firth in the Northern Highlands, also draws its water from a hard mineral spring called Tarlogie, which it credits as part of the house style. In the glass it's citrus blossom and fresh peach up front, creamy vanilla and a touch of honeyed malt through the middle, finishing soft and clean. It's one of Scotland's most approachable single malts, gentle enough for someone new to the category but still recognizably a single malt.",
    origin: 'Scotland',
    searchTerms: ['glenmorangie', 'glenmorangie original', 'glenmorangie 10', 'glen morangie'],
  },
  {
    id: 'highland-park-12',
    name: 'Highland Park 12 Year Viking Honour',
    brand: 'Highland Park',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 42, max: 52 },
      CAD: { min: 55, max: 68 },
      GBP: { min: 36, max: 46 },
    },
    flavorProfile: ['Heather Honey', 'Peat Smoke', 'Dried Fruit', 'Vanilla'],
    tastingNotes:
      "Highland Park distills on Orkney, Scotland's northernmost whisky distillery, and is one of the few left that still hand-turns its own malt on traditional floor maltings, peating it with heather-infused Orkney peat that burns cooler and sweeter than the peat used on Islay. Matured in a mix of sherry-seasoned European and American oak, the 12 Year strikes a genuine balance between Highland sweetness and Island smoke rather than leaning hard into either. It opens with heather honey and dried fruit, moves into gentle citrus and malt, and closes on just a whisper of peat smoke — restrained rather than aggressive. The Viking longship and warrior artwork on the label nods to Orkney's Norse history, which still runs deep in the islands' place names and culture.",
    origin: 'Scotland',
    searchTerms: [
      'highland park',
      'highland park 12',
      'viking honour',
      'orkney whisky',
      'highland park viking',
    ],
  },
  {
    id: 'oban-14',
    name: 'Oban 14 Year Single Malt Scotch',
    brand: 'Oban',
    type: 'whiskey',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 65, max: 80 },
      CAD: { min: 82, max: 100 },
      GBP: { min: 56, max: 70 },
    },
    flavorProfile: ['Sea Salt', 'Heather', 'Dried Fruit', 'Light Peat'],
    tastingNotes:
      "Oban's distillery sits wedged into the harbor town of the same name on Scotland's west coast, one of the smallest and oldest licensed distilleries in Scotland, predating the town that grew up around it. Its coastal position gives it a style that sits genuinely between Highland and Island whisky — not as smoky as an Islay malt, but with real maritime character absent from most inland Highland drams. Matured in ex-bourbon casks for 14 years, it opens with sea salt and heather, moves through dried fruit and orange peel, and finishes on a subtle wisp of coastal peat smoke. It's a small-batch whisky by necessity — Oban's stills are tiny and production is limited — which has made it a benchmark for balance and complexity at this age.",
    origin: 'Scotland',
    searchTerms: ['oban', 'oban 14', 'oban fourteen', 'west highland malt'],
  },
  {
    id: 'lagavulin-16',
    name: 'Lagavulin 16 Year Single Malt Scotch',
    brand: 'Lagavulin',
    type: 'whiskey',
    abv: 43,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 90, max: 115 },
      CAD: { min: 115, max: 145 },
      GBP: { min: 78, max: 100 },
    },
    flavorProfile: ['Intense Peat', 'Smoke', 'Seaweed', 'Dried Fruit', 'Oak'],
    tastingNotes:
      "Lagavulin sits on Islay's southern coast, using water drawn from a peaty loch and a slow, unusually long fermentation and distillation process — its stills run at a near-glacial pace compared to its Islay neighbors — which builds the depth this whisky is known for. It's peated to roughly the same level as Laphroaig and Ardbeg, but the 16 Year's extended maturation, largely in ex-bourbon casks, rounds the smoke into something richer rather than sharper. It opens with intense bonfire smoke and a maritime iodine note, then reveals real sweetness underneath — dried fruit, sherried richness, and dark chocolate — before a long, warm, resinous finish that doesn't let go. It's widely considered one of the defining expressions of what Islay whisky can be.",
    origin: 'Scotland',
    serveGuidance: {
      priority: 'serve-first',
      spiritFamily: 'scotch',
      premiumScore: 94,
      recommendedModes: ['neat', 'water-drops'],
      firstPour: 'neat',
      shouldDeprioritizeCocktails: true,
      why: 'Lagavulin is a meditating whisky. A few drops of water opens it up beautifully. Never dilute with ice.',
      cocktailUse: 'best-neat',
    },
    searchTerms: [
      'lagavulin 16',
      'lagavulin',
      'lagavulin sixteen',
      'islay peat whisky',
      'peated scotch',
    ],
  },
  {
    id: 'ardbeg-10',
    name: 'Ardbeg 10 Year Single Malt Scotch',
    brand: 'Ardbeg',
    type: 'whiskey',
    abv: 46,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 60 },
      CAD: { min: 62, max: 78 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Peat', 'Smoke', 'Lemon', 'Vanilla', 'Dark Chocolate'],
    tastingNotes:
      "Ardbeg is bottled non-chill filtered at 46% ABV, a higher strength and gentler filtration than most entry-level Islay malts, which the distillery credits with keeping more of the oily texture and flavor compounds intact. It's peated to one of the highest levels on Islay, matured mainly in ex-bourbon casks, and distilled at a distillery that nearly closed for good in the 1980s before Glenmorangie bought and revived it in the '90s. The smoke here is genuinely intense, but it's cut with real sweetness — lemon curd and citrus zest, vanilla, and dark chocolate running underneath the peat rather than being buried by it. The dark green bottle with Ardbeg's raven logo has become one of the most recognisable on the Islay shelf, and the whisky inside has a cult following to match.",
    origin: 'Scotland',
    searchTerms: ['ardbeg', 'ardbeg 10', 'ardbeg ten', 'ardbeg islay', 'peated islay'],
  },
  {
    id: 'talisker-10',
    name: 'Talisker 10 Year Single Malt Scotch',
    brand: 'Talisker',
    type: 'whiskey',
    abv: 45.8,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 60 },
      CAD: { min: 62, max: 78 },
      GBP: { min: 42, max: 52 },
    },
    flavorProfile: ['Smoke', 'Pepper', 'Sea Salt', 'Dried Fruit', 'Peat'],
    tastingNotes:
      "Talisker has been the Isle of Skye's only distillery since 1830, sitting right on the shore of Loch Harport with waves reportedly close enough to spray the warehouse walls, and its unusual lantern-shaped stills with an extra partial distillation step are part of what gives it such a distinctive character. Bottled at a robust 45.8% ABV and matured mainly in ex-bourbon casks, it delivers intense maritime character — sea spray and brine, billowing peat smoke, and a famous fierce black-pepper heat that builds through the finish. Robert Louis Stevenson, who grew up not far from here, once called it \"the king o' drinks\" in verse. It's long stood as the benchmark for what an Island malt should taste like.",
    origin: 'Scotland',
    searchTerms: ['talisker', 'talisker 10', 'talisker ten', 'skye whisky', 'isle of skye malt'],
  },

  // -- American Whiskey additions --
  {
    id: 'evan-williams-black',
    name: 'Evan Williams Black Label Kentucky Bourbon',
    brand: 'Evan Williams',
    type: 'whiskey',
    abv: 43,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 20, max: 27 },
      GBP: { min: 12, max: 18 },
    },
    flavorProfile: ['Caramel', 'Oak', 'Vanilla', 'Corn'],
    tastingNotes:
      "Evan Williams Black Label is produced by Heaven Hill, the largest independent family-owned distillery in the US, and named for one of Kentucky's earliest recorded distillers, who is said to have set up shop along the Ohio River in Louisville in the 1780s. What sets it apart from most bottles in its price range is age — Heaven Hill lets it rest around four to five years, longer than many comparable budget bourbons, which shows in the glass. It's built on a high-corn mash bill, giving it a sweet, grain-forward backbone, with caramel and vanilla up front and a clean, straightforward oak finish. For the price, it consistently overdelivers, which is why it's long been a bartender's go-to well bourbon.",
    origin: 'United States',
    searchTerms: [
      'evan williams',
      'evan williams black',
      'evan williams bourbon',
      'heaven hill bourbon',
    ],
  },
  {
    id: 'old-forester-86',
    name: 'Old Forester 86 Proof Kentucky Bourbon',
    brand: 'Old Forester',
    type: 'whiskey',
    abv: 43,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 19, max: 25 },
    },
    flavorProfile: ['Banana', 'Caramel', 'Spice', 'Oak'],
    tastingNotes:
      "Old Forester holds a genuine claim to history — George Garvin Brown began selling it pre-bottled in 1870, at a time when most whiskey was sold from the barrel and could be watered down or adulterated along the way, making this arguably America's first bottled bourbon brand. It's also one of the few bourbons that survived Prohibition legally, licensed to produce whiskey for medicinal use. The 86 Proof expression is made from Brown-Forman's standard high-rye mash bill, giving it a spicier backbone than wheated bourbons, with ripe banana and caramel sweetness up front and a warm, spicy rye finish. It's an old-school, no-frills bourbon that still overdelivers for the price, equally at home in a Manhattan or poured neat.",
    origin: 'United States',
    searchTerms: [
      'old forester',
      'old forester 86',
      'brown forman bourbon',
      'old forester bourbon',
    ],
  },
  {
    id: 'knob-creek-9',
    name: 'Knob Creek 9 Year Small Batch Bourbon',
    brand: 'Knob Creek',
    type: 'whiskey',
    abv: 50,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 50, max: 62 },
      GBP: { min: 33, max: 42 },
    },
    flavorProfile: ['Oak', 'Vanilla', 'Caramel', 'Rich Grain'],
    tastingNotes:
      "Knob Creek was one of the original four bottles in Jim Beam's Small Batch Bourbon Collection when it launched in the early '90s, part of the wave that helped kick off the modern small-batch bourbon movement. Named for the creek near Abraham Lincoln's boyhood home in Kentucky, it's aged a minimum of 9 years and bottled at a robust 100 proof, well above standard bourbon strength, which gives it real weight and grip. Expect heavy oak char, rich caramel, and vanilla up front, with a long, warm finish that carries real heat without turning harsh. It's built for bourbon drinkers who want something with more backbone than the standard Jim Beam white label.",
    origin: 'United States',
    searchTerms: ['knob creek', 'knob creek 9', 'knob creek bourbon', 'small batch bourbon'],
  },
  {
    id: 'elijah-craig-small-batch',
    name: 'Elijah Craig Small Batch Bourbon',
    brand: 'Elijah Craig',
    type: 'whiskey',
    abv: 47,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 40, max: 50 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Vanilla', 'Oak', 'Caramel', 'Mint', 'Toffee'],
    tastingNotes:
      "Elijah Craig is named for the Baptist minister and distiller who, according to popular Kentucky legend, was among the first to age corn whiskey in charred oak barrels — a story the bourbon industry loves even though the historical record behind it is thin. Made by Heaven Hill from a high-corn, low-rye mash bill and bottled with no age statement (though it's typically aged around 8 years), it delivers rich toffee and vanilla up front, a distinct minty lift through the middle, and a long, char-forward oak finish. It's consistently cited by bourbon drinkers as one of the best value-to-quality ratios in the category, punching well above its price point.",
    origin: 'United States',
    searchTerms: [
      'elijah craig',
      'elijah craig small batch',
      'ec small batch',
      'heaven hill bourbon',
      'elijah craig bourbon',
    ],
  },
  {
    id: 'angels-envy',
    name: "Angel's Envy Kentucky Straight Bourbon",
    brand: "Angel's Envy",
    type: 'whiskey',
    abv: 43.3,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 45, max: 55 },
      CAD: { min: 58, max: 72 },
      GBP: { min: 39, max: 49 },
    },
    flavorProfile: ['Port Wine', 'Vanilla', 'Dark Fruit', 'Maple'],
    tastingNotes:
      "Angel's Envy was founded by Lincoln Henderson, a longtime master distiller for Brown-Forman who helped create Woodford Reserve before starting his own family label, and it was one of the bottles that helped popularize wine-cask finishing in American whiskey. After traditional bourbon ageing, it spends several months finishing in ruby port wine barrels, a step that adds noticeable dark fruit and maple sweetness on top of the base bourbon's vanilla and caramel. The port influence comes through clearly on the nose and palate without overwhelming the underlying whiskey, finishing rich and slightly winey. The distinctive angel-wings emblem on the bottle has become one of the more recognisable marks in the modern craft-bourbon space.",
    origin: 'United States',
    searchTerms: ["angel's envy", 'angels envy', 'port finish bourbon', 'angels envy bourbon'],
  },
  {
    id: 'george-dickel-no12',
    name: 'George Dickel No. 12 Tennessee Whisky',
    brand: 'George Dickel',
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Corn', 'Vanilla', 'Caramel', 'Smooth'],
    tastingNotes:
      "George Dickel is one of only two Tennessee whiskies that legally carries the Lincoln County Process designation alongside Jack Daniel's, filtering the new-make spirit slowly through thick beds of sugar-maple charcoal before barreling — Dickel additionally chills the whiskey first, which the distillery says mellows it even further. Founded by George Dickel in the 1860s and spelling its product \"whisky\" in the Scottish style out of the founder's fondness for Scotch, it's a quieter, less marketed name than its famous neighbor despite similar production. It leans sweeter and rounder than Jack Daniel's, with soft corn and caramel up front, gentle vanilla through the middle, and a smooth finish with barely any burn. It's frequently cited by whiskey drinkers as one of the more underrated bottles on the Tennessee whiskey shelf.",
    origin: 'United States',
    searchTerms: ['george dickel', 'george dickel 12', 'dickel tennessee', 'tennessee whisky'],
  },
  {
    id: 'fireball',
    name: 'Fireball Cinnamon Whisky',
    brand: 'Fireball',
    type: 'liqueur',
    abv: 33,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 20, max: 27 },
      GBP: { min: 12, max: 17 },
    },
    flavorProfile: ['Cinnamon', 'Red Hot', 'Sweet', 'Whisky'],
    tastingNotes:
      "A Canadian whisky base flavored with cinnamon and sweeteners — the added flavoring and sugar are exactly why it's labeled a liqueur rather than a whisky under most regulations, despite the name. It made headlines in 2014 when several European countries pulled it from shelves over propylene glycol levels that exceeded EU limits, even though the same formulation was, and still is, fine under U.S. rules; the European version was later reformulated. The nose is straight cinnamon candy, the palate is hot with red-hot cinnamon heat cut by heavy sweetness and a faint whisky note underneath, and the finish is short and sugary. It is built entirely for shots, not sipping.",
    origin: 'Canada',
    searchTerms: ['fireball', 'fireball whisky', 'cinnamon whisky', 'fireball cinnamon'],
  },

  // -- Gin additions --
  {
    id: 'gordons-gin',
    name: "Gordon's Special Dry London Gin",
    brand: "Gordon's",
    type: 'gin',
    abv: 37.5,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 20, max: 27 },
      GBP: { min: 12, max: 17 },
    },
    flavorProfile: ['Juniper', 'Coriander', 'Angelica', 'Citrus'],
    tastingNotes:
      "Gordon's was founded in 1769 by Alexander Gordon in London and remains the best-selling gin in the world by volume, with a recipe kept so closely guarded that only a handful of people know it in full at any given time. The domestic UK bottling sits at 37.5% ABV, lower than the 'export strength' versions historically sold elsewhere, a split that traces back to shifts in UK duty and licensing rules decades ago. Juniper leads on the nose alongside coriander seed and citrus peel, with angelica adding a dry, earthy backbone through the palate, and the finish is crisp and clean without much sweetness.",
    origin: 'United Kingdom',
    searchTerms: [
      "gordon's gin",
      'gordons gin',
      'gordons london dry',
      'gordons special dry',
      'green gin bottle',
      'gordons',
      'london dry gin',
    ],
  },
  {
    id: 'whitley-neill-original',
    name: 'Whitley Neill Original Dry Gin',
    brand: 'Whitley Neill',
    type: 'gin',
    abv: 43,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 36, max: 46 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Juniper', 'Citrus', 'Baobab', 'Cape Gooseberry'],
    tastingNotes:
      "Whitley Neill was founded in 2005 by Johnny Neill, a descendant of the Greenall's gin-distilling family, who built the recipe around African botanicals he encountered while living in South Africa. Baobab fruit and Cape gooseberry sit alongside the classic juniper base, an unusual pairing that gives it a fruitier, more exotic profile than a standard London Dry. The nose leads with juniper and citrus before the baobab's tangy, slightly sour fruit character comes through, the palate carries Cape gooseberry's tart sweetness through the middle, and the finish is fruity and bright rather than dry and piney.",
    origin: 'United Kingdom',
    searchTerms: ['whitley neill', 'whitley neill original', 'whitley neill gin', 'baobab gin'],
  },
  {
    id: 'roku-gin',
    name: 'Roku Japanese Craft Gin',
    brand: 'Roku',
    type: 'gin',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 26, max: 33 },
    },
    flavorProfile: ['Sakura', 'Yuzu', 'Sencha Tea', 'Juniper', 'Floral'],
    tastingNotes:
      "Roku comes from Suntory's Osaka distillery and is built around six Japanese botanicals — sakura flower, sakura leaf, yuzu peel, sencha tea, gyokuro tea, and sansho pepper — each distilled separately using whichever method best preserves its character before the results are blended with a classic juniper-based gin. The nose is delicate and floral with cherry blossom and green tea, the palate layers yuzu citrus and a light peppery tingle from the sansho over a juniper backbone, and the finish is soft and lingering rather than dry. The hexagonal bottle, etched with motifs representing Japan's four seasons, is as considered as the liquid inside it.",
    origin: 'Japan',
    searchTerms: [
      'roku gin',
      'roku japanese gin',
      'roku',
      'japanese craft gin',
      'suntory roku',
      '六',
    ],
  },
  {
    id: 'tanqueray-sevilla',
    name: 'Tanqueray Flor de Sevilla Gin',
    brand: 'Tanqueray',
    type: 'gin',
    abv: 41.3,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 32 },
      CAD: { min: 32, max: 42 },
      GBP: { min: 20, max: 27 },
    },
    flavorProfile: ['Seville Orange', 'Juniper', 'Citrus Blossom', 'Bittersweet'],
    tastingNotes:
      "Tanqueray Flor de Sevilla takes the brand's classic London Dry base and adds Seville orange, the same bitter orange used in marmalade and in orange liqueurs like Grand Marnier, layered in alongside the original juniper, coriander, and angelica bill. The nose is bright with orange peel and citrus blossom, the palate balances juniper against a distinctly bittersweet orange character rather than straightforward sweetness, and the finish is zesty and lingering. It's built for an orange-garnished gin and tonic, but it also holds its own in a Negroni-style riff where the bitter citrus note has something to play against.",
    origin: 'United Kingdom',
    searchTerms: [
      'tanqueray sevilla',
      'tanqueray flor de sevilla',
      'orange tanqueray',
      'sevilla gin',
    ],
  },

  // -- Vodka additions --
  {
    id: 'svedka',
    name: 'Svedka Vodka',
    brand: 'Svedka',
    type: 'vodka',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 11, max: 16 },
    },
    flavorProfile: ['Clean', 'Grain', 'Neutral', 'Smooth'],
    tastingNotes:
      "Distilled five times from Swedish winter wheat and cut with glacial spring water, aiming squarely at the same clean-and-neutral lane as its higher-priced Swedish neighbors while undercutting them on price. Svedka is better known for its marketing than its liquid: since 2005 it's built its identity around a sultry robot mascot that promotes the brand as coming 'from the future,' one of the more unusual long-running gimmicks in vodka advertising. It's built for volume — one of the best-selling vodkas in North America — and the profile reflects that: straightforward grain character, minimal aroma, a smooth mouthfeel with almost no burn, and a short, clean finish. Nothing to dissect, but reliably consistent bottle to bottle, which is the whole job for a mixing vodka at this tier.",
    origin: 'Sweden',
    searchTerms: ['svedka', 'svedka vodka', 'swedish vodka'],
  },
  {
    id: 'new-amsterdam',
    name: 'New Amsterdam Vodka',
    brand: 'New Amsterdam',
    type: 'vodka',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 11, max: 16 },
    },
    flavorProfile: ['Clean', 'Smooth', 'Light Grain', 'Neutral'],
    tastingNotes:
      "A grain-based vodka distilled five times and filtered three times, a heavier processing regimen than most bottles at its price point typically bother with. The name borrows New York City's original Dutch name — the city was called New Amsterdam until the English took control in 1664 — as a nod to the brand's New York roots. That extra filtration shows up as a genuinely smooth, low-burn character with light grain sweetness and a clean, neutral core — closer to mid-range vodkas than the budget shelf it's priced on. It's grown into one of the fastest-expanding vodka brands in the US largely on that value gap between price and polish.",
    origin: 'United States',
    searchTerms: ['new amsterdam', 'new amsterdam vodka', 'new amsterdam spirits'],
  },
  {
    id: 'pinnacle-vodka',
    name: 'Pinnacle Vodka',
    brand: 'Pinnacle',
    type: 'vodka',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 12, max: 18 },
      CAD: { min: 18, max: 24 },
      GBP: { min: 11, max: 16 },
    },
    flavorProfile: ['Clean', 'Smooth', 'Wheat', 'Neutral'],
    tastingNotes:
      'A French wheat vodka that borrows the same base grain and general production style as pricier Cognac-region vodkas, but bottled and marketed at a budget price point. Soft, clean wheat character with minimal grain harshness, a smooth mouthfeel, and a neutral finish — unremarkable in the best sense for a mixing vodka. It became one of the most popular value vodkas in the US largely on the strength of its long-running flavored-vodka lineup built on this same clean base.',
    origin: 'France',
    searchTerms: ['pinnacle', 'pinnacle vodka', 'pinnacle french vodka'],
  },
  {
    id: 'three-olives',
    name: 'Three Olives Vodka',
    brand: 'Three Olives',
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Clean', 'Slightly Sweet', 'Grain', 'Smooth'],
    tastingNotes:
      "An English grain vodka, quadruple-distilled, that leans noticeably sweeter than the typically bone-dry British vodka style — a deliberate choice that made it a natural base for the brand's wide range of flavored expressions, which have run to the genuinely odd, including a short-lived 'Dude' flavor engineered to taste like Mountain Dew and a Marilyn Monroe-branded strawberries-and-cream edition made in partnership with her estate. Clean grain character up front, a rounder, slightly sugared mid-palate, and a very smooth, easy finish with little burn. It reads best as an accessible, crowd-pleasing mixing vodka rather than a sipping spirit.",
    origin: 'United Kingdom',
    searchTerms: ['three olives', 'three olives vodka', '3 olives vodka'],
  },
  {
    id: 'wheatley-vodka',
    name: 'Wheatley Craft Vodka',
    brand: 'Wheatley',
    type: 'vodka',
    abv: 41,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 26 },
      CAD: { min: 27, max: 35 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Wheat', 'Clean', 'Light Citrus', 'Smooth'],
    tastingNotes:
      'Made at Buffalo Trace — a distillery better known for bourbon — by testing ten different recipes across different yeast strains and distillation approaches before landing on the final wheat-based formula, then named for master distiller Harlen Wheatley. That bourbon-distillery pedigree shows in the texture: a genuinely wheat-forward vodka with more body than most, clean grain character, a faint citrus lift, and a smooth, rounded finish. Widely regarded as punching well above its price point.',
    origin: 'United States',
    searchTerms: ['wheatley', 'wheatley vodka', 'buffalo trace vodka', 'wheatley craft'],
  },

  // -- Rum additions --
  {
    id: 'malibu',
    name: 'Malibu Original Caribbean Rum',
    brand: 'Malibu',
    type: 'rum',
    abv: 21,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Coconut', 'Sweet', 'Vanilla', 'Light Rum'],
    tastingNotes:
      'A light Caribbean rum base blended with coconut extract and sugar rather than aged for character — Malibu is a coconut liqueur built on a rum backbone more than a traditional sipping rum, which is why its ABV sits well below standard rum strength. Launched in Barbados in the 1980s, it rode the tiki and piña colada boom to become one of the most recognizable liqueur bottles in bars worldwide. The nose is straight coconut and vanilla, the palate is sweet and creamy with almost no rum bite, and the finish is short and candy-like. It exists to make a piña colada or a beach cocktail taste like a beach cocktail, nothing more complicated than that.',
    origin: 'Caribbean',
    searchTerms: ['malibu', 'malibu rum', 'malibu coconut', 'coconut rum', 'malibu caribbean'],
  },
  {
    id: 'sailor-jerry',
    name: 'Sailor Jerry Spiced Rum',
    brand: 'Sailor Jerry',
    type: 'rum',
    abv: 46,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 26 },
      CAD: { min: 25, max: 34 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Vanilla', 'Cinnamon', 'Nutmeg', 'Caramel', 'Spice'],
    tastingNotes:
      'A Caribbean rum blend steeped with vanilla, cinnamon, nutmeg, and other spices, bottled at 46% ABV — noticeably higher than most spiced rums, which gives it more bite and less reliance on sugar to carry flavor. It takes its name and artwork from Norman "Sailor Jerry" Collins, the Honolulu tattoo artist credited with pioneering American traditional tattooing, and the brand licenses his flash art directly for its labeling. The nose is bold with vanilla and cinnamon, the palate brings warm nutmeg and caramel over a firmer rum backbone than most spiced competitors, and the finish carries real heat and spice. It holds up better in stronger cocktails like a spiced rum old fashioned than lighter spiced rums can.',
    origin: 'Caribbean',
    searchTerms: [
      'sailor jerry',
      'sailor jerry rum',
      'sailor jerry spiced',
      'spiced rum sailor',
      'tattoo rum',
    ],
  },
  {
    id: 'goslings-black-seal',
    name: "Gosling's Black Seal Dark Rum",
    brand: "Gosling's",
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 27, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Molasses', 'Dark Fruit', 'Vanilla', 'Toffee'],
    tastingNotes:
      "A blend of Caribbean pot- and column-still rums, deeply colored and rounded out with caramel, sold under the Gosling's name that has been importing and blending rum in Bermuda since the early 1800s. Gosling's trademarked the term \"Dark 'N Stormy\" and still insists, not without justification, that the cocktail isn't authentic without their rum in it. The nose is heavy with molasses and dark dried fruit, the palate brings toffee and vanilla over a firm, slightly rummy backbone, and the finish is warm with lingering caramel. It has enough weight to stand up to ginger beer without disappearing.",
    origin: 'Bermuda',
    searchTerms: [
      "gosling's",
      'goslings black seal',
      'goslings dark rum',
      'bermuda rum',
      'dark n stormy rum',
    ],
  },
  {
    id: 'myers-dark-rum',
    name: "Myers's Original Dark Rum",
    brand: "Myers's",
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 27, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Dark Fruit', 'Molasses', 'Caramel', 'Spice'],
    tastingNotes:
      "A blend of up to nine Jamaican pot- and column-still rums, aged as long as four years and married together for a consistently full-bodied, dark profile. Fred L. Myers began blending rum in Jamaica in the 1870s, and the brand's heavy, funky style became a foundational building block of tiki cocktails when the category took off in the mid-20th century. The nose is rich with dark fruit and molasses, the palate carries caramel and warm spice over a solid rum backbone with a hint of Jamaican funk, and the finish is full and lingering. It is a workhorse in mai tais and other tiki drinks that need weight rather than subtlety.",
    origin: 'Jamaica',
    searchTerms: ["myers's rum", 'myers dark rum', 'myers original rum', 'jamaican dark rum'],
  },
  {
    id: 'appleton-signature',
    name: 'Appleton Estate Signature Blend Rum',
    brand: 'Appleton Estate',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Orange Peel', 'Vanilla', 'Molasses', 'Warm Spice'],
    tastingNotes:
      "A blend of pot- and column-still rums, all distilled and aged on the Appleton Estate in Jamaica's Nassau Valley, one of the island's oldest continuously operating sugar estates, with roots stretching back to the 1700s. The distillery has been led since the 1990s by Joy Spence, the first woman to hold the title of Master Blender anywhere in the spirits industry, and her signature style favors balance over raw funk. The nose brings orange peel and vanilla, the palate layers molasses and warm baking spice over a smooth, moderately funky Jamaican base, and the finish is long and gently spiced. It works equally well in a rum punch or sipped over ice.",
    origin: 'Jamaica',
    searchTerms: ['appleton estate', 'appleton rum', 'appleton signature', 'jamaican rum estate'],
  },
  {
    id: 'ron-barcelo',
    name: 'Ron Barceló Imperial Dominican Rum',
    brand: 'Ron Barceló',
    type: 'rum',
    abv: 38,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Vanilla', 'Caramel', 'Oak', 'Dark Fruit'],
    tastingNotes:
      "Molasses-based rum aged 6 to 10 years in American white oak barrels that previously held bourbon, blended and bottled at a lower-than-typical 38% ABV that keeps the profile soft. Barceló has produced rum in Santo Domingo since 1930 and remains the Dominican Republic's best-selling rum domestically while expanding steadily into export markets. The nose is rich with vanilla and caramel, the palate brings toasted oak and dark dried fruit over a smooth, gentle body, and the finish is medium-length and mellow rather than assertive. Its lower proof and easy sweetness make it approachable neat or on ice.",
    origin: 'Dominican Republic',
    searchTerms: ['ron barcelo', 'barcelo imperial', 'barcelo rum', 'dominican rum'],
  },

  // -- Tequila additions --
  {
    id: 'el-jimador-blanco',
    name: 'El Jimador Blanco Tequila',
    brand: 'El Jimador',
    type: 'tequila',
    abv: 40,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Pepper', 'Herbal'],
    tastingNotes:
      "El Jimador is Mexico's best-selling tequila domestically, produced by the Herradura family using 100% blue agave despite its budget price point — a rarity in this tier, where mixto blends are far more common. Bright agave and citrus lead the nose, a peppery kick and light herbal note carry through the palate, and the finish is clean and fairly short. It's an unusually solid value pour, distilled at the same Amatitán, Jalisco facility that produces Herradura's more premium range.",
    origin: 'Mexico',
    searchTerms: ['el jimador', 'el jimador blanco', 'jimador tequila', 'el jimador tequila'],
  },
  {
    id: 'hornitos-plata',
    name: 'Hornitos Plata Tequila',
    brand: 'Hornitos',
    type: 'tequila',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Light Pepper', 'Herbal'],
    tastingNotes:
      "Hornitos Plata is 100% blue agave, part of the Sauza family of tequilas now under Beam Suntory ownership, rested only briefly before bottling to keep the agave character upfront. The name translates to 'little ovens,' a nod to the traditional brick ovens historically used to slow-roast the agave before fermentation. Fresh agave and citrus dominate the nose, a light pepper kick and clean herbal note round out the palate, and the finish is crisp and short. It's consistently reliable for the price, distilled in Jalisco using traditional Sauza production methods refined over generations.",
    origin: 'Mexico',
    searchTerms: ['hornitos', 'hornitos plata', 'hornitos tequila', 'hornitos blanco'],
  },
  {
    id: '1800-silver',
    name: '1800 Silver Tequila',
    brand: '1800',
    type: 'tequila',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Vanilla', 'Light Pepper'],
    tastingNotes:
      '1800 Silver is 100% blue agave, double-distilled and briefly rested in French oak before bottling — an unusual touch of wood for a tequila marketed as a blanco/silver expression. That short oak contact softens the raw agave edge just slightly, giving fresh agave and citrus a light vanilla lift through the finish alongside a mild pepper kick. The name references 1800, the year tequila is said to have first been aged in oak barrels, and the trapezoidal bottle remains one of the more recognizable shapes in the mid-range tequila aisle.',
    origin: 'Mexico',
    searchTerms: ['1800 tequila', '1800 silver', '1800 blanco', 'eighteen hundred tequila'],
  },
  {
    id: 'espolon-reposado',
    name: 'Espòlón Reposado Tequila',
    brand: 'Espòlón',
    type: 'tequila',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 32 },
      CAD: { min: 32, max: 42 },
      GBP: { min: 21, max: 28 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Oak', 'Caramel'],
    tastingNotes:
      "Espòlón Reposado ages a minimum of eight months in new American oak barrels, giving it noticeably more wood character than a lot of tequilas at this price point. Smooth agave sits under real vanilla and caramel, with the new-oak treatment — rather than used bourbon barrels — contributing a slightly more assertive char and spice than you'd get from re-used wood. The folk-art sugar skull label is one of the more recognizable in the tequila aisle, and the reposado holds up well both neat and in an Old Fashioned-style tequila cocktail.",
    origin: 'Mexico',
    searchTerms: ['espolon reposado', 'espolon tequila reposado', 'espolon repo'],
  },

  // -- Liqueur additions --
  {
    id: 'southern-comfort',
    name: 'Southern Comfort Original',
    brand: 'Southern Comfort',
    type: 'liqueur',
    abv: 35,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 24, max: 32 },
      GBP: { min: 16, max: 22 },
    },
    flavorProfile: ['Peach', 'Vanilla', 'Whisky', 'Orange', 'Cinnamon'],
    tastingNotes:
      'A neutral or whisky-based spirit flavored with peach, vanilla, orange, and cinnamon, first mixed by a New Orleans bartender in 1874 and still built around a recipe the brand keeps proprietary. Its exact spirit base has shifted over the decades and remains a point of debate among drinkers, but the fruit-and-spice profile has stayed consistent. The nose is sweet with ripe peach and vanilla, the palate brings warm cinnamon and orange over a soft, low-burn base, and the finish is smooth and sugary. It leans more liqueur than whiskey despite the branding, and works best in sweeter tiki-adjacent or bourbon-based cocktails.',
    origin: 'United States',
    searchTerms: [
      'southern comfort',
      'soco',
      'southern comfort original',
      'socom',
      'southern comfort whiskey',
    ],
  },
  {
    id: 'peach-schnapps-archers',
    name: 'Archers Peach Schnapps',
    brand: 'Archers',
    type: 'liqueur',
    abv: 18,
    priceTier: 'budget',
    priceEstimate: {
      USD: { min: 14, max: 20 },
      CAD: { min: 19, max: 26 },
      GBP: { min: 12, max: 17 },
    },
    flavorProfile: ['Peach', 'Sweet', 'Fruity', 'Light'],
    tastingNotes:
      'A neutral grain spirit flavored and sweetened with peach, launched in the UK in the 1980s and widely credited as the bottle that popularized peach schnapps as a category rather than a niche German-style spirit. Its low proof and straightforward sweetness made it a fixture of British pub back bars, largely used as a mixer rather than sipped alone. The nose is bright, artificial-leaning peach, the palate is sweet and light with little alcohol heat, and the finish is short and syrupy. It exists almost entirely to build a Sex on the Beach or a fuzzy navel.',
    origin: 'United Kingdom',
    searchTerms: [
      'archers',
      'archers peach',
      'peach schnapps',
      'archers schnapps',
      'peach liqueur',
    ],
  },
  {
    id: 'pimms-no1',
    name: "Pimm's No.1 Cup",
    brand: "Pimm's",
    type: 'liqueur',
    abv: 25,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 26 },
      CAD: { min: 24, max: 34 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Citrus', 'Herbs', 'Spice', 'Bitter Orange'],
    tastingNotes:
      "A gin base infused with a secret blend of herbs, spices, and bitter orange, a recipe James Pimm developed as a digestive tonic for his London oyster bar in 1823 before it grew into a standalone drink. Its exact formula remains proprietary, and while the current gin base is public knowledge, the botanical blend that gives it its fruit-cup character is not. The nose is citrus-forward with herbal undertones, the palate is light and gently spiced with bitter orange peel, and the finish is short and refreshing rather than boozy. Traditionally stretched with lemonade, cucumber, mint, and fruit, it's built to be a mixer rather than a spirit to drink straight.",
    origin: 'United Kingdom',
    searchTerms: [
      "pimm's",
      'pimms',
      'pimms no1',
      "pimm's no 1",
      'pimms cup',
      'british summer drink',
    ],
  },
  {
    id: 'sambuca-molinari',
    name: 'Molinari Extra Sambuca',
    brand: 'Molinari',
    type: 'liqueur',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Anise', 'Liquorice', 'Sweet', 'Elderflower'],
    tastingNotes:
      "A distillation of star anise and elderflower blended into a neutral spirit and heavily sweetened, produced in Civitavecchia since 1945 by the family-owned Molinari distillery, which remains the category benchmark and the world's best-selling sambuca. The style is Roman in origin, distinct from other Italian anise liqueurs by its higher sugar content and near-syrupy body. The nose is intensely anise and licorice, the palate is sweet and warming with floral elderflower underneath, and the finish is long and sweet. It is traditionally served con la mosca, with three coffee beans floated on top representing health, happiness, and prosperity, or set alight briefly as a flaming shot.",
    origin: 'Italy',
    searchTerms: [
      'sambuca',
      'molinari sambuca',
      'molinari extra',
      'italian sambuca',
      'anise liqueur',
    ],
  },
  {
    id: 'limoncello-pallini',
    name: 'Pallini Limoncello',
    brand: 'Pallini',
    type: 'liqueur',
    abv: 26,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 27, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Lemon Zest', 'Sweet', 'Citrus', 'Creamy'],
    tastingNotes:
      "Made by steeping the zest of Sfusato Amalfitano lemons — a variety grown on terraced groves along the Amalfi Coast and prized for its thick, intensely aromatic peel — in neutral spirit, then blending the infusion with a sugar syrup rather than distilling it. Pallini has produced it since the 1990s and helped push limoncello from a regional Southern Italian digestivo into an internationally recognized category. The nose is bright, fresh lemon zest, the palate is sweet and full-bodied with a faintly oily, almost creamy texture from the zest oils, and the finish is clean and citrusy. It's meant to be served ice-cold, straight from the freezer, as a digestif.",
    origin: 'Italy',
    searchTerms: ['limoncello', 'pallini limoncello', 'lemon liqueur', 'italian limoncello'],
  },
  {
    id: 'rumchata',
    name: 'RumChata Cream Liqueur',
    brand: 'RumChata',
    type: 'liqueur',
    abv: 13.75,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 30, max: 40 },
      GBP: { min: 19, max: 26 },
    },
    flavorProfile: ['Cream', 'Cinnamon', 'Vanilla', 'Rice'],
    tastingNotes:
      'Caribbean rum blended with real dairy cream, cinnamon, vanilla, and sugar, modeled on horchata, the rice-and-cinnamon drink common across Latin America and Spain — a novel combination when it launched in Wisconsin in 2009 that carved out its own niche distinct from Irish cream liqueurs. The rum base gives it a different backbone than whiskey-based cream liqueurs like Baileys, leaning sweeter and spicier rather than toward cocoa. The nose is heavy with cinnamon and vanilla, the palate is thick and creamy with a rice-like sweetness underneath, and the finish is long and warmly spiced. It works over ice, in coffee, or in a horchata-inspired cocktail.',
    origin: 'United States',
    searchTerms: [
      'rumchata',
      'rum chata',
      'horchata rum',
      'cinnamon cream liqueur',
      'rumchata cream',
    ],
  },
  {
    id: 'licor-43',
    name: 'Licor 43 Original',
    brand: 'Licor 43',
    type: 'liqueur',
    abv: 31,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 27, max: 36 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Vanilla', 'Citrus', 'Herbs', 'Spice'],
    tastingNotes:
      "A maceration and blend of 43 ingredients, including citrus peels, vanilla, and assorted herbs and spices, built on a recipe the brand traces back to a Roman-era drink called Liqueur Cuarenta y Tres, first commercially bottled in Cartagena, Spain, in the 1940s. Vanilla dominates the finished blend more than any single citrus or spice note, giving it a rounder, dessert-like profile than most herbal liqueurs. The nose is sweet vanilla with bright citrus underneath, the palate carries warm baking spice and herbal complexity without heavy bitterness, and the finish is smooth and lingering. It's the defining ingredient in a carajillo, mixed with espresso, and also works well over ice or in coffee.",
    origin: 'Spain',
    searchTerms: [
      'licor 43',
      'cuarenta y tres',
      '43 liqueur',
      'spanish liqueur',
      'licor cuarenta tres',
    ],
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
    (spirit) => spirit.id === lowerQuery || spirit.name.toLowerCase() === lowerQuery,
  );

  if (match) return match;

  // Search in search terms
  match = SPIRITS_DATABASE.find((spirit) =>
    spirit.searchTerms.some((term) => term.includes(lowerQuery) || lowerQuery.includes(term)),
  );

  if (match) return match;

  // Partial brand match
  match = SPIRITS_DATABASE.find(
    (spirit) =>
      spirit.brand.toLowerCase().includes(lowerQuery) ||
      lowerQuery.includes(spirit.brand.toLowerCase()),
  );

  return match || null;
}

/**
 * Get all spirits of a specific type
 */
export function getSpiritsByType(type: SpiritType): Spirit[] {
  return SPIRITS_DATABASE.filter((spirit) => spirit.type === type);
}

/**
 * Get spirits by price tier
 */
export function getSpiritsByPriceTier(tier: PriceTier): Spirit[] {
  return SPIRITS_DATABASE.filter((spirit) => spirit.priceTier === tier);
}

/**
 * Get price tier display text
 */
export function getPriceTierDisplay(tier: PriceTier): string {
  const tiers: Record<PriceTier, string> = {
    budget: 'Budget',
    'mid-range': 'Mid-Range',
    premium: 'Premium',
    'ultra-premium': 'Ultra-Premium',
  };
  return tiers[tier];
}

export const SPIRITS_DATABASE: Spirit[] = [...SPIRITS_DATABASE_CORE, ...SPIRITS_DATABASE_EXTRA];
