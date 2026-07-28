/**
 * NAVIGATION REF
 * A single app-wide handle on the NavigationContainer so non-React code
 * (notification taps, deep links, background handlers) can navigate.
 *
 * App.tsx passes this ref to <NavigationContainer ref={navigationRef}>. Any
 * navigate() issued before the container is ready is queued and replayed on
 * the next markNavigationReady() call — notification taps routinely arrive
 * during cold start, before the tree has mounted.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import { log } from './logger';

export const navigationRef = createNavigationContainerRef<any>();

type PendingNavigation = { name: string; params?: object };

let pendingNavigation: PendingNavigation | null = null;

/**
 * Navigate as soon as the container allows. Returns true if the navigation
 * happened immediately, false if it was queued for replay on ready.
 */
export function navigateWhenReady(name: string, params?: object): boolean {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(name, params);
    return true;
  }

  log.info('NavigationRef', 'Navigation queued until container is ready', { name });
  pendingNavigation = { name, params };
  return false;
}

/**
 * Called from NavigationContainer's onReady. Flushes a queued navigation.
 */
export function markNavigationReady(): void {
  if (!pendingNavigation) return;
  const { name, params } = pendingNavigation;
  pendingNavigation = null;
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(name, params);
  }
}

/**
 * Drops any queued navigation without performing it.
 */
export function clearPendingNavigation(): void {
  pendingNavigation = null;
}
