export type UnlockDeckSlideKind = 'cover' | 'spec' | 'comparison' | 'field_notes';

export interface UnlockDeckSlide {
  id: string;
  kind: UnlockDeckSlideKind;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ratio?: string;
  body?: string;
  sections?: Array<{
    label: string;
    value?: string;
    bullets?: string[];
  }>;
  columns?: Array<{
    title: string;
    subtitle?: string;
    bullets: string[];
  }>;
  notes?: string[];
  footer?: string;
}

export interface UnlockDeckDefinition {
  slug: string;
  title: string;
  kicker: string;
  rewardLabel: string;
  watermark: string;
  slides: UnlockDeckSlide[];
}

export const UNLOCK_DECKS: Record<string, UnlockDeckDefinition> = {
  'simple-rich-syrup-basics': {
    slug: 'simple-rich-syrup-basics',
    title: 'Simple Syrup + Rich Syrup Basics',
    kicker: 'Field Guide Vol. 01',
    rewardLabel: 'Unlocked in KOOPE',
    watermark: 'KOOPE Field Guide',
    slides: [
      {
        id: 'cover',
        kind: 'cover',
        eyebrow: 'Premium Module',
        title: 'Simple Syrup\n+\nRich Syrup\nBasics',
        subtitle: 'The first prep system every bar should get right.',
        footer: 'Field Guide No. 01',
      },
      {
        id: 'simple',
        kind: 'spec',
        eyebrow: 'Field Guide Vol. 1',
        title: 'Simple Syrup',
        ratio: '1:1',
        subtitle: 'Sugar to water',
        sections: [
          {
            label: 'Flavor Impact',
            value:
              'Clean, neutral sweetness that lifts citrus and stabilizes texture without changing the base spirit.',
          },
          {
            label: 'Best Use Cases',
            bullets: ['Classic sours', 'Bright highballs', 'Drinks that need lift, not weight'],
          },
          {
            label: 'Storage',
            value: 'Refrigerate, label clearly, and use while fresh for the cleanest finish.',
          },
        ],
        footer: 'Use simple when the drink needs brightness more than body.',
      },
      {
        id: 'rich',
        kind: 'spec',
        eyebrow: 'Field Guide No. 03',
        title: 'Rich Syrup',
        ratio: '2:1',
        subtitle: 'Sugar to water',
        sections: [
          {
            label: 'Flavor Impact',
            bullets: [
              'Adds silkier texture and more weight on the palate.',
              'Delivers stronger sweetness with less added dilution.',
            ],
          },
          {
            label: 'Best Use Cases',
            bullets: ['Old Fashioneds', 'Spirit-forward riffs', 'Builds that feel thin or sharp'],
          },
          {
            label: 'Storage & Stability',
            value: 'Refrigerate, label, and monitor freshness. Rich syrup lasts longer, but consistency still matters.',
          },
        ],
        footer: 'Use rich when the drink needs body, not just sweetness.',
      },
      {
        id: 'comparison',
        kind: 'comparison',
        eyebrow: 'Technical Layout // Slide 04',
        title: 'Field Guide: Syrup Variance',
        columns: [
          {
            title: 'Simple (1:1)',
            subtitle: 'Lift',
            bullets: [
              'Cleaner sweetness',
              'Lighter texture',
              'Higher water content',
              'Better for bright, citrus-led builds',
            ],
          },
          {
            title: 'Rich (2:1)',
            subtitle: 'Weight',
            bullets: [
              'Denser sweetness',
              'Silkier mouthfeel',
              'Lower dilution impact',
              'Better for stirred and spirit-forward drinks',
            ],
          },
        ],
        footer: 'Rule of thumb: use simple for lift, rich for weight.',
      },
      {
        id: 'notes',
        kind: 'field_notes',
        eyebrow: 'Series 05 // Vol. 1',
        title: 'Technical\nMastery',
        notes: [
          'Over-dilution: extra stirring or wet ice strips texture and pushes sweetness flat.',
          'Incorrect temperature: warm glassware makes rich syrup feel heavy instead of polished.',
          'Wrong syrup choice: bright drinks can turn sluggish when rich syrup replaces 1:1 without purpose.',
        ],
        body:
          'Precision is not just ratios. Syrup choice shapes texture, finish, and how sweetness behaves over time.',
        footer: 'Field note: good prep makes drinks repeatable.',
      },
    ],
  },
  'shake-vs-stir': {
    slug: 'shake-vs-stir',
    title: 'Shake vs Stir',
    kicker: 'Bartender Hack Vol. 02',
    rewardLabel: 'Unlocked in KOOPE',
    watermark: 'KOOPE Bartender Hack',
    slides: [
      {
        id: 'cover',
        kind: 'cover',
        eyebrow: 'Prep Hack',
        title: 'Shake\nvs\nStir',
        subtitle: 'The first build decision that changes texture, clarity, and dilution.',
        footer: 'Field Guide No. 02',
      },
      {
        id: 'shake',
        kind: 'spec',
        eyebrow: 'Technique Split',
        title: 'Shake',
        ratio: 'AERATE',
        subtitle: 'Chill + dilution + lift',
        sections: [
          { label: 'Use For', bullets: ['Citrus', 'Juice', 'Syrups', 'Egg white or aquafaba'] },
          { label: 'What It Does', value: 'Builds texture fast, integrates uneven ingredients, and creates a colder, brighter drink.' },
          { label: 'Watch For', value: 'Over-shaking can flatten balance and strip structure.' },
        ],
        footer: 'If the drink needs lift or integration, shake it.',
      },
      {
        id: 'stir',
        kind: 'spec',
        eyebrow: 'Technique Split',
        title: 'Stir',
        ratio: 'CLARIFY',
        subtitle: 'Control + polish + silk',
        sections: [
          { label: 'Use For', bullets: ['Spirit-forward cocktails', 'Vermouth builds', 'Bitter cocktails', 'Drinks without citrus'] },
          { label: 'What It Does', value: 'Keeps the drink clean, glossy, and precise while controlling dilution.' },
          { label: 'Watch For', value: 'Warm glassware or wet ice will still ruin a stirred drink.' },
        ],
        footer: 'If the drink needs polish and clarity, stir it.',
      },
      {
        id: 'comparison',
        kind: 'comparison',
        eyebrow: 'Decision Table',
        title: 'When to Use Each',
        columns: [
          {
            title: 'Shake',
            subtitle: 'Lift',
            bullets: ['Cloudier finish', 'More aeration', 'Faster chill', 'Best with citrus, syrups, foam'],
          },
          {
            title: 'Stir',
            subtitle: 'Polish',
            bullets: ['Cleaner finish', 'Lower aeration', 'Controlled dilution', 'Best with all-spirit builds'],
          },
        ],
        footer: 'Rule of thumb: uneven ingredients get shaken, spirit structure gets stirred.',
      },
      {
        id: 'notes',
        kind: 'field_notes',
        eyebrow: 'Field Notes',
        title: 'Fast Fixes',
        notes: [
          'If a sour tastes flat, check your shake before changing the recipe.',
          'If a Martini looks cloudy, your technique was probably wrong before the gin was.',
          'Wet ice makes both techniques worse, just in different ways.',
        ],
        body: 'Technique is not tradition for tradition’s sake. It changes the finished drink in the glass.',
        footer: 'Field note: the right move is the one the drink structure asks for.',
      },
    ],
  },
  'citrus-balance-fixes': {
    slug: 'citrus-balance-fixes',
    title: 'Citrus Balance Fixes',
    kicker: 'Bartender Hack Vol. 03',
    rewardLabel: 'Unlocked in KOOPE',
    watermark: 'KOOPE Bartender Hack',
    slides: [
      {
        id: 'cover',
        kind: 'cover',
        eyebrow: 'Flavor Hack',
        title: 'Citrus\nBalance\nFixes',
        subtitle: 'Fast adjustments for drinks that are too sharp, too soft, or just off.',
        footer: 'Field Guide No. 03',
      },
      {
        id: 'too-sour',
        kind: 'spec',
        eyebrow: 'Diagnostic',
        title: 'Too Sour',
        ratio: 'ADD CONTROL',
        subtitle: 'Sweetness or dilution',
        sections: [
          { label: 'First Move', bullets: ['Add sweetness in small increments', 'Check temperature and dilution first'] },
          { label: 'Do Not', value: 'Do not rush to add more spirit. It usually makes the imbalance harsher.' },
          { label: 'Best Fix', value: 'If the drink is cold and sharp, add sweetness. If it is hot and sharp, add dilution.' },
        ],
        footer: 'Sour usually means you need control, not power.',
      },
      {
        id: 'too-sweet',
        kind: 'spec',
        eyebrow: 'Diagnostic',
        title: 'Too Sweet',
        ratio: 'ADD EDGE',
        subtitle: 'Acid, bitterness, or length',
        sections: [
          { label: 'First Move', bullets: ['Add citrus or acid', 'Add bitterness if structure supports it', 'Lengthen with soda if it is a highball build'] },
          { label: 'Do Not', value: 'Avoid adding more syrup-rich modifier just because the flavor feels weak.' },
          { label: 'Best Fix', value: 'Citrus usually fixes sweetness fastest. Bitters help if the drink also feels flat.' },
        ],
        footer: 'Sweetness needs contrast to feel precise.',
      },
      {
        id: 'comparison',
        kind: 'comparison',
        eyebrow: 'Quick Table',
        title: 'What the Drink Needs',
        columns: [
          {
            title: 'If It Feels Sharp',
            subtitle: 'Reduce aggression',
            bullets: ['Add sweetness', 'Increase dilution', 'Re-check temperature', 'Soften citrus edge'],
          },
          {
            title: 'If It Feels Heavy',
            subtitle: 'Add structure',
            bullets: ['Add acid', 'Add bitterness', 'Lengthen the drink', 'Reduce syrup weight'],
          },
        ],
        footer: 'Simple = balance | Rich = control',
      },
      {
        id: 'notes',
        kind: 'field_notes',
        eyebrow: 'Field Notes',
        title: 'Bartender Notes',
        notes: [
          'Balance is rarely fixed by one ingredient in isolation.',
          'Temperature can make the same ratio taste brighter or heavier.',
          'A better fix is usually smaller than you think.',
        ],
        body: 'Fix the pressure point, not just the loudest flavor.',
        footer: 'Field note: the best correction is the smallest one that restores structure.',
      },
    ],
  },
  'easy-flavor-pairing-matrix': {
    slug: 'easy-flavor-pairing-matrix',
    title: 'Easy Flavor Pairing Matrix',
    kicker: 'Bartender Hack Vol. 04',
    rewardLabel: 'Unlocked in KOOPE',
    watermark: 'KOOPE Bartender Hack',
    slides: [
      {
        id: 'cover',
        kind: 'cover',
        eyebrow: 'Flavor Hack',
        title: 'Easy\nFlavor\nPairing\nMatrix',
        subtitle: 'A fast system for pairing spirit, citrus, sweetener, and modifier.',
        footer: 'Field Guide No. 04',
      },
      {
        id: 'spirit-citrus',
        kind: 'spec',
        eyebrow: 'Build Logic',
        title: 'Spirit + Citrus',
        ratio: 'PAIR',
        subtitle: 'Start with the backbone',
        sections: [
          { label: 'Bright Pairings', bullets: ['Gin + lemon', 'Tequila + lime', 'Vodka + grapefruit'] },
          { label: 'Richer Pairings', bullets: ['Bourbon + lemon', 'Rum + lime', 'Brandy + orange or lemon'] },
          { label: 'Rule', value: 'Match brighter spirits with sharper citrus. Match richer spirits with rounder citrus or softer acid.' },
        ],
        footer: 'The backbone determines what the drink can carry.',
      },
      {
        id: 'sweetener-modifier',
        kind: 'spec',
        eyebrow: 'Build Logic',
        title: 'Sweetener + Modifier',
        ratio: 'SHAPE',
        subtitle: 'Add body and identity',
        sections: [
          { label: 'For Lift', bullets: ['Simple syrup', 'Dry orange liqueur', 'Light herbal modifiers'] },
          { label: 'For Weight', bullets: ['Rich syrup', 'Honey syrup', 'Amaro or deeper liqueurs'] },
          { label: 'Rule', value: 'Use sweetener for structure and modifiers for personality.' },
        ],
        footer: 'Sweetness supports. Modifiers define.',
      },
      {
        id: 'comparison',
        kind: 'comparison',
        eyebrow: 'Matrix View',
        title: 'Fast Pairing Routes',
        columns: [
          {
            title: 'Refreshing Route',
            subtitle: 'Lift',
            bullets: ['Gin or tequila', 'Lemon or lime', 'Simple syrup', 'Dry modifier'],
          },
          {
            title: 'Rounder Route',
            subtitle: 'Weight',
            bullets: ['Rum or whiskey', 'Lemon or grapefruit', 'Rich or honey syrup', 'Amaro / spice modifier'],
          },
        ],
        footer: 'Build from backbone -> acid -> sweetener -> modifier.',
      },
      {
        id: 'notes',
        kind: 'field_notes',
        eyebrow: 'Field Notes',
        title: 'Pairing Notes',
        notes: [
          'If the drink feels hollow, the modifier may be missing.',
          'If it feels confused, your citrus and spirit may be fighting each other.',
          'If it tastes sweet but empty, the sweetener has no supporting aroma.',
        ],
        body: 'Good pairing is less about “correct” ingredients and more about keeping every part pointed in the same direction.',
        footer: 'Field note: flavor becomes easier when each ingredient has a job.',
      },
    ],
  },
  'how-to-fix-an-unbalanced-cocktail': {
    slug: 'how-to-fix-an-unbalanced-cocktail',
    title: 'How to Fix an Unbalanced Cocktail',
    kicker: 'Bartender Hack Vol. 05',
    rewardLabel: 'Unlocked in KOOPE',
    watermark: 'KOOPE Bartender Hack',
    slides: [
      {
        id: 'cover',
        kind: 'cover',
        eyebrow: 'Flavor Hack',
        title: 'How to Fix\nan Unbalanced\nCocktail',
        subtitle: 'A quick diagnostic system for drinks that taste too strong, too sweet, too bitter, or just wrong.',
        footer: 'Field Guide No. 05',
      },
      {
        id: 'diagnose',
        kind: 'spec',
        eyebrow: 'Step 1',
        title: 'Diagnose First',
        ratio: 'READ',
        subtitle: 'Find the pressure point',
        sections: [
          { label: 'Ask', bullets: ['Too sharp?', 'Too heavy?', 'Too hot?', 'Too flat?'] },
          { label: 'Check', bullets: ['Temperature', 'Dilution', 'Sweetness source', 'Acid or bitter structure'] },
          { label: 'Rule', value: 'Do not change the recipe before checking temperature and dilution.' },
        ],
        footer: 'Most “bad drinks” are balance problems, not recipe problems.',
      },
      {
        id: 'fixes',
        kind: 'spec',
        eyebrow: 'Step 2',
        title: 'Use the Right Fix',
        ratio: 'ADJUST',
        subtitle: 'Small moves win',
        sections: [
          { label: 'Too Strong', bullets: ['Add dilution', 'Check chill', 'Lengthen if appropriate'] },
          { label: 'Too Sweet', bullets: ['Add acid', 'Add bitterness', 'Reduce syrup weight'] },
          { label: 'Too Bitter', bullets: ['Add sweetness', 'Reduce modifier intensity', 'Lengthen the drink'] },
          { label: 'Too Sour', bullets: ['Add sweetness', 'Add slight dilution', 'Reduce acid edge'] },
        ],
        footer: 'The smaller the correction, the cleaner the final drink.',
      },
      {
        id: 'comparison',
        kind: 'comparison',
        eyebrow: 'Decision Grid',
        title: 'Fix by Feel',
        columns: [
          {
            title: 'If It Feels Aggressive',
            subtitle: 'Soften',
            bullets: ['Add sweetness', 'Add dilution', 'Re-check chill', 'Reduce acid or bitter edge'],
          },
          {
            title: 'If It Feels Dull',
            subtitle: 'Sharpen',
            bullets: ['Add acid', 'Add aroma', 'Add bitterness', 'Tighten dilution'],
          },
        ],
        footer: 'Aggressive drinks need softening. Dull drinks need contrast.',
      },
      {
        id: 'notes',
        kind: 'field_notes',
        eyebrow: 'Field Notes',
        title: 'Bartender Notes',
        notes: [
          'Guessing larger fixes usually creates a second problem.',
          'A drink can taste too strong because it is warm, not because it has too much alcohol.',
          'Balance is easier to restore when you know whether the issue is texture, sweetness, acid, or finish.',
        ],
        body: 'Fix the system, not just the symptom.',
        footer: 'Field note: great bartenders correct with intention, not panic.',
      },
    ],
  },
};

export function getUnlockDeck(slug?: string | null): UnlockDeckDefinition | undefined {
  if (!slug) return undefined;
  return UNLOCK_DECKS[slug];
}
