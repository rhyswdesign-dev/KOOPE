import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
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
    // Navigate to OAuth sign-in screen
    nav.navigate('OAuthSignIn');
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
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="glass-cocktail" size={40} color={colors.accent} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>Bartender</Text>
              <Text style={styles.userSubtext}>ID: {user?.id.substring(0, 8)}...</Text>
            </View>
          </View>

          {/* Level & XP Display */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={20} color={colors.accent} />
              <Text style={styles.statNumber}>Level {userStats.level}</Text>
              <Text style={styles.statLabel}>Current Level</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={20} color={colors.accent} />
              <Text style={styles.statNumber}>{userStats.totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={20} color={colors.accent} />
              <Text style={styles.statNumber}>{streakData.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Streak Display Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Streak</Text>
            <StreakDisplay streakData={streakData} />
          </View>

          {/* Progress Statistics Section */}
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

          {/* Progress Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('Achievements')}
            >
              <Ionicons name="trophy-outline" size={20} color={colors.text} />
              <View style={styles.settingButtonContent}>
                <Text style={styles.settingButtonText}>View All Achievements</Text>
                <Text style={styles.settingButtonSubtext}>Level {userStats.level} • {userStats.totalXP} XP</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Personalization Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Preferences</Text>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setPreferencesModalVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Recipe Preferences</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium</Text>

            <TouchableOpacity
              style={[styles.settingButton, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}
              onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
            >
              <Ionicons name="diamond-outline" size={20} color="#D4AF37" />
              <Text style={[styles.settingButtonText, { color: colors.accent, fontWeight: '600' }]}>
                Upgrade to KOOPE+
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D4AF37" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('SubscriptionDebug')}
            >
              <Ionicons name="bug-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Subscription Status</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings & Support</Text>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('ShoppingCart')}
            >
              <Ionicons name="cart-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Shopping Cart</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('HelpSupport')}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('PrivacyPolicy')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => nav.navigate('TermsOfService')}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingButton}>
              <Ionicons name="information-circle-outline" size={20} color={colors.text} />
              <Text style={styles.settingButtonText}>About</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingButton, styles.signOutButton]}
              onPress={handleSignOut}
              disabled={loading}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={[styles.settingButtonText, { color: colors.error }]}>
                {loading ? 'Signing out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
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

        {/* Premium Section (Not Signed In) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>

          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}
            onPress={() => nav.navigate('Paywall', { displayCloseButton: true })}
          >
            <Ionicons name="diamond-outline" size={20} color="#D4AF37" />
            <Text style={[styles.settingButtonText, { color: colors.accent, fontWeight: '600' }]}>
              Upgrade to KOOPE+
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => nav.navigate('SubscriptionDebug')}
          >
            <Ionicons name="bug-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>Subscription Status</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & Support</Text>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => nav.navigate('ShoppingCart')}
          >
            <Ionicons name="cart-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>Shopping Cart</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => nav.navigate('HelpSupport')}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => nav.navigate('PrivacyPolicy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => nav.navigate('TermsOfService')}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <Ionicons name="information-circle-outline" size={20} color={colors.text} />
            <Text style={styles.settingButtonText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
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
    paddingHorizontal: spacing(4),
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
    marginTop: spacing(4),
    marginBottom: spacing(4),
    gap: spacing(3),
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  userSubtext: {
    fontSize: 14,
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
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
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
});
