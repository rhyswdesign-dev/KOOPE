export type CollectibleRecipeCardType = 'premium' | 'mixology';

export interface CollectibleRecipeCardSpecLine {
  name: string;
  amount: string;
}

export interface CollectibleRecipeCardModule {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

export interface CollectibleRecipeCard {
  id: string;
  slug: string;
  type: CollectibleRecipeCardType;
  title: string;
  subtitle: string;
  categoryLabel: string;
  unlockLabel: string;
  heroImage: string;
  heroKicker?: string;
  tierLabel?: string;
  garnish?: string;
  whyUnlockedTitle?: string;
  heroEyebrow?: string;
  technicalBadge?: string;
  meta: {
    time: string;
    difficulty: string;
    glassware: string;
  };
  spec: CollectibleRecipeCardSpecLine[];
  method: string[];
  tastingNote?: string;
  prepBlock?: {
    title: string;
    lines: string[];
  };
  technicalModules?: CollectibleRecipeCardModule[];
  buildLogic?: string;
  serviceNote?: string;
}
