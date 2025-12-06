/**
 * KOOPE PAYWALL SCREEN (SIMPLIFIED)
 * Basic paywall structure using TierComparisonCard component
 * RevenueCat integration will be added later
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { TIERS } from '../constants/tierBenefits';
import TierComparisonCard from '../components/TierComparisonCard';

interface PaywallScreenSimpleProps {
  route?: {
    params?: {
      displayCloseButton?: boolean;
    };
  };
}

export default function PaywallScreenSimple({ route }: PaywallScreenSimpleProps) {
  const navigation = useNavigation();
  const { isKoopePro, isPro, isSubscriber } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const displayCloseButton = route?.params?.displayCloseButton !== false;

  const handleTierPress = (tierId: 'free' | 'koope_plus' | 'koope_pro') => {
    if (tierId === 'free') {
      // Free tier - just go back
      navigation.goBack();
      return;
    }

    // For now, just log the subscription attempt
    console.log('Subscribe:', tierId, 'period:', billingPeriod);

    // Show coming soon alert
    Alert.alert(
      'Coming Soon',
      `${tierId === 'koope_plus' ? 'KOOPE+' : 'KOOPE PRO'} subscription will be available once RevenueCat setup is complete.`,
      [{ text: 'OK' }]
    );
  };

  const toggleBillingPeriod = () => {
    setBillingPeriod(prev => prev === 'monthly' ? 'yearly' : 'monthly');
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      {displayCloseButton && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Unlock KOOPE PRO</Text>
          <Text style={styles.subtitle}>
            Choose your path. Elevate how you drink, host, and learn.
          </Text>
        </View>

        {/* Billing Period Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              billingPeriod === 'monthly' && styles.toggleButtonActive,
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text
              style={[
                styles.toggleText,
                billingPeriod === 'monthly' && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              billingPeriod === 'yearly' && styles.toggleButtonActive,
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text
              style={[
                styles.toggleText,
                billingPeriod === 'yearly' && styles.toggleTextActive,
              ]}
            >
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscriber Status (if already subscribed) */}
        {isSubscriber && (
          <View style={styles.subscriberBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />
            <Text style={styles.subscriberText}>
              You're already {isPro ? 'KOOPE PRO' : 'KOOPE+'}
            </Text>
          </View>
        )}

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {TIERS.map(tier => {
            const isCurrent =
              tier.id === 'free' ? false :
              tier.id === 'koope_plus' ? (isKoopePro && !isPro) :
              isPro;

            return (
              <TierComparisonCard
                key={tier.id}
                name={tier.name}
                priceLabel={tier.priceLabel}
                tagline={tier.tagline}
                bulletPoints={tier.bulletPoints}
                recommended={tier.recommended}
                badge={tier.badge}
                color={tier.color}
                priceDetail={tier.priceDetail}
                onPress={() => handleTierPress(tier.id)}
                isCurrent={isCurrent}
                buttonText={
                  tier.id === 'free'
                    ? 'Continue Free'
                    : isCurrent
                    ? 'Current Plan'
                    : 'Select Plan'
                }
              />
            );
          })}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={() => {
            console.log('Restore purchases');
            Alert.alert('Restore Purchases', 'This will be implemented with RevenueCat.');
          }}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing(6),
    right: spacing(3),
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: spacing(8),
    paddingBottom: spacing(4),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(3),
    paddingHorizontal: spacing(3),
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F9FAFB',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing(1.5),
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#000000',
  },
  subscriberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingVertical: spacing(2),
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
    borderRadius: 12,
  },
  subscriberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  tiersContainer: {
    paddingHorizontal: spacing(3),
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});
