import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { useReferrals, RewardTier } from '../services/referralService';
import Button from '../components/ui/Button';

export default function ReferralScreen() {
  const { referralCode, stats, isLoading, rewardTiers, nextReward, progress, shareCode, refresh } =
    useReferrals();

  const [copied, setCopied] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleCopyCode = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    await shareCode();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderCodeCard = () => (
    <View style={styles.codeCard}>
      <Text style={styles.cardTitle}>Your Referral Code</Text>
      <Text style={styles.cardSubtitle}>Share this code with friends to earn rewards</Text>

      <View style={styles.codeContainer}>
        <Text style={styles.code}>{referralCode || '...'}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? colors.success : colors.accent}
          />
        </TouchableOpacity>
      </View>

      <Button
        title="Share with Friends"
        icon="share-outline"
        onPress={handleShare}
        variant="primary"
        size="large"
        fullWidth
        style={styles.shareButton}
      />
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.success }]}>{stats.confirmed}</Text>
        <Text style={styles.statLabel}>Confirmed</Text>
      </View>
    </View>
  );

  const renderProgress = () => {
    if (!progress || !nextReward) return null;

    return (
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Next Reward</Text>
          <Text style={styles.progressCount}>
            {progress.current}/{progress.required}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
        </View>

        <View style={styles.rewardPreview}>
          <View style={styles.rewardIcon}>
            <Ionicons name={nextReward.icon as any} size={24} color={colors.gold} />
          </View>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>{nextReward.reward}</Text>
            <Text style={styles.rewardDescription}>{nextReward.description}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRewardTier = (tier: RewardTier, index: number) => {
    const isUnlocked = stats.confirmed >= tier.referralsRequired;
    const isNext = nextReward?.id === tier.id;

    return (
      <View
        key={tier.id}
        style={[styles.tierItem, isUnlocked && styles.tierUnlocked, isNext && styles.tierNext]}
      >
        <View style={[styles.tierBadge, isUnlocked && styles.tierBadgeUnlocked]}>
          <Ionicons
            name={isUnlocked ? 'checkmark' : (tier.icon as any)}
            size={20}
            color={isUnlocked ? colors.white : colors.subtext}
          />
        </View>

        <View style={styles.tierContent}>
          <Text style={[styles.tierName, isUnlocked && styles.tierNameUnlocked]}>
            {tier.reward}
          </Text>
          <Text style={styles.tierRequirement}>
            {tier.referralsRequired} referral{tier.referralsRequired !== 1 ? 's' : ''}
          </Text>
        </View>

        {isUnlocked && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
      </View>
    );
  };

  const renderReferralsList = () => {
    if (stats.referrals.length === 0) {
      return (
        <View style={styles.emptyReferrals}>
          <Text style={styles.emptyText}>No referrals yet</Text>
          <Text style={styles.emptySubtext}>Share your code to start earning rewards!</Text>
        </View>
      );
    }

    return (
      <View style={styles.referralsList}>
        {stats.referrals.slice(0, 5).map((referral) => (
          <View key={referral.id} style={styles.referralItem}>
            <View style={styles.referralAvatar}>
              <Text style={styles.referralInitial}>
                {referral.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.referralInfo}>
              <Text style={styles.referralName}>{referral.username}</Text>
              <Text style={styles.referralDate}>
                {new Date(referral.date).toLocaleDateString()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                referral.status === 'confirmed' && styles.statusConfirmed,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  referral.status === 'confirmed' && styles.statusTextConfirmed,
                ]}
              >
                {referral.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {renderCodeCard()}
        {renderStatsCard()}
        {renderProgress()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Tiers</Text>
          {rewardTiers.map(renderRewardTier)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          {renderReferralsList()}
        </View>
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
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.35)',
    padding: spacing(3),
    marginBottom: spacing(2),
    shadowColor: colors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  cardSubtitle: {
    fontSize: fonts.small,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(0.75),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    padding: spacing(2),
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },
  code: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 4,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Courier New',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(214,138,56,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
  },
  shareButton: {
    marginTop: spacing(1),
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.line,
  },
  statValue: {
    fontSize: fonts.h1,
    fontWeight: '800',
    color: colors.accent,
  },
  statLabel: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(3),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  progressTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressCount: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.subtext,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.accent,
  },
  rewardDescription: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
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
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  tierUnlocked: {
    borderColor: 'rgba(76,175,80,0.3)',
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
  },
  tierNext: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderColor: 'rgba(214,138,56,0.2)',
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  tierBadgeUnlocked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  tierContent: {
    flex: 1,
  },
  tierName: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  tierNameUnlocked: {
    color: colors.success,
  },
  tierRequirement: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  emptyReferrals: {
    alignItems: 'center',
    padding: spacing(4),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
  },
  referralsList: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(214,138,56,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  referralInitial: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.accent,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
  },
  referralDate: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  statusBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
  },
  statusConfirmed: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderColor: 'rgba(76,175,80,0.3)',
  },
  statusText: {
    fontSize: fonts.caption,
    fontWeight: '600',
    color: colors.warning,
    textTransform: 'capitalize',
  },
  statusTextConfirmed: {
    color: colors.success,
  },
});
