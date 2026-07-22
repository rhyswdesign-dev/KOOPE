/**
 * Entrance animation presets
 * One consistent motion language for content appearing on screen.
 * Use with Reanimated layout animations:
 *
 *   <Animated.View entering={listItemEntering(index)}>
 *     <RecipeCard ... />
 *   </Animated.View>
 *
 *   <Animated.View entering={cardEntering}> ... </Animated.View>
 *
 * Reanimated automatically skips layout animations when the system
 * Reduce Motion setting is on.
 */

import { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { durations } from '../../theme/tokens';

/** Max items that stagger; everything after slides in together */
const MAX_STAGGER_INDEX = 10;
const STAGGER_MS = 55;

/** Staggered slide-up for list/grid items (cap keeps long lists snappy) */
export const listItemEntering = (index: number) =>
  FadeInDown.delay(Math.min(index, MAX_STAGGER_INDEX) * STAGGER_MS)
    .springify()
    .damping(18)
    .stiffness(160);

/** Single card / section appearing */
export const cardEntering = FadeInDown.duration(durations.normal)
  .springify()
  .damping(18)
  .stiffness(160);

/** Modals, badges, unlock reveals */
export const popEntering = ZoomIn.springify().damping(14).stiffness(180);

/** Quiet fade for text/detail content */
export const fadeEntering = FadeIn.duration(durations.fast);
