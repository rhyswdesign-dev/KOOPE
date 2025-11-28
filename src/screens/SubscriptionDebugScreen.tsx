/**
 * SUBSCRIPTION DEBUG SCREEN
 * Development screen to view and test subscription state
 *
 * This screen is for debugging purposes only.
 * Shows current subscription status, entitlements, and RevenueCat info.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_PRODUCTS } from '../constants/subscriptions';

export default function SubscriptionDebugScreen() {
  const {
    isPro,
    isPrestige,
    isSubscriber,
    isLoading,
    error,
    customerInfo,
    refreshSubscriptionStatus,
  } = useSubscription();

  const renderStatusBadge = (label: string, isActive: boolean) => (
    <View style={styles.statusBadge}>
      <Ionicons
        name={isActive ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={isActive ? colors.success : colors.muted}
      />
      <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
        {label}: {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Debug</Text>
        <Text style={styles.subtitle}>Development testing only</Text>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.section}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading subscription status...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}

      {/* Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Status</Text>
        <View style={styles.card}>
          {renderStatusBadge('Pro Subscription', isPro)}
          {renderStatusBadge('Prestige Subscription', isPrestige)}
          {renderStatusBadge('Any Subscription', isSubscriber)}
        </View>
      </View>

      {/* Customer Info */}
      {customerInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Info</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Original App User ID:</Text>
              <Text style={styles.infoValue}>{customerInfo.originalAppUserId || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Active Entitlements:</Text>
              <Text style={styles.infoValue}>
                {Object.keys(customerInfo.entitlements.active).length > 0
                  ? Object.keys(customerInfo.entitlements.active).join(', ')
                  : 'None'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>All Entitlements:</Text>
              <Text style={styles.infoValue}>
                {Object.keys(customerInfo.entitlements.all).length > 0
                  ? Object.keys(customerInfo.entitlements.all).join(', ')
                  : 'None'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Entitlements:</Text>
            <Text style={styles.infoValue}>
              {Object.values(SUBSCRIPTION_ENTITLEMENTS).join(', ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Products:</Text>
            <Text style={styles.infoValue}>
              {Object.values(SUBSCRIPTION_PRODUCTS).join(', ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.button}
          onPress={refreshSubscriptionStatus}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Refresh Subscription Status</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Setup Instructions</Text>
        <Text style={styles.instructionsText}>
          1. Install RevenueCat SDK: npm install react-native-purchases{'\n'}
          2. Update API keys in src/constants/subscriptions.ts{'\n'}
          3. Configure products in RevenueCat dashboard{'\n'}
          4. Test purchases using sandbox accounts
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(2),
  },
  header: {
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  statusText: {
    fontSize: 14,
    color: colors.subtext,
  },
  statusTextActive: {
    color: colors.success,
    fontWeight: '600',
  },
  infoRow: {
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing(2),
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginTop: spacing(1),
  },
  errorMessage: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing(0.5),
  },
  loadingText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(1),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    padding: spacing(2),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructions: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(2),
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  instructionsText: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
  },
});
