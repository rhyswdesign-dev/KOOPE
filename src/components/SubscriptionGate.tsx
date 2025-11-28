/**
 * SUBSCRIPTION GATE COMPONENT
 * Gates content behind subscription requirements
 *
 * Shows upgrade prompt if user doesn't have required subscription
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionGateProps {
  children: ReactNode;
  requiredTier: 'koope_pro' | 'pro' | 'prestige' | 'any';
  fallback?: ReactNode;
  title?: string;
  description?: string;
  ctaText?: string;
  offering?: string | null;
}

/**
 * SubscriptionGate Component
 *
 * Conditionally renders content based on subscription status
 *
 * @example
 * ```tsx
 * <SubscriptionGate requiredTier="pro">
 *   <ProOnlyFeature />
 * </SubscriptionGate>
 * ```
 */
export default function SubscriptionGate({
  children,
  requiredTier,
  fallback,
  title = 'Premium Feature',
  description = 'Upgrade to access this feature and unlock all premium content.',
  ctaText = 'Upgrade Now',
  offering = null,
}: SubscriptionGateProps) {
  const navigation = useNavigation<any>();
  const { isKoopePro, isPro, isPrestige, isSubscriber, isLoading } = useSubscription();

  /**
   * Check if user has required subscription
   */
  const hasAccess = (): boolean => {
    if (isLoading) return false;

    switch (requiredTier) {
      case 'koope_pro':
        return isKoopePro;
      case 'pro':
        return isPro || isPrestige; // Prestige includes Pro features
      case 'prestige':
        return isPrestige;
      case 'any':
        return isSubscriber;
      default:
        return false;
    }
  };

  /**
   * Navigate to paywall
   */
  const handleUpgrade = () => {
    navigation.navigate('Paywall', {
      offering,
      displayCloseButton: true,
    });
  };

  // User has access - show content
  if (hasAccess()) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1F2937', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color={colors.accent} />
          </View>
        </View>

        {/* Content */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {/* CTA Button */}
        <TouchableOpacity style={styles.button} onPress={handleUpgrade}>
          <LinearGradient
            colors={[colors.accent, '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>{ctaText}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Features List */}
        <View style={styles.features}>
          <FeatureItem icon="checkmark-circle" text="Unlimited access" />
          <FeatureItem icon="checkmark-circle" text="Premium content" />
          <FeatureItem icon="checkmark-circle" text="Ad-free experience" />
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Feature Item Component
 */
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={16} color={colors.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing(2),
  },
  gradient: {
    flex: 1,
    borderRadius: radii.xl,
    padding: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing(3),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(2),
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(4),
    lineHeight: 24,
  },
  button: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing(4),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  features: {
    gap: spacing(1.5),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  featureText: {
    fontSize: 14,
    color: colors.subtext,
  },
});
