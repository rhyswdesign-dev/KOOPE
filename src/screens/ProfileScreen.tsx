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

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header - Compact */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="glass-cocktail" size={32} color={colors.accent} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>Bartender</Text>
              <Text style={styles.userSubtext}>Level {userStats.level} • {userStats.totalXP} XP</Text>
            </View>
          </View>

          {/* Quick Stats Row - Minimal */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>{streakData.currentStreak}</Text>
              <Text style={styles.quickStatLabel}>Day Streak</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>{userStats.achievementsUnlocked || 0}</Text>
              <Text style={styles.quickStatLabel}>Badges</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>{savedItems.length}</Text>
              <Text style={styles.quickStatLabel}>Saved</Text>
            </View>
          </View>

          {/* Collections Grid - 2x2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Collections</Text>
            <View style={styles.collectionsGrid}>
              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => nav.navigate('SavedItems')}
              >
                <Ionicons name="heart" size={28} color={colors.accent} />
                <Text style={styles.collectionLabel}>Saved</Text>
                <Text style={styles.collectionCount}>{savedItems.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => nav.navigate('MyRecipes')}
              >
                <Ionicons name="create" size={28} color="#F59E0B" />
                <Text style={styles.collectionLabel}>My Recipes</Text>
                <Text style={styles.collectionCount}>{recipes.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => nav.navigate('HomeBar')}
              >
                <Ionicons name="home" size={28} color="#8B5CF6" />
                <Text style={styles.collectionLabel}>Home Bar</Text>
                <Text style={styles.collectionCount}>{userStats.homeBarIngredients}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => nav.navigate('Achievements')}
              >
                <Ionicons name="trophy" size={28} color={colors.gold} />
                <Text style={styles.collectionLabel}>Achievements</Text>
                <Text style={styles.collectionCount}>{userStats.achievementsUnlocked || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress - Compact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <ProgressStats
              stats={[
                {
                  icon: 'book',
                  label: 'Lessons',
                  value: userStats.lessonsCompleted,
                  color: colors.accent,
                },
                {
                  icon: 'restaurant',
                  label: 'Recipes',
                  value: userStats.recipesViewed,
                  color: '#F59E0B',
                },
                {
                  icon: 'heart',
                  label: 'Favorites',
                  value: userStats.favoriteCount,
                  color: '#EF4444',
                },
                {
                  icon: 'home',
                  label: 'Bar Items',
                  value: userStats.homeBarIngredients,
                  color: '#8B5CF6',
                },
                {
                  icon: 'location',
                  label: 'Bars Visited',
                  value: userStats.barsVisited,
                  color: '#10B981',
                },
                {
                  icon: 'game-controller',
                  label: 'Games',
                  value: userStats.gamesPlayed,
                  color: '#3B82F6',
                },
              ]}
              columns={3}
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setPreferencesModalVisible(true)}
              >
                <Ionicons name="options-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionText}>Preferences</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => nav.navigate('ShoppingCart')}
              >
                <Ionicons name="cart-outline" size={20} color={colors.text} />
                <Text style={styles.quickActionText}>Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}
                onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
              >
                <Ionicons name="diamond-outline" size={20} color={colors.gold} />
                <Text style={[styles.quickActionText, { color: colors.gold }]}>Upgrade</Text>
              </TouchableOpacity>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(2),
    marginBottom: spacing(3),
    gap: spacing(2),
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  userSubtext: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(0.25),
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
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1),
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
});
