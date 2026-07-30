/**
 * Animation Components Export
 * Centralized exports for all animation components
 */

export { CompletionAnimation } from './CompletionAnimation';
export { QuickFeedbackAnimation } from './QuickFeedbackAnimation';
export { AnimationDemo } from './AnimationDemo';

// Core animation kit (Reanimated, UI-thread, reduce-motion aware)
export { default as PressableScale } from './PressableScale';
export { default as ShakerLoader } from './ShakerLoader';
export { default as ConfettiBurst } from './ConfettiBurst';
export { default as CountUp } from './CountUp';
export { default as AnimatedProgressBar } from './AnimatedProgressBar';
export { listItemEntering, cardEntering, popEntering, fadeEntering } from './entering';

// Export types
export type { CompletionAnimationType } from '../../hooks/useCompletionAnimation';
export type { PressableScaleProps } from './PressableScale';
export type { ShakerLoaderProps } from './ShakerLoader';
export type { ConfettiBurstProps } from './ConfettiBurst';
export type { CountUpProps } from './CountUp';
export type { AnimatedProgressBarProps } from './AnimatedProgressBar';

// Re-export the hook for convenience
export { useCompletionAnimation } from '../../hooks/useCompletionAnimation';
