// @ts-nocheck
/**
 * XP Balance Modal
 * Shows XP balance, transaction history, and ways to earn more XP
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { useXPSystem, XP_EARNING_RATES } from '../store/useXPSystem';
import InPageTabBar from './ui/InPageTabBar';

interface XPBalanceModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function XPBalanceModal({ visible, onClose }: XPBalanceModalProps) {
  const {
    balance,
    getRecentTransactions,
    getTotalEarned,
    getTotalSpent,
    streaks,
    unlockedCocktails,
  } = useXPSystem();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'earn'>('overview');

  const recentTransactions = getRecentTransactions(20);
  const totalEarned = getTotalEarned();
  const totalSpent = getTotalSpent();

  // Ways to earn XP
  const earningMethods = [
    { icon: 'calendar-outline', label: 'Daily Login', amount: XP_EARNING_RATES.dailyLogin, frequency: 'Once per day' },
    { icon: 'school-outline', label: 'Complete a Lesson', amount: XP_EARNING_RATES.lessonComplete, frequency: 'Per lesson' },
    { icon: 'beer-outline', label: 'Make a Cocktail', amount: XP_EARNING_RATES.makeCocktail, frequency: 'Once per day per recipe' },
    { icon: 'heart-outline', label: 'Save a Recipe', amount: XP_EARNING_RATES.saveRecipe, frequency: 'Per save' },
    { icon: 'cart-outline', label: 'Add to Shopping Cart', amount: XP_EARNING_RATES.addToCart, frequency: 'Per item' },
    { icon: 'share-outline', label: 'Share a Cocktail', amount: XP_EARNING_RATES.shareCocktail, frequency: 'Per share' },
    { icon: 'gift-outline', label: 'Open Vault Daily Drop', amount: XP_EARNING_RATES.vaultDailyDrop, frequency: 'Once per day' },
    { icon: 'star-outline', label: 'Earn Seasonal Item', amount: XP_EARNING_RATES.vaultSeasonalItem, frequency: 'Per item' },
    { icon: 'person-outline', label: 'Complete Profile', amount: XP_EARNING_RATES.profileComplete, frequency: 'One-time' },
    { icon: 'people-outline', label: 'Invite a Friend', amount: XP_EARNING_RATES.inviteFriend, frequency: 'Per friend signup' },
  ];

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>XP Balance</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="star" size={32} color={colors.gold} />
              </View>
              <View style={styles.balanceContent}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>{balance.toLocaleString()} XP</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalEarned.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalSpent.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{unlockedCocktails.length}</Text>
                <Text style={styles.statLabel}>Unlocked</Text>
              </View>
            </View>

            {/* Streaks */}
            {(streaks.dailyLogin > 1 || streaks.unlockStreak > 0) && (
              <View style={styles.streaksContainer}>
                {streaks.dailyLogin > 1 && (
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={16} color={colors.accent} />
                    <Text style={styles.streakText}>{streaks.dailyLogin} day streak</Text>
                  </View>
                )}
                {streaks.unlockStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <Ionicons name="trophy" size={16} color={colors.gold} />
                    <Text style={styles.streakText}>{streaks.unlockStreak} unlocks this week</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <InPageTabBar
              items={[
                { key: 'overview', label: 'Overview', icon: 'speedometer-outline' },
                { key: 'history', label: 'History', icon: 'time-outline' },
                { key: 'earn', label: 'Earn More', icon: 'sparkles-outline' },
              ]}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'overview' | 'history' | 'earn')}
            />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <View>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {recentTransactions.slice(0, 5).map(transaction => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={[
                      styles.transactionIcon,
                      transaction.type === 'earn' ? styles.transactionIconEarn : styles.transactionIconSpend
                    ]}>
                      <Ionicons
                        name={transaction.type === 'earn' ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={transaction.type === 'earn' ? colors.accent : colors.gold}
                      />
                    </View>
                    <View style={styles.transactionContent}>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      <Text style={styles.transactionTime}>{formatDate(transaction.timestamp)}</Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'earn' ? styles.transactionAmountEarn : styles.transactionAmountSpend
                    ]}>
                      {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                    </Text>
                  </View>
                ))}
                {recentTransactions.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="hourglass-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyStateText}>No transactions yet</Text>
                    <Text style={styles.emptyStateSubtext}>Start earning XP to see your activity here</Text>
                  </View>
                )}
              </View>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <View>
                {recentTransactions.map(transaction => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={[
                      styles.transactionIcon,
                      transaction.type === 'earn' ? styles.transactionIconEarn : styles.transactionIconSpend
                    ]}>
                      <Ionicons
                        name={transaction.type === 'earn' ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={transaction.type === 'earn' ? colors.accent : colors.gold}
                      />
                    </View>
                    <View style={styles.transactionContent}>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      <Text style={styles.transactionTime}>{formatDate(transaction.timestamp)}</Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'earn' ? styles.transactionAmountEarn : styles.transactionAmountSpend
                    ]}>
                      {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                    </Text>
                  </View>
                ))}
                {recentTransactions.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="hourglass-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyStateText}>No transactions yet</Text>
                  </View>
                )}
              </View>
            )}

            {/* Earn More Tab */}
            {activeTab === 'earn' && (
              <View>
                <Text style={styles.sectionTitle}>Ways to Earn XP</Text>
                {earningMethods.map((method, index) => (
                  <View key={index} style={styles.earningMethod}>
                    <View style={styles.earningIcon}>
                      <Ionicons name={method.icon as any} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.earningContent}>
                      <Text style={styles.earningLabel}>{method.label}</Text>
                      <Text style={styles.earningFrequency}>{method.frequency}</Text>
                    </View>
                    <View style={styles.earningAmount}>
                      <Text style={styles.earningAmountText}>+{method.amount}</Text>
                      <Ionicons name="star" size={14} color={colors.gold} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modal: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
  },
  header: {
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  balanceContent: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing(0.5),
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fonts.heading,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.line,
    marginHorizontal: spacing(1),
  },
  streaksContainer: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    gap: spacing(0.75),
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: spacing(3),
  },
  tab: {
    flex: 1,
    paddingVertical: spacing(2),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  content: {
    padding: spacing(3),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  transactionIconEarn: {
    backgroundColor: colors.accent + '20',
  },
  transactionIconSpend: {
    backgroundColor: colors.gold + '20',
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionAmountEarn: {
    color: colors.accent,
  },
  transactionAmountSpend: {
    color: colors.gold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing(6),
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing(2),
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing(0.5),
  },
  earningMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  earningContent: {
    flex: 1,
  },
  earningLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  earningFrequency: {
    fontSize: 12,
    color: colors.textMuted,
  },
  earningAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  earningAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
  },
});
