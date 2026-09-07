/**
 * UI Components Index
 * Central export file for all UI components
 */

// Existing components
export { default as Section } from './Section';
export { default as Avatar } from './Avatar';
export { default as Icon } from './Icon';
export { default as InfoRow } from './InfoRow';
export { default as SectionTitle } from './SectionTitle';
export { default as Header } from './Header';
export { default as SearchInput } from './SearchInput';
export { ToastProvider as Toast, useToast } from './Toast';
export { ModalProvider as Modal, useModal } from './Modal';
export {
  ConfirmDialogProvider as ConfirmDialog,
  useConfirmDialog,
  useQuickConfirm,
} from './ConfirmDialog';
export {
  LoadingProvider as LoadingOverlay,
  LoadingProvider,
  useLoading,
  useAsyncOperation,
  useProgressLoading,
} from './LoadingOverlay';
export { default as AudioButton } from './AudioButton';
export { default as Heading } from './Heading';
export { default as InPageTabBar } from './InPageTabBar';
export { default as MainPageHeader } from './MainPageHeader';

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
  clearSeenFeatures,
} from './FeatureTooltip';

// Types
export type { LocationData } from './LocationMap';
export type { ActionMenuItem } from './ActionMenu';
export type { FeatureInfo } from './FeatureTooltip';
