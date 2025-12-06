/**
 * KOOPE PREMIUM PAYWALL
 * Vertical stacked layout inspired by Masterclass
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

const { width } = Dimensions.get('window');

interface PaywallScreenProps {
  route?: {
    params?: {
      offering?: string | null;
      displayCloseButton?: boolean;
      source?: string; // Where the user came from (e.g., 'home_bar', 'cocktail_detail', 'vault')
    };
  };
}

interface Feature {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
  locked?: boolean; // For FREE tier
}

interface TierData {
  id: 'free' | 'koope_plus' | 'koope_pro';
  name: string;
  badge?: string;
  tagline: string;
  price: string;
  priceDetail: string;
  monthlyPrice: string;
  monthlyPriceDetail: string;
  yearlyPrice: string;
  yearlyPriceDetail: string;
  color: string;
  buttonColor: string;
  borderColor: string;
}

const TIERS: TierData[] = [
  {
    id: 'free',
    name: 'FREE',
    tagline: 'Start the journey. Learn the basics.',
    price: '$0',
    priceDetail: '',
    monthlyPrice: 'Free',
    monthlyPriceDetail: '',
    yearlyPrice: 'Free',
    yearlyPriceDetail: '',
    color: '#8B8B8B',
    buttonColor: '#2D3139',
    borderColor: '#3A3F45',
  },
  {
    id: 'koope_plus',
    name: 'KOOPE+',
    badge: 'Most Popular',
    tagline: 'Your personal upgrade.',
    price: '$8.99',
    priceDetail: '/mo USD or $71.99/yr',
    monthlyPrice: '$8.99',
    monthlyPriceDetail: '/month',
    yearlyPrice: '$71.99',
    yearlyPriceDetail: '/year (save 33%)',
    color: colors.accent,
    buttoncolor: colors.accent,
    bordercolor: colors.accent,
  },
  {
    id: 'koope_pro',
    name: 'KOOPE PRO',
    badge: 'Elite',
    tagline: 'The premium hosting lifestyle.',
    price: '$17.99',
    priceDetail: '/mo USD or $179.99/yr',
    monthlyPrice: '$17.99',
    monthlyPriceDetail: '/month',
    yearlyPrice: '$179.99',
    yearlyPriceDetail: '/year (save 17%)',
    color: '#CD7F32',
    buttonColor: '#CD7F32',
    borderColor: '#CD7F32',
  },
];

const FEATURES: Feature[] = [
  { label: 'Lessons', free: 'Basics Only', plus: 'Unlimited', pro: 'Unlimited + Masterclasses' },
  { label: 'AI Coach', free: 'Limited (3/day)', plus: 'Unlimited', pro: 'Priority AI (Memory + Context)' },
  { label: 'Saves & Notes', free: 'Limited', plus: 'Unlimited', pro: 'Unlimited + Pro Tools' },
  { label: 'Inventory System', free: '10 Items Max', plus: 'Unlimited', pro: 'Unlimited + Smart Suggestions' },
  { label: 'Seasonal Vault Access', free: false, plus: 'Standard Access', pro: 'Early Access + Monthly Free Key' },
  { label: 'Monthly New Drops', free: 'Free Mini-Drop', plus: 'Full Access', pro: 'Early Access + Pro Exclusives' },
  { label: 'Challenges', free: 'Limited', plus: 'Full Access', pro: 'VIP-Only Challenges' },
  { label: 'Brand Perks', free: false, plus: 'Light Perks', pro: 'Exclusive Offers, Tastings, Events' },
  { label: 'Offline Mode', free: false, plus: true, pro: true },
  { label: 'Recipe Builder', free: 'Basic', plus: 'Enhanced', pro: 'Pro Builder (Advanced Flavor AI)' },
  { label: 'Cocktail Cards', free: 'Limited Pack', plus: 'Full Library', pro: 'Pro-Only Cards + Variations' },
  { label: 'Home Bar Plan', free: 'Basic Tips', plus: 'Monthly Personalized Plan', pro: 'Advanced Blueprint + PDF' },
  { label: 'Event / Class Discounts', free: false, plus: 'Light', pro: 'Priority + Bigger Discounts' },
  { label: 'Certification Tracks', free: false, plus: 'Basic', pro: 'Verified MixMind Certifications' },
  { label: 'Creator Tools', free: false, plus: false, pro: 'Menu Export, Upload Recipes, Themes' },
  { label: 'Community Identity', free: 'General', plus: 'Standard', pro: 'Elite Flair (Badge, Crown)' },
];

type BillingMode = 'monthly' | 'yearly';

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const { offerings, refreshSubscriptionStatus, restorePurchases, purchaseTier, isKoopePro, isPro, isSubscriber } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>('yearly'); // Default to yearly (better value)

  const displayCloseButton = route?.params?.displayCloseButton !== false;
  const source = route?.params?.source || 'unknown';

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
        if (offerings?.current) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (error) {
        console.error('[PaywallScreen] Error loading packages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, [offerings]);

  /**
   * Handle subscription purchase
   * Finds the appropriate package based on tier and billing mode
   */
  const handleSubscribe = async (tier: 'koope_plus' | 'koope_pro', mode: BillingMode) => {
    try {
      setIsPurchasing(true);

      // Track CTA click
      trackEvent(ANALYTICS_EVENTS.PAYWALL_CTA_CLICKED, {
        [ANALYTICS_PROPS.TIER]: tier,
        [ANALYTICS_PROPS.BILLING_MODE]: mode,
        [ANALYTICS_PROPS.SOURCE]: source,
      });

      // Track purchase started
      trackEvent(ANALYTICS_EVENTS.PURCHASE_STARTED, {
        [ANALYTICS_PROPS.TIER]: tier,
        [ANALYTICS_PROPS.BILLING_MODE]: mode,
      });

      // Map koope_plus/koope_pro to 'pro'/'prestige'
      const tierName = tier === 'koope_pro' ? 'pro' : 'pro'; // Both map to 'pro' for now

      const result = await purchaseTier(tierName, mode);

      if (result.success) {
        // Track successful purchase
        trackEvent(ANALYTICS_EVENTS.PURCHASE_COMPLETED, {
          [ANALYTICS_PROPS.TIER]: tier,
          [ANALYTICS_PROPS.BILLING_MODE]: mode,
          [ANALYTICS_PROPS.SOURCE]: source,
        });

        Alert.alert(
          'Success!',
          `Welcome to ${tier === 'koope_plus' ? 'KOOPE+' : 'KOOPE PRO'}! Enjoy your ${mode} subscription.`,
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
        );
      } else if (result.userCancelled) {
        // Track user cancellation
        trackEvent(ANALYTICS_EVENTS.PURCHASE_CANCELLED, {
          [ANALYTICS_PROPS.TIER]: tier,
          [ANALYTICS_PROPS.BILLING_MODE]: mode,
        });
      } else {
        // Track purchase failure
        trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
          [ANALYTICS_PROPS.TIER]: tier,
          [ANALYTICS_PROPS.BILLING_MODE]: mode,
          error: result.error || 'Unknown error',
        });

        Alert.alert('Purchase Error', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      console.error('[PaywallScreen] Purchase error:', error);

      // Track error
      trackEvent(ANALYTICS_EVENTS.PURCHASE_FAILED, {
        [ANALYTICS_PROPS.TIER]: tier,
        [ANALYTICS_PROPS.BILLING_MODE]: mode,
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

      // Track restore attempt
      trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_TAPPED);

      const result = await restorePurchases();

      if (result.success) {
        const hasActive = Object.keys(result.customerInfo?.entitlements.active || {}).length > 0;

        // Track restore success
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS, {
          had_active_entitlements: hasActive,
        });

        Alert.alert(
          hasActive ? 'Success!' : 'No Purchases Found',
          hasActive ? 'Your purchases have been restored.' : 'No previous purchases found.',
          [{ text: 'OK' }]
        );
      } else {
        // Track restore failure
        trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, {
          error: result.error || 'Unknown error',
        });

        Alert.alert('Restore Error', result.error || 'Failed to restore purchases');
      }
    } catch (error: any) {
      // Track error
      trackEvent(ANALYTICS_EVENTS.RESTORE_PURCHASES_FAILED, {
        error: error.message || 'Unknown error',
      });

      Alert.alert('Restore Error', error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderFeatureValue = (feature: Feature, tier: 'free' | 'koope_plus' | 'koope_pro') => {
    const value = tier === 'free' ? feature.free : tier === 'koope_plus' ? feature.plus : feature.pro;

    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    return value;
  };

  const getKeyHighlights = (tier: TierData) => {
    switch (tier.id) {
      case 'free':
        return ['Basics Only', 'Limited AI (1/day)', '10 Inventory Items'];
      case 'koope_plus':
        return ['Unlimited Lessons', 'Unlimited AI Coach', 'Vault Access', 'Offline Mode'];
      case 'koope_pro':
        return ['Everything in KOOPE+', 'Priority AI w/ Memory', 'Creator Tools', 'VIP Challenges'];
      default:
        return [];
    }
  };

  const renderTierCard = (tier: TierData) => {
    const isCurrent = tier.id === 'free' ? false : (tier.id === 'koope_plus' ? isKoopePro && !isPro : isPro);
    const isExpanded = expandedTier === tier.id;
    const keyHighlights = getKeyHighlights(tier);

    // Get dynamic price based on billing mode
    const displayPrice = billingMode === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
    const displayPriceDetail = billingMode === 'monthly' ? tier.monthlyPriceDetail : tier.yearlyPriceDetail;

    // Determine badge to show: Current Plan takes priority
    const badgeText = isCurrent ? 'Current Plan' : tier.badge;
    const badgeColor = isCurrent ? '#3A3F45' : tier.color;

    return (
      <View
        key={tier.id}
        style={[
          styles.tierCard,
          {
            borderColor: isCurrent ? tier.color :
                        tier.id === 'koope_plus' ? '#D4AF37' :
                        tier.id === 'koope_pro' ? '#CD7F32' :
                        '#374151',
            borderWidth: isCurrent ? 3 : 2,
          }
        ]}
      >
        {/* Badge */}
        {badgeText && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.tierHeader}>
          <View style={styles.tierHeaderLeft}>
            <Text style={[styles.tierTitle, { color: tier.color }]}>{tier.name}</Text>
            <Text style={styles.tierTagline}>{tier.tagline}</Text>
          </View>
          <View style={styles.tierHeaderRight}>
            <Text style={[styles.tierPrice, { color: tier.color }]}>{displayPrice}</Text>
            {displayPriceDetail ? (
              <Text style={styles.tierPriceDetail}>{displayPriceDetail}</Text>
            ) : null}
          </View>
        </View>

        {/* Key Highlights */}
        <View style={styles.highlightsContainer}>
          {keyHighlights.map((highlight, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <Ionicons name="checkmark-circle" size={18} color={tier.color} />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>

        {/* See More Button */}
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => setExpandedTier(isExpanded ? null : tier.id)}
        >
          <Text style={styles.seeMoreText}>
            {isExpanded ? 'See Less' : 'See All Features'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#8B8B8B"
          />
        </TouchableOpacity>

        {/* Expanded Features */}
        {isExpanded && (
          <View style={styles.expandedFeatures}>
            {FEATURES.map((feature, idx) => {
              const value = renderFeatureValue(feature, tier.id);
              const isLocked = feature.locked && tier.id === 'free' && !value;

              return (
                <View key={idx} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={14} color="#5A5F6B" />
                    ) : value === '✓' ? (
                      <Ionicons name="checkmark" size={16} color={tier.color} />
                    ) : value === '✗' ? (
                      <Ionicons name="close" size={16} color="#5A5F6B" />
                    ) : null}
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={[styles.featureLabel, { color: isLocked ? '#5A5F6B' : '#FFFFFF' }]}>
                      {feature.label}
                    </Text>
                    {typeof value === 'string' && value !== '✓' && value !== '✗' && (
                      <Text style={[styles.featureValue, { color: isLocked ? '#5A5F6B' : '#B8B8B8' }]}>
                        {value}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.selectButton,
            {
              backgroundColor: isCurrent ? '#3A3F45' : tier.color,
              opacity: isPurchasing ? 0.6 : 1,
            }
          ]}
          disabled={isPurchasing}
          onPress={() => {
            if (tier.id === 'free') {
              navigation.goBack();
            } else if (!isCurrent && !isPurchasing) {
              handleSubscribe(tier.id, billingMode);
            }
          }}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.selectButtonText,
                { color: isCurrent ? '#8B8B8B' : '#000000' }
              ]}
            >
              {isCurrent
                ? 'Current Plan'
                : tier.id === 'free'
                ? 'Continue with Free'
                : 'Subscribe Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

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
          <Text style={styles.subtitle}>Choose your path. Elevate how you drink, host, and learn.</Text>
        </View>

        {/* Billing Mode Toggle */}
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingToggleButton,
              billingMode === 'monthly' && styles.billingToggleButtonActive,
            ]}
            onPress={() => setBillingMode('monthly')}
          >
            <Text
              style={[
                styles.billingToggleText,
                billingMode === 'monthly' && styles.billingToggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingToggleButton,
              billingMode === 'yearly' && styles.billingToggleButtonActive,
            ]}
            onPress={() => setBillingMode('yearly')}
          >
            <Text
              style={[
                styles.billingToggleText,
                billingMode === 'yearly' && styles.billingToggleTextActive,
              ]}
            >
              Yearly
            </Text>
            {billingMode === 'yearly' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>Best Value</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Subscriber Status Banner */}
        {isSubscriber && (
          <View style={styles.subscriberBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />
            <Text style={styles.subscriberText}>
              You are currently on {isPro ? 'KOOPE PRO' : 'KOOPE+'} plan
            </Text>
          </View>
        )}

        {/* Tier Cards - Vertical Stacked */}
        <View style={styles.tiersContainer}>
          {TIERS.map(renderTierCard)}
        </View>

        {/* Restore Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
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
    marginBottom: spacing(4),
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
  billingToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
    gap: 4,
  },
  billingToggleButton: {
    flex: 1,
    paddingVertical: spacing(1.5),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  billingToggleButtonActive: {
    backgroundColor: colors.accent,
  },
  billingToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  billingToggleTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subscriberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  subscriberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  tiersContainer: {
    paddingHorizontal: spacing(3),
    gap: spacing(4),
  },
  tierCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: spacing(4),
    width: '100%',
    backgroundColor: colors.card,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: 12,
    marginBottom: spacing(2),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(3),
  },
  tierHeaderLeft: {
    flex: 1,
  },
  tierHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: spacing(2),
  },
  tierTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: spacing(0.5),
  },
  tierTagline: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  tierPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tierPriceDetail: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  highlightsContainer: {
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  highlightText: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: spacing(2),
  },
  seeMoreText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  expandedFeatures: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: spacing(2),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.5),
  },
  featureIconContainer: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#F9FAFB',
  },
  featureValue: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9CA3AF',
  },
  selectButton: {
    paddingVertical: spacing(2.5),
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing(3),
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
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
