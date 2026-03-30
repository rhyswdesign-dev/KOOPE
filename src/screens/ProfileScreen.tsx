import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Animated,
  Share,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import MainPageHeader from '../components/ui/MainPageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
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
import { getProIdentityProgress, PRO_XP_MULTIPLIER } from '../config/proIdentity';
import { WEEKLY_FOR_YOU_DROP_RECIPES } from '../data/weeklyForYouDropRecipes';
import { notificationService } from '../services/notificationService';
import { ScanHistoryService, ScanRecord } from '../services/scanHistoryService';
import { InventoryService } from '../services/inventoryService';

const CERT_SEEN_KEY = 'koope_last_seen_cert_id';

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
  const [certUnlockModalVisible, setCertUnlockModalVisible] = useState(false);
  const [newlyEarnedCert, setNewlyEarnedCert] = useState<{ title: string; body: string } | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const certModalScale = useRef(new Animated.Value(0.7)).current;
  const certModalOpacity = useRef(new Animated.Value(0)).current;

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;
  const unlockedAchievementCount = achievements.filter(a => a.unlocked).length;
  const savedCocktailCount = savedItems.savedCocktails?.length || 0;
  const savedDrinkCount = savedItems.savedDrinks?.length || 0;
  const savedRecipeCardCount = savedItems.savedRecipeCards?.length || 0;
  const savedTotalCount = savedCocktailCount + savedDrinkCount + savedRecipeCardCount;
  const createdRecipeCount = recipes.filter(r => r.type === 'created' || r.type === 'ai_generated').length;
  const importedRecipeCount = recipes.filter(r => (r.type as string) === 'imported').length;
  const claimedDropCount = useMemo(() => {
    const weeklyDropIds = new Set(WEEKLY_FOR_YOU_DROP_RECIPES.map((recipe) => recipe.id));
    return (savedItems.savedCocktails || []).filter((item) => weeklyDropIds.has(item.id)).length;
  }, [savedItems.savedCocktails]);
  const proIdentity = useMemo(() => getProIdentityProgress({
    lessonsCompleted: completedLessons?.length || 0,
    achievementsUnlocked: unlockedAchievementCount,
    claimedDrops: claimedDropCount,
  }), [completedLessons?.length, unlockedAchievementCount, claimedDropCount]);

  // Detect newly earned certifications and show the unlock modal
  useEffect(() => {
    if (!proIdentity.current || tier !== 'PRO') return;
    const certId = proIdentity.current.id;

    AsyncStorage.getItem(CERT_SEEN_KEY).then((lastSeen) => {
      if (lastSeen === certId) return; // already celebrated this cert

      // New certification earned — show the modal
      setNewlyEarnedCert({ title: proIdentity.current!.title, body: proIdentity.current!.body });
      setCertUnlockModalVisible(true);
      Animated.parallel([
        Animated.spring(certModalScale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
        Animated.timing(certModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Push local notification
      notificationService.scheduleCertificationUnlocked(proIdentity.current!.title).catch(() => {});

      // Mark as seen
      AsyncStorage.setItem(CERT_SEEN_KEY, certId);
    });
  }, [proIdentity.current?.id, tier]);

  const handleDismissCertModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(certModalScale, { toValue: 0.7, duration: 180, useNativeDriver: true }),
      Animated.timing(certModalOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setCertUnlockModalVisible(false));
  }, [certModalScale, certModalOpacity]);

  const handleShareCert = useCallback(async () => {
    if (!newlyEarnedCert) return;
    await Share.share({
      message: `I just earned the "${newlyEarnedCert.title}" certification on KOOPE. ${newlyEarnedCert.body} Track your bar and earn yours — the bartender's app.`,
    });
  }, [newlyEarnedCert]);

  const handleAddFromHistory = useCallback((record: ScanRecord) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add bottles to your inventory.');
      return;
    }
    Alert.alert(
      `Add to Bar?`,
      `Add ${record.bottleName}${record.bottleBrand ? ` by ${record.bottleBrand}` : ''} to your inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            const result = await InventoryService.addToInventory({
              userId: user.id,
              itemType: 'spirit',
              itemName: record.bottleName,
              category: 'spirit',
              subcategory: record.bottleType,
              brand: record.bottleBrand || undefined,
              imageUrl: record.imageUri,
            });
            if (result.duplicate) {
              Alert.alert('Already in Bar', `${record.bottleName} is already in your inventory.`);
            } else if (result.success) {
              Alert.alert('Added!', `${record.bottleName} has been added to your bar.`);
            } else {
              Alert.alert('Error', 'Unable to add to inventory right now.');
            }
          },
        },
      ]
    );
  }, [user]);

  // Compute what vault content the user can currently afford with their XP.
  // Only used in the free-user affordability card; shows XP as currency, not just a score.
  const vaultAffordability = useMemo(() => {
    const safeVariations = cocktailVariations || [];
    const safePlaybooks = techniquePlaybooks || [];
    const safeGames = drinkingGames || [];
    const safeBarFeatures = barFeatures || [];

    const freeVariations = safeVariations.filter(v => !v.requiredTier);
    const freePlaybooks = safePlaybooks.filter(p => !p.requiredTier);
    const freeGames = safeGames.filter(g => !g.requiredTier);

    const affordableVariations = freeVariations.filter(v => v.xpCost <= totalXP).length;
    const affordablePlaybooks = freePlaybooks.filter(p => p.xpCost <= totalXP).length;
    const affordableGames = freeGames.filter(g => g.xpCost <= totalXP).length;

    const plusGatedCount = [
      ...safeVariations.filter(v => v.requiredTier === 'PLUS'),
      ...safePlaybooks.filter(p => p.requiredTier === 'PLUS'),
      ...safeGames.filter(g => g.requiredTier === 'PLUS'),
      ...safeBarFeatures.filter(b => b.requiredTier === 'PLUS'),
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

  useFocusEffect(
    React.useCallback(() => {
      setStreakData(streakService.getStreakData());
      setAchievements(achievementService.getAchievements());
      ScanHistoryService.getScanHistory().then(setScanHistory).catch(() => {});
    }, [])
  );

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

          {/* Certification Unlock Modal */}
          <Modal
            visible={certUnlockModalVisible}
            transparent
            animationType="none"
            onRequestClose={handleDismissCertModal}
          >
            <TouchableOpacity
              style={styles.certModalOverlay}
              activeOpacity={1}
              onPress={handleDismissCertModal}
            >
              <Animated.View
                style={[
                  styles.certModalCard,
                  { transform: [{ scale: certModalScale }], opacity: certModalOpacity },
                ]}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View style={styles.certModalBadge}>
                    <Ionicons name="ribbon" size={36} color={colors.gold} />
                  </View>
                  <Text style={styles.certModalEyebrow}>Certification Earned</Text>
                  <Text style={styles.certModalTitle}>{newlyEarnedCert?.title}</Text>
                  <Text style={styles.certModalBody}>{newlyEarnedCert?.body}</Text>
                  <TouchableOpacity
                    style={styles.certModalShareButton}
                    activeOpacity={0.82}
                    onPress={handleShareCert}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.gold} />
                    <Text style={styles.certModalShareText}>Share this achievement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.certModalDismiss}
                    activeOpacity={0.8}
                    onPress={handleDismissCertModal}
                  >
                    <Text style={styles.certModalDismissText}>Continue</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </Modal>

          <MainPageHeader
            title="Profile"
            subtitle="Account & progress"
            rightActions={[
              {
                icon: 'settings-outline',
                onPress: () => nav.navigate('Settings'),
                accessibilityLabel: 'Open settings',
              },
            ]}
          />
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

            {tier === 'PRO' && (
              <View style={styles.proIdentityCard}>
                <View style={styles.proIdentityHeader}>
                  <View>
                    <Text style={styles.proIdentityEyebrow}>Wave 4 Identity</Text>
                    <Text style={styles.proIdentityTitle}>Pro Status & Certifications</Text>
                  </View>
                  <View style={styles.proIdentityBadge}>
                    <Text style={styles.proIdentityBadgeText}>{proIdentity.earnedCount}/{proIdentity.totalCount}</Text>
                  </View>
                </View>

                <View style={styles.proIdentityGrid}>
                  <View style={styles.proIdentityMetric}>
                    <Text style={styles.proIdentityMetricLabel}>Current Cert</Text>
                    <Text style={styles.proIdentityMetricValue}>{proIdentity.current?.title || 'In Progress'}</Text>
                  </View>
                  <View style={styles.proIdentityMetric}>
                    <Text style={styles.proIdentityMetricLabel}>XP Multiplier</Text>
                    <Text style={styles.proIdentityMetricValue}>{PRO_XP_MULTIPLIER}x</Text>
                  </View>
                  <View style={styles.proIdentityMetric}>
                    <Text style={styles.proIdentityMetricLabel}>Claimed Drops</Text>
                    <Text style={styles.proIdentityMetricValue}>{claimedDropCount}</Text>
                  </View>
                </View>

                <Text style={styles.proIdentityBody}>
                  {proIdentity.current
                    ? `${proIdentity.current.title} is active. Your profile now has both a recurring reward loop and an identity track.`
                    : 'Your Pro identity track has started. Claim drops, complete lessons, and unlock achievements to earn your first certification.'}
                </Text>

                {proIdentity.next && (
                  <View style={styles.proIdentityNextCard}>
                    <Text style={styles.proIdentityNextEyebrow}>Next Certification</Text>
                    <Text style={styles.proIdentityNextTitle}>{proIdentity.next.title}</Text>
                    <Text style={styles.proIdentityNextBody}>{proIdentity.next.body}</Text>
                    <Text style={styles.proIdentityChecklist}>
                      {`${Math.min(completedLessons?.length || 0, proIdentity.next.requiredLessons)}/${proIdentity.next.requiredLessons} lessons • ${Math.min(unlockedAchievementCount, proIdentity.next.requiredAchievements)}/${proIdentity.next.requiredAchievements} achievements • ${Math.min(claimedDropCount, proIdentity.next.requiredDrops)}/${proIdentity.next.requiredDrops} drops`}
                    </Text>
                  </View>
                )}
              </View>
            )}

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
                  <Text style={styles.statBoxLabel}>Saved{'\n'}Drinks</Text>
                  <Text style={styles.statValue}>{savedTotalCount}</Text>
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
                      <Text style={styles.badgeName} numberOfLines={2}>{achievement.title}</Text>
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
                    <Text style={styles.collectionStatValue}>{savedTotalCount}</Text>
                    <Text style={styles.collectionStatLabel}>Saved</Text>
                  </View>
                  <View style={styles.collectionDivider} />
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="create" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{createdRecipeCount}</Text>
                    <Text style={styles.collectionStatLabel}>Created</Text>
                  </View>
                  <View style={styles.collectionDivider} />
                  <View style={styles.collectionStatItem}>
                    <Ionicons name="download" size={18} color={colors.accent} />
                    <Text style={styles.collectionStatValue}>{importedRecipeCount}</Text>
                    <Text style={styles.collectionStatLabel}>Imported</Text>
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

            {/* Scan History Journal */}
            {scanHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Heading level={2} style={styles.sectionTitle}>Bottle Journal</Heading>
                  <Text style={styles.scanHistoryCount}>{scanHistory.length} bottle{scanHistory.length !== 1 ? 's' : ''}</Text>
                </View>
                {scanHistory.slice(0, 5).map((record) => (
                  <View key={record.bottleId} style={styles.scanHistoryRow}>
                    {record.imageUri ? (
                      <Image
                        source={{ uri: record.imageUri }}
                        style={styles.scanHistoryThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.scanHistoryIcon}>
                        <Ionicons name="scan-outline" size={18} color={colors.accent} />
                      </View>
                    )}
                    <View style={styles.scanHistoryInfo}>
                      <Text style={styles.scanHistoryName} numberOfLines={1}>{record.bottleName}</Text>
                      <Text style={styles.scanHistoryMeta}>
                        {record.bottleBrand ? `${record.bottleBrand} · ` : ''}
                        {record.bottleType}
                        {record.scanCount > 1 ? ` · ${record.scanCount}× scanned` : ''}
                      </Text>
                    </View>
                    <Text style={styles.scanHistoryDate}>
                      {new Date(record.lastScannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                      style={styles.scanHistoryAddButton}
                      onPress={() => handleAddFromHistory(record)}
                      accessibilityLabel={`Add ${record.bottleName} to inventory`}
                    >
                      <Ionicons name="add" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                ))}
                {scanHistory.length > 5 && (
                  <Text style={styles.scanHistoryMore}>+{scanHistory.length - 5} more in history</Text>
                )}
              </View>
            )}

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
                      : `You've completed ${completedLessons.length} lesson${completedLessons.length !== 1 ? 's' : ''}, saved ${savedTotalCount} drink${savedTotalCount !== 1 ? 's' : ''}, unlocked ${unlockedAchievementCount} achievement${unlockedAchievementCount !== 1 ? 's' : ''}, and earned ${totalXP.toLocaleString()} XP.`}
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
        <MainPageHeader
          title="Profile"
          subtitle="Account & progress"
          rightActions={[
            {
              icon: 'settings-outline',
              onPress: () => nav.navigate('Settings'),
              accessibilityLabel: 'Open settings',
            },
          ]}
        />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.signInIntro}>
            <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.accent} />
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
  signInIntro: {
    alignItems: 'center',
    marginTop: spacing(4),
    marginBottom: spacing(4),
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
  proIdentityCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(224, 168, 84, 0.24)',
    gap: spacing(2),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  proIdentityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  proIdentityEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.75),
  },
  proIdentityTitle: {
    fontSize: 22,
    color: colors.text,
    fontFamily: serifFont,
    fontWeight: '700',
  },
  proIdentityBadge: {
    minWidth: 46,
    height: 34,
    paddingHorizontal: spacing(1.25),
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 168, 84, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224, 168, 84, 0.28)',
  },
  proIdentityBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  proIdentityGrid: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  proIdentityMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  proIdentityMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  proIdentityMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  proIdentityBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
  },
  proIdentityNextCard: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.75),
  },
  proIdentityNextEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  proIdentityNextTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
    fontFamily: serifFont,
  },
  proIdentityNextBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  proIdentityChecklist: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: '600',
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
  scanHistoryCount: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  scanHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: spacing(1.25),
  },
  scanHistoryThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.card,
  },
  scanHistoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHistoryAddButton: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHistoryInfo: {
    flex: 1,
  },
  scanHistoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scanHistoryMeta: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scanHistoryDate: {
    fontSize: 11,
    color: colors.subtext,
  },
  scanHistoryMore: {
    fontSize: 12,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing(1.25),
    fontWeight: '600',
  },
  certModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
  },
  certModalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  certModalBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  certModalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing(0.75),
  },
  certModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  certModalBody: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(2.5),
  },
  certModalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(3),
    width: '100%',
    marginBottom: spacing(1.25),
  },
  certModalShareText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  certModalDismiss: {
    paddingVertical: spacing(1),
    width: '100%',
    alignItems: 'center',
  },
  certModalDismissText: {
    fontSize: 14,
    color: colors.subtext,
  },
});
