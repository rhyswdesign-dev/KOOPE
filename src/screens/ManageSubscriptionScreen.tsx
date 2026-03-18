// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import Button from '../components/ui/Button';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ManageSubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    isPro,
    isKoopePro,
    isPrestige,
    isSubscriber,
    customerInfo,
    restorePurchases,
  } = useSubscription();

  // Determine current plan
  const getCurrentPlan = () => {
    if (isPrestige) return { name: 'KOOPE Prestige', tier: 'prestige' };
    if (isKoopePro || isPro) return { name: 'KOOPE PRO', tier: 'pro' };
    return { name: 'Free', tier: 'free' };
  };

  const currentPlan = getCurrentPlan();

  // Get subscription details from customerInfo
  const getSubscriptionDetails = () => {
    if (!customerInfo || !isSubscriber) return null;

    const activeSubscription = customerInfo.activeSubscriptions?.[0];
    const entitlement = customerInfo.entitlements?.active?.koope_pro ||
                        customerInfo.entitlements?.active?.pro ||
                        customerInfo.entitlements?.active?.prestige;

    if (!entitlement) return null;

    return {
      expirationDate: entitlement.expirationDate
        ? new Date(entitlement.expirationDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
      willRenew: entitlement.willRenew,
      productIdentifier: entitlement.productIdentifier,
    };
  };

  const subscriptionDetails = getSubscriptionDetails();

  const handleManageInStore = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.success) {
      Alert.alert('Success', 'Your purchases have been restored.');
    } else if (!result.userCancelled) {
      Alert.alert('Error', result.error || 'Failed to restore purchases.');
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Paywall', { source: 'manage_subscription' });
  };

  const renderPlanCard = () => (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planBadge}>
          <Ionicons
            name={currentPlan.tier === 'free' ? 'person-outline' : 'star'}
            size={20}
            color={currentPlan.tier === 'free' ? colors.subtext : colors.gold}
          />
        </View>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{currentPlan.name}</Text>
          <Text style={styles.planStatus}>
            {currentPlan.tier === 'free' ? 'Basic access' : 'Active subscription'}
          </Text>
        </View>
      </View>

      {subscriptionDetails && (
        <View style={styles.subscriptionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Next billing date</Text>
            <Text style={styles.detailValue}>
              {subscriptionDetails.expirationDate || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Auto-renew</Text>
            <Text style={[styles.detailValue, { color: subscriptionDetails.willRenew ? colors.success : colors.warning }]}>
              {subscriptionDetails.willRenew ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderUpgradeOptions = () => {
    if (isPrestige) return null; // Already at highest tier

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {currentPlan.tier === 'free' ? 'Upgrade Your Plan' : 'Available Plans'}
        </Text>

        {currentPlan.tier === 'free' && (
          <>
            <TouchableOpacity style={styles.optionCard} onPress={handleUpgrade}>
              <View style={styles.optionContent}>
                <View style={[styles.optionBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="star" size={18} color={colors.white} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>KOOPE PRO</Text>
                  <Text style={styles.optionDescription}>
                    Unlimited recipes, AI tools, and more
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={handleUpgrade}>
              <View style={styles.optionContent}>
                <View style={[styles.optionBadge, { backgroundColor: colors.gold }]}>
                  <Ionicons name="diamond" size={18} color={colors.goldText} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>KOOPE Prestige</Text>
                  <Text style={styles.optionDescription}>
                    Everything in PRO plus exclusive perks
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </>
        )}

        {currentPlan.tier === 'pro' && (
          <TouchableOpacity style={styles.optionCard} onPress={handleUpgrade}>
            <View style={styles.optionContent}>
              <View style={[styles.optionBadge, { backgroundColor: colors.gold }]}>
                <Ionicons name="diamond" size={18} color={colors.goldText} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>Upgrade to Prestige</Text>
                <Text style={styles.optionDescription}>
                  Get exclusive perks and early access
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Manage</Text>

      {isSubscriber && (
        <TouchableOpacity style={styles.actionRow} onPress={handleManageInStore}>
          <View style={styles.actionContent}>
            <Ionicons name="card-outline" size={22} color={colors.text} />
            <Text style={styles.actionText}>Manage in {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.subtext} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.actionRow} onPress={handleRestore}>
        <View style={styles.actionContent}>
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
          <Text style={styles.actionText}>Restore Purchases</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>

      {isSubscriber && (
        <TouchableOpacity style={styles.actionRow} onPress={handleManageInStore}>
          <View style={styles.actionContent}>
            <Ionicons name="close-circle-outline" size={22} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Cancel Subscription</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPlanCard()}
        {renderUpgradeOptions()}
        {renderActions()}

        <Text style={styles.disclaimer}>
          Subscriptions are managed through the {Platform.OS === 'ios' ? 'App Store' : 'Google Play Store'}.
          You can cancel anytime from your account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(3),
    paddingBottom: spacing(6),
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.35)',
    padding: spacing(3),
    marginBottom: spacing(3),
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
    borderWidth: 2,
    borderColor: 'rgba(214,138,56,0.4)',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Georgia',
  },
  planStatus: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subscriptionDetails: {
    marginTop: spacing(3),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  detailLabel: {
    fontSize: fonts.small,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing(2),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(1.5),
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.text,
  },
  optionDescription: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    marginBottom: spacing(1),
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  actionText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  disclaimer: {
    fontSize: fonts.small,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing(2),
    opacity: 0.7,
  },
});
