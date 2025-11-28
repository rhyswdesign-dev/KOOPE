/**
 * CUSTOMER CENTER SCREEN
 * RevenueCat Customer Center for subscription management
 *
 * Provides self-service subscription management:
 * - View active subscriptions
 * - Cancel subscriptions
 * - Change subscription plans
 * - Restore purchases
 * - View billing history
 *
 * https://www.revenuecat.com/docs/tools/customer-center
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RevenueCatUI from 'react-native-purchases-ui';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';

// Customer Center result enum
enum CUSTOMER_CENTER_RESULT {
  RESTORED = 'restored',
  CANCELLED = 'cancelled',
  ERROR = 'error',
  NOT_PRESENTED = 'not_presented',
}

/**
 * CustomerCenterScreen Component
 *
 * Displays RevenueCat's pre-built Customer Center UI
 * Allows users to manage their subscriptions
 */
export default function CustomerCenterScreen() {
  const navigation = useNavigation();
  const { refreshSubscriptionStatus } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Handle customer center result
   */
  const handleCustomerCenterResult = async (result: CUSTOMER_CENTER_RESULT) => {
    console.log('[CustomerCenterScreen] Customer Center result:', result);

    switch (result) {
      case CUSTOMER_CENTER_RESULT.RESTORED:
        // Purchase restored
        await refreshSubscriptionStatus();

        Alert.alert(
          'Restored',
          'Your purchase has been restored successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        break;

      case CUSTOMER_CENTER_RESULT.CANCELLED:
        // User closed the customer center
        console.log('[CustomerCenterScreen] User closed customer center');
        navigation.goBack();
        break;

      case CUSTOMER_CENTER_RESULT.ERROR:
        // Error occurred
        Alert.alert(
          'Error',
          'Something went wrong. Please try again later.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        break;

      case CUSTOMER_CENTER_RESULT.NOT_PRESENTED:
        // Customer Center could not be presented
        Alert.alert(
          'Unavailable',
          'Customer Center is not available right now. Please try again later.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        break;
    }
  };

  /**
   * Present the customer center
   */
  React.useEffect(() => {
    const presentCustomerCenter = async () => {
      try {
        setIsLoading(true);

        // Present RevenueCat Customer Center
        const result = await RevenueCatUI.presentCustomerCenter();

        handleCustomerCenterResult(result);
      } catch (error) {
        console.error('[CustomerCenterScreen] Error presenting customer center:', error);
        Alert.alert(
          'Error',
          'Could not load subscription management. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

    presentCustomerCenter();
  }, []);

  // Show loading indicator while customer center loads
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading subscription management...</Text>
      </View>
    );
  }

  // This will rarely show as customer center handles its own UI
  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  loadingText: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(2),
    textAlign: 'center',
  },
});
