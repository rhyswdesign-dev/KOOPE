/**
 * Hardcoded fallback recipe data for CocktailDetailScreen — the
 * non-alcoholic beverage catalog and the classic-cocktail fallback used
 * when a recipe isn't found remotely. Pure data, no logic; extracted
 * verbatim from CocktailDetailScreen.tsx (Phase 5, god-file breakup).
 */

export const nonAlcoholicBeverages = [
  {
    id: 'seedlip-garden-108',
    name: 'Seedlip Garden 108',
    category: 'Zero-Proof Spirits',
    region: 'United Kingdom',
    tier: 'gold',
    image:
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Herbal & Garden Fresh',
    description:
      'A complex blend of peas, hay, spearmint, rosemary, and thyme creating a fresh garden experience.',
    abv: '0.0%',
    flavorNotes: ['Fresh herbs', 'Garden peas', 'Mint', 'Rosemary'],
    useCase: 'Perfect for G&T-style serves and herb-forward cocktails',
    recipes: [
      {
        name: 'Garden 108 & Tonic',
        ingredients: [
          '2 oz Seedlip Garden 108',
          '4 oz Premium tonic water',
          '3 cucumber slices',
          'Fresh mint sprig',
          'Lime wheel',
        ],
        instructions:
          'Fill glass with ice. Add Seedlip Garden 108. Top with tonic water. Garnish with cucumber, mint, and lime.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min',
      },
      {
        name: 'Herbaceous Spritz',
        ingredients: [
          '1 1/2 oz Seedlip Garden 108',
          '3 oz Elderflower sparkling water',
          '1/2 oz Fresh lime juice',
          'Rosemary sprig',
          'Grapefruit peel',
        ],
        instructions:
          'Combine in wine glass over ice. Stir gently. Express grapefruit oils and garnish with rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '3 min',
      },
      {
        name: 'Garden Gimlet',
        ingredients: [
          '2 oz Seedlip Garden 108',
          '3/4 oz Fresh lime juice',
          '3/4 oz Simple syrup',
          'Cucumber wheel',
          'Fresh basil',
        ],
        instructions:
          'Shake ingredients with ice. Double strain into chilled coupe. Garnish with cucumber and basil.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'lyre-s-american-malt',
    name: "Lyre's American Malt",
    category: 'Zero-Proof Spirits',
    region: 'Australia',
    tier: 'gold',
    image:
      'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Rich & Smoky',
    description:
      'Generous flavors of honey and vanilla with a gentle smoky finish, perfect for classic cocktails.',
    abv: '0.0%',
    flavorNotes: ['Honey', 'Vanilla', 'Oak', 'Smoke'],
    useCase: 'Ideal for whiskey cocktails like Old Fashioned and Manhattan',
    recipes: [
      {
        name: 'Smokeless Old Fashioned',
        ingredients: [
          "2 oz Lyre's American Malt",
          '1/4 oz Maple syrup',
          '2 dashes Orange bitters',
          '1 dash Angostura bitters',
          'Orange peel',
          'Luxardo cherry',
        ],
        instructions:
          'Stir all ingredients with ice. Strain over large ice cube. Express orange oils and garnish with cherry.',
        glassware: 'Old Fashioned glass',
        difficulty: 'Easy',
        time: '3 min',
      },
      {
        name: 'Zero Proof Manhattan',
        ingredients: [
          "2 oz Lyre's American Malt",
          '1 oz Sweet vermouth',
          '2 dashes Angostura bitters',
          'Maraschino cherry',
        ],
        instructions:
          'Stir ingredients with ice for 30 seconds. Strain into chilled coupe. Garnish with cherry.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min',
      },
      {
        name: 'Maple Whiskey Sour',
        ingredients: [
          "2 oz Lyre's American Malt",
          '3/4 oz Fresh lemon juice',
          '1/2 oz Maple syrup',
          '1 Egg white',
          'Lemon wheel',
        ],
        instructions:
          'Dry shake without ice. Shake again with ice. Double strain into coupe. Garnish with lemon wheel.',
        glassware: 'Coupe glass',
        difficulty: 'Medium',
        time: '4 min',
      },
    ],
  },
  {
    id: 'monday-gin',
    name: 'Monday Zero Alcohol Gin',
    category: 'Zero-Proof Spirits',
    region: 'Canada',
    tier: 'silver',
    image:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Juniper Forward',
    description:
      'Classic gin botanicals with zero alcohol - juniper, coriander, and citrus in perfect balance.',
    abv: '0.0%',
    flavorNotes: ['Juniper', 'Citrus', 'Coriander', 'Angelica'],
    useCase: 'Classic gin cocktails and modern mixed drinks',
    recipes: [
      {
        name: 'Zero Proof Gin & Tonic',
        ingredients: ['2 oz Monday Gin', '4 oz Tonic water', 'Lime wheel', 'Juniper berries'],
        instructions:
          'Build in glass over ice. Stir gently. Garnish with lime and juniper berries.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min',
      },
    ],
  },
  {
    id: 'ghia-aperitif',
    name: 'Ghia Aperitif',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'gold',
    image:
      'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Mediterranean Botanicals',
    description:
      'A sophisticated aperitif with rosemary, ginger, and elderflower for the perfect pre-dinner drink.',
    abv: '0.0%',
    flavorNotes: ['Rosemary', 'Ginger', 'Elderflower', 'Citrus'],
    useCase: 'Perfect for aperitif hour and spritz-style cocktails',
    recipes: [
      {
        name: 'Ghia Spritz',
        ingredients: [
          '2 oz Ghia Aperitif',
          '3 oz Sparkling water',
          '1 oz Fresh grapefruit juice',
          'Rosemary sprig',
          'Grapefruit wheel',
        ],
        instructions:
          'Build in wine glass over ice. Top with sparkling water. Garnish with grapefruit and rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min',
      },
    ],
  },
  {
    id: 'gt-s-gingerade',
    name: "GT's Gingerade Kombucha",
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image: require('../../assets/images/mocktails/ginger_kombucha_mule.png'),
    tagline: 'Probiotic & Refreshing',
    description:
      'Living kombucha with organic ginger providing digestive benefits and refreshing taste.',
    abv: '<0.5%',
    flavorNotes: ['Ginger', 'Fermented tea', 'Probiotics', 'Tangy'],
    useCase: 'Great for wellness cocktails and digestive health',
    recipes: [
      {
        name: 'Ginger Kombucha Mule',
        ingredients: [
          "6 oz GT's Gingerade",
          '1 oz Fresh lime juice',
          '1/2 oz Agave syrup',
          'Mint sprig',
          'Candied ginger',
          'Lime wheel',
        ],
        instructions:
          'Combine lime juice and agave in mug. Add ice and kombucha. Stir gently. Garnish with mint, ginger, and lime.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'recess-hemp-sparkling-water',
    name: 'Recess Hemp Sparkling Water',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'silver',
    image: require('../../assets/images/mocktails/zen_garden_spritz.png'),
    tagline: 'Calm & Focused',
    description:
      'Sparkling water infused with hemp extract and adaptogens for relaxation and focus.',
    abv: '0.0%',
    flavorNotes: ['Light hemp', 'Citrus', 'Adaptogenic herbs', 'Clean finish'],
    useCase: 'Perfect for mindful drinking and wellness-focused cocktails',
    recipes: [
      {
        name: 'Zen Garden Spritz',
        ingredients: [
          '8 oz Recess Hemp Water',
          '1 oz Fresh cucumber juice',
          '1/2 oz Mint simple syrup',
          'Cucumber ribbons',
          'Fresh mint',
        ],
        instructions:
          'Combine cucumber juice and syrup in glass. Add ice and Recess water. Garnish with cucumber and mint.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '4 min',
      },
      {
        name: 'Hemp Citrus Cooler',
        ingredients: [
          '8 oz Recess Hemp Water',
          '1 oz Fresh lemon juice',
          '1/2 oz Simple syrup',
          'Fresh thyme',
          'Lemon wheel',
        ],
        instructions:
          'Muddle thyme gently in glass. Add lemon juice and syrup. Fill with ice. Top with Recess water. Garnish with lemon wheel.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'ritual-zero-proof-gin',
    name: 'Ritual Zero Proof Gin Alternative',
    category: 'Zero-Proof Spirits',
    region: 'United States',
    tier: 'gold',
    image:
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Botanical Excellence',
    description:
      'Distilled with juniper, coriander, and angelica root for an authentic gin experience without alcohol.',
    abv: '0.0%',
    flavorNotes: ['Juniper', 'Angelica root', 'Coriander', 'Citrus'],
    useCase: 'Perfect for classic gin cocktails and modern zero-proof mixology',
    recipes: [
      {
        name: 'Zero Proof Negroni',
        ingredients: [
          '1 oz Ritual Gin Alternative',
          '1 oz Seedlip Spice 94',
          '1 oz Sweet vermouth',
          'Orange peel',
        ],
        instructions:
          'Stir all ingredients with ice. Strain over fresh ice. Express orange oils and garnish with peel.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min',
      },
      {
        name: 'Garden Martini',
        ingredients: [
          '2 1/2 oz Ritual Gin Alternative',
          '1/2 oz Dry vermouth',
          '2 dashes Orange bitters',
          'Lemon twist',
        ],
        instructions:
          'Stir ingredients with ice until well chilled. Strain into chilled coupe. Garnish with lemon twist.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'wilderton-earthen',
    name: 'Wilderton Earthen',
    category: 'Zero-Proof Spirits',
    region: 'United States',
    tier: 'silver',
    image:
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Forest Floor',
    description:
      'Crafted with Douglas fir, sage, and lavender for an earthy, complex botanical experience.',
    abv: '0.0%',
    flavorNotes: ['Douglas fir', 'Sage', 'Lavender', 'Earthy botanicals'],
    useCase: 'Ideal for contemplative sipping and herbal cocktails',
    recipes: [
      {
        name: 'Forest Floor',
        ingredients: [
          '2 oz Wilderton Earthen',
          '1/2 oz Honey syrup',
          '1/2 oz Fresh lemon juice',
          'Sage sprig',
          'Lavender garnish',
        ],
        instructions:
          'Shake ingredients with ice. Strain into rocks glass over fresh ice. Garnish with sage and lavender.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'athletic-brewing-coffee',
    name: 'Athletic Brewing Cold Brew Coffee',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image:
      'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Performance & Flavor',
    description:
      'Premium cold brew coffee crafted for athletes and coffee enthusiasts seeking clean energy.',
    abv: '0.0%',
    flavorNotes: ['Rich coffee', 'Chocolate notes', 'Smooth finish', 'No sugar crash'],
    useCase: 'Perfect for coffee cocktails and energy-focused beverages',
    recipes: [
      {
        name: 'Coffee Spritz',
        ingredients: [
          '4 oz Athletic Cold Brew',
          '2 oz Sparkling water',
          '1/2 oz Vanilla syrup',
          'Orange peel',
          'Coffee beans',
        ],
        instructions:
          'Combine cold brew and vanilla syrup in glass. Add ice and top with sparkling water. Garnish with orange peel and coffee beans.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min',
      },
      {
        name: 'Espresso Martini Zero',
        ingredients: [
          '3 oz Athletic Cold Brew',
          '1 oz Coffee liqueur alternative',
          '1/2 oz Simple syrup',
          '3 Coffee beans',
        ],
        instructions:
          'Shake all ingredients vigorously with ice. Double strain into chilled coupe. Float 3 coffee beans on foam.',
        glassware: 'Coupe glass',
        difficulty: 'Medium',
        time: '4 min',
      },
    ],
  },
  {
    id: 'kin-euphorics-high-rhode',
    name: 'Kin Euphorics High Rhode',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'gold',
    image: require('../../assets/images/mocktails/high_rhode_spritz.png'),
    tagline: 'Mood-Elevating',
    description:
      'A euphoric blend of adaptogens, nootropics, and botanicals designed to elevate your mood naturally.',
    abv: '<0.5%',
    flavorNotes: ['Hibiscus', 'Orange bitters', 'Licorice root', 'Cardamom'],
    useCase: 'Perfect for social occasions and mood enhancement',
    recipes: [
      {
        name: 'High Rhode Spritz',
        ingredients: [
          '2 oz Kin High Rhode',
          '3 oz Sparkling wine',
          '1 oz Fresh grapefruit juice',
          'Grapefruit wheel',
          'Rosemary sprig',
        ],
        instructions:
          'Combine High Rhode and grapefruit juice in wine glass. Add ice and top with sparkling wine. Garnish with grapefruit and rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'seedlip-spice-94',
    name: 'Seedlip Spice 94',
    category: 'Zero-Proof Spirits',
    region: 'United Kingdom',
    tier: 'gold',
    image:
      'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Warm & Spiced',
    description: 'A warm, aromatic blend of allspice and cardamom with a complex spice profile.',
    abv: '0.0%',
    flavorNotes: ['Allspice', 'Cardamom', 'Oak', 'Citrus peel'],
    useCase: 'Perfect for spiced cocktails and warming winter drinks',
    recipes: [
      {
        name: 'Spiced Mule',
        ingredients: [
          '2 oz Seedlip Spice 94',
          '1/2 oz Fresh lime juice',
          '4 oz Ginger beer',
          'Lime wheel',
          'Candied ginger',
        ],
        instructions:
          'Build in copper mug over ice. Stir gently. Garnish with lime and candied ginger.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '2 min',
      },
      {
        name: 'Spice Route',
        ingredients: [
          '1 1/2 oz Seedlip Spice 94',
          '1 oz Apple juice',
          '1/2 oz Honey syrup',
          '1/4 oz Lemon juice',
          'Cinnamon stick',
        ],
        instructions:
          'Shake ingredients with ice. Strain into rocks glass over fresh ice. Garnish with cinnamon stick.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'aperol-spritz-zero',
    name: "Lyre's Italian Orange",
    category: 'Low-ABV Options',
    region: 'Australia',
    tier: 'silver',
    image: require('../../assets/images/mocktails/italian_sunset.png'),
    tagline: 'Italian Aperitivo',
    description:
      'Zero-proof alternative to Italian orange aperitif with bitter orange and herbal complexity.',
    abv: '0.0%',
    flavorNotes: ['Bitter orange', 'Herbs', 'Rhubarb', 'Vanilla'],
    useCase: 'Perfect for aperitif hour and Italian-style spritzes',
    recipes: [
      {
        name: 'Zero Proof Aperol Spritz',
        ingredients: [
          "3 oz Lyre's Italian Orange",
          '3 oz Prosecco',
          '1 oz Soda water',
          'Orange slice',
        ],
        instructions:
          'Build in wine glass over ice. Top with soda water. Garnish with orange slice.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min',
      },
      {
        name: 'Italian Sunset',
        ingredients: [
          "2 oz Lyre's Italian Orange",
          '1 oz Fresh grapefruit juice',
          '1/2 oz Honey syrup',
          '3 oz Sparkling water',
          'Grapefruit twist',
        ],
        instructions:
          'Shake orange liqueur, grapefruit juice, and honey with ice. Strain into highball over ice. Top with sparkling water.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'curious-elixir-no2',
    name: 'Curious Elixir No. 2',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'bronze',
    image: require('../../assets/images/mocktails/curious_spritz.png'),
    tagline: 'Negroni Inspired',
    description:
      'A sophisticated blend inspired by the classic Negroni with bitter and sweet botanicals.',
    abv: '<0.5%',
    flavorNotes: ['Bitter orange', 'Juniper', 'Gentian', 'Rosemary'],
    useCase: 'Ready-to-drink alternative to classic bitter cocktails',
    recipes: [
      {
        name: 'Curious Spritz',
        ingredients: [
          '4 oz Curious Elixir No. 2',
          '2 oz Sparkling water',
          'Orange peel',
          'Fresh rosemary',
        ],
        instructions:
          'Pour over ice in wine glass. Top with sparkling water. Express orange oils and garnish with rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min',
      },
    ],
  },
  {
    id: 'health-ade-kombucha',
    name: 'Health-Ade Ginger Lemon Kombucha',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image:
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Probiotic Power',
    description:
      'Organic kombucha with real ginger and lemon for digestive health and refreshing taste.',
    abv: '<0.5%',
    flavorNotes: ['Fresh ginger', 'Lemon', 'Fermented tea', 'Tangy'],
    useCase: 'Great for wellness cocktails and digestive support',
    recipes: [
      {
        name: 'Ginger Lemon Mule',
        ingredients: [
          '6 oz Health-Ade Ginger Lemon',
          '1 oz Fresh lime juice',
          '1/2 oz Agave nectar',
          'Mint sprig',
          'Crystallized ginger',
        ],
        instructions:
          'Combine lime juice and agave in mug. Add ice and kombucha. Stir gently. Garnish with mint and ginger.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '3 min',
      },
      {
        name: 'Wellness Spritzer',
        ingredients: [
          '4 oz Health-Ade Ginger Lemon',
          '2 oz Sparkling water',
          '1 oz Fresh cucumber juice',
          'Cucumber ribbon',
          'Lemon wheel',
        ],
        instructions:
          'Combine cucumber juice with kombucha in glass. Add ice and top with sparkling water. Garnish with cucumber and lemon.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
  {
    id: 'rebbl-ashwagandha-chai',
    name: 'REBBL Ashwagandha Chai',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'silver',
    image:
      'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Adaptogenic Blend',
    description:
      'Plant-based superfood drink with ashwagandha, reishi, and warming spices for stress support.',
    abv: '0.0%',
    flavorNotes: ['Chai spices', 'Coconut', 'Ashwagandha', 'Cinnamon'],
    useCase: 'Perfect for evening relaxation and stress relief cocktails',
    recipes: [
      {
        name: 'Golden Hour Latte',
        ingredients: [
          '6 oz REBBL Ashwagandha Chai',
          '2 oz Steamed oat milk',
          '1/2 oz Vanilla syrup',
          'Cinnamon stick',
          'Star anise',
        ],
        instructions:
          'Heat chai drink. Steam oat milk and vanilla syrup. Combine in mug. Garnish with cinnamon and star anise.',
        glassware: 'Coffee mug',
        difficulty: 'Easy',
        time: '4 min',
      },
      {
        name: 'Spiced Chai Fizz',
        ingredients: [
          '4 oz REBBL Ashwagandha Chai',
          '2 oz Sparkling water',
          '1/2 oz Maple syrup',
          'Orange peel',
          'Cardamom pod',
        ],
        instructions:
          'Combine chai and maple syrup in glass. Add ice and top with sparkling water. Garnish with orange peel and cardamom.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min',
      },
    ],
  },
];

export const cocktailData = {
  'old-fashioned': {
    id: 'old-fashioned',
    title: 'Old Fashioned',
    subtitle: 'Classic • Whiskey-based',
    description:
      'A timeless cocktail made with whiskey, sugar, bitters, and an orange twist. This drink represents the essence of what a cocktail should be - simple, balanced, and perfectly executed.',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz Whiskey', note: 'Bourbon or Rye preferred' },
      { name: '1/4 oz Simple Syrup', note: 'Or 1 sugar cube' },
      { name: '2 dashes Angostura Bitters', note: 'Essential for flavor' },
      { name: 'Orange Peel', note: 'For garnish and aroma' },
      { name: 'Ice', note: 'Large cube preferred' },
    ],
    instructions: [
      'Add simple syrup and bitters to rocks glass',
      'Add whiskey and stir to combine',
      'Add ice (preferably one large cube)',
      'Stir gently to chill and dilute',
      'Express orange peel oils over drink',
      'Garnish with orange peel',
    ],
    tips: [
      'Use a large ice cube to minimize dilution',
      'Express the orange peel properly for best aroma',
      'Quality whiskey makes a big difference',
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 49.99,
  },
  manhattan: {
    id: 'manhattan',
    title: 'Manhattan',
    subtitle: 'Classic • Whiskey-based',
    description:
      'An elegant mix of whiskey, sweet vermouth, and bitters, garnished with a cherry. The Manhattan is the sophisticated sibling of the Old Fashioned.',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Rye Whiskey', note: 'Bourbon also works well' },
      { name: '1 oz Sweet Vermouth', note: 'Quality matters here' },
      { name: '2 dashes Angostura Bitters', note: 'Classic choice' },
      { name: 'Maraschino Cherry', note: 'For garnish' },
    ],
    instructions: [
      'Add whiskey, vermouth, and bitters to mixing glass',
      'Add ice and stir for 30 seconds',
      'Strain into chilled Coupe glass',
      'Garnish with cherry',
    ],
    tips: [
      "Stir, don't shake - keeps it clear",
      'Chill your glass beforehand',
      'Good vermouth is crucial',
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 54.99,
  },
  negroni: {
    id: 'negroni',
    title: 'Negroni',
    subtitle: 'Classic • Gin-based',
    description:
      'A bitter and sweet Italian cocktail with gin, Campari, and sweet vermouth. Perfect for those who appreciate complex, bitter flavors.',
    img: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '1 oz Gin', note: 'London Dry style preferred' },
      { name: '1 oz Campari', note: 'The signature bitter element' },
      { name: '1 oz Sweet Vermouth', note: 'Balances the bitterness' },
      { name: 'Orange Peel', note: 'Essential garnish' },
    ],
    instructions: [
      'Add gin, Campari, and vermouth to rocks glass',
      'Add ice and stir to combine',
      'Express orange peel over drink',
      'Drop peel into glass',
    ],
    tips: [
      'Equal parts - the perfect balance',
      'Build in glass for simplicity',
      'Orange peel oils are essential',
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 64.99,
  },
  'espresso-martini': {
    id: 'espresso-martini',
    title: 'Espresso Martini',
    subtitle: 'Modern • Vodka-based',
    description:
      'A sophisticated coffee cocktail with vodka, coffee liqueur, and fresh espresso. The perfect pick-me-up cocktail.',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Medium',
    time: '5 min',
    ingredients: [
      { name: '2 oz Vodka', note: 'Premium vodka recommended' },
      { name: '1/2 oz Coffee Liqueur', note: 'Kahlúa or similar' },
      { name: '1 shot Fresh Espresso', note: 'Must be fresh and hot' },
      { name: '1/4 oz Simple Syrup', note: 'Optional, to taste' },
    ],
    instructions: [
      'Brew fresh espresso shot',
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 15 seconds',
      'Double strain into chilled coupe',
      'Garnish with 3 coffee beans',
    ],
    tips: [
      'Fresh espresso is non-negotiable',
      'Shake hard to create foam',
      'Serve immediately while hot',
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 39.99,
  },
  'classic-martini': {
    id: 'classic-martini',
    title: 'Classic Martini',
    subtitle: 'Classic • Gin-based',
    description:
      'A timeless classic cocktail with gin and dry vermouth. The epitome of cocktail elegance and sophistication.',
    img: 'https://images.unsplash.com/photo-1541976076758-347942db1978?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Gin', note: 'London Dry preferred' },
      { name: '1/2 oz Dry Vermouth', note: 'Quality matters' },
      { name: 'Olive or Lemon Twist', note: 'For garnish' },
    ],
    instructions: [
      'Add gin and vermouth to mixing glass with ice',
      'Stir for 30 seconds until well chilled',
      'Strain into chilled Coupe glass',
      'Garnish with olive or lemon twist',
    ],
    tips: [
      "Stir, don't shake for clarity",
      'Chill your glass beforehand',
      'Less vermouth for a drier martini',
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 44.99,
  },
  'virgin-mojito': {
    id: 'virgin-mojito',
    title: 'Virgin Mojito',
    subtitle: 'Non-Alcoholic • Refreshing',
    description:
      'Refreshing non-alcoholic version of the classic mojito with fresh mint, lime, and sparkling water.',
    img: 'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: 'Fresh Lime Juice', note: '1 oz freshly squeezed' },
      { name: 'Mint Leaves', note: '8-10 fresh leaves' },
      { name: 'Simple Syrup', note: '1/2 oz to taste' },
      { name: 'Soda Water', note: '4 oz chilled' },
      { name: 'Ice', note: 'Crushed preferred' },
    ],
    instructions: [
      'Muddle mint leaves gently in glass',
      'Add lime juice and simple syrup',
      'Fill glass with crushed ice',
      'Top with soda water',
      'Stir gently and garnish with mint sprig',
    ],
    tips: ["Don't over-muddle the mint", 'Use fresh lime juice only', 'Adjust sweetness to taste'],
    glassware: 'Highball Glass',
    kitAvailable: false,
    kitPrice: 0,
  },
  mojito: {
    id: 'mojito',
    title: 'Mojito',
    subtitle: 'Classic • Rum-based',
    description:
      'A refreshing Cuban cocktail with white rum, fresh mint, lime juice, sugar, and soda water. The perfect summer drink.',
    img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz White Rum', note: 'Light rum preferred' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '2 tsp Sugar', note: 'Or 1/2 oz simple syrup' },
      { name: '8-10 Mint Leaves', note: 'Fresh mint only' },
      { name: 'Soda Water', note: '2-3 oz to top' },
      { name: 'Ice', note: 'Crushed preferred' },
    ],
    instructions: [
      'Gently muddle mint leaves with sugar in glass',
      'Add lime juice and rum',
      'Fill glass with crushed ice',
      'Top with soda water',
      'Stir gently and garnish with mint sprig',
    ],
    tips: [
      "Don't over-muddle the mint - bruise, don't tear",
      'Use fresh lime juice only',
      'Adjust sweetness to taste',
    ],
    glassware: 'Highball Glass',
    kitAvailable: true,
    kitPrice: 34.99,
  },
  daiquiri: {
    id: 'daiquiri',
    title: 'Daiquiri',
    subtitle: 'Classic • Rum-based',
    description:
      'A simple yet perfect cocktail with white rum, lime juice, and simple syrup. The essence of Caribbean elegance.',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz White Rum', note: 'Quality white rum' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '3/4 oz Simple Syrup', note: 'Adjust to taste' },
    ],
    instructions: [
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Double strain into chilled Coupe glass',
      'Garnish with lime wheel if desired',
    ],
    tips: [
      'Balance is key - adjust sweetness to taste',
      'Shake hard for proper dilution',
      'Serve immediately while cold',
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 29.99,
  },
  margarita: {
    id: 'margarita',
    title: 'Margarita',
    subtitle: 'Classic • Tequila-based',
    description:
      'The quintessential tequila cocktail with lime juice, orange liqueur, and a salted rim. Perfect balance of sweet, sour, and salty.',
    img: 'https://images.unsplash.com/photo-1541976076758-347942db1978?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz Blanco Tequila', note: '100% agave preferred' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '1 oz Orange Liqueur', note: 'Cointreau or Triple Sec' },
      { name: 'Salt', note: 'For rim' },
      { name: 'Lime Wheel', note: 'For garnish' },
    ],
    instructions: [
      'Rim glass with salt using lime wheel',
      'Add tequila, lime juice, and orange liqueur to shaker',
      'Add ice and shake vigorously',
      'Strain into salt-rimmed rocks glass over ice',
      'Garnish with lime wheel',
    ],
    tips: [
      'Use 100% agave tequila for best flavor',
      'Fresh lime juice is essential',
      'Salt rim is traditional but optional',
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 39.99,
  },
  cosmopolitan: {
    id: 'cosmopolitan',
    title: 'Cosmopolitan',
    subtitle: 'Modern • Vodka-based',
    description:
      'A glamorous pink cocktail with vodka, cranberry juice, lime juice, and orange liqueur. Made famous in the 90s.',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '1 1/2 oz Vodka', note: 'Premium vodka preferred' },
      { name: '1 oz Orange Liqueur', note: 'Cointreau or Triple Sec' },
      { name: '1 oz Cranberry Juice', note: 'For color and flavor' },
      { name: '1/2 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: 'Lime Wheel', note: 'For garnish' },
    ],
    instructions: [
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Double strain into chilled Coupe glass',
      'Garnish with lime wheel on rim',
    ],
    tips: [
      'Use just enough cranberry for pink color',
      'Fresh lime juice makes all the difference',
      'Serve in a chilled glass',
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 34.99,
  },
  'moscow-mule': {
    id: 'moscow-mule',
    title: 'Moscow Mule',
    subtitle: 'Classic • Vodka-based',
    description:
      'A refreshing cocktail with vodka, ginger beer, and lime juice, traditionally served in a copper mug.',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Vodka', note: 'Quality vodka' },
      { name: '1/2 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '4-6 oz Ginger Beer', note: 'Spicy ginger beer preferred' },
      { name: 'Lime Wedge', note: 'For garnish' },
      { name: 'Ice', note: 'Cubed ice' },
    ],
    instructions: [
      'Fill copper mug or highball glass with ice',
      'Add vodka and lime juice',
      'Top with ginger beer',
      'Stir gently to combine',
      'Garnish with lime wedge',
    ],
    tips: [
      'Copper mug keeps drink colder longer',
      'Good quality ginger beer is key',
      "Don't over-stir to preserve carbonation",
    ],
    glassware: 'Copper Mug',
    kitAvailable: true,
    kitPrice: 32.99,
  },
};

// Function to get non-alcoholic recipe data
export const getNonAlcoholicRecipeData = (recipeId: string) => {
  for (const beverage of nonAlcoholicBeverages) {
    for (const recipe of beverage.recipes) {
      const fullRecipeId = `${beverage.id}-${recipe.name}`;
      if (fullRecipeId === recipeId) {
        return {
          id: fullRecipeId,
          title: recipe.name,
          subtitle: `${beverage.category} • ${beverage.name}`,
          description: `${beverage.description} ${beverage.useCase}`,
          img: beverage.image,
          difficulty: recipe.difficulty,
          time: recipe.time,
          ingredients: recipe.ingredients.map((ingredient) => ({
            name: ingredient,
            note: beverage.name,
          })),
          instructions: recipe.instructions.split('. ').filter((step) => step.trim()),
          tips: beverage.flavorNotes.map((note) => `Features ${note.toLowerCase()} notes`),
          glassware: recipe.glassware,
          kitAvailable: false,
          kitPrice: 0,
          isNonAlcoholic: true,
          beverage,
        };
      }
    }
  }
  return null;
};
