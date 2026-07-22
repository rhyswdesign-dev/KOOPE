/**
 * Phase 3.4 fading scaffold: a recipe's Method section renders as a full
 * numbered walkthrough, condensed steps, or a single-line spec depending
 * on how many times the signed-in user has made it (Plus/Pro only — Free's
 * separate tier-truncated teaser is untouched by this).
 */

export type MethodRenderMode = 'full' | 'condensed' | 'spec';

export function trimSentence(value: string, maxLength: number): string {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).match(/^(.*?[.!?])\s/);
  if (sentenceBreak?.[1]) return sentenceBreak[1];

  const truncated = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}...`;
}

export function resolveMethodRenderMode(params: {
  isFreeTier: boolean;
  showFullMethod: boolean;
  timesMade: number;
}): MethodRenderMode {
  const { isFreeTier, showFullMethod, timesMade } = params;
  if (isFreeTier || showFullMethod) return 'full';
  if (timesMade >= 5) return 'spec';
  if (timesMade >= 2) return 'condensed';
  return 'full';
}

export function buildCondensedSteps(steps: string[], maxLength = 60): string[] {
  return steps.map((step) => trimSentence(String(step || ''), maxLength)).filter(Boolean);
}

export function buildMethodSpecLine(steps: string[], maxStepLength = 40): string {
  return steps
    .map((step) => trimSentence(String(step || ''), maxStepLength).replace(/\.$/, ''))
    .filter(Boolean)
    .join(' → ');
}
