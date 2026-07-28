/**
 * KOOPE+ PAYWALL
 *
 * Phase 0.7 (tier collapse): single-tier, annual-first. There is one
 * paywall product now — KŌOPE+ — not a koope_plus/koope_pro tab switch.
 * Plans come from RevenueCat offering metadata when available
 * (plansFromOffering), falling back to the hardcoded FALLBACK_PLANS only
 * if the live offering hasn't loaded (e.g. dev/offline) — activation
 * itself (making sure the RevenueCat offering is actually configured) is
 * Phase 2 work, not this screen's job.
 *
 * Psychology-driven layout carried over from the two-tier screen:
 *   - Annual plan is visually dominant (large card, "Best Value" badge, pre-selected)
 *   - Monthly plan is visually secondary
 *   - Founders pricing locked via backend (never shown in-app)
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
import { PAYWALL_TRIGGERS } from '../config/paywallTriggers';

const getSafeAreaTop = () => (Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24);
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
  fallback: string,
): string => {
  if (!Number.isFinite(price)) return fallback;
  if (billingPeriod === 'monthly') return `${formatCurrency(price as number, currencyCode)}/mo`;
  const monthly = (price as number) / 12;
  return `${formatCurrency(monthly, currencyCode)}/mo`;
};

interface PaywallScreenProps {
  route?: {
    params?: {
      displayCloseButton?: boolean;
      source?: string;
      triggerId?: string;
    };
  };
}

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
// FALLBACK PLANS — only used if the live RevenueCat offering hasn't loaded
// ============================================================================

const FALLBACK_PLANS: PlanOption[] = [
  {
    id: 'plus_yearly',
    billingPeriod: 'yearly',
    price: '$59',
    perMonth: '$4.92/mo',
    badge: 'Best Value',
    badgeColor: '#D4AF37',
    savings: 'Save $25 vs monthly',
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

// ============================================================================
// FEATURE BENEFITS
// ============================================================================

const FEATURES: FeatureBenefit[] = [
  {
    icon: 'wine-outline',
    title: 'Unlimited inventory & advanced filters',
    description: 'No bottle limits. Filter by ingredient count, sugar level, spirit-forward.',
  },
  {
    icon: 'albums-outline',
    title: 'Full recipe catalog + unlimited saves',
    description: 'Every recipe unlocked. Save as many favourites as you want.',
  },
  {
    icon: 'bar-chart-outline',
    title: '"Optimize My Bar" analysis',
    description: 'Gap analysis shows exactly what to buy next for maximum cocktail reach.',
  },
  {
    icon: 'people-outline',
    title: 'Party scaling + shopping list export',
    description: 'Scale any recipe for a crowd. Export your shopping list in one tap.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Smart inventory tracking',
    description: 'Bar health score, expiry alerts, bottle level tracking.',
  },
  {
    icon: 'restaurant-outline',
    title: 'Full hosting tools',
    description: 'Guest count → cocktail picks → scaled ingredients → prep timeline.',
  },
];

const COMING_SOON: string[] = [
  'Palate Match % — cocktail scores matched to your palate',
  'Mood suggestions — cocktails based on how you feel',
  'Enhanced AI bartender with memory',
];

const getAnnualSavingsPercent = (plans: PlanOption[]): number | null => {
  const annual = plans.find((p) => p.billingPeriod === 'yearly');
  const monthly = plans.find((p) => p.billingPeriod === 'monthly');
  if (!annual || !monthly) return null;
  const annualValue = Number(String(annual.price).replace(/[^\d.]/g, ''));
  const monthlyValue = Number(String(monthly.price).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(annualValue) || !Number.isFinite(monthlyValue) || monthlyValue <= 0)
    return null;
  const savings = 1 - annualValue / (monthlyValue * 12);
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
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(FALLBACK_PLANS[0]);

  const displayCloseButton = route?.params?.displayCloseButton !== false;
  const source = route?.params?.source || 'unknown';
  const trigger = route?.params?.triggerId ? PAYWALL_TRIGGERS[route.params.triggerId] : undefined;

  const plansFromOffering = useMemo(() => {
    const packages = offerings?.current?.availablePackages || [];
    const findPackage = (productId: string) =>
      packages.find(
        (pkg) =>
          pkg.product?.identifier === productId ||
          pkg.identifier === productId ||
          pkg.identifier?.toLowerCase?.().includes(productId.toLowerCase()),
      );

    const plusYearly = findPackage(SUBSCRIPTION_PRODUCTS.PLUS_YEARLY);
    const plusMonthly = findPackage(SUBSCRIPTION_PRODUCTS.PLUS_MONTHLY);

    if (!plusYearly || !plusMonthly) return FALLBACK_PLANS;

    return [
      {
        id: SUBSCRIPTION_PRODUCTS.PLUS_YEARLY,
        billingPeriod: 'yearly' as const,
        price: plusYearly.product.priceString || PRICING_DISPLAY.PLUS.yearly,
        perMonth: buildPerMonthLabel(
          plusYearly.product.price,
          plusYearly.product.currencyCode,
          'yearly',
          PRICING_DISPLAY.PLUS.yearlyPerMonth,
        ),
        packageCode: plusYearly.identifier || plusYearly.product.identifier,
        badge: 'Best Value',
        badgeColor: '#D4AF37',
        savings: 'Annual plan',
        isRecommended: true,
      },
      {
        id: SUBSCRIPTION_PRODUCTS.PLUS_MONTHLY,
        billingPeriod: 'monthly' as const,
        price: plusMonthly.product.priceString || PRICING_DISPLAY.PLUS.monthly,
        perMonth: buildPerMonthLabel(
          plusMonthly.product.price,
          plusMonthly.product.currencyCode,
          'monthly',
          PRICING_DISPLAY.PLUS.monthlyPerMonth,
        ),
        packageCode: plusMonthly.identifier || plusMonthly.product.identifier,
        isRecommended: false,
      },
    ];
  }, [offerings]);

  const plans = plansFromOffering;
  const tierColor = colors.gold;
  const isLoading = subscriptionLoading && !offerings;
  const annualSavingsPercent = useMemo(() => getAnnualSavingsPercent(plans), [plans]);
  const usingLivePlan = useMemo(
    () => plansFromOffering.some((plan) => Boolean(plan.packageCode)),
    [plansFromOffering],
  );

  // Detect if the annual plan has a RevenueCat introductory offer (7-day trial)
  const hasTrialAvailable = useMemo(() => {
    if (!offerings?.current) return false;
    const packages = offerings.current.availablePackages || [];
    const yearlyPkg = packages.find(
      (pkg) =>
        pkg.product?.identifier === SUBSCRIPTION_PRODUCTS.PLUS_YEARLY ||
        pkg.identifier === SUBSCRIPTION_PRODUCTS.PLUS_YEARLY ||
        pkg.identifier?.toLowerCase?.().includes(SUBSCRIPTION_PRODUCTS.PLUS_YEARLY.toLowerCase()),
    );
    return Boolean(
      (yearlyPkg?.product as { introductoryPrice?: unknown } | undefined)?.introductoryPrice,
    );
  }, [offerings]);

  const isTrialEligible = hasTrialAvailable && selectedPlan.billingPeriod === 'yearly';

  // Track paywall view
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      [ANALYTICS_PROPS.SOURCE]: source,
      [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
    });
  }, [source, trigger?.id]);

  useEffect(() => {
    log.info('PaywallScreen', 'Plan source resolved', {
      usingLivePlan,
      hasCurrentOffering: Boolean(offerings?.current),
      planIds: plansFromOffering.map((plan) => plan.id),
    });
  }, [usingLivePlan, offerings, plansFromOffering]);

  // Reset to annual/recommended plan when offerings update
  useEffect(() => {
    setSelectedPlan(plansFromOffering[0]);
  }, [plansFromOffering]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleSubscribe = async () => {
    try {
      setIsPurchasing(true);

      trackEvent(ANALYTICS_EVENTS.PAYWALL_CTA_CLICKED, {
        [ANALYTICS_PROPS.TIER]: 'koope_plus',
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
        [ANALYTICS_PROPS.SOURCE]: source,
        [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
      });

      trackEvent(ANALYTICS_EVENTS.PURCHASE_STARTED, {
        [ANALYTICS_PROPS.TIER]: 'koope_plus',
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
        [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
      });

      const billingMode = selectedPlan.billingPeriod;
      const result = isTrialEligible
        ? await startFreeTrial('plus')
        : await purchaseTier('plus', billingMode);

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETED, {
          [ANALYTICS_PROPS.TIER]: 'koope_plus',
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          [ANALYTICS_PROPS.SOURCE]: source,
          [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
          is_trial: isTrialEligible,
        });
        Alert.alert(
          isTrialEligible ? 'Trial Started!' : 'Welcome!',
          isTrialEligible
            ? 'Your 7-day free trial of KŌOPE+ has started!'
            : "You're now a KŌOPE+ member!",
          [{ text: 'Continue', onPress: () => navigation.goBack() }],
        );
      } else if (result.userCancelled) {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_CANCELLED, {
          [ANALYTICS_PROPS.TIER]: 'koope_plus',
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
        });
      } else {
        trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
          [ANALYTICS_PROPS.TIER]: 'koope_plus',
          [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
          [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
          error: result.error || 'Unknown error',
        });
        Alert.alert('Purchase Error', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      log.error('PaywallScreen', 'Purchase error', error);
      trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
        [ANALYTICS_PROPS.TIER]: 'koope_plus',
        [ANALYTICS_PROPS.BILLING_MODE]: selectedPlan.billingPeriod,
        [ANALYTICS_PROPS.TRIGGER_ID]: trigger?.id,
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
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS, {
          had_active_entitlements: hasActive,
        });
        Alert.alert(
          hasActive ? 'Success!' : 'No Purchases Found',
          hasActive ? 'Your purchases have been restored.' : 'No previous purchases found.',
          [{ text: 'OK' }],
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

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderPlanCard = (plan: PlanOption) => {
    const isSelected = selectedPlan.id === plan.id;
    const isAnnual = plan.billingPeriod === 'yearly';
    const headerLabel =
      isAnnual && annualSavingsPercent
        ? `Save ${annualSavingsPercent}%`
        : isAnnual
          ? 'Best Value'
          : 'Monthly';
    const durationLabel = isAnnual ? '12 months' : '1 month';
    const chargeLabel = isAnnual ? `${plan.price}/year` : `${plan.price}/month`;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.planCard, isSelected && { borderColor: tierColor, borderWidth: 2 }]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        <View style={[styles.planHeader, isSelected && { backgroundColor: tierColor }]}>
          <Text style={[styles.planHeaderText, isSelected && { color: colors.bg }]}>
            {headerLabel}
          </Text>
        </View>

        <View style={styles.planBody}>
          <Text style={[styles.planDuration, isSelected && { color: colors.text }]}>
            {durationLabel}
          </Text>
          {isAnnual ? (
            <>
              <Text style={[styles.planPerMonth, isSelected && { color: colors.white }]}>
                {chargeLabel}
              </Text>
              <Text style={[styles.planCharge, isSelected && { color: colors.text }]}>
                {plan.perMonth}
              </Text>
            </>
          ) : (
            <Text style={[styles.planPerMonth, isSelected && { color: colors.white }]}>
              {plan.perMonth}
            </Text>
          )}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: getSafeAreaTop() + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <ImageBackground
            source={HERO_IMAGE}
            style={styles.heroImageCard}
            imageStyle={styles.heroImage}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>KŌOPE+</Text>
            </View>
            <Text style={styles.heroTitle}>Build the bar you actually use</Text>
            <Text style={styles.heroSubtitle}>
              Unlimited bottles, the full recipe catalog, smart inventory tools, and hosting tools
              that take you from guest count to prep timeline.
            </Text>
          </ImageBackground>
        </View>

        {trigger && (
          <View style={styles.contextCard}>
            <View style={styles.contextHeader}>
              <Ionicons name="sparkles-outline" size={16} color={colors.gold} />
              <Text style={styles.contextEyebrow}>Why you are seeing this</Text>
            </View>
            <Text style={styles.contextTitle}>{trigger.ctaText}</Text>
            <Text style={styles.contextBody}>{trigger.message}</Text>
          </View>
        )}

        {/* Founders Urgency Banner — shown when fewer than 300 founders have subscribed */}
        {founderCount !== undefined && founderCount < 300 && (
          <View style={styles.foundersBar}>
            <Ionicons name="lock-closed" size={14} color={colors.gold} />
            <Text style={styles.foundersText}>
              {`You're Founder #${founderCount + 1} of 300 — early access pricing, lock it in before it goes up`}
            </Text>
          </View>
        )}

        {/* Plan Cards — Annual first (dominant), monthly below (secondary) */}
        <View style={styles.plansContainer}>{plans.map(renderPlanCard)}</View>

        {/* Feature Benefits */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>What you get</Text>
          {FEATURES.map(renderFeature)}
        </View>

        {/* Coming Soon */}
        <View style={styles.comingSoonSection}>
          <View style={styles.comingSoonHeader}>
            <Ionicons name="time-outline" size={14} color={colors.subtext} />
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          </View>
          {COMING_SOON.map((item, index) => (
            <View key={index} style={styles.comingSoonRow}>
              <View style={styles.comingSoonDot} />
              <Text style={styles.comingSoonText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Legal — scrollable copy, reinforces the sticky footer disclosure */}
        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID account at confirmation. Subscription auto-renews
          unless cancelled at least 24 hours before the end of the current period. Manage or cancel
          anytime in App Store Settings. <Text style={styles.legalLink}>Terms</Text> &{' '}
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
                ? 'Start 7-Day Free Trial — KŌOPE+'
                : selectedPlan.billingPeriod === 'yearly'
                  ? `Get KŌOPE+ — ${selectedPlan.price}/year`
                  : `Get KŌOPE+ — ${selectedPlan.price}/month`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Subscription disclosure — required by Apple guideline 3.1.2 */}
        <Text style={styles.ctaDisclosure}>
          {isTrialEligible
            ? `7-day free trial, then ${selectedPlan.price}/year. Payment charged to Apple ID after trial. Renews automatically — cancel anytime in Settings.`
            : selectedPlan.billingPeriod === 'yearly'
              ? `Billed as ${selectedPlan.price}/year. Payment charged to Apple ID. Renews automatically — cancel anytime in Settings.`
              : `Billed as ${selectedPlan.price}/month. Payment charged to Apple ID. Renews monthly — cancel anytime in Settings.`}
        </Text>
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

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
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
  heroPill: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(26,18,13,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(242,229,213,0.22)',
  },
  heroPillText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
  contextCard: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(242,229,213,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(242,229,213,0.12)',
    gap: 6,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextEyebrow: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contextTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '800',
  },
  contextBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
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

  // Coming Soon
  comingSoonSection: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(242,229,213,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(242,229,213,0.1)',
    gap: 10,
  },
  comingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  comingSoonTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  comingSoonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.subtext,
    opacity: 0.5,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
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
  ctaDisclosure: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
