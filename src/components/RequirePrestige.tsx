/**
 * REQUIRE PRESTIGE COMPONENT
 * Subscription gate that redirects to paywall if user is not Prestige
 */

import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscription } from '../contexts/SubscriptionContext';
import { log } from '../lib/logger';
import type { RootStackParamList } from '../navigation/RootNavigator';

interface RequirePrestigeProps {
  children: React.ReactNode;
}

/**
 * RequirePrestige Gate Component
 *
 * Checks if user has Prestige subscription.
 * If not, redirects to Paywall screen.
 * If yes, renders children.
 *
 * @example
 * ```tsx
 * <RequirePrestige>
 *   <PrestigeFeatureScreen />
 * </RequirePrestige>
 * ```
 */
export default function RequirePrestige({ children }: RequirePrestigeProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPrestige, isLoading } = useSubscription();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Wait for subscription state to load
    if (isLoading) {
      return;
    }

    // If user has Prestige access, allow access
    if (isPrestige) {
      hasNavigatedRef.current = false;
      return;
    }

    // Get current route name to prevent loops
    const navState = navigation.getState();
    const currentRoute = navState.routes[navState.index];
    const isOnPaywall = currentRoute?.name === 'Paywall';

    // User doesn't have access - redirect to paywall (if not already there)
    if (!hasNavigatedRef.current && !isOnPaywall) {
      hasNavigatedRef.current = true;
      log.info('RequirePrestige', 'Access denied - redirecting to Paywall');
      navigation.navigate('Paywall', { source: 'prestige_gate' });
    }
  }, [isPrestige, isLoading, navigation]);

  // Still loading subscription status
  if (isLoading) {
    return null;
  }

  // User has access - render children
  if (isPrestige) {
    return <>{children}</>;
  }

  // User doesn't have access - render nothing (navigation will trigger)
  return null;
}
