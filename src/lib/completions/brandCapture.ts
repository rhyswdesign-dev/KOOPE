/**
 * Brand Capture Configuration
 * Controls what the "How did you make this?" completion prompt shows per tier.
 * ALL tiers capture brand selections and ratings (25x data multiplier for brand pitches).
 * Pro unlocks detailed notes + photo upload.
 */

export type CompletionPlan = 'free' | 'plus' | 'pro';

export interface CompletionPromptConfig {
  promptText: string;
  showBrandCapture: boolean;
  showRating: boolean;
  showQuickNotes: boolean;
  showDetailedNotes: boolean;
  showPhotoUpload: boolean;
  notesCharLimit: number;
  notesPlaceholder: string;
  xpReward: number;
}

export function getCompletionPromptConfig(plan: CompletionPlan): CompletionPromptConfig {
  const isPro = plan === 'pro';
  const isPlus = plan === 'plus';

  return {
    promptText: 'How did you make this?',
    showBrandCapture: true,           // ALL tiers — this is the key data for brand partnerships
    showRating: true,                  // ALL tiers
    showQuickNotes: true,              // ALL tiers
    showDetailedNotes: isPro,          // PRO only (500 chars)
    showPhotoUpload: isPro,            // PRO only
    notesCharLimit: isPro ? 500 : 50,
    notesPlaceholder: isPro
      ? 'Tasting notes, technique variations, modifications... (500 chars)'
      : 'Quick note (50 chars)',
    xpReward: isPro ? 100 : isPlus ? 75 : 50,
  };
}

/** Map UserTier store values to CompletionPlan */
export function tierToCompletionPlan(tier: string): CompletionPlan {
  if (tier === 'PRO') return 'pro';
  if (tier === 'PLUS') return 'plus';
  return 'free';
}
