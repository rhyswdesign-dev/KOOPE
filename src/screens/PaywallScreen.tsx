/**
 * KOOPE PREMIUM PAYWALL
 *
 * Psychology-driven layout:
 *   - Annual plan is visually dominant (large card, "Best Value" badge, pre-selected)
 *   - Monthly plan is visually secondary (smaller, muted, for testers)
 *   - Founders pricing locked via backend (never shown in-app)
 *   - Feature benefits are tier-specific and benefit-focused
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
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';

const getSafeAreaTop = () => Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

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
type BillingPeriod = 'yearly' | 'monthly';

interface PlanOption {
  id: string;
  billingPeriod: BillingPeriod;
  price: string;
  perMonth: string;
  badge?: string;
  badgeColor?: string;
  savings?: string;
  isRecommended: boolean;
}

interface FeatureBenefit {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

// ============================================================================
// PLAN OPTIONS — Annual dominant, quarterly secondary
// ============================================================================

const PLUS_PLANS: PlanOption[] = [
  {
    id: 'plus_yearly',
    billingPeriod: 'yearly',
    price: '$49',
    perMonth: '$4.08/mo',
    badge: 'Best Value',
    badgeColor: '#D4AF37',
    savings: 'Save $35 vs monthly',
    isRecommended: true,
  },
  {
    id: 'plus_monthly',
    billingPeriod: 'monthly',
    price: '$6.99',
    perMonth: '$6.99/mo',
    isRecommended: false,
  },
];

const PRO_PLANS: PlanOption[] = [
  {
    id: 'pro_yearly',
    billingPeriod: 'yearly',
    price: '$119',
    perMonth: '$9.92/mo',
    badge: 'Best Value',
    badgeColor: '#CD7F32',
    savings: 'Save $61 vs monthly',
    isRecommended: true,
  },
  {
    id: 'pro_monthly',
    billingPeriod: 'monthly',
    price: '$14.99',
    perMonth: '$14.99/mo',
    isRecommended: false,
  },
];

// ============================================================================
// FEATURE BENEFITS
// ============================================================================

const PLUS_FEATURES: FeatureBenefit[] = [
  {
    icon: 'wine-outline',
    title: 'Unlimited inventory & advanced filters',
    description: 'No bottle limits, filter by count, sugar, spirit-forward',
  },
  {
    icon: 'bookmark-outline',
    title: 'Save favorites & smart inventory',
    description: 'Unlimited saves, bar health score, expiry alerts',
  },
  {
    icon: 'bar-chart-outline',
    title: '"Optimize My Bar" analysis',
    description: 'See what to buy next for maximum cocktail reach',
  },
  {
    icon: 'people-outline',
    title: 'Basic hosting tools',
    description: 'Party scaling, shopping list export (1-4 guests)',
  },
];

const PRO_FEATURES: FeatureBenefit[] = [
  {
    icon: 'trophy-outline',
    title: 'Mastery lessons & XP levels',
    description: 'Certifications, practice mode, and level progression',
  },
  {
    icon: 'pulse-outline',
    title: 'Full Predictive Engine & Taste Graph',
    description: 'AI that learns and predicts what you want',
  },
  {
    icon: 'restaurant-outline',
    title: 'Advanced hosting (5+ guests)',
    description: 'Batch optimizer, guest menus, prep timelines',
  },
  {
    icon: 'color-wand-outline',
    title: 'Flavor sliders & brand capture',
    description: 'Fine-tune your taste profile, track specific brands',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const { offerings, restorePurchases, purchaseTier } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierTab>(
    route?.params?.offering === 'pro' ? 'koope_pro' : 'koope_plus'
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLUS_PLANS[0]); // Annual pre-selected

  const displayCloseButton = route?.params?.displayCloseButton !== false;
  const source = route?.params?.source || 'unknown';

  const plans = selectedTier === 'koope_plus' ? PLUS_PLANS : PRO_PLANS;
  const features = selectedTier === 'koope_plus' ? PLUS_FEATURES : PRO_FEATURES;
  const tierColor = selectedTier === 'koope_plus' ? '#D4AF37' : '#CD7F32';
  const tierName = selectedTier === 'koope_plus' ? 'KŌOPE+' : 'KŌOPE PRO';

  // Track paywall view
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      [ANALYTICS_PROPS.SOURCE]: source,
    });
  }, [source]);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        setIsLoading(true);
      } catch (error) {
        log.error('PaywallScreen', 'Error loading packages', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPackages();
  }, [offerings]);

  // Reset to annual (recommended) when tier changes
  useEffect(() => {
    const newPlans = selectedTier === 'koope_plus' ? PLUS_PLANS : PRO_PLANS;
    setSelectedPlan(newPlans[0]); // Always default to annual
  }, [selectedTier]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleSubscribe = async () => {
    try {
      setIsPurchasing(true);

      trackEvent(ANALYTICS_EVENTS.PAYWALL_CTA_CLICKED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
        [ANALYTICS_PROPS.SOURCE]: source,
      });

      trackEvent(ANALYTICS_EVENTS.PURCHASE_STARTED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
      });

      const tier: 'plus' | 'pro' = selectedTier === 'koope_plus' ? 'plus' : 'pro';
      const billingMode = selectedPlan.billingPeriod;
      const result = await purchaseTier(tier, billingMode);

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          [ANALYTICS_PROPS.SOURCE]: source,
        });
        Alert.alert(
          'Welcome!',
          `You're now a ${tierName} member!`,
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
        );
      } else if (result.userCancelled) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_CANCELLED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
        });
      } else {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          error: result.error || 'Unknown error',
        });
        Alert.alert('Purchase Error', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      log.error('PaywallScreen', 'Purchase error', error);
      trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
        [ANALYTICS_PROPS.TIER]: selectedTier,
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
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
      const hasActive = Object.keys(result.customerInfo?.entitlements.active || {}).length > 0;

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS, { had_active_entitlements: hasActive });
        Alert.alert(
          hasActive ? 'Success!' : 'No Purchases Found',
          hasActive ? 'Your purchases have been restored.' : 'No previous purchases found.',
          [{ text: 'OK' }]
        );
      } else {
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, { error: result.error || 'Unknown error' });
        Alert.alert('Restore Error', result.error || 'Failed to restore purchases');
      }
    } catch (error: any) {
      trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, { error: error.message || 'Unknown error' });
      Alert.alert('Restore Error', error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderPlanCard = (plan: PlanOption) => {
    const isSelected = selectedPlan.id === plan.id;
    const isAnnual = plan.billingPeriod === 'yearly';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isAnnual ? styles.planCardAnnual : styles.planCardMonthly,
          isSelected && { borderColor: tierColor, borderWidth: 2.5 },
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        {/* Badge */}
        {plan.badge && (
          <View style={[styles.planBadge, { backgroundColor: plan.badgeColor || tierColor }]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        )}

        {/* Plan content */}
        <View style={styles.planContent}>
          {/* Price — large for annual, smaller for quarterly */}
          <Text style={[
            isAnnual ? styles.planPriceAnnual : styles.planPriceMonthly,
            isSelected && { color: '#FFFFFF' },
          ]}>
            {plan.price}
          </Text>

          {/* Period label */}
          <Text style={[
            styles.planPeriod,
            isSelected && { color: '#D1D5DB' },
          ]}>
            {isAnnual ? '/year' : '/month'}
          </Text>

          {/* Per-month breakdown */}
          <Text style={[
            styles.planPerMonth,
            isSelected && { color: '#9CA3AF' },
          ]}>
            {plan.perMonth}
          </Text>

          {/* Savings callout — only on annual */}
          {plan.savings && (
            <View style={[styles.savingsBadge, { backgroundColor: `${tierColor}30` }]}>
              <Text style={[styles.savingsText, { color: tierColor }]}>
                {plan.savings}
              </Text>
            </View>
          )}
        </View>

        {/* Selection indicator */}
        <View style={[
          styles.planRadio,
          isSelected && { borderColor: tierColor, backgroundColor: tierColor },
        ]}>
          {isSelected && <View style={styles.planRadioInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeature = (feature: FeatureBenefit, index: number) => (
    <View key={index} style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: `${tierColor}20` }]}>
        <Ionicons name={feature.icon} size={22} color={tierColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDesc}>{feature.description}</Text>
      </View>
    </View>
  );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

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
          style={[styles.tierTab, selectedTier === 'koope_plus' && styles.tierTabActive]}
          onPress={() => setSelectedTier('koope_plus')}
        >
          <Text style={[
            styles.tierTabText,
            selectedTier === 'koope_plus' && { color: '#D4AF37' },
          ]}>
            KŌOPE+
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tierTab, selectedTier === 'koope_pro' && [styles.tierTabActive, { borderBottomColor: '#CD7F32' }]]}
          onPress={() => setSelectedTier('koope_pro')}
        >
          <Text style={[
            styles.tierTabText,
            selectedTier === 'koope_pro' && { color: '#CD7F32' },
          ]}>
            KŌOPE PRO
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            {selectedTier === 'koope_plus'
              ? 'Build a precision bar'
              : 'Become a confident bartender'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {selectedTier === 'koope_plus'
              ? 'Optimize your bar for taste and budget'
              : 'Everything in KŌOPE+ plus mastery and hosting'}
          </Text>
        </View>

        {/* Plan Cards — Annual first (dominant), quarterly below (secondary) */}
        <View style={styles.plansContainer}>
          {plans.map(renderPlanCard)}
        </View>

        {/* Feature Benefits */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>What you get</Text>
          {features.map(renderFeature)}
        </View>

        {/* Legal */}
        <Text style={styles.legalText}>
          Subscription auto-renews until cancelled. Cancel anytime via App Store settings.{' '}
          <Text style={styles.legalLink}>Terms</Text> &{' '}
          <Text style={styles.legalLink}>Privacy</Text>.
        </Text>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaContainer, { paddingBottom: Platform.OS === 'ios' ? 34 : 16 }]}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: tierColor },
            isPurchasing && styles.ctaDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={isPurchasing}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.ctaText}>
              {selectedPlan.billingPeriod === 'yearly'
                ? `Get ${tierName} — ${selectedPlan.price}/year`
                : `Get ${tierName} — ${selectedPlan.price}/month`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    borderBottomColor: '#D4AF37',
  },
  tierTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
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

  // Plan Cards
  plansContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  /** Annual card: taller, more prominent */
  planCardAnnual: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  /** Monthly card: compact, muted */
  planCardMonthly: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    opacity: 0.75,
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planContent: {
    flex: 1,
  },
  planPriceAnnual: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E5E7EB',
    letterSpacing: -1,
  },
  planPriceMonthly: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: -0.5,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  planPerMonth: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },

  // Features
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 18,
  },
  featuresSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },

  // Legal
  legalText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    lineHeight: 16,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },

  // Restore
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 4,
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
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
});
