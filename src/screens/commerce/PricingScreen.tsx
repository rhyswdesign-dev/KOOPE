import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii, fonts } from '../../theme/tokens';
import { PricingPlan } from '../../types/commerce';

const pricingPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for occasional cocktail enthusiasts',
    price: 9.99,
    billingPeriod: 'monthly',
    features: [
      'Access to basic cocktail recipes',
      'XP tracking',
      'Save favorite recipes',
      'Community access',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For serious home bartenders',
    price: 19.99,
    billingPeriod: 'monthly',
    originalPrice: 29.99,
    popular: true,
    features: [
      'Everything in Basic',
      'Premium cocktail recipes',
      'Video tutorials',
      'Exclusive spirit tastings',
      'Advanced mixology courses',
      'Priority support',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime Access',
    description: 'One-time purchase, lifetime access',
    price: 299.99,
    billingPeriod: 'lifetime',
    originalPrice: 599.99,
    features: [
      'Everything in Premium',
      'Lifetime access to all content',
      'Future updates included',
      'VIP community access',
      'Exclusive merchandise discounts',
      '1-on-1 mixology sessions',
    ],
  },
];

export default function PricingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isIOS = Platform.OS === 'ios';

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Premium',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      // Kill List (Master Plan §2.4): the header cart icon used to navigate to
      // the mock Cart screen — removed (audit/sprint-1 review), not replaced,
      // since in-app checkout is permanently gone (commerce = affiliate links out).
    });
  }, [nav]);

  const handleSelectPlan = (plan: PricingPlan) => {
    // Kill List (Master Plan §2.4): both platforms now route to Paywall — the
    // one live subscription entry point. The Android path previously added the
    // plan to a local cart then navigated to the killed Cart screen; that
    // navigation is removed (audit/sprint-1 review) rather than left as a
    // dead-end tap.
    nav.navigate('Paywall', { source: 'pricing_screen_plan_select', displayCloseButton: true });
  };

  const renderPlanCard = (plan: PricingPlan) => (
    <View key={plan.id} style={[styles.planCard, plan.popular && styles.popularCard]}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ${plan.price}
            {plan.billingPeriod !== 'lifetime' && (
              <Text style={styles.billingPeriod}>/{plan.billingPeriod === 'monthly' ? 'mo' : 'yr'}</Text>
            )}
          </Text>
          {plan.originalPrice && (
            <Text style={styles.originalPrice}>${plan.originalPrice}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.selectButton, plan.popular && styles.popularButton]}
        onPress={() => handleSelectPlan(plan)}
        activeOpacity={0.8}
      >
        <Text style={[styles.selectButtonText, plan.popular && styles.popularButtonText]}>
          {plan.billingPeriod === 'lifetime' ? 'Purchase Lifetime' : 'Start Free Trial'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isIOS) {
    return (
      <View style={styles.container}>
        <View style={styles.iosComplianceCard}>
          <Text style={styles.iosComplianceTitle}>Store purchases are disabled on iOS</Text>
          <Text style={styles.iosComplianceBody}>
            This build only supports App Store managed subscriptions on iOS.
          </Text>
          <TouchableOpacity
            style={styles.iosComplianceButton}
            onPress={() => nav.navigate('Paywall', { source: 'pricing_screen_ios_notice', displayCloseButton: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.iosComplianceButtonText}>View Subscription Options</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Kill List (Master Plan §2.4): the Products tab (fake merch + a
          broken "Add to Cart" that called a never-mounted CartContext)
          was removed — commerce returns in Phase 3 as affiliate links
          out, not an in-app cart. Subscription plans are the only tab
          left, so the tab selector is gone too. */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.plansContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <Text style={styles.sectionSubtitle}>
              Unlock premium content and exclusive features
            </Text>
          </View>

          {pricingPlans.map(renderPlanCard)}

          <View style={styles.trialNote}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.trialNoteText}>
              All plans include a 7-day free trial. Cancel anytime.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: spacing(2),
    borderRadius: radii.lg,
    padding: spacing(0.5),
  },
  iosComplianceCard: {
    margin: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    gap: spacing(1),
  },
  iosComplianceTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  iosComplianceBody: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  iosComplianceButton: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
  },
  iosComplianceButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing(2),
    alignItems: 'center',
    borderRadius: radii.md,
  },
  activeTab: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  activeTabText: {
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
  },
  plansContainer: {
    paddingTop: spacing(3),
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.line,
    marginHorizontal: spacing(2),
    marginBottom: spacing(3),
    padding: spacing(3),
    position: 'relative',
  },
  popularCard: {
    borderColor: colors.accent,
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popularBadgeText: {
    backgroundColor: colors.accent,
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  planDescription: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  priceContainer: {
    alignItems: 'center',
  },
  price: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
  },
  billingPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.subtext,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.subtext,
    textDecorationLine: 'line-through',
    marginTop: spacing(0.5),
  },
  featuresContainer: {
    marginBottom: spacing(4),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  selectButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: colors.accent,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  popularButtonText: {
    color: colors.white,
  },
  trialNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(3),
    marginHorizontal: spacing(2),
    gap: spacing(2),
  },
  trialNoteText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  productsContainer: {
    paddingTop: spacing(3),
  },
  productsGrid: {
    paddingHorizontal: spacing(2),
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(3),
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  valueBadge: {
    position: 'absolute',
    top: spacing(2),
    left: spacing(2),
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
  },
  valueBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  productInfo: {
    padding: spacing(3),
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  productDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(3),
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2.5),
    gap: spacing(1),
  },
  disabledButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  disabledButtonText: {
    color: colors.subtext,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
