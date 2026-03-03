/**
 * KOOPE PREMIUM PAYWALL
 *
 * Psychology-driven layout:
 *   - Annual plan is visually dominant (large card, "Best Value" badge, pre-selected)
 *   - Monthly plan is visually secondary (smaller, muted, for testers)
 *   - Founders pricing locked via backend (never shown in-app)
 *   - Feature benefits are tier-specific and benefit-focused
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';
import { PRICING_DISPLAY, SUBSCRIPTION_PRODUCTS } from '../constants/subscriptions';

const getSafeAreaTop = () => Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);
const HERO_IMAGE = require('../../assets/images/branding/MMS Backsplash.png');

const formatCurrency = (amount: number, currencyCode?: string): string => {
  if (!Number.isFinite(amount)) return '$0';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const buildPerMonthLabel = (
  price: number | undefined,
  currencyCode: string | undefined,
  billingPeriod: BillingPeriod,
  fallback: string
): string => {
  if (!Number.isFinite(price)) return fallback;
  if (billingPeriod === 'monthly') return `${formatCurrency(price as number, currencyCode)}/mo`;
  const monthly = (price as number) / 12;
  return `${formatCurrency(monthly, currencyCode)}/mo`;
};

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
  packageCode?: string;
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

const getAnnualSavingsPercent = (plans: PlanOption[]): number | null => {
  const annual = plans.find((p) => p.billingPeriod === 'yearly');
  const monthly = plans.find((p) => p.billingPeriod === 'monthly');
  if (!annual || !monthly) return null;
  const annualValue = Number(String(annual.price).replace(/[^\d.]/g, ''));
  const monthlyValue = Number(String(monthly.price).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(annualValue) || !Number.isFinite(monthlyValue) || monthlyValue <= 0) return null;
  const savings = 1 - (annualValue / (monthlyValue * 12));
  const pct = Math.round(savings * 100);
  return pct > 0 ? pct : null;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const {
    offerings,
    isLoading: subscriptionLoading,
    restorePurchases,
    purchaseTier,
    startFreeTrial,
    founderCount,
  } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierTab>(
    route?.params?.offering === 'pro' ? 'koope_pro' : 'koope_plus'
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLUS_PLANS[0]);

  const displayCloseButton = route?.params?.displayCloseButton !== false;
  const source = route?.params?.source || 'unknown';

  const plansFromOfferings = useMemo(() => {
    const packages = offerings?.current?.availablePackages || [];
    const findPackage = (productId: string) =>
      packages.find(
        (pkg) =>
          pkg.product?.identifier === productId ||
          pkg.identifier === productId ||
          pkg.identifier?.toLowerCase?.().includes(productId.toLowerCase())
      );

    const plusYearly = findPackage(SUBSCRIPTION_PRODUCTS.PLUS_YEARLY);
    const plusMonthly = findPackage(SUBSCRIPTION_PRODUCTS.PLUS_MONTHLY);
    const proYearly = findPackage(SUBSCRIPTION_PRODUCTS.PRO_YEARLY);
    const proMonthly = findPackage(SUBSCRIPTION_PRODUCTS.PRO_MONTHLY);

    const plusPlans: PlanOption[] =
      plusYearly && plusMonthly
        ? [
            {
              id: SUBSCRIPTION_PRODUCTS.PLUS_YEARLY,
              billingPeriod: 'yearly',
              price: plusYearly.product.priceString || PRICING_DISPLAY.PLUS.yearly,
              perMonth: buildPerMonthLabel(
                plusYearly.product.price,
                plusYearly.product.currencyCode,
                'yearly',
                PRICING_DISPLAY.PLUS.yearlyPerMonth
              ),
              packageCode: plusYearly.identifier || plusYearly.product.identifier,
              badge: 'Best Value',
              badgeColor: '#D4AF37',
              savings: 'Annual plan',
              isRecommended: true,
            },
            {
              id: SUBSCRIPTION_PRODUCTS.PLUS_MONTHLY,
              billingPeriod: 'monthly',
              price: plusMonthly.product.priceString || PRICING_DISPLAY.PLUS.monthly,
              perMonth: buildPerMonthLabel(
                plusMonthly.product.price,
                plusMonthly.product.currencyCode,
                'monthly',
                PRICING_DISPLAY.PLUS.monthlyPerMonth
              ),
              packageCode: plusMonthly.identifier || plusMonthly.product.identifier,
              isRecommended: false,
            },
          ]
        : PLUS_PLANS;

    const proPlans: PlanOption[] =
      proYearly && proMonthly
        ? [
            {
              id: SUBSCRIPTION_PRODUCTS.PRO_YEARLY,
              billingPeriod: 'yearly',
              price: proYearly.product.priceString || PRICING_DISPLAY.PRO.yearly,
              perMonth: buildPerMonthLabel(
                proYearly.product.price,
                proYearly.product.currencyCode,
                'yearly',
                PRICING_DISPLAY.PRO.yearlyPerMonth
              ),
              packageCode: proYearly.identifier || proYearly.product.identifier,
              badge: 'Best Value',
              badgeColor: '#CD7F32',
              savings: 'Annual plan',
              isRecommended: true,
            },
            {
              id: SUBSCRIPTION_PRODUCTS.PRO_MONTHLY,
              billingPeriod: 'monthly',
              price: proMonthly.product.priceString || PRICING_DISPLAY.PRO.monthly,
              perMonth: buildPerMonthLabel(
                proMonthly.product.price,
                proMonthly.product.currencyCode,
                'monthly',
                PRICING_DISPLAY.PRO.monthlyPerMonth
              ),
              packageCode: proMonthly.identifier || proMonthly.product.identifier,
              isRecommended: false,
            },
          ]
        : PRO_PLANS;

    return { plusPlans, proPlans };
  }, [offerings]);

  const plans = selectedTier === 'koope_plus' ? plansFromOfferings.plusPlans : plansFromOfferings.proPlans;
  const features = selectedTier === 'koope_plus' ? PLUS_FEATURES : PRO_FEATURES;
  const tierColor = colors.gold;
  const tierName = selectedTier === 'koope_plus' ? 'KŌOPE+' : 'KŌOPE PRO';
  const isLoading = subscriptionLoading && !offerings;
  const annualSavingsPercent = useMemo(() => getAnnualSavingsPercent(plans), [plans]);
  const usingLivePlans = useMemo(
    () =>
      plansFromOfferings.plusPlans.some((plan) => Boolean(plan.packageCode)) &&
      plansFromOfferings.proPlans.some((plan) => Boolean(plan.packageCode)),
    [plansFromOfferings.plusPlans, plansFromOfferings.proPlans]
  );

  // Detect if the annual plan has a RevenueCat introductory offer (7-day trial)
  const hasTrialAvailable = useMemo(() => {
    if (!offerings?.current) return false;
    const packages = offerings.current.availablePackages || [];
    const productId =
      selectedTier === 'koope_plus'
        ? SUBSCRIPTION_PRODUCTS.PLUS_YEARLY
        : SUBSCRIPTION_PRODUCTS.PRO_YEARLY;
    const yearlyPkg = packages.find(
      (pkg) =>
        pkg.product?.identifier === productId ||
        pkg.identifier === productId ||
        pkg.identifier?.toLowerCase?.().includes(productId.toLowerCase())
    );
    return Boolean(yearlyPkg?.product?.introductoryPrice);
  }, [offerings, selectedTier]);

  const isTrialEligible = hasTrialAvailable && selectedPlan.billingPeriod === 'yearly';

  // Track paywall view
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      [ANALYTICS_PROPS.SOURCE]: source,
    });
  }, [source]);

  useEffect(() => {
    log.info('PaywallScreen', 'Plan source resolved', {
      usingLivePlans,
      hasCurrentOffering: Boolean(offerings?.current),
      plusPlanIds: plansFromOfferings.plusPlans.map((plan) => plan.id),
      proPlanIds: plansFromOfferings.proPlans.map((plan) => plan.id),
    });
  }, [usingLivePlans, offerings, plansFromOfferings.plusPlans, plansFromOfferings.proPlans]);

  // Reset to annual/recommended plan when tier changes or offerings update
  useEffect(() => {
    const newPlans = selectedTier === 'koope_plus' ? plansFromOfferings.plusPlans : plansFromOfferings.proPlans;
    setSelectedPlan(newPlans[0]);
  }, [selectedTier, plansFromOfferings.plusPlans, plansFromOfferings.proPlans]);

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
      const result = isTrialEligible
        ? await startFreeTrial(tier)
        : await purchaseTier(tier, billingMode);

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETED, {
          [ANALYTICS_PROPS.TIER]: selectedTier,
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          [ANALYTICS_PROPS.SOURCE]: source,
          is_trial: isTrialEligible,
        });
        Alert.alert(
          isTrialEligible ? 'Trial Started!' : 'Welcome!',
          isTrialEligible
            ? `Your 7-day free trial of ${tierName} has started!`
            : `You're now a ${tierName} member!`,
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
    const headerLabel = isAnnual && annualSavingsPercent
      ? `Save ${annualSavingsPercent}%`
      : isAnnual
        ? 'Best Value'
        : 'Monthly';
    const durationLabel = isAnnual ? '12 months' : '1 month';
    const chargeLabel = isAnnual ? `${plan.price}/year` : `${plan.price}/month`;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && { borderColor: tierColor, borderWidth: 2 },
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        <View style={[styles.planHeader, isSelected && { backgroundColor: tierColor }]}>
          <Text style={[styles.planHeaderText, isSelected && { color: colors.bg }]}>{headerLabel}</Text>
        </View>

        <View style={styles.planBody}>
          <Text style={[styles.planDuration, isSelected && { color: colors.text }]}>{durationLabel}</Text>
          <Text style={[styles.planPerMonth, isSelected && { color: colors.white }]}>{plan.perMonth}</Text>
          <Text style={[styles.planCharge, isSelected && { color: colors.text }]}>{chargeLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeature = (feature: FeatureBenefit, index: number) => (
    <View key={index} style={styles.featureRow}>
      <View style={styles.featureIconCircle}>
        <Ionicons name={feature.icon} size={20} color={tierColor} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
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
            selectedTier === 'koope_plus' && { color: colors.gold },
          ]}>
            KŌOPE+
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tierTab, selectedTier === 'koope_pro' && [styles.tierTabActive, { borderBottomColor: colors.gold }]]}
          onPress={() => setSelectedTier('koope_pro')}
        >
          <Text style={[
            styles.tierTabText,
            selectedTier === 'koope_pro' && { color: colors.gold },
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
          <ImageBackground source={HERO_IMAGE} style={styles.heroImageCard} imageStyle={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <Text style={styles.heroTitle}>
              {selectedTier === 'koope_plus'
                ? 'Build your ideal home bar'
                : 'Level up your bartending'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {selectedTier === 'koope_plus'
                ? 'Scan, track, and get personalized cocktails instantly.'
                : 'Master recipes, hosting, and advanced taste intelligence.'}
            </Text>
          </ImageBackground>
        </View>

        {/* Founders Urgency Banner — shown when fewer than 300 founders have subscribed */}
        {founderCount !== undefined && founderCount < 300 && (
          <View style={styles.foundersBar}>
            <Ionicons name="lock-closed" size={14} color={colors.gold} />
            <Text style={styles.foundersText}>
              {`You're Founder #${founderCount + 1} of 300 — lock in ${tierName} pricing forever`}
            </Text>
          </View>
        )}

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
              {isTrialEligible
                ? `Start 7-Day Free Trial — ${tierName}`
                : selectedPlan.billingPeriod === 'yearly'
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
    backgroundColor: 'rgba(26,18,13,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tier Tabs
  tierTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,229,213,0.12)',
  },
  tierTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tierTabActive: {
    borderBottomColor: colors.gold,
  },
  tierTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(242,229,213,0.55)',
    letterSpacing: 0.5,
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  heroImageCard: {
    minHeight: 190,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  heroImage: {
    borderRadius: 22,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,13,9,0.38)',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
    letterSpacing: -0.8,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
    textAlign: 'center',
  },

  // Founders Banner
  foundersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(214,138,56,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.45)',
  },
  foundersText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
    lineHeight: 18,
  },

  // Plan Cards
  plansContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(242,229,213,0.14)',
    overflow: 'hidden',
    minHeight: 156,
  },
  planHeader: {
    backgroundColor: 'rgba(242,229,213,0.1)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  planHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 6,
  },
  planDuration: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  planPerMonth: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: -0.8,
  },
  planCharge: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },

  // Features
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 26,
    gap: 16,
  },
  featuresSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242,229,213,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242,229,213,0.14)',
  },
  featureTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  featureDescription: {
    marginTop: 2,
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    flex: 1,
  },

  // Legal
  legalText: {
    fontSize: 11,
    color: colors.subtext,
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
    color: colors.subtext,
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
    borderTopColor: 'rgba(242,229,213,0.14)',
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
    color: colors.bg,
    letterSpacing: 0.3,
  },
});
