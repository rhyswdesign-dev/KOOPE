import type { ServeMode, ServeSpiritFamily } from '../data/spiritsDatabase';

export interface FamilyServeCopy {
  family: ServeSpiritFamily;
  title: string;
  shortWhy: string;
  detailedWhy: string;
  modeDescriptions: Record<ServeMode, string>;
  premiumFirst: boolean;
}

export const PREMIUM_SERVE_GUIDANCE: Record<ServeSpiritFamily, FamilyServeCopy> = {
  scotch: {
    family: 'scotch',
    title: 'How to enjoy this scotch',
    shortWhy: 'Start neat to understand the bottle before you add dilution.',
    detailedWhy: 'Scotch often reveals smoke, malt, fruit, and oak in layers. Start neat, then add a few drops of water if you want to open aroma and soften the alcohol without rushing dilution.',
    modeDescriptions: {
      neat: 'Start neat to taste the bottle in its full original shape.',
      'water-drops': 'Add a few drops of water to open aroma and soften heat.',
      'large-rock': 'Use a single large cube if you prefer slow, controlled dilution.',
      cocktail: 'If you mix it, keep it spirit-forward so the bottle still shows.',
    },
    premiumFirst: true,
  },
  bourbon: {
    family: 'bourbon',
    title: 'How to enjoy this bourbon',
    shortWhy: 'Try it neat first, then adjust with water or a large cube.',
    detailedWhy: 'Premium bourbon often carries vanilla, caramel, oak, and spice that are easiest to read neat. A few drops of water can widen aroma, while a large cube softens the sip over time.',
    modeDescriptions: {
      neat: 'Best first pour if you want to read sweetness, oak, and texture clearly.',
      'water-drops': 'A few drops can help open the nose and reduce alcohol heat.',
      'large-rock': 'A large cube gives a slower, rounder sip without watering it down too fast.',
      cocktail: 'Best in spirit-forward builds like an Old Fashioned or Manhattan.',
    },
    premiumFirst: true,
  },
  rye: {
    family: 'rye',
    title: 'How to enjoy this rye',
    shortWhy: 'Taste it neat first so the spice profile stays clear.',
    detailedWhy: 'Rye can show pepper, mint, citrus peel, and dry spice. Start neat, then use a few drops of water if you want to soften the attack and reveal more detail.',
    modeDescriptions: {
      neat: 'Start neat to catch the spice and structure before dilution.',
      'water-drops': 'A little water can calm the edges and reveal mint or citrus notes.',
      'large-rock': 'Great if you like a slower, softer evolution in the glass.',
      cocktail: 'Works best in stirred, spirit-forward cocktails that respect rye spice.',
    },
    premiumFirst: true,
  },
  tequila: {
    family: 'tequila',
    title: 'How to enjoy this tequila',
    shortWhy: 'Try premium tequila neat first so the agave character is not buried.',
    detailedWhy: 'With quality tequila, the point is to taste cooked agave, texture, minerality, and oak if aged. Start neat, then move to a large cube if you want a slower sip.',
    modeDescriptions: {
      neat: 'Best first pour to understand the agave and texture clearly.',
      'water-drops': 'Only a few drops if the alcohol heat is hiding aroma.',
      'large-rock': 'A large cube can soften the sip while keeping the tequila in focus.',
      cocktail: 'If you mix it, use clean, respectful builds that do not bury the bottle.',
    },
    premiumFirst: true,
  },
  mezcal: {
    family: 'mezcal',
    title: 'How to enjoy this mezcal',
    shortWhy: 'Neat first helps you read smoke, fruit, herbs, and texture.',
    detailedWhy: 'Good mezcal is usually more interesting as a sipping spirit than as a background ingredient. Start neat, then add a few drops of water only if you want to soften smoke and reveal more fruit or herbs.',
    modeDescriptions: {
      neat: 'Best first pour to taste smoke, earth, fruit, and texture.',
      'water-drops': 'A few drops can soften smoke and reveal hidden aromas.',
      'large-rock': 'Use a large cube if you want a cooler, slower sip.',
      cocktail: 'If you mix it, let mezcal stay obvious in the drink.',
    },
    premiumFirst: true,
  },
  cognac: {
    family: 'cognac',
    title: 'How to enjoy this cognac',
    shortWhy: 'Start neat for the fullest expression of fruit, oak, and spice.',
    detailedWhy: 'Premium cognac rewards slower sipping. Start neat, then try a few drops of water if the alcohol is masking aroma, or a large cube if you want a softer texture.',
    modeDescriptions: {
      neat: 'Best first pour for fruit, oak, and aromatic detail.',
      'water-drops': 'A small amount of water can soften heat and open the nose.',
      'large-rock': 'Good if you want a gentler, rounder sip.',
      cocktail: 'If you mix it, keep the build simple and spirit-led.',
    },
    premiumFirst: true,
  },
  'aged-rum': {
    family: 'aged-rum',
    title: 'How to enjoy this aged rum',
    shortWhy: 'Quality aged rum often deserves a first pour neat.',
    detailedWhy: 'Aged rum can show vanilla, banana, molasses, spice, and oak. Start neat first, then move to a large cube if you want a slower, softer drink.',
    modeDescriptions: {
      neat: 'Best first pour if you want to understand the oak and sweetness balance.',
      'water-drops': 'A few drops can open aroma if the alcohol feels tight.',
      'large-rock': 'A large cube works well for a slower, rounder sip.',
      cocktail: 'If you mix it, keep the drink spirit-forward and not too sweet.',
    },
    premiumFirst: true,
  },
  'irish-whiskey': {
    family: 'irish-whiskey',
    title: 'How to enjoy this Irish whiskey',
    shortWhy: 'Try it neat first, then adjust lightly if you want more softness.',
    detailedWhy: 'Irish whiskey often shows smooth grain, orchard fruit, vanilla, and toasted wood. Start neat, then use a few drops of water or a large cube if you want a softer profile.',
    modeDescriptions: {
      neat: 'Best first pour for a clean read on smoothness and fruit.',
      'water-drops': 'A few drops can open aroma without flattening the whiskey.',
      'large-rock': 'Good if you prefer a cooler, slower sip.',
      cocktail: 'Also works well in classics if the bottle is not too precious.',
    },
    premiumFirst: false,
  },
  'japanese-whisky': {
    family: 'japanese-whisky',
    title: 'How to enjoy this Japanese whisky',
    shortWhy: 'Start neat to appreciate balance, texture, and subtle aroma.',
    detailedWhy: 'Japanese whisky often rewards careful tasting because the profile is more about balance and finesse than force. Start neat, then add a few drops of water if you want to reveal more floral or fruit notes.',
    modeDescriptions: {
      neat: 'Best first pour for balance, polish, and texture.',
      'water-drops': 'A few drops can open delicate floral and fruit notes.',
      'large-rock': 'Use a large cube if you want a slow, elegant dilution.',
      cocktail: 'If you mix it, keep the drink clean and restrained.',
    },
    premiumFirst: true,
  },
};
