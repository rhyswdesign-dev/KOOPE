import { HOSTING_MOCKTAIL_RECIPES } from './hostingMocktails';

export const HOSTING_PARTY_SUPPLEMENTS = [
  {
    id: 'fruit-punch',
    title: 'Fruit Punch',
    name: 'Fruit Punch',
    subtitle: 'Party • Crowd-Pleaser',
    category: 'Party Punch',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    ingredients: [
      { name: 'White Rum', amount: '4', unit: 'oz' },
      { name: 'Dark Rum', amount: '2', unit: 'oz' },
      { name: 'Pineapple Juice', amount: '8', unit: 'oz' },
      { name: 'Orange Juice', amount: '6', unit: 'oz' },
      { name: 'Fresh Lime Juice', amount: '2', unit: 'oz' },
      { name: 'Grenadine', amount: '1', unit: 'oz' },
    ],
    description: 'Classic party punch built for groups.',
    recipeType: 'cocktail',
    baseSpirit: 'rum',
    tags: ['party', 'punch', 'batch-friendly'],
  },
];

export const HOSTING_RECIPE_SUPPLEMENTS = [
  ...HOSTING_MOCKTAIL_RECIPES,
  ...HOSTING_PARTY_SUPPLEMENTS,
];

