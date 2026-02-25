import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes } from '../store/useUserRecipes';
import RecipePreferencesModal from '../components/RecipePreferencesModal';
import { achievementService, Achievement } from '../services/achievementService';
import { streakService, StreakData } from '../services/streakService';
import { useXPSystem, FREE_DAILY_XP_CAP } from '../store/useXPSystem';
import { useUser } from '../store/useUser';
import { useUserTier } from '../store/useUserTier';
import {
  cocktailVariations,
  techniquePlaybooks,
  drinkingGames,
  barFeatures,
} from '../config/vaultContent';

const serifFont = serif;

export default function ProfileScreen() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const { savedItems } = useSavedItems();
  const { recipes } = useUserRecipes();
  const { balance: totalXP, earnedToday } = useXPSystem();
  const { tier } = useUserTier();
  const { completedLessons } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streakData, setStreakData] = useState<StreakData>(streakService.getStreakData());

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;

  // Compute what vault content the user can currently afford with their XP.
  // Only used in the free-user affordability card; shows XP as currency, not just a score.
  const vaultAffordability = useMemo(() => {
    const freeVariations = cocktailVariations.filter(v => !v.requiredTier);
    const freePlaybooks = techniquePlaybooks.filter(p => !p.requiredTier);
    const freeGames = drinkingGames.filter(g => !g.requiredTier);

    const affordableVariations = freeVariations.filter(v => v.xpCost <= totalXP).length;
    const affordablePlaybooks = freePlaybooks.filter(p => p.xpCost <= totalXP).length;
    const affordableGames = freeGames.filter(g => g.xpCost <= totalXP).length;

    const plusGatedCount = [
      ...cocktailVariations.filter(v => v.requiredTier === 'PLUS'),
      ...techniquePlaybooks.filter(p => p.requiredTier === 'PLUS'),
      ...drinkingGames.filter(g => g.requiredTier === 'PLUS'),
      ...barFeatures.filter(b => b.requiredTier === 'PLUS'),
    ].length;

    const cheapestFreeItem = Math.min(
      ...freeVariations.map(v => v.xpCost),
      ...freePlaybooks.map(p => p.xpCost),
      ...freeGames.map(g => g.xpCost),
    );

    return {
      affordableVariations,
      affordablePlaybooks,
      affordableGames,
      plusGatedCount,
      totalAffordable: affordableVariations + affordablePlaybooks + affordableGames,
      cheapestFreeItem: isFinite(cheapestFreeItem) ? cheapestFreeItem : 200,
    };
  }, [totalXP]);

  // Debug: Log authentication state
  useEffect(() => {
    console.log('👤 [ProfileScreen] Auth state:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isLoading
    });
  }, [isAuthenticated, user, isLoading]);

  const showAuthenticatedView = isAuthenticated;

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable
          hitSlop={12}
          onPress={() => nav.navigate('Settings')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open settings (new updates available)"
        >
          <View style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
            <View style={styles.settingsAttentionDot} />
          </View>
        </Pressable>
      ),
    });
  }, [nav]);

  useEffect(() => {
    const loadStats = () => {
      setStreakData(streakService.getStreakData());
      setAchievements(achievementService.getAchievements());
    };
    loadStats();

    const unsubscribe = streakService.addStreakListener(() => {
      setStreakData(streakService.getStreakData());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = () => {
    // Navigate to OAuth sign-in screen
    // Screen will automatically navigate back after sign-in or skip
    nav.navigate('OAuthSignIn');
  };

  // Show loading state while auth is initializing
  if (isLoading && !showAuthenticatedView) {
    return (
      <LinearGradient colors={['rgba(0,0,0,0)', '#1A120D']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isAuthenticated || showAuthenticatedView) {
    return (
      <LinearGradient colors={['rgba(0,0,0,0)', '#1A120D']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Header with Avatar */}
            <View style={styles.profileHeaderSection}>
              <View style={styles.avatarLarge}>
                <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
              </View>
              <Heading level={2} style={styles.userHandle}>{user?.email?.split('@')[0] || 'Bartender'}</Heading>
              <Text style={styles.userTitle}>Level {currentLevel} | {totalXP.toLocaleString()} XP</Text>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={colors.accent} />
                <Text style={styles.streakText}>{streakData.currentStreak} Day Streak{streakData.currentStreak > 0 ? ' — Keep it Going!' : ''}</Text>
              </View>
            </View>

            {/* Level Progress Bar */}
            <View style={styles.levelSection}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelText}>Level {currentLevel}</Text>
                <Text style={styles.levelXP}>{xpInLevel} / {xpForNextLevel} XP</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${(xpInLevel / xpForNextLevel) * 100}%` }]} />
              </View>
            </View>

            {/* XP Affordability Card — free users only.
                Makes XP feel like currency ("you can unlock X items") rather than an abstract score. */}
            {tier === 'FREE' && (
              <View style={styles.xpCurrencyCard}>
                <View style={styles.xpCurrencyHeader}>
                  <Text style={styles.xpCurrencyTitle}>Your XP Can Unlock</Text>
                  <Text style={styles.xpCurrencyBalance}>{totalXP.toLocaleString()} XP</Text>
                </View>

                {vaultAffordability.totalAffordable > 0 ? (
                  <>
                    {vaultAffordability.affordableVariations > 0 && (
                      <View style={styles.xpCurrencyRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                        <Text style={styles.xpCurrencyItem}>
                          {vaultAffordability.affordableVariations} Cocktail Variation{vaultAffordability.affordableVariations !== 1 ? 's' : ''}{' '}
                          <Text style={styles.xpCurrencyXP}>(300–950 XP)</Text>
                        </Text>
                      </View>
                    )}
                    {vaultAffordability.affordablePlaybooks > 0 && (
                      <View style={styles.xpCurrencyRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                        <Text style={styles.xpCurrencyItem}>
                          {vaultAffordability.affordablePlaybooks} Technique Playbook{vaultAffordability.affordablePlaybooks !== 1 ? 's' : ''}{' '}
                          <Text style={styles.xpCurrencyXP}>(400–550 XP)</Text>
                        </Text>
                      </View>
                    )}
                    {vaultAffordability.affordableGames > 0 && (
                      <View style={styles.xpCurrencyRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                        <Text style={styles.xpCurrencyItem}>
                          {vaultAffordability.affordableGames} Party Game{vaultAffordability.affordableGames !== 1 ? 's' : ''}{' '}
                          <Text style={styles.xpCurrencyXP}>(200–250 XP)</Text>
                        </Text>
                      </View>
                    )}
                    {vaultAffordability.plusGatedCount > 0 && (
                      <View style={styles.xpCurrencyRow}>
                        <Ionicons name="lock-closed-outline" size={16} color={colors.subtext} />
                        <Text style={[styles.xpCurrencyItem, { color: colors.subtext }]}>
                          {vaultAffordability.plusGatedCount}+ more with KŌOPE+
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.xpCurrencyRow}>
                    <Ionicons name="time-outline" size={16} color={colors.subtext} />
                    <Text style={[styles.xpCurrencyItem, { color: colors.subtext }]}>
                      Earn {vaultAffordability.cheapestFreeItem - totalXP} more XP to unlock your first item
                    </Text>
                  </View>
                )}

                {/* Daily cap progress for free users */}
                <View style={styles.xpDailyCapRow}>
                  <Text style={styles.xpDailyCapLabel}>Today: {earnedToday} / {FREE_DAILY_XP_CAP} XP</Text>
                  <View style={styles.xpDailyCapBar}>
                    <View style={[styles.xpDailyCapFill, { width: `${Math.min((earnedToday / FREE_DAILY_XP_CAP) * 100, 100)}%` as any }]} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewVaultButton}
                  onPress={() => (nav as any).navigate('Vault')}
                >
                  <Text style={styles.viewVaultButtonText}>View Vault</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}

            {/* Stats Overview - 2x2 Grid */}
            <View style={styles.section}>
              <Heading level={2} style={styles.sectionTitle}>Stats Overview</Heading>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Lessons{'\n'}Completed</Text>
                  <Text style={styles.statValue}>{completedLessons.length}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Saved{'\n'}Recipes</Text>
                  <Text style={styles.statValue}>{savedItems.savedCocktails?.length || 0}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Best{'\n'}Streak</Text>
                  <Text style={styles.statValue}>{streakData.longestStreak}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Achievements</Text>
                  <Text style={styles.statValue}>{achievements.filter(a => a.unlocked).length}/{achievements.length}</Text>
                </View>
              </View>
            </View>

            {/* Badges & Achievements */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heading level={2} style={styles.sectionTitle}>Badges & Achievements</Heading>
                <TouchableOpacity onPress={() => nav.navigate('Achievements')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
                {achievements.filter(a => a.unlocked).length > 0 ? (
                  achievements.filter(a => a.unlocked).slice(0, 5).map(achievement => (
                    <TouchableOpacity key={achievement.id} style={styles.badgeItem} onPress={() => nav.navigate('Achievements')}>
                      <View style={styles.badgeIcon}>
                        <Ionicons name={(achievement.icon || 'trophy') as any} size={32} color={colors.gold} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={1}>{achievement.name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity style={styles.badgeItem} onPress={() => nav.navigate('Achievements')}>
                    <View style={[styles.badgeIcon, { opacity: 0.4 }]}>
                      <Ionicons name="trophy-outline" size={32} color={colors.subtext} />
                    </View>
                    <Text style={styles.badgeName}>Start earning!</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* My Collection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heading level={2} style={styles.sectionTitle}>My Collection</Heading>
                <TouchableOpacity onPress={() => nav.navigate('ProfileSavedItems')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => nav.navigate('ProfileSavedItems')}
              >
                <View style={styles.collectionStats}>
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="bookmark" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{savedItems.savedCocktails?.length || 0}</Text>
                    <Text style={styles.collectionStatLabel}>Saved</Text>
                  </View>
                  <View style={styles.collectionDivider} />
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="create" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{recipes.filter(r => r.type === 'created' || r.type === 'ai_generated').length}</Text>
                    <Text style={styles.collectionStatLabel}>Created</Text>
                  </View>
                  <View style={styles.collectionDivider} />
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="game-controller" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{savedItems.savedGames?.length || 0}</Text>
                    <Text style={styles.collectionStatLabel}>Games</Text>
                  </View>
                  <View style={styles.collectionDivider} />
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="diamond" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{savedItems.savedVaultItems?.length || 0}</Text>
                    <Text style={styles.collectionStatLabel}>Vault</Text>
                  </View>
                </View>
                <View style={styles.collectionArrow}>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Summary */}
            <View style={styles.section}>
              <Heading level={2} style={styles.sectionTitle}>Your Journey</Heading>
              <View style={styles.insightCard}>
                <View style={styles.insightContent}>
                  <Heading level={3} style={styles.insightSubtitle}>
                    {completedLessons.length === 0
                      ? 'Ready to start learning?'
                      : completedLessons.length < 10
                        ? 'Great start!'
                        : 'Making great progress!'}
                  </Heading>
                  <Text style={styles.insightDescription}>
                    {completedLessons.length === 0
                      ? 'Complete your first lesson to begin your bartending journey.'
                      : `You've completed ${completedLessons.length} lesson${completedLessons.length !== 1 ? 's' : ''} and earned ${totalXP.toLocaleString()} XP so far.`}
                  </Text>
                </View>
                <View style={styles.insightImage}>
                  <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Recipe Preferences Modal */}
          <RecipePreferencesModal
            visible={preferencesModalVisible}
            onClose={() => setPreferencesModalVisible(false)}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['rgba(0,0,0,0)', '#1A120D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
            <Heading level={1} style={styles.title}>Profile</Heading>
            <Text style={styles.subtitle}>Sign in to access your profile</Text>
          </View>

          <View style={styles.authSection}>
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.signInButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Message */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={32} color={colors.accent} />
            <Text style={styles.infoText}>
              Sign in to view your collections, achievements, and personalized content
            </Text>
          </View>

          {/* Quick Actions for Non-Authenticated */}
          <View style={styles.section}>
            <Heading level={2} style={styles.sectionTitle}>Quick Access</Heading>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}
                onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
              >
                <Ionicons name="diamond-outline" size={20} color={colors.gold} />
                <Text style={[styles.quickActionText, { color: colors.gold }]}>Upgrade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => nav.navigate('ShoppingCart')}
              >
                <Ionicons name="cart-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionText}>Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
  },
  header: {
    alignItems: 'center',
    marginTop: spacing(6),
    marginBottom: spacing(6),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(3),
    fontFamily: serifFont,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(1),
  },
  profileHeaderSection: {
    alignItems: 'center',
    paddingVertical: spacing(4),
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  userHandle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
    fontFamily: serifFont,
  },
  userTitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  streakText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  levelSection: {
    marginBottom: spacing(3),
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1),
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  levelXP: {
    fontSize: 13,
    color: colors.subtext,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(1),
  },
  statLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
    fontFamily: serifFont,
  },
  actionButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    flex: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionSubtext: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  preferencesCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(2),
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  preferenceLabel: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  preferenceValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing(2),
  },
  authSection: {
    marginBottom: spacing(6),
  },
  signInButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingVertical: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  signInButtonText: {
    color: '#1A120D',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  settingButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  settingButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  settingButtonContent: {
    flex: 1,
  },
  settingButtonSubtext: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  collectionCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  collectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  collectionCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1),
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  statBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  statBoxLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(1),
    lineHeight: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  badgesScroll: {
    marginTop: spacing(1),
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: spacing(2),
    width: 100,
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  badgeName: {
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    gap: spacing(2),
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 11,
    color: colors.subtext,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
    fontWeight: '600',
  },
  insightSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  insightDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  insightImage: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
  seeAllText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  collectionStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  collectionStatItem: {
    alignItems: 'center',
    gap: spacing(0.5),
  },
  collectionStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  collectionStatLabel: {
    fontSize: 11,
    color: colors.subtext,
  },
  collectionDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.line,
  },
  collectionArrow: {
    paddingLeft: spacing(2),
  },

  // XP Affordability Card (free users)
  xpCurrencyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1.5),
  },
  xpCurrencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  xpCurrencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  xpCurrencyBalance: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  xpCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  xpCurrencyItem: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  xpCurrencyXP: {
    color: colors.subtext,
    fontSize: 13,
  },
  xpDailyCapRow: {
    marginTop: spacing(0.5),
    gap: spacing(0.75),
  },
  xpDailyCapLabel: {
    fontSize: 11,
    color: colors.subtext,
  },
  xpDailyCapBar: {
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpDailyCapFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    opacity: 0.6,
  },
  viewVaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(0.5),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing(0.75),
  },
  viewVaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  settingsAttentionDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
