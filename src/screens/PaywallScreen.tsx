/**
 * KOOPE PREMIUM PAYWALL
 * Hinge-inspired layout with tier tabs, duration cards, and feature benefits
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';

// Safe area top padding fallback - lazy evaluation to ensure runtime is ready
const getSafeAreaTop = () => Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

const { width } = Dimensions.get('window');

interface PaywallScreenProps {
  route?: {
    params?: {
      offering?: string | null;
      displayCloseButton?: boolean;
      source?: string;
    };
  };
}

type TierTab = 'koope_plus' | 'koope_pro';

interface DurationOption {
  id: string;
  label: string;
  duration: string;
  pricePerWeek: string;
  totalPrice: string;
  savings?: string;
  billingMode: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  isNew?: boolean;
  isPopular?: boolean;
}

interface FeatureBenefit {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

// Duration options for each tier
const PLUS_DURATIONS: DurationOption[] = [
  {
    id: 'plus_weekly',
    label: 'New',
    duration: '1 week',
    pricePerWeek: '$2.99/wk',
    totalPrice: '$2.99',
    billingMode: 'weekly',
    isNew: true,
  },
  {
    id: 'plus_monthly',
    label: 'Save 25%',
    duration: '1 month',
    pricePerWeek: '$2.25/wk',
    totalPrice: '$8.99',
    savings: '25%',
    billingMode: 'monthly',
  },
  {
    id: 'plus_quarterly',
    label: 'Save 44%',
    duration: '3 months',
    pricePerWeek: '$1.67/wk',
    totalPrice: '$19.99',
    savings: '44%',
    billingMode: 'quarterly',
    isPopular: true,
  },
  {
    id: 'plus_yearly',
    label: 'Save 62%',
    duration: '1 year',
    pricePerWeek: '$1.15/wk',
    totalPrice: '$59.99',
    savings: '62%',
    billingMode: 'yearly',
  },
];

const PRO_DURATIONS: DurationOption[] = [
  {
    id: 'pro_weekly',
    label: 'New',
    duration: '1 week',
    pricePerWeek: '$5.99/wk',
    totalPrice: '$5.99',
    billingMode: 'weekly',
    isNew: true,
  },
  {
    id: 'pro_monthly',
    label: 'Save 25%',
    duration: '1 month',
    pricePerWeek: '$4.50/wk',
    totalPrice: '$17.99',
    savings: '25%',
    billingMode: 'monthly',
  },
  {
    id: 'pro_quarterly',
    label: 'Save 44%',
    duration: '3 months',
    pricePerWeek: '$3.33/wk',
    totalPrice: '$39.99',
    savings: '44%',
    billingMode: 'quarterly',
    isPopular: true,
  },
  {
    id: 'pro_yearly',
    label: 'Save 62%',
    duration: '1 year',
    pricePerWeek: '$2.31/wk',
    totalPrice: '$119.99',
    savings: '62%',
    billingMode: 'yearly',
  },
];

// Feature benefits for each tier
const PLUS_FEATURES: FeatureBenefit[] = [
  {
    icon: 'book-outline',
    title: 'Unlimited lessons',
    description: 'Access the full cocktail curriculum',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Unlimited AI Coach',
    description: 'Get personalized drink recommendations',
  },
  {
    icon: 'cloud-download-outline',
    title: 'Offline mode',
    description: 'Download recipes for anywhere access',
  },
  {
    icon: 'bookmark-outline',
    title: 'Unlimited saves',
    description: 'Build your personal recipe collection',
  },
];

const PRO_FEATURES: FeatureBenefit[] = [
  {
    icon: 'star-outline',
    title: 'Priority AI with memory',
    description: 'AI that remembers your taste preferences',
  },
  {
    icon: 'trophy-outline',
    title: 'VIP challenges',
    description: 'Exclusive competitions and rewards',
  },
  {
    icon: 'create-outline',
    title: 'Creator tools',
    description: 'Export menus, upload recipes, custom themes',
  },
  {
    icon: 'gift-outline',
    title: 'Brand perks',
    description: 'Exclusive tastings, events, and discounts',
  },
];

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const { offerings, restorePurchases, purchaseTier, isKoopePro, isPro, isSubscriber } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierTab>('koope_plus');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(PLUS_DURATIONS[2]); // Default to 3 months (best value)

  const displayCloseButton = route?.params?.displayCloseButton !== false;
  const source = route?.params?.source || 'unknown';

  const durations = selectedTier === 'koope_plus' ? PLUS_DURATIONS : PRO_DURATIONS;
  const features = selectedTier === 'koope_plus' ? PLUS_FEATURES : PRO_FEATURES;
  const tierColor = selectedTier === 'koope_plus' ? colors.accent : '#CD7F32';
  const tierName = selectedTier === 'koope_plus' ? 'KOOPE+' : 'KOOPE PRO';

  // Track paywall view on mount
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      [ANALYTICS_PROPS.SOURCE]: source,
    });
  }, [source]);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        setIsLoading(true);
        // Packages loaded from offerings context
      } catch (error) {
        log.error('PaywallScreen', 'Error loading packages', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, [offerings]);

  // Update selected duration when tier changes
  useEffect(() => {
    const newDurations = selectedTier === 'koope_plus' ? PLUS_DURATIONS : PRO_DURATIONS;
    // Select the popular option (3 months) by default
    const popularOption = newDurations.find(d => d.isPopular) || newDurations[2];
    setSelectedDuration(popularOption);
  }, [selectedTier]);

  const handleSubscribe = async () => {
    try {
      setIsPurchasing(true);

      // Track CTA click
      trackEvent(ANALYTICS_EVENTS.PAYWALL_CTA_CLICKED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
        [ANALYTICS_PROPS.SOURCE]: source,
      });

      // Track purchase started
      trackEvent(ANALYTICS_EVENTS.PURCHASE_STARTED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
      });

      const tierName: 'plus' | 'pro' = selectedTier === 'koope_plus' ? 'plus' : 'pro';

      // Map quarterly to yearly for now (RevenueCat typically uses monthly/yearly)
      const billingMode = selectedDuration.billingMode === 'quarterly'
        ? 'yearly' // Will need to add quarterly products to RevenueCat
        : selectedDuration.billingMode;

      const result = await purchaseTier(tierName, billingMode);

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
          [ANALYTICS_PROPS.SOURCE]: source,
        });

        Alert.alert(
          'Welcome!',
          `You're now a ${selectedTier === 'koope_plus' ? 'KOOPE+' : 'KOOPE PRO'} member!`,
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
        );
      } else if (result.userCancelled) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_CANCELLED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
        });
      } else {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
          error: result.error || 'Unknown error',
        });

        Alert.alert('Purchase Error', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      log.error('PaywallScreen', 'Purchase error', error);
      trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedDuration.billingMode,
        error: error.message || 'Unknown error',
      });

      Alert.alert('Purchase Error', error.message || 'Something went wrong');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_TAPPED);

      const result = await restorePurchases();

      if (result.success) {
        const hasActive = Object.keys(result.customerInfo?.entitlements.active || {}).length > 0;
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS, {
          had_active_entitlements: hasActive,
        });

        Alert.alert(
          hasActive ? 'Success!' : 'No Purchases Found',
          hasActive ? 'Your purchases have been restored.' : 'No previous purchases found.',
          [{ text: 'OK' }]
        );
      } else {
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, {
          error: result.error || 'Unknown error',
        });
        Alert.alert('Restore Error', result.error || 'Failed to restore purchases');
      }
    } catch (error: any) {
      trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, {
        error: error.message || 'Unknown error',
      });
      Alert.alert('Restore Error', error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderDurationCard = (option: DurationOption) => {
    const isSelected = selectedDuration.id === option.id;

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.durationCard,
          isSelected && [styles.durationCardSelected, { borderColor: tierColor }],
        ]}
        onPress={() => setSelectedDuration(option)}
        activeOpacity={0.7}
      >
        {/* Badge */}
        <View style={[
          styles.durationBadge,
          isSelected && { backgroundColor: tierColor },
          option.isNew && !isSelected && { backgroundColor: '#059669' },
        ]}>
          <Text style={[
            styles.durationBadgeText,
            isSelected && { color: '#000' },
            option.isNew && !isSelected && { color: '#FFFFFF' },
          ]}>
            {option.label}
          </Text>
        </View>

        {/* Duration */}
        <Text style={[styles.durationText, isSelected && { color: '#FFFFFF' }]}>
          {option.duration}
        </Text>

        {/* Price per week */}
        <Text style={[styles.durationPrice, isSelected && { color: '#FFFFFF' }]}>
          {option.pricePerWeek}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFeatureBenefit = (feature: FeatureBenefit, index: number) => (
    <View key={index} style={styles.featureRow}>
      <View style={[styles.featureIconContainer, { backgroundColor: `${tierColor}20` }]}>
        <Ionicons name={feature.icon} size={24} color={tierColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Close Button */}
      {displayCloseButton && (
        <TouchableOpacity
          style={[styles.closeButton, { top: getSafeAreaTop() }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Tier Tabs */}
      <View style={[styles.tierTabs, { paddingTop: getSafeAreaTop() }]}>
        <TouchableOpacity
          style={[
            styles.tierTab,
            selectedTier === 'koope_plus' && styles.tierTabActive,
          ]}
          onPress={() => setSelectedTier('koope_plus')}
        >
          <Text style={[
            styles.tierTabText,
            selectedTier === 'koope_plus' && styles.tierTabTextActive,
          ]}>
            KOOPE+
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tierTab,
            selectedTier === 'koope_pro' && styles.tierTabActive,
          ]}
          onPress={() => setSelectedTier('koope_pro')}
        >
          <Text style={[
            styles.tierTabText,
            selectedTier === 'koope_pro' && styles.tierTabTextActive,
          ]}>
            KOOPE PRO
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              {selectedTier === 'koope_plus'
                ? 'Level up your cocktail game'
                : 'Become a cocktail master'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {selectedTier === 'koope_plus'
                ? 'Unlimited access to lessons, AI coach, and more'
                : 'Everything in KOOPE+ plus exclusive pro features'}
            </Text>
          </View>
        </View>

        {/* Duration Cards - Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.durationsContainer}
          style={styles.durationsScroll}
        >
          {durations.map(renderDurationCard)}
        </ScrollView>

        {/* Feature Benefits */}
        <View style={styles.featuresSection}>
          {features.map(renderFeatureBenefit)}
        </View>

        {/* Legal Text */}
        <Text style={styles.legalText}>
          *Your subscription will auto-renew for the same price and package length until you cancel via App Store settings, and you agree to our{' '}
          <Text style={styles.legalLink}>Terms</Text>.
        </Text>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky CTA Button */}
      <View style={[styles.ctaContainer, { paddingBottom: Platform.OS === 'ios' ? 34 : 16 }]}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: tierColor },
            isPurchasing && styles.ctaButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={isPurchasing}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.ctaText}>
              Get {selectedDuration.duration} for {selectedDuration.totalPrice}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: spacing(2),
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tier Tabs
  tierTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tierTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tierTabActive: {
    borderBottomColor: colors.accent,
  },
  tierTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  tierTabTextActive: {
    color: colors.accent,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {
    height: 120,
    backgroundColor: colors.bg,
    justifyContent: 'flex-end',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 22,
  },

  // Duration Cards
  durationsScroll: {
    marginTop: 8,
  },
  durationsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  durationCard: {
    width: (width - 64) / 4,
    minWidth: 85,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationCardSelected: {
    backgroundColor: colors.card,
    borderWidth: 2,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
    alignSelf: 'center',
    minWidth: 60,
    alignItems: 'center',
  },
  durationBadgeNew: {
    backgroundColor: colors.accent,
  },
  durationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 4,
    textAlign: 'center',
  },
  durationPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Features
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },

  // Legal
  legalText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },

  // Restore
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
});
