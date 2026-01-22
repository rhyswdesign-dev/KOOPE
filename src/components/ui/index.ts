/**
 * UI Components Index
 * Central export file for all UI components
 */

// Existing components
export { default as Card } from './Card';
export { default as Section } from './Section';
export { default as SectionHeader } from './SectionHeader';
export { default as Avatar } from './Avatar';
export { default as Icon } from './Icon';
export { default as BrandPillButton } from './BrandPillButton';
export { default as InfoRow } from './InfoRow';
export { default as PillButton } from '../PillButton';
export { default as SectionTitle } from './SectionTitle';
export { default as Header } from './Header';
export { default as SearchInput } from './SearchInput';
export { default as Toast } from './Toast';
export { default as Modal } from './Modal';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as EmptyState, SearchEmptyState, ErrorEmptyState, OfflineEmptyState, ListEmptyState } from './EmptyState';
export { default as LoadingOverlay, LoadingProvider, useLoading, useAsyncOperation, useProgressLoading } from './LoadingOverlay';
export { default as AudioButton } from './AudioButton';

// New components
export { default as VideoPlayer, InlineVideoPlayer, CompactVideoPlayer } from './VideoPlayer';
export { default as LocationMap, CompactLocationMap, BasicLocationMap } from './LocationMap';
export { default as ActionMenu, SaveActionMenu, ContentActionMenu } from './ActionMenu';
export { default as Skeleton } from '../Skeleton';
export { 
  default as FeatureTooltip, 
  FeatureTooltipProvider,
  useFeatureTooltip,
  useFeatureTooltipContext,
  markFeatureAsSeen,
  getSeenFeatures,
  hasSeenFeature,
  clearSeenFeatures
} from './FeatureTooltip';

// Types
export type { LocationData } from './LocationMap';
export type { ActionMenuItem } from './ActionMenu';
export type { FeatureInfo } from './FeatureTooltip';