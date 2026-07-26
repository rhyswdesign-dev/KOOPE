/**
 * SPIRITS DATABASE — EXTENDED ENTRIES
 *
 * Supplements spiritsDatabase.ts. Same Spirit schema.
 * Organised by category, then by scan-frequency priority within each category.
 *
 * All price estimates are approximate USD/CAD/GBP retail for a standard 750ml.
 */

import type { Spirit } from './spiritsDatabase';

export const SPIRITS_DATABASE_EXTRA: Spirit[] = [
  // ─── BOURBON / AMERICAN WHISKEY ────────────────────────────────────────────

  {
    id: 'basil-haydens',
    name: "Basil Hayden's Bourbon",
    brand: "Basil Hayden's",
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 52, max: 62 },
      GBP: { min: 34, max: 42 },
    },
    flavorProfile: ['Spice', 'Dried Fruit', 'Light Caramel', 'Black Pepper'],
    tastingNotes:
      "Made at Jim Beam's distillery and named for the 19th-century distiller credited with popularizing bourbon among Kentucky's elite, Basil Hayden's uses the Beam family mash bill with a higher rye percentage than its siblings, then bottles at a lower, more restrained 80 proof. That gentler proof makes the rye spice, black pepper, and dried fruit read as bright rather than hot, with a light caramel sweetness underneath. It's the softest-spoken bourbon in the Small Batch Collection — built for sipping neat or building a cocktail without dominating it.",
    origin: 'United States',
    searchTerms: ['basil hayden', 'basil haydens', "basil hayden's"],
  },
  {
    id: 'eagle-rare-10yr',
    name: 'Eagle Rare 10 Year Bourbon',
    brand: 'Eagle Rare',
    type: 'whiskey',
    abv: 45,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 55 },
      CAD: { min: 55, max: 70 },
      GBP: { min: 34, max: 48 },
    },
    flavorProfile: ['Toffee', 'Oak', 'Floral', 'Vanilla'],
    tastingNotes:
      "Single barrel bourbon, hand-selected from Buffalo Trace's warehouses and aged a minimum of 10 years — long enough in Kentucky's climate to pull deep color and oak character without tipping into over-oaked bitterness. Each barrel is chosen individually, so there's some bottle-to-bottle variation, but the house signature holds: toffee, dried herbs, honey, and a faint anise note carried by the mash bill Buffalo Trace shares with several of its other labels. The finish is long, dry, and toasty. It's often cited as one of the best value arguments in aged bourbon, sitting well below what its age statement would normally command.",
    origin: 'United States',
    searchTerms: ['eagle rare', 'eagle rare 10', 'buffalo trace eagle'],
  },
  {
    id: 'blantons-original',
    name: "Blanton's Original Single Barrel",
    brand: "Blanton's",
    type: 'whiskey',
    abv: 46.5,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 65, max: 100 },
      CAD: { min: 90, max: 130 },
      GBP: { min: 55, max: 90 },
    },
    flavorProfile: ['Citrus', 'Caramel', 'Oak', 'Honey'],
    tastingNotes:
      "Released in 1984, Blanton's is widely credited as the first modern single barrel bourbon put on the market, and it set the template every premium single-barrel release since has followed. Bottled at a slightly higher proof than most Buffalo Trace products, it carries honey, orange citrus, and caramel corn sweetness over a backbone of oak tannin and a faint nutty spice. Because each bottle comes from one barrel rather than a blend, the profile shifts subtly release to release, but the sweet-and-oaky core stays consistent. The horse-and-jockey stopper, one of eight in a set spelling out the distillery's name, has become as much a collector's fixation as the whiskey itself.",
    origin: 'United States',
    searchTerms: ['blantons', "blanton's", 'blanton', 'single barrel bourbon'],
  },
  {
    id: 'weller-special-reserve',
    name: 'W.L. Weller Special Reserve',
    brand: 'W.L. Weller',
    type: 'whiskey',
    abv: 45,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 25, max: 60 },
      CAD: { min: 40, max: 80 },
      GBP: { min: 25, max: 55 },
    },
    flavorProfile: ['Wheat', 'Vanilla', 'Caramel', 'Light Spice'],
    tastingNotes:
      "A wheated bourbon from Buffalo Trace, meaning wheat stands in for rye as the secondary grain in the mash bill — the same recipe family that produces Pappy Van Winkle, which is why Weller Special Reserve earned its nickname as the accessible way into that style. Wheat brings a softer, rounder sweetness than rye's spice, so expect vanilla, caramel, and baked bread notes with a gentle, easy finish rather than a peppery bite. At 90 proof it's the lightest and least expensive of the Weller line, built for everyday sipping rather than special-occasion hunting.",
    origin: 'United States',
    searchTerms: ['weller', 'wl weller', 'w.l. weller', 'wheated bourbon'],
  },
  {
    id: 'bourbon-1792-small-batch',
    name: '1792 Small Batch Bourbon',
    brand: '1792',
    type: 'whiskey',
    abv: 46.85,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 40, max: 50 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Spice', 'Caramel', 'Oak', 'Vanilla'],
    tastingNotes:
      "Distilled at the Barton 1792 Distillery in Bardstown — the self-declared 'Bourbon Capital of the World' — this small batch bourbon leans on a high-rye mash bill that pushes it toward the spicier end of the category. Cracked black pepper and clove sit up front, backed by caramel, vanilla, and a good hit of toasted oak from the barrel char. The name references 1792, the year Kentucky achieved statehood, and the oddly specific 46.85% ABV is a bit of brand signature in itself. It holds its structure well in cocktails but has enough going on to reward drinking neat.",
    origin: 'United States',
    searchTerms: ['1792', '1792 bourbon', 'barton bourbon'],
  },

  // ─── SCOTCH WHISKY ─────────────────────────────────────────────────────────

  {
    id: 'glenfarclas-12',
    name: 'Glenfarclas 12 Year',
    brand: 'Glenfarclas',
    type: 'whiskey',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 46, max: 56 },
      CAD: { min: 62, max: 74 },
      GBP: { min: 38, max: 48 },
    },
    flavorProfile: ['Sherry', 'Dried Fruit', 'Oak', 'Spice'],
    tastingNotes:
      "Glenfarclas has stayed in the Grant family's hands since 1865, one of a small handful of Speyside distilleries never to have been swallowed by a conglomerate, and that independence shows in how unfashionably generous the 12 Year is for its price. Matured entirely in sherry casks rather than the usual bourbon-cask-plus-finish approach, it comes out dark, rich, and full-bodied — Christmas cake, dried fruit, and toffee wrapped in oak tannin and a warming clove-and-cinnamon spice. It's a bigger, more old-fashioned style of Speyside than the softer, more floral malts the region is often known for.",
    origin: 'Scotland',
    searchTerms: ['glenfarclas', 'glenfarclas 12'],
  },
  {
    id: 'bowmore-12',
    name: 'Bowmore 12 Year',
    brand: 'Bowmore',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 44, max: 54 },
      CAD: { min: 60, max: 72 },
      GBP: { min: 36, max: 46 },
    },
    flavorProfile: ['Peat', 'Floral', 'Dark Chocolate', 'Sea Brine'],
    tastingNotes:
      "Founded in 1779, Bowmore is Islay's oldest working distillery, and its waterfront warehouses on Loch Indaal age casks in cellars that dip below sea level, letting the ocean air work directly on the whisky as it matures. The result is a medium-peated style that's smokier than Speyside but noticeably gentler than the coastal powerhouses further down the island — dark chocolate and sea brine over a distinctive floral, almost perfumed note that cuts through the smoke. It's often poured as a first step into Islay whisky for people who assume all peat tastes like a bonfire.",
    origin: 'Scotland',
    searchTerms: ['bowmore', 'bowmore 12', 'islay bowmore'],
  },

  // ─── IRISH WHISKEY ─────────────────────────────────────────────────────────

  {
    id: 'bushmills-original',
    name: 'Bushmills Original',
    brand: 'Bushmills',
    type: 'whiskey',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Honey', 'Vanilla', 'Light Fruit', 'Malt'],
    tastingNotes:
      "Bushmills holds a license to distill dating back to 1608, making it one of the oldest licensed whiskey distilleries anywhere, and Bushmills Original is its everyday blend — malt whiskey combined with grain whiskey, both triple-distilled in the traditional Irish style for extra smoothness. That triple distillation strips out a lot of the heavier, oilier notes, leaving honey, vanilla, and fresh orchard fruit with barely any burn. It's built to be easy rather than complex, which is exactly the point — a low-commitment, mixable everyday Irish whiskey rather than a sipping showpiece.",
    origin: 'Ireland',
    searchTerms: ['bushmills', 'old bushmills'],
  },
  {
    id: 'teeling-small-batch',
    name: 'Teeling Small Batch Irish Whiskey',
    brand: 'Teeling',
    type: 'whiskey',
    abv: 46,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 36, max: 44 },
      CAD: { min: 50, max: 60 },
      GBP: { min: 30, max: 38 },
    },
    flavorProfile: ['Vanilla', 'Spice', 'Tropical Fruit', 'Rum'],
    tastingNotes:
      "Teeling opened in Dublin's Liberties district in 2015, the city's first new distillery in well over a century, founded by a family with a long history in Irish whiskey. The Small Batch blend spends its final months finishing in ex-rum casks sourced from Central America, and that finish is what sets it apart — the base whiskey's vanilla and grain sweetness picks up tropical fruit and a molasses-like rum richness that most Irish blends don't have. It's soft enough to sip neat but has enough going on to hold up in a whiskey sour or highball.",
    origin: 'Ireland',
    searchTerms: ['teeling', 'teeling small batch', 'dublin whiskey'],
  },
  {
    id: 'green-spot',
    name: 'Green Spot Single Pot Still Irish Whiskey',
    brand: 'Green Spot',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 50, max: 62 },
      CAD: { min: 68, max: 80 },
      GBP: { min: 42, max: 54 },
    },
    flavorProfile: ['Green Apple', 'Spice', 'Toasted Oak', 'Honey'],
    tastingNotes:
      "Single pot still is the whiskey style Ireland can claim as genuinely its own — made from a mash of both malted and unmalted barley, pot-distilled, which gives it a spicier, oilier texture than a single malt. Green Spot's recipe traces back to Mitchell & Son, a Dublin wine and whiskey merchant that has been sourcing and bottling casks since the 19th century, historically 'spotting' barrels with paint to track their age in the merchant's own bonded warehouse. Expect green apple and orchard fruit up front, spicy raw grain in the middle, and toasted oak from a mix of bourbon and sherry cask maturation on the finish. It's a benchmark for the pot still category at a fair price.",
    origin: 'Ireland',
    searchTerms: ['green spot', 'single pot still', 'irish pot still'],
  },
  {
    id: 'connemara-peated',
    name: 'Connemara Peated Single Malt',
    brand: 'Connemara',
    type: 'whiskey',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 36, max: 44 },
      CAD: { min: 50, max: 60 },
      GBP: { min: 30, max: 38 },
    },
    flavorProfile: ['Peat', 'Honey', 'Vanilla', 'Citrus'],
    tastingNotes:
      "Connemara is one of the very few peated Irish whiskeys on the market, a style that's historically been Scotland's territory, and it stands out for combining that peat smoke with the triple distillation Ireland is known for — a combination almost nobody else does. It comes from Cooley, the distillery John Teeling founded in 1987 inside a defunct state-owned industrial alcohol plant, whose revival is largely credited with bringing peated whiskey back to Ireland after decades away. The extra distillation run rounds off the smoke considerably, so instead of the coastal, medicinal intensity of an Islay Scotch, you get a softer, sweeter smokiness balanced by honey and orchard fruit. It's a genuine crossover dram, built for drinkers who like the idea of peat but not the full Islay assault.",
    origin: 'Ireland',
    searchTerms: ['connemara', 'peated irish', 'connemara single malt'],
  },

  // ─── JAPANESE WHISKY ───────────────────────────────────────────────────────

  // ─── RUM ───────────────────────────────────────────────────────────────────

  {
    id: 'plantation-3-stars',
    name: 'Plantation 3 Stars White Rum',
    brand: 'Plantation',
    type: 'rum',
    abv: 41.2,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Tropical Fruit', 'Sugar Cane', 'Floral', 'Vanilla'],
    tastingNotes:
      "Plantation 3 Stars blends rums from three of the Caribbean's classic distilling nations — Barbados, Jamaica, and Trinidad — each aged briefly in the tropics before being charcoal-filtered to strip out the color, a technique that lets the rum keep some of the depth of short barrel aging without looking or tasting like an aged spirit. The brand behind it, Plantation, is owned by Maison Ferrand, a Cognac house in France — an unusual pedigree for a Caribbean rum label, and the same outfit that pioneered finishing aged Plantation expressions in cognac casks back in France. Tropical aging moves faster than aging in cooler climates, which rounds out the raw cane edges even in a rum built to drink young. The nose is bright with fresh sugar cane and tropical fruit, backed by soft floral and vanilla notes picked up from the wood. On the palate it's clean and lightly sweet rather than harsh, making it one of the more forgiving whites for a proper Daiquiri or Mojito.",
    origin: 'Barbados',
    searchTerms: ['plantation rum', 'plantation 3 stars', 'plantation white'],
  },
  {
    id: 'el-dorado-15',
    name: 'El Dorado 15 Year Special Reserve',
    brand: 'El Dorado',
    type: 'rum',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 60 },
      CAD: { min: 65, max: 80 },
      GBP: { min: 40, max: 52 },
    },
    flavorProfile: ['Molasses', 'Brown Sugar', 'Vanilla', 'Tropical Fruit'],
    tastingNotes:
      "El Dorado 15 comes from Demerara Distillers in Guyana, home to some of the last working wooden stills in the world — pot and column stills salvaged from historic sugar estates like Port Mourant, Versailles, and Enmore, each imparting its own character to the blend. The rum spends its full 15 years aging in the tropics, where heat and humidity accelerate maturation well beyond what the same years would produce in Scotland or Kentucky, pulling deep color and flavor from the ex-bourbon casks. The result is dense and almost chewy: burnt sugar and molasses up front, dried tropical fruit and toffee through the middle, and a long, warming finish of vanilla and oak spice. It's frequently poured neat or over a single rock, closer to a fine whisky than a mixing rum.",
    origin: 'Guyana',
    searchTerms: ['el dorado', 'el dorado 15', 'demerara rum'],
  },
  {
    id: 'flor-de-cana-12',
    name: 'Flor de Caña 12 Year Rum',
    brand: 'Flor de Caña',
    type: 'rum',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 26, max: 32 },
      CAD: { min: 36, max: 44 },
      GBP: { min: 22, max: 28 },
    },
    flavorProfile: ['Vanilla', 'Dried Fruit', 'Caramel', 'Light Oak'],
    tastingNotes:
      "Flor de Caña is distilled and aged at the foot of the San Cristóbal volcano in Nicaragua, where the same family-run estate distillery has operated since 1890. The 12 Year uses a solera-style blending system, layering rums of different ages in white oak ex-bourbon barrels so the final blend carries more complexity than its stated age would suggest. Vanilla and caramel lead the nose, with dried fruit — fig, raisin — and a well-integrated, gentle oak underneath rather than sharp tannin. It's a soft, sipping-friendly rum, and one of the first spirits in the world to be certified both carbon-neutral and Fair Trade.",
    origin: 'Nicaragua',
    searchTerms: ['flor de cana', 'flor de caña', 'nicaraguan rum'],
  },
  {
    id: 'foursquare-spiced',
    name: 'Foursquare Spiced Rum',
    brand: 'Foursquare',
    type: 'rum',
    abv: 37.5,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 28 },
      CAD: { min: 30, max: 38 },
      GBP: { min: 18, max: 24 },
    },
    flavorProfile: ['Vanilla', 'Cinnamon', 'Tropical Fruit', 'Caramel'],
    tastingNotes:
      "Foursquare Distillery in Barbados is run by Richard Seale, one of the most outspoken voices in rum for full disclosure and against undisclosed sugar-dosing. The Spiced blends rums that have already spent time aging in oak from both column and pot stills, then adds real vanilla, cinnamon, and allspice rather than the caramel-and-sugar shortcuts common in the spiced-rum category. That aged base gives it more backbone than most: vanilla and cinnamon warmth up front, baked tropical fruit and caramel through the middle, with the underlying column-and-pot blend keeping it from tasting like flavored syrup. It holds its own in a Dark 'n' Stormy or sipped over ice, which is unusual for the category.",
    origin: 'Barbados',
    searchTerms: ['foursquare', 'foursquare spiced', 'barbados spiced rum'],
  },
  {
    id: 'santa-teresa-1796',
    name: 'Santa Teresa 1796 Antiguo Solera Rum',
    brand: 'Santa Teresa',
    type: 'rum',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 38, max: 48 },
      CAD: { min: 52, max: 65 },
      GBP: { min: 32, max: 42 },
    },
    flavorProfile: ['Dried Fruit', 'Vanilla', 'Chocolate', 'Oak'],
    tastingNotes:
      "Santa Teresa 1796 comes from Hacienda Santa Teresa, a sugar estate in Venezuela's Aragua Valley that has operated continuously since 1796, making it one of the oldest working sugar and rum operations in the Americas. The rum is column-distilled, then matured through a solera system that blends casks as old as 35 years with younger stock, folding barrel depth into every bottle rather than relying on a single vintage. The result is dense and dried-fruit forward — raisin and fig alongside vanilla, dark chocolate, and baking spice — with oak that reads as rounded rather than tannic. It's smooth enough to sip neat, and the estate is nearly as well known for its long-running social program rehabilitating at-risk youth through rum production as it is for the rum itself.",
    origin: 'Venezuela',
    searchTerms: ['santa teresa', 'santa teresa 1796', 'venezuelan rum'],
  },
  {
    id: 'wray-nephew-overproof',
    name: 'Wray & Nephew White Overproof Rum',
    brand: 'Wray & Nephew',
    type: 'rum',
    abv: 63,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 26, max: 32 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Raw Cane', 'Tropical Fruit', 'Grassy', 'Ester'],
    tastingNotes:
      "Jamaica's most popular rum, drunk by around 90% of Jamaicans. Raw, funky, and powerful at 63% ABV — grassy sugar cane, banana ester, and tropical fruit. Used in Rum Punch and countless Jamaican mixed drinks. Unmistakable.",
    origin: 'Jamaica',
    searchTerms: ['wray and nephew', 'wray & nephew', 'white overproof', 'jamaican overproof'],
  },

  // ─── TEQUILA ───────────────────────────────────────────────────────────────

  {
    id: '818-tequila-blanco',
    name: '818 Tequila Blanco',
    brand: '818',
    type: 'tequila',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Citrus', 'Light Pepper'],
    tastingNotes:
      "818 Blanco, Kendall Jenner's tequila, is sourced from the Los Altos highlands of Jalisco and rested only briefly before bottling, leaning on that highland fruitiness rather than wood for its character. Clean agave and bright citrus lead, with a soft vanilla note and gentle pepper finish keeping it approachable rather than sharp. It's built as an easy, crowd-pleasing entry-level tequila, and has picked up blind-tasting awards that helped it stand out in a crowded celebrity-tequila market.",
    origin: 'Mexico',
    searchTerms: ['818 blanco', '818 tequila blanco', 'eight one eight tequila'],
  },
  {
    id: 'corralejo-blanco',
    name: 'Corralejo Blanco Tequila',
    brand: 'Corralejo',
    type: 'tequila',
    abv: 38,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 24, max: 30 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 20, max: 26 },
    },
    flavorProfile: ['Agave', 'Pepper', 'Citrus', 'Mineral'],
    tastingNotes:
      "Corralejo is distilled in the lowlands of Guanajuato rather than the more common Jalisco highlands, which tends to produce an earthier, more herbaceous agave character with less of the citrus sweetness highland tequilas are known for. It's produced at the Hacienda Corralejo, one of Mexico's older distilling estates, using 100% blue agave. Black pepper and fresh citrus sit over a genuinely mineral, earthy core, giving it more raw agave character than a typical highland blanco, with a clean, slightly hot finish.",
    origin: 'Mexico',
    searchTerms: ['corralejo', 'corralejo blanco'],
  },
  {
    id: 'cincoro-blanco',
    name: 'Cincoro Tequila Blanco',
    brand: 'Cincoro',
    type: 'tequila',
    abv: 40,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 68, max: 85 },
      CAD: { min: 90, max: 115 },
      GBP: { min: 58, max: 74 },
    },
    flavorProfile: ['Agave', 'Vanilla', 'Tropical Fruit', 'Light Oak'],
    tastingNotes:
      "Cincoro was founded by five NBA team owners, and the Blanco blends agave from both the highlands (smoother, sweeter) and lowlands (earthier, more herbal) of Jalisco, aiming for balance rather than leaning into either region's extremes. That blend shows in the glass: vanilla and tropical fruit sweetness sit alongside a light oak note and a cleaner agave character than a purely lowland blanco would carry, with a well-integrated, smooth finish. It's an ultra-premium bottle built to justify its price through genuine blending craft rather than packaging alone.",
    origin: 'Mexico',
    searchTerms: ['cincoro blanco', 'cincoro tequila blanco'],
  },
  {
    id: 'sierra-tequila-blanco',
    name: 'Sierra Tequila Silver Blanco',
    brand: 'Sierra Tequila',
    type: 'tequila',
    abv: 38,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 35, max: 45 },
      GBP: { min: 18, max: 25 },
    },
    flavorProfile: ['Agave', 'Citrus', 'Pepper', 'Light Sweetness'],
    tastingNotes:
      "Sierra Tequila Silver is 100% blue agave from Jalisco, rested only briefly before bottling to keep the profile clean and straightforward. Fresh agave and citrus lead, with a light pepper kick and a touch of natural sweetness rounding out the palate, and the finish is crisp and uncomplicated. It's one of the most widely distributed tequilas in the European market, instantly recognizable by its Mexican folk-art label featuring a guitar player, and built for easy mixing rather than contemplative sipping.",
    origin: 'Mexico',
    searchTerms: [
      'sierra tequila',
      'sierra blanco',
      'sierra silver tequila',
      'sierra tequila blanco',
    ],
  },

  // ─── MEZCAL ────────────────────────────────────────────────────────────────

  {
    id: 'ilegal-joven',
    name: 'Ilegal Mezcal Joven',
    brand: 'Ilegal',
    type: 'mezcal',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Smokey', 'Citrus', 'Tropical Fruit', 'Agave'],
    tastingNotes:
      "Ilegal's origin story is in the name: founder John Rexer ran a bar in Antigua, Guatemala, and started smuggling mezcal across the border from Oaxaca for his patrons before eventually building it into a legitimate, exported brand. The Joven is unaged Espadín agave, pit-roasted in the traditional style, and built to be approachable enough for bartenders who need a reliable mezcal for cocktails rather than a sipping showpiece. The nose carries gentle smoke over tropical fruit, the palate is bright with citrus and ripe fruit before the roasted agave and smoke settle in underneath, and the finish is short and clean.",
    origin: 'Mexico',
    searchTerms: ['ilegal', 'ilegal mezcal', 'ilegal joven'],
  },
  {
    id: 'vago-espadin-en-barro',
    name: 'Mezcal Vago Espadín en Barro',
    brand: 'Mezcal Vago',
    type: 'mezcal',
    abv: 50.2,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 55, max: 70 },
      CAD: { min: 74, max: 92 },
      GBP: { min: 46, max: 60 },
    },
    flavorProfile: ['Earthy', 'Smokey', 'Clay', 'Agave'],
    tastingNotes:
      "Mezcal Vago works directly with individual maestros mezcaleros in Oaxaca rather than blending across producers, and this expression is distilled by Aquilino García López in Candelaria Yegolé using clay pot stills — a rare, labor-intensive method most producers abandoned in favor of copper generations ago. Wild Espadín agave is roasted in earthen pits, crushed by hand, and fermented in wood before going through the clay stills, and it's bottled undiluted at cask strength rather than cut down to a standard proof. The clay imparts a distinctly earthy, mineral quality you don't get from copper distillation, layered over roasted agave and smoke, and that high proof carries a real kick through the long, smoky finish.",
    origin: 'Mexico',
    searchTerms: ['vago', 'mezcal vago', 'vago espadin'],
  },
  {
    id: 'banhez-ensemble',
    name: 'Banhez Ensemble Mezcal',
    brand: 'Banhez',
    type: 'mezcal',
    abv: 42,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 32, max: 42 },
      CAD: { min: 44, max: 56 },
      GBP: { min: 28, max: 36 },
    },
    flavorProfile: ['Fruity', 'Floral', 'Light Smoke', 'Agave'],
    tastingNotes:
      "Banhez is produced by a cooperative of more than a hundred small-scale agave farmers across the Ejutla and Miahuatlán districts of Oaxaca, structured so the growers themselves share in the brand's profits rather than just selling agave to a distillery. The Ensemble blends Espadín with Barril agave, an unusual pairing since most mezcal sticks to a single varietal, and the Barril brings a fruitier, less vegetal character than Espadín alone. The nose is fruity and floral with only a light touch of smoke, the palate stays soft and approachable rather than aggressively smoky, and the finish is clean and gently sweet.",
    origin: 'Mexico',
    searchTerms: ['banhez', 'banhez mezcal'],
  },

  // ─── GIN ───────────────────────────────────────────────────────────────────

  {
    id: 'drumshanbo-gunpowder',
    name: 'Drumshanbo Gunpowder Irish Gin',
    brand: 'Drumshanbo',
    type: 'gin',
    abv: 43,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 34, max: 44 },
      CAD: { min: 46, max: 58 },
      GBP: { min: 28, max: 38 },
    },
    flavorProfile: ['Gunpowder Tea', 'Citrus', 'Oriental Spice', 'Juniper'],
    tastingNotes:
      'Slow-vapour distilled with oriental botanicals including gunpowder tea, Chinese sichuan pepper, and yuzu. A gin that bridges East and West. Recognisable by its handblown bottle. Irish-made with a genuinely unique flavour profile.',
    origin: 'Ireland',
    searchTerms: ['drumshanbo', 'gunpowder gin', 'drumshanbo gunpowder'],
  },
  {
    id: 'four-pillars-rare-dry',
    name: 'Four Pillars Rare Dry Gin',
    brand: 'Four Pillars',
    type: 'gin',
    abv: 41.8,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 36, max: 46 },
      CAD: { min: 50, max: 62 },
      GBP: { min: 30, max: 40 },
    },
    flavorProfile: ['Citrus', 'Lemon Myrtle', 'Juniper', 'Spice'],
    tastingNotes:
      "Four Pillars was founded in 2013 in Healesville, in Victoria's Yarra Valley, and distills in a custom copper pot still the founders named Wilma. Rare Dry is built with whole fresh oranges — not just peel — distilled directly in the botanical charge, alongside native Australian ingredients like lemon myrtle and Tasmanian pepperberry layered over a classic juniper base. The nose is bright with orange oil and a distinct lemon-myrtle citrus lift, the palate carries juniper backed by the pepperberry's gentle heat, and the finish is warm and citrus-driven rather than dry and piney. It's widely credited as one of the gins that put Australian craft distilling on the map internationally.",
    origin: 'Australia',
    searchTerms: ['four pillars', 'four pillars gin', 'australian gin'],
  },
  {
    id: 'brockmans-gin',
    name: 'Brockmans Intensely Smooth Gin',
    brand: 'Brockmans',
    type: 'gin',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Blueberry', 'Blackberry', 'Floral', 'Juniper'],
    tastingNotes:
      'Brockmans breaks from the citrus-and-pine template most gins lean on by macerating blueberries and blackberries alongside its botanical bill, which pulls the whole profile toward dark fruit rather than the usual bright citrus. Juniper is still present, but it sits underneath the berries rather than leading the nose, making this a genuinely different style of gin rather than just a flavored variant. The nose is dark and fruity with blueberry and a soft floral lift, the palate carries blackberry sweetness with juniper providing quiet structure underneath, and the finish is smooth and lightly sweet rather than dry.',
    origin: 'United Kingdom',
    searchTerms: ['brockmans', 'brockmans gin', 'berry gin'],
  },

  // ─── VODKA ─────────────────────────────────────────────────────────────────

  {
    id: 'finlandia',
    name: 'Finlandia Vodka',
    brand: 'Finlandia',
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 24, max: 30 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Clean', 'Grain', 'Crisp', 'Smooth'],
    tastingNotes:
      "Distilled from six-row barley grown in Finnish fields with unusually long summer daylight hours, then cut with glacial spring water drawn from the brand's own aquifer near Rajamäki. Its tapered, frosted bottle was designed in 1970 by Finnish glass artist Tapio Wirkkala to look like a block of melting Arctic ice, a shape so iconic it's been revisited by top designers ever since. The barley base and cold-climate water combine for an exceptionally clean, crisp profile with a light grainy backbone rather than any real sweetness or fruit. Smooth and neutral through the finish, it's consistently rated among the cleanest, most reliable vodkas at its price point.",
    origin: 'Finland',
    searchTerms: ['finlandia', 'finlandia vodka', 'finnish vodka'],
  },
  {
    id: 'chopin-potato',
    name: 'Chopin Potato Vodka',
    brand: 'Chopin',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 42, max: 52 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Creamy', 'Earthy', 'Rich', 'Smooth'],
    tastingNotes:
      "One of the few widely available single-ingredient potato vodkas, made entirely from potatoes grown around Krzesk in eastern Poland, a region with a long history of potato cultivation and distilling. The brand takes its name from Frédéric Chopin, Poland's most celebrated composer, as a point of national pride. Potatoes contain less starch than grain, which slows fermentation and yields a naturally fuller, oilier spirit — the reason Chopin has a distinctly creamy, silky texture that grain vodkas can't replicate. Full-bodied and earthy on the palate, with real weight and a long, rounded finish rather than the thin crispness typical of wheat or rye.",
    origin: 'Poland',
    searchTerms: ['chopin', 'chopin vodka', 'potato vodka'],
  },
  {
    id: 'zubrowka-bison-grass',
    name: 'Żubrówka Bison Grass Vodka',
    brand: 'Żubrówka',
    type: 'vodka',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 26, max: 32 },
      GBP: { min: 15, max: 20 },
    },
    flavorProfile: ['Bison Grass', 'Vanilla', 'Almond', 'Coconut'],
    tastingNotes:
      "A rye vodka infused with bison grass (Hierochloe odorata) harvested from the Białowieża Forest on the Poland-Belarus border, the same old-growth woodland where Europe's last wild bison herds still roam — each bottle carries a single blade of the grass. The infusion gives it a flavor profile no other vodka has: uniquely herbaceous and hay-like, with vanilla, toasted almond, and light coconut layered over the rye base. Traditionally served with cloudy apple juice as a Tatanka, or simply over ice to let the grass character open up.",
    origin: 'Poland',
    searchTerms: ['zubrowka', 'żubrówka', 'bison grass vodka', 'zubrówka'],
  },
  {
    id: 'hangar-1-straight',
    name: 'Hangar 1 Straight Vodka',
    brand: 'Hangar 1',
    type: 'vodka',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 28, max: 36 },
      CAD: { min: 38, max: 48 },
      GBP: { min: 24, max: 32 },
    },
    flavorProfile: ['Clean', 'Soft Grain', 'Floral', 'Vanilla'],
    tastingNotes:
      'Distilled in a converted World War II-era aircraft hangar at the former Alameda Naval Air Station, the vodka the brand is named for. It blends a pot-distilled grape spirit made from viognier wine with a column-distilled grain spirit, an unusual combination that borrows a technique more common in brandy production to add texture most single-base vodkas lack. The viognier component brings soft floral and vanilla notes over a clean grain foundation, with an exceptionally smooth, rounded finish.',
    origin: 'United States',
    searchTerms: ['hangar 1', 'hangar one', 'california vodka'],
  },

  // ─── COGNAC & BRANDY ───────────────────────────────────────────────────────

  {
    id: 'hennessy-vsop',
    name: 'Hennessy VSOP Cognac',
    brand: 'Hennessy',
    type: 'brandy',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 50, max: 65 },
      CAD: { min: 68, max: 85 },
      GBP: { min: 42, max: 56 },
    },
    flavorProfile: ['Vanilla', 'Oak', 'Spice', 'Dried Fruit'],
    tastingNotes:
      "The world's most recognized cognac, from a house founded in 1765 by Richard Hennessy, an Irish Jacobite soldier who settled in the town of Cognac after serving in the French army and never returned home. The blend draws on over 60 double pot-still-distilled eaux-de-vie aged between roughly 4 and 15 years, well past the VSOP (Very Superior Old Pale) minimum of four. That longer average age brings noticeably more oak integration and depth than a standard VS. Vanilla and warm oak spice lead, with dried fruit developing through the mid-palate into a long, rounded, gently warming finish — for most drinkers, this is the benchmark against which other VSOPs are measured.",
    origin: 'France',
    searchTerms: ['hennessy vsop', 'henny vsop', 'hennessy very superior'],
  },
  {
    id: 'pierre-ferrand-ambre',
    name: 'Pierre Ferrand Ambre Cognac',
    brand: 'Pierre Ferrand',
    type: 'brandy',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 48, max: 58 },
      CAD: { min: 65, max: 78 },
      GBP: { min: 40, max: 52 },
    },
    flavorProfile: ['Orange Peel', 'Dried Apricot', 'Vanilla', 'Spice'],
    tastingNotes:
      "Double pot-still distilled and aged 10-plus years across a mix of Limousin and Tronçais oak, giving Pierre Ferrand's small-house Ambre more structure than its VSOP-tier price suggests. Owner Alexandre Gabriel built the brand specifically with bartenders in mind, favoring the drier, more citrus-driven style that holds up in classic cocktails rather than the sweeter commercial norm — the same Maison Ferrand roof under which he also created the widely respected Plantation rum range. Orange peel and dried apricot lead, with vanilla and well-defined spice underneath, giving it enough backbone for a Sidecar or Cognac-based Negroni while still being complex enough to sip neat.",
    origin: 'France',
    searchTerms: ['pierre ferrand', 'ferrand ambre', 'pierre ferrand cognac'],
  },
  {
    id: 'martell-vsop',
    name: 'Martell VSOP Medaillon Cognac',
    brand: 'Martell',
    type: 'brandy',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 46, max: 58 },
      CAD: { min: 62, max: 76 },
      GBP: { min: 38, max: 50 },
    },
    flavorProfile: ['Stone Fruit', 'Vanilla', 'Oak', 'Floral'],
    tastingNotes:
      "The oldest of the great cognac houses, founded in 1715, blending eaux-de-vie aged well beyond the four-year VSOP minimum. Martell's signature move is aging predominantly in denser Tronçais oak rather than the more common Limousin, which imparts tannin and spice more slowly — the reason the house has a reputation for a lighter, more floral style than its rivals even at this level. Stone fruit and delicate floral notes lead the nose, with vanilla and gentle oak spice filling out a smooth, elegant palate.",
    origin: 'France',
    searchTerms: ['martell vsop', 'martell medaillon', 'cognac martell'],
  },
  {
    id: 'calvados-pere-magloire',
    name: 'Père Magloire Fine Calvados',
    brand: 'Père Magloire',
    type: 'brandy',
    abv: 40,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 30, max: 38 },
      CAD: { min: 42, max: 52 },
      GBP: { min: 26, max: 34 },
    },
    flavorProfile: ['Apple', 'Pear', 'Vanilla', 'Light Oak'],
    tastingNotes:
      "Apple brandy from Normandy, named not for a priest but for Dominique Magloire, a 19th-century Norman innkeeper whose calvados earned such a reputation that his name became the brand when the house was founded in 1821. It's made by fermenting cider apples (and often a portion of pears) into a base cider before double-distilling it, unlike grape-based cognac or armagnac. As a 'Fine' calvados it carries a minimum two years in oak, on the lighter end of the category, which keeps the fresh orchard character front and center rather than burying it under wood. Bright apple and pear dominate, with vanilla and a gentle, unobtrusive oak note — the most approachable entry point into calvados, and a natural fit for any cocktail calling for apple brandy.",
    origin: 'France',
    searchTerms: ['calvados', 'père magloire', 'pere magloire', 'apple brandy'],
  },

  // ─── LIQUEUR ───────────────────────────────────────────────────────────────

  {
    id: 'drambuie',
    name: 'Drambuie Liqueur',
    brand: 'Drambuie',
    type: 'liqueur',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 32, max: 42 },
      CAD: { min: 44, max: 56 },
      GBP: { min: 26, max: 36 },
    },
    flavorProfile: ['Heather Honey', 'Scotch Whisky', 'Spice', 'Herbs'],
    tastingNotes:
      "Drambuie starts as aged Scotch whisky, then is sweetened with heather honey and infused with a secret blend of herbs and spices — the exact recipe is known to only a handful of people at any time, in the old liqueur-house tradition of Chartreuse or Bénédictine. The name comes from the Gaelic 'an dram buidheach,' the drink that satisfies, and company lore traces the recipe to a formula supposedly given to the MacKinnon family by Bonnie Prince Charlie in 1745 — one of Scotch culture's most repeated origin stories. On the palate it's rich and warming: heather honey and whisky malt up front, herbal spice underneath, with real Scotch backbone rather than the thin sweetness of a lesser whisky liqueur. It's essential for a Rusty Nail, and pairs just as well poured over ice on its own.",
    origin: 'Scotland',
    searchTerms: ['drambuie', 'scotch liqueur', 'rusty nail'],
  },
  {
    id: 'benedictine',
    name: 'Bénédictine D.O.M. Liqueur',
    brand: 'Bénédictine',
    type: 'liqueur',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 36, max: 46 },
      CAD: { min: 50, max: 62 },
      GBP: { min: 30, max: 40 },
    },
    flavorProfile: ['Herbal', 'Honey', 'Citrus', 'Spice'],
    tastingNotes:
      "Bénédictine D.O.M. is macerated and distilled from a recipe of 27 plants, herbs, and spices — including angelica, hyssop, and citrus peel — then aged in oak before bottling, a process the distillery in Fécamp, Normandy has never fully disclosed. Company history credits the recipe to a Benedictine monk in 1510, though the version sold today was developed and marketed in the 1860s by wine merchant Alexandre Le Grand, who built the elaborate Palais Bénédictine around the legend. Whatever its true age, the liqueur itself is genuinely complex: honeyed citrus and warm spice layer over a deep herbal base, with a long finish that never tips into cloying. It's the backbone of the B&B and the Singapore Sling, built to hold its own against brandy rather than just sweeten it.",
    origin: 'France',
    searchTerms: ['benedictine', 'bénédictine', 'dom benedictine'],
  },
  {
    id: 'lillet-blanc',
    name: 'Lillet Blanc',
    brand: 'Lillet',
    type: 'liqueur',
    abv: 17,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 18, max: 24 },
      CAD: { min: 26, max: 34 },
      GBP: { min: 15, max: 20 },
    },
    flavorProfile: ['Citrus', 'Honey', 'White Wine', 'Floral'],
    tastingNotes:
      "French aperitif wine — a blend of Bordeaux wines and citrus liqueurs. Fresh citrus, honey, and floral notes. Best known as the secret ingredient in the Vesper Martini (James Bond's drink). Serve chilled with a slice of orange.",
    origin: 'France',
    searchTerms: ['lillet', 'lillet blanc', 'lillet aperitif'],
  },
  {
    id: 'cynar',
    name: 'Cynar Artichoke Liqueur',
    brand: 'Cynar',
    type: 'liqueur',
    abv: 16.5,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 16, max: 22 },
      CAD: { min: 24, max: 30 },
      GBP: { min: 14, max: 20 },
    },
    flavorProfile: ['Artichoke', 'Bitter', 'Herbal', 'Caramel'],
    tastingNotes:
      'Cynar is an Italian amaro built around artichoke leaf, one of thirteen herbs and plants macerated into the base, which gives it a genuinely vegetal, bittersweet character unlike most other amari. It was created in Padua in the 1950s and became a fixture of Italian advertising thanks to a famous ad campaign showing an actor sipping it at a café table in the middle of traffic — still referenced in Italy today. At 16.5% ABV it sits lower than Campari or most amari, so the bitterness comes through as rounded and earthy rather than sharp, with caramel and herbal notes filling in underneath the artichoke. Bartenders lean on it for low-ABV Negroni riffs and as a bittersweet modifier where a full-strength amaro would overwhelm the drink.',
    origin: 'Italy',
    searchTerms: ['cynar', 'artichoke liqueur', 'amaro cynar'],
  },
  {
    id: 'amaro-montenegro',
    name: 'Amaro Montenegro',
    brand: 'Montenegro',
    type: 'liqueur',
    abv: 23,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 18, max: 26 },
    },
    flavorProfile: ['Orange Peel', 'Herbs', 'Vanilla', 'Floral'],
    tastingNotes:
      'Made with 40 botanicals including orange peel, vanilla, and aromatic herbs. Company lore holds that its creator, Stanislao Cobianchi, named it in honor of Elena of Montenegro, the princess who married into the Italian royal family and became Queen consort — a royal dedication baked right into the brand. Sweeter and more approachable than most Italian amaros. Described by many as the most approachable amaro — accessible enough for beginners, complex enough for connoisseurs.',
    origin: 'Italy',
    searchTerms: ['amaro montenegro', 'montenegro', 'amaro'],
  },
  {
    id: 'amaro-nonino',
    name: 'Amaro Nonino Quintessentia',
    brand: 'Nonino',
    type: 'liqueur',
    abv: 35,
    priceTier: 'ultra-premium',
    priceEstimate: {
      USD: { min: 50, max: 65 },
      CAD: { min: 68, max: 85 },
      GBP: { min: 42, max: 56 },
    },
    flavorProfile: ['Orange', 'Herbs', 'Grappa', 'Caramel'],
    tastingNotes:
      "Unlike most amari, which start from a neutral base spirit, Amaro Nonino is built on the Nonino family's own aged grappa — itself distilled from Friulian grape pomace — infused with herbs, roots, and orange peel. The Quintessentia recipe was developed by Giannola Nonino in the 1980s and is credited with helping revive interest in amaro as a category outside Italy, in part because the grappa base gives it a spirit-forward depth that sweeter, neutral-based amari lack. Orange and caramel dominate early, giving way to bitter herbs and a long, warming finish that carries real grape-spirit heat rather than just sugar. It's the amaro in the Paper Plane, and one of the few complex enough to be sipped neat as a digestivo.",
    origin: 'Italy',
    searchTerms: ['amaro nonino', 'nonino', 'nonino quintessentia', 'paper plane amaro'],
  },
  {
    id: 'averna-amaro',
    name: 'Amaro Averna',
    brand: 'Averna',
    type: 'liqueur',
    abv: 29,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 20, max: 28 },
      CAD: { min: 28, max: 36 },
      GBP: { min: 17, max: 24 },
    },
    flavorProfile: ['Caramel', 'Chocolate', 'Herbs', 'Citrus'],
    tastingNotes:
      'Sicilian amaro with a secret blend of herbs, roots, and citrus rinds. Company legend traces the recipe to 1868, when a Benedictine monk supposedly gave it to Salvatore Averna as thanks for his hospitality — the Averna family has kept the formula in-house ever since. Dark caramel, dark chocolate, and herbal notes with bitter orange on the finish. Rich and full-bodied — one of the most versatile Italian amaros in cocktails.',
    origin: 'Italy',
    searchTerms: ['averna', 'amaro averna', 'sicilian amaro'],
  },
  {
    id: 'luxardo-maraschino',
    name: 'Luxardo Maraschino Originale',
    brand: 'Luxardo',
    type: 'liqueur',
    abv: 32,
    priceTier: 'mid-range',
    priceEstimate: {
      USD: { min: 22, max: 30 },
      CAD: { min: 32, max: 40 },
      GBP: { min: 18, max: 26 },
    },
    flavorProfile: ['Cherry', 'Almond', 'Floral', 'Dry'],
    tastingNotes:
      "Luxardo Maraschino Originale is distilled from Marasca cherries — small, sour cherries grown in the Veneto — using the whole fruit including the crushed pits, which is where its distinctive faint bitter-almond note comes from. The Luxardo family originally distilled in Zadar, on the Dalmatian coast, before relocating production to Torreglia, Italy after World War II, and still ages the liqueur in Finnish ash vats rather than oak, which keeps it clear instead of picking up barrel color. It doesn't taste like cherry candy — it's dry, almost floral, with that bitter-almond edge from the pits and a clean, vanilla-tinged finish rather than syrupy sweetness. It's non-negotiable in a proper Last Word, Aviation, or Hemingway Daiquiri, where its dryness balances the other liqueurs instead of adding more sugar.",
    origin: 'Italy',
    searchTerms: ['luxardo', 'luxardo maraschino', 'maraschino liqueur', 'marasca cherry'],
  },
  {
    id: 'chartreuse-yellow',
    name: 'Yellow Chartreuse',
    brand: 'Chartreuse',
    type: 'liqueur',
    abv: 40,
    priceTier: 'premium',
    priceEstimate: {
      USD: { min: 52, max: 65 },
      CAD: { min: 70, max: 85 },
      GBP: { min: 44, max: 56 },
    },
    flavorProfile: ['Honey', 'Herbal', 'Floral', 'Saffron'],
    tastingNotes:
      "Yellow Chartreuse was created in 1838 as a milder companion to the original Green Chartreuse, which Carthusian monks have distilled since the 18th century from a recipe of around 130 plants, herbs, and flowers that only two monks alive at any time are permitted to know in full. Saffron gives Yellow its color and a good part of its perfume, and the lower proof — still 40% ABV, well down from Green's 55% — makes it noticeably sweeter and gentler, with honey and floral notes leading rather than Green's forceful herbal bite. It's still produced at the monks' distillery near Voiron in the French Alps, using the same closely guarded formula the order has protected for centuries. For anyone finding Green Chartreuse too aggressive, Yellow is the way in.",
    origin: 'France',
    searchTerms: ['yellow chartreuse', 'chartreuse jaune', 'jaune', 'chartreuse yellow'],
  },
];
