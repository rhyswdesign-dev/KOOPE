// @ts-nocheck
/**
 * Seed Data for Bartending App
 * Mock content to demonstrate the lesson engine
 */

import { Module, Lesson, Item } from '../../types/domain';

export const seedModules: Module[] = [
  {
    id: 'ch1-intro',
    title: 'Bartending Basics',
    chapterIndex: 1,
    description: 'Learn the fundamentals of bartending',
    prerequisiteIds: [],
    estimatedMinutes: 25,
    tags: ['basics', 'foundation']
  },
  {
    id: 'ch2-tools-terms',
    title: 'Tools & Terminology',
    chapterIndex: 2,
    description: 'Master essential bar tools and bartending language',
    prerequisiteIds: ['ch1-intro'],
    estimatedMinutes: 40,
    tags: ['tools', 'terminology']
  },
  {
    id: 'gin-101',
    title: 'Gin Essentials',
    chapterIndex: 0, // Spirit modules
    description: 'Everything you need to know about gin',
    prerequisiteIds: [],
    estimatedMinutes: 15,
    tags: ['gin', 'spirits', 'spirit101']
  },
  {
    id: 'rum-101',
    title: 'Rum Fundamentals',
    chapterIndex: 0,
    description: 'Explore the world of rum',
    prerequisiteIds: [],
    estimatedMinutes: 15,
    tags: ['rum', 'spirits', 'spirit101']
  }
];

export const seedLessons: Lesson[] = [
  {
    id: 'lesson-glassware',
    moduleId: 'ch1-intro',
    title: 'Glassware Basics',
    types: ['mcq', 'order'],
    itemIds: ['item-glass-1', 'item-glass-2', 'item-glass-order'],
    estimatedMinutes: 5,
    prereqs: []
  },
  {
    id: 'lesson-shake-stir',
    moduleId: 'ch1-intro',
    title: 'Shake vs Stir',
    types: ['mcq', 'short'],
    itemIds: ['item-shake-1', 'item-stir-1', 'item-technique-short'],
    estimatedMinutes: 4,
    prereqs: []
  },
  {
    id: 'lesson-gin-basics',
    moduleId: 'gin-101',
    title: 'What is Gin?',
    types: ['mcq', 'short'],
    itemIds: ['item-gin-def', 'item-gin-botanicals', 'item-gin-short'],
    estimatedMinutes: 3,
    prereqs: []
  }
];

export const seedItems: Item[] = [
  // Glassware items
  {
    id: 'item-glass-1',
    type: 'mcq',
    prompt: 'Which glass is traditionally used for a Martini?',
    options: ['Highball', 'Coupe', 'Collins', 'Old Fashioned'],
    answerIndex: 1,
    tags: ['glassware', 'martini'],
    difficulty: 0.3
  },
  {
    id: 'item-glass-2',
    type: 'mcq',
    prompt: 'What type of glass would you use for a Whiskey Sour?',
    options: ['Coupe', 'Rocks glass', 'Champagne flute', 'Hurricane'],
    answerIndex: 0,
    tags: ['glassware', 'whiskey-sour'],
    difficulty: 0.4
  },
  {
    id: 'item-glass-order',
    type: 'order',
    prompt: 'Order these glasses from smallest to largest capacity:',
    orderTarget: ['Shot glass', 'Coupe', 'Rocks glass', 'Highball'],
    tags: ['glassware', 'capacity'],
    difficulty: 0.5
  },

  // Shake vs Stir items
  {
    id: 'item-shake-1',
    type: 'mcq',
    prompt: 'Which cocktail should be shaken, not stirred?',
    options: ['Manhattan', 'Martini', 'Margarita', 'Negroni'],
    answerIndex: 2,
    tags: ['technique', 'shaking'],
    difficulty: 0.4
  },
  {
    id: 'item-stir-1',
    type: 'mcq',
    prompt: 'Why do we stir spirit-forward cocktails like a Manhattan?',
    options: [
      'To add air and create foam',
      'To maintain clarity and smooth texture',
      'To cool the drink faster',
      'To mix the ingredients more thoroughly'
    ],
    answerIndex: 1,
    tags: ['technique', 'stirring'],
    difficulty: 0.6
  },
  {
    id: 'item-technique-short',
    type: 'short',
    prompt: 'Name one cocktail that contains citrus and should be shaken:',
    answerText: 'whiskey sour',
    tags: ['technique', 'citrus'],
    difficulty: 0.5
  },

  // Gin items
  {
    id: 'item-gin-def',
    type: 'mcq',
    prompt: 'What is the primary botanical that defines gin?',
    options: ['Coriander', 'Angelica', 'Juniper', 'Citrus peel'],
    answerIndex: 2,
    tags: ['gin', 'botanicals'],
    difficulty: 0.3
  },
  {
    id: 'item-gin-botanicals',
    type: 'mcq',
    prompt: 'Which of these is NOT a common gin botanical?',
    options: ['Juniper berries', 'Coriander seeds', 'Vanilla beans', 'Angelica root'],
    answerIndex: 2,
    tags: ['gin', 'botanicals'],
    difficulty: 0.5
  },
  {
    id: 'item-gin-short',
    type: 'short',
    prompt: 'Name a classic gin cocktail that uses vermouth:',
    answerText: 'martini',
    tags: ['gin', 'cocktails'],
    difficulty: 0.4
  }
];