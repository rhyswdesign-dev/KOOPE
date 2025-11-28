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

const { width } = Dimensions.get('window');

interface PaywallScreenProps {
  route?: {
    params?: {
      offering?: string | null;
      displayCloseButton?: boolean;
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
    priceDetail: '/mo USD or $59.99/yr',
    color: '#D4AF37',
    buttonColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  {
    id: 'koope_pro',
    name: 'KOOPE PRO',
    badge: 'Elite',
    tagline: 'The premium hosting lifestyle.',
    price: '$19.99',
    priceDetail: '/mo USD or $119.99/yr',
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

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const { offerings, refreshSubscriptionStatus, isKoopePro, isPro } = useSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const displayCloseButton = route?.params?.displayCloseButton !== false;

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

  const handlePurchase = async (tier: 'koope_plus' | 'koope_pro') => {
    const pkg = packages.find(p => {
      const id = p.identifier.toLowerCase();
      if (tier === 'koope_plus') {
        return id.includes('koope') && id.includes('month') && !id.includes('pro');
      } else {
        return id.includes('pro') && id.includes('month');
      }
    });

    if (!pkg) {
      Alert.alert('Coming Soon', 'Subscription packages will be available once App Store setup is complete.');
      return;
    }

    try {
      setIsPurchasing(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await refreshSubscriptionStatus();

      Alert.alert(
        'Success!',
        `Welcome to ${tier === 'koope_plus' ? 'KOOPE+' : 'KOOPE PRO'}!`,
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Error', error.message || 'Something went wrong');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const customerInfo = await Purchases.restorePurchases();
      await refreshSubscriptionStatus();

      const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
      Alert.alert(
        hasActive ? 'Success!' : 'No Purchases Found',
        hasActive ? 'Your purchases have been restored.' : 'No previous purchases found.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
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

  const renderTierCard = (tier: TierData) => {
    const isCurrent = tier.id === 'free' ? false : (tier.id === 'koope_plus' ? isKoopePro && !isPro : isPro);
    const cardWidth = (width - spacing(8)) / 3;

    return (
      <View
        key={tier.id}
        style={[
          styles.tierCard,
          {
            width: cardWidth,
            borderColor: tier.borderColor,
            backgroundColor: tier.id === 'koope_plus' ? 'rgba(212, 175, 55, 0.05)' :
                           tier.id === 'koope_pro' ? 'rgba(205, 127, 50, 0.05)' :
                           '#1E2128',
          }
        ]}
      >
        {/* Badge */}
        {tier.badge && (
          <View style={[styles.badge, { backgroundColor: tier.color }]}>
            <Text style={styles.badgeText}>{tier.badge}</Text>
          </View>
        )}

        {/* Header */}
        <Text style={[styles.tierTitle, { color: tier.color }]}>{tier.name}</Text>
        <Text style={styles.tierPrice}>{tier.price}</Text>
        {tier.priceDetail ? (
          <Text style={styles.tierPriceDetail}>{tier.priceDetail}</Text>
        ) : null}
        <Text style={styles.tierTagline}>{tier.tagline}</Text>

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.selectButton,
            {
              backgroundColor: isCurrent ? '#3A3F45' : tier.buttonColor,
              opacity: isPurchasing ? 0.6 : 1,
            }
          ]}
          onPress={() => {
            if (tier.id === 'free') {
              navigation.goBack();
            } else if (!isCurrent) {
              handlePurchase(tier.id);
            }
          }}
          disabled={isPurchasing || (isCurrent && tier.id !== 'free')}
        >
          <Text style={[styles.selectButtonText, { color: tier.id === 'free' || isCurrent ? '#B8B8B8' : '#1A1D21' }]}>
            {tier.id === 'free' ? 'Get Started' : isCurrent ? 'Current Plan' : 'Select Plan'}
          </Text>
        </TouchableOpacity>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, idx) => {
            const value = renderFeatureValue(feature, tier.id);
            const isLocked = feature.locked && tier.id === 'free' && !value;

            return (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  {isLocked ? (
                    <Ionicons name="lock-closed" size={12} color="#5A5F6B" />
                  ) : value === '✓' ? (
                    <Ionicons name="checkmark" size={14} color={tier.color} />
                  ) : value === '✗' ? (
                    <Ionicons name="close" size={14} color="#5A5F6B" />
                  ) : null}
                </View>
                <Text style={[styles.featureText, { color: isLocked ? '#5A5F6B' : '#B8B8B8' }]} numberOfLines={2}>
                  {typeof value === 'string' && value !== '✓' && value !== '✗' ? value : feature.label}
                </Text>
              </View>
            );
          })}
        </View>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KOOPE—Pricing at a Glance</Text>
          <Text style={styles.subtitle}>Choose your path. Elevate how you drink, host, and learn.</Text>
        </View>

        {/* Tier Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiersContainer}
          style={styles.tiersScroll}
        >
          {TIERS.map(renderTierCard)}
        </ScrollView>

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
    backgroundColor: '#2D3139',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#2D3139',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8B8B8B',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: '#B8B8B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  tiersScroll: {
    marginBottom: spacing(3),
  },
  tiersContainer: {
    paddingHorizontal: spacing(3),
    gap: spacing(3),
  },
  tierCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing(3),
    minHeight: 600,
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
  tierTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: spacing(1),
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tierPriceDetail: {
    fontSize: 13,
    color: '#8B8B8B',
    marginBottom: spacing(1),
  },
  tierTagline: {
    fontSize: 14,
    color: '#B8B8B8',
    marginBottom: spacing(2),
    lineHeight: 20,
  },
  selectButton: {
    paddingVertical: spacing(2),
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  featuresContainer: {
    gap: spacing(1.5),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.5),
  },
  featureIconContainer: {
    width: 16,
    alignItems: 'center',
    paddingTop: 2,
  },
  featureText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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
    color: '#8B8B8B',
    textAlign: 'center',
  },
});
