import type { CollectibleRecipeCard } from '../types/recipeCards';

export const COLLECTIBLE_RECIPE_CARDS: CollectibleRecipeCard[] = [
  {
    id: 'gimlet-premium-card',
    slug: 'gimlet-premium-card',
    type: 'premium',
    title: 'Gimlet',
    subtitle: 'Modern • Gin-Based',
    categoryLabel: 'Premium Recipe Card',
    unlockLabel: 'Unlocked for clean balance and citrus discipline.',
    heroImage: 'https://images.unsplash.com/photo-1514362545857-3f16c0c5604c?q=80&w=1200&auto=format&fit=crop',
    heroKicker: 'Recipe',
    heroEyebrow: 'Unlocked In KOOPE',
    tierLabel: 'FREE',
    garnish: 'Lime coin',
    whyUnlockedTitle: 'Why You Unlocked This',
    meta: {
      time: '3 min',
      difficulty: 'Easy',
      glassware: 'Coupe',
    },
    spec: [
      { name: 'London dry gin', amount: '2 oz' },
      { name: 'Fresh lime juice', amount: '0.75 oz' },
      { name: 'Rich lime cordial', amount: '0.5 oz' },
      { name: 'Saline', amount: '2 drops' },
    ],
    method: [
      'Shake hard with cold, dry ice until the tin feels tight and frosted.',
      'Double strain into a chilled coupe to keep the texture polished.',
      'Express a lime coin lightly, then set it with restraint.',
    ],
    tastingNote:
      'Lean citrus up front, then a quieter sweet edge and a sharper, more disciplined finish.',
  },
  {
    id: 'distillers-reserve-manhattan-card',
    slug: 'distillers-reserve-manhattan-card',
    type: 'mixology',
    title: "Distiller's Reserve Manhattan",
    subtitle: 'Stirred • Whiskey-Forward',
    categoryLabel: 'Mixology Recipe Card',
    unlockLabel: 'Reserved for PLUS and PRO mixology progression.',
    heroImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    heroKicker: 'Mixology',
    heroEyebrow: 'Reserved In KOOPE',
    tierLabel: 'PRO',
    technicalBadge: 'Stirred Spec',
    garnish: 'Orange expression',
    whyUnlockedTitle: 'Why You Unlocked This',
    meta: {
      time: '4 min',
      difficulty: 'Advanced',
      glassware: 'Nick & Nora',
    },
    spec: [
      { name: 'Reserve rye whiskey', amount: '2 oz' },
      { name: 'Italian sweet vermouth', amount: '0.75 oz' },
      { name: 'Dry curaçao', amount: '0.125 oz' },
      { name: 'Aromatic bitters', amount: '2 dashes' },
      { name: 'Cherry bark bitters', amount: '1 dash' },
    ],
    method: [
      'Stir with dense, cold ice until the texture turns glossy and the dilution is fully integrated.',
      'Strain into a deeply chilled Nick & Nora to preserve lift and line.',
      'Finish with a restrained orange expression and a neat, dark cherry.',
    ],
    prepBlock: {
      title: 'Supporting Component',
      lines: [
        'Sweet vermouth should be opened fresh and held cold.',
        'Use a higher-proof rye to keep the vermouth and curaçao in frame.',
      ],
    },
    technicalModules: [
      {
        id: 'bitters',
        eyebrow: 'Bitters',
        title: 'Layering the Spice',
        body:
          'Aromatic bitters build the spine. Cherry bark bitters deepen the finish and pull the whiskey darker without making the drink read sweet.',
      },
      {
        id: 'vermouth',
        eyebrow: 'Vermouth',
        title: 'Cold Storage Matters',
        body:
          'Hold the vermouth refrigerated and fresh. Oxidation softens the middle and makes the Manhattan feel tired before the rye can carry it.',
      },
      {
        id: 'curaçao',
        eyebrow: 'Orange Note',
        title: 'Use With Restraint',
        body:
          'The curaçao should not announce itself. It exists to round edges and polish transitions between spice, oak, and sweetness.',
      },
      {
        id: 'dilution',
        eyebrow: 'Dilution',
        title: 'Stir Until Glossy',
        body:
          'This spec needs full chilling and measured dilution. Stop when the drink turns glossy and seamless, not merely cold.',
      },
    ],
    buildLogic:
      'The curaçao is not there to read as orange. It rounds the mid-palate and keeps the vermouth from landing too soft.',
    serviceNote:
      'If you need a drier finish, reduce vermouth slightly before changing the bitters structure.',
  },
];

export const getCollectibleRecipeCard = (cardId?: string | null) =>
  COLLECTIBLE_RECIPE_CARDS.find((card) => card.id === cardId);

export const getCollectibleRecipeCardBySlug = (slug?: string | null) =>
  COLLECTIBLE_RECIPE_CARDS.find((card) => card.slug === slug);
