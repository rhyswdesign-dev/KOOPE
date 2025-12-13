/**
 * REQUIRE PRO COMPONENT
 * Subscription gate that redirects to paywall if user is not Pro or Prestige
 */

import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { log } from '../lib/logger';

interface RequireProProps {
  children: React.ReactNode;
}

/**
 * RequirePro Gate Component
 *
 * Checks if user has Pro or Prestige subscription.
 * If not, redirects to Paywall screen.
 * If yes, renders children.
 *
 * @example
 * ```tsx
 * <RequirePro>
 *   <ProFeatureScreen />
 * </RequirePro>
 * ```
 */
export default function RequirePro({ children }: RequireProProps) {
  const navigation = useNavigation();
  const { isPro, isPrestige, isLoading } = useSubscription();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Wait for subscription state to load
    if (isLoading) {
      return;
    }

    // If user has Pro or Prestige access, allow access
    if (isPro || isPrestige) {
      hasNavigatedRef.current = false;
      return;
    }

    // Get current route name to prevent loops
    const currentRoute = navigation.getState().routes[navigation.getState().index];
    const isOnPaywall = currentRoute?.name === 'Paywall';

    // User doesn't have access - redirect to paywall (if not already there)
    if (!hasNavigatedRef.current && !isOnPaywall) {
      hasNavigatedRef.current = true;
      log.info('RequirePro', 'Access denied - redirecting to Paywall');
      navigation.navigate('Paywall' as never, { source: 'pro_gate' } as never);
    }
  }, [isPro, isPrestige, isLoading, navigation]);

  // Still loading subscription status
  if (isLoading) {
    return null;
  }

  // User has access - render children
  if (isPro || isPrestige) {
    return <>{children}</>;
  }

  // User doesn't have access - render nothing (navigation will trigger)
  return null;
}
