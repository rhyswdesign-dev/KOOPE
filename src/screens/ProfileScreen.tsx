import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes } from '../store/useUserRecipes';
import { usePersonalization } from '../store/usePersonalization';
import RecipePreferencesModal from '../components/RecipePreferencesModal';
import { achievementService } from '../services/achievementService';
import { streakService, StreakData } from '../services/streakService';
import { StreakDisplay } from '../components/StreakDisplay';
import { ProgressStats } from '../components/ProgressStats';

export default function ProfileScreen() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const { savedItems } = useSavedItems();
  const { recipes } = useUserRecipes();
  const { profile } = usePersonalization();
  const [userStats, setUserStats] = useState(achievementService.getUserStats());
  const [streakData, setStreakData] = useState<StreakData>(streakService.getStreakData());

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

  const showAuthenticatedView = true;

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable
          hitSlop={12}
          onPress={() => nav.navigate('Settings')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} style={{ marginRight: 16 }} />
        </Pressable>
      ),
    });
  }, [nav]);

  useEffect(() => {
    // Load latest stats when screen focuses
    const loadStats = () => {
      setUserStats(achievementService.getUserStats());
      setStreakData(streakService.getStreakData());
    };
    loadStats();

    // Subscribe to streak changes
    const unsubscribe = streakService.addStreakListener((newStreak) => {
      setStreakData(streakService.getStreakData());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = () => {
    // Navigate to OAuth sign-in screen with callback
    nav.navigate('OAuthSignIn', {
      onComplete: () => {
        // Navigate back to profile after successful sign-in
        nav.goBack();
      },
      onSkip: () => {
        // Allow user to skip sign-in
        nav.goBack();
      },
    });
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
              // AuthContext will handle navigation automatically
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Show loading state while auth is initializing
  if (isLoading && !showAuthenticatedView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated || showAuthenticatedView) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header with Avatar */}
          <View style={styles.profileHeaderSection}>
            <View style={styles.avatarLarge}>
              <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
            </View>
            <Text style={styles.userHandle}>@Bartender</Text>
            <Text style={styles.userTitle}>Bar Apprentice | {userStats.totalXP} XP | Level {userStats.level}</Text>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={styles.streakText}>{streakData.currentStreak} Week Streak — Keep it Going!</Text>
            </View>
          </View>

          {/* Level Progress Bar */}
          <View style={styles.levelSection}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelText}>Level {userStats.level}</Text>
              <Text style={styles.levelXP}>{userStats.totalXP} / 2,000 XP</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${Math.min((userStats.totalXP / 2000) * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Stats Overview - 2x2 Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stats Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Lessons{'\n'}Completed</Text>
                <Text style={styles.statValue}>{userStats.lessonsCompleted}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Recipes{'\n'}Unlocked</Text>
                <Text style={styles.statValue}>{userStats.recipesViewed}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Inventory Items</Text>
                <Text style={styles.statValue}>{userStats.homeBarIngredients}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Time</Text>
                <Text style={styles.statValue}>2h 45m</Text>
              </View>
            </View>
          </View>

          {/* Badges & Achievements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges & Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              <TouchableOpacity style={styles.badgeItem} onPress={() => nav.navigate('Achievements')}>
                <View style={styles.badgeIcon}>
                  <Ionicons name="wine" size={32} color={colors.gold} />
                </View>
                <Text style={styles.badgeName}>Glassware Guru</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.badgeItem} onPress={() => nav.navigate('Achievements')}>
                <View style={styles.badgeIcon}>
                  <Ionicons name="flame" size={32} color="#FF6B35" />
                </View>
                <Text style={styles.badgeName}>Streak Master</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.badgeItem} onPress={() => nav.navigate('Achievements')}>
                <View style={styles.badgeIcon}>
                  <Ionicons name="flask" size={32} color="#8B5CF6" />
                </View>
                <Text style={styles.badgeName}>Mixologist</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* My Collection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Collection</Text>
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
                  <Ionicons name="bookmark" size={20} color={colors.accent} />
                  <Text style={styles.collectionStatValue}>{savedItems.savedCocktails?.length || 0}</Text>
                  <Text style={styles.collectionStatLabel}>Saved</Text>
                </View>
                <View style={styles.collectionDivider} />
                <View style={styles.collectionStatItem}>
                  <Ionicons name="create" size={20} color={colors.accent} />
                  <Text style={styles.collectionStatValue}>{recipes.filter(r => r.type === 'created' || r.type === 'ai_generated').length}</Text>
                  <Text style={styles.collectionStatLabel}>Created</Text>
                </View>
                <View style={styles.collectionDivider} />
                <View style={styles.collectionStatItem}>
                  <Ionicons name="download" size={20} color={colors.accent} />
                  <Text style={styles.collectionStatValue}>{recipes.filter(r => (r.type as string) === 'imported').length}</Text>
                  <Text style={styles.collectionStatLabel}>Imported</Text>
                </View>
              </View>
              <View style={styles.collectionArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Insights / Personalization */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights / Personalization</Text>
            <View style={styles.insightCard}>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Personalized Feedback</Text>
                <Text style={styles.insightSubtitle}>You excel at classic builds</Text>
                <Text style={styles.insightDescription}>
                  Your mastery of traditional techniques shines through in every cocktail. Keep refining your skills!
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
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
          <Text style={styles.title}>Profile</Text>
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
          <Text style={styles.sectionTitle}>Quick Access</Text>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(3),
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
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  userHandle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
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
    backgroundColor: colors.text,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '600',
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
  signOutButton: {
    marginTop: spacing(3),
    borderColor: colors.error + '20',
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
  statLabel: {
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
    borderRadius: 40,
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
});
