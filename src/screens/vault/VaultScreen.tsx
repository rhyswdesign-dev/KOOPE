/**
 * VAULT HOME SCREEN - XP + KEYS ECONOMY
 * Clean layout matching app's current design patterns
 */

import React, { useLayoutEffect, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { VaultItem } from '../../types/vault';
import { useVault } from '../../contexts/VaultContext';
import { useUser } from '../../store/useUser';
import { useAICredits } from '../../store/useAICredits';
import { useXPSystem } from '../../store/useXPSystem';
import { currentVaultCycle, getVaultCountdown } from '../../data/vaultData';
import XPBalanceModal from '../../components/XPBalanceModal';
import PillButton from '../../components/PillButton';
import VaultUnlockModal from './components/VaultUnlockModal';
import VaultItemCard from './components/VaultItemCard';
import AICreditsPurchaseModal from '../../components/AICreditsPurchaseModal';
import { useScreenTracking, useAnalyticsContext } from '../../context/AnalyticsContext';
import { VaultCategory } from '../../config/vaultTypes';
import {
  vaultCategories,
  VaultCategoryConfig,
  getVariationsForDisplay,
  getTechniquePlaybooksByType,
  getBarFeaturesForDisplay,
  getAvailableSeasonalDropsForTier,
  getAllPlaybookTypes,
  TechniquePlaybookType,
} from '../../config/vaultContent';
import AIRecommendations from '../../components/AIRecommendations';
import { useSavedItems } from '../../hooks/useSavedItems';
import GroceryListModal from '../../components/GroceryListModal';
import { useUserTier } from '../../store/useUserTier';
import { canAccessContent } from '../../utils/tierAccess';
import TierBadge from '../../components/TierBadge';
import LockedContentOverlay from '../../components/LockedContentOverlay';
import { log } from '../../lib/logger';
import { BAR_PAGE_HEADERS } from '../../data/barImages';


export default function VaultScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, dispatch } = useVault();
  const { tier, setTier } = useUserTier();
  const analytics = useAnalyticsContext();
  const { xp } = useUser();
  const { credits, isPremium } = useAICredits();
  const { balance: xpBalance } = useXPSystem();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const [selectedTab, setSelectedTab] = useState<string>('variations');
  const [countdown, setCountdown] = useState(getVaultCountdown());
  const [creditsPurchaseVisible, setCreditsPurchaseVisible] = useState(false);
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  
  // Track screen view
  useScreenTracking('VaultScreen');

  // Update countdown every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getVaultCountdown());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Vault',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 16 }}>
          {/* XP Balance */}
          <Pressable
            hitSlop={12}
            onPress={() => setXpBalanceModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`XP Balance: ${xpBalance}`}
          >
            <Ionicons name="star" size={20} color={colors.gold} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {xpBalance.toLocaleString()}
            </Text>
          </Pressable>

          {/* Help Icon */}
          <Pressable
            hitSlop={12}
            onPress={() => {
              Alert.alert(
                'How the Vault Works',
                'XP (Experience Points):\n• Earn XP by completing lessons and challenges\n• Use XP to unlock exclusive recipes, techniques, and bar features\n\nKeys:\n• Premium currency for special items\n• Purchase keys in the store\n• Unlock limited-edition content and boosters\n\nTip: Complete daily lessons to maximize your XP earnings!',
                [{ text: 'Got it!', style: 'default' }]
              );
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Learn how the Vault economy works"
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.accent} />
          </Pressable>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {/* Developer Tier Switcher - for testing only */}
          <Pressable
            hitSlop={12}
            onPress={() => {
              const tiers: ('FREE' | 'PLUS' | 'PRO')[] = ['FREE', 'PLUS', 'PRO'];
              const currentIndex = tiers.indexOf(tier);
              const nextTier = tiers[(currentIndex + 1) % tiers.length];
              setTier(nextTier);
              log.info('VaultScreen', 'Tier switched', { tier: nextTier });
            }}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.accent,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>
              {tier}
            </Text>
          </Pressable>

          <Pressable
            hitSlop={12}
            onPress={() => {
              log.info('VaultScreen', 'Shop icon pressed, navigating to VaultStore');
              nav.navigate('VaultStore');
            }}
          >
            <MaterialCommunityIcons name="storefront" size={24} color={colors.accent} />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => nav.navigate('VaultOrderHistory')}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      ),
    });
  }, [nav, tier, setTier, xpBalance]);

  const getFilteredItems = (): VaultItem[] => {
    const items = state.vaultItems.filter(item => item.isActive);

    switch (selectedTab) {
      case 'variations':
      case 'playbooks':
      case 'bars':
      case 'seasonal':
      case 'games':
        return []; // New vault content categories (handled inline)
      case 'common':
        return items.filter(item => item.rarity === 'common');
      case 'limited':
        return items.filter(item => item.rarity === 'limited');
      case 'rare':
        return items.filter(item => item.rarity === 'rare' || item.rarity === 'prestige');
      default:
        return items;
    }
  };

  const tabs = [
    { key: 'variations', label: 'Cocktails' },
    { key: 'seasonal', label: 'Seasonal' },
    { key: 'playbooks', label: 'Playbooks' },
    { key: 'bars', label: 'Bar Features' },
    { key: 'games', label: 'Games' },
    // Archived for future product expansion
    // { key: 'common', label: 'Common' },
    // { key: 'limited', label: 'Limited' },
    // { key: 'rare', label: 'Rare' },
  ];

  const renderVaultItem = ({ item }: { item: VaultItem }) => (
    <VaultItemCard
      item={item}
      userProfile={state.userProfile}
      onPress={() => {
        // Track vault item view
        analytics.trackVaultView(item.id, item.category, item.rarity);
        
        dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
        dispatch({ type: 'SHOW_UNLOCK_MODAL', payload: true });
      }}
    />
  );

  const renderHeader = () => (
    <View>
      {/* Collection Header */}
      <View style={styles.collectionHeader}>
        <View style={styles.collectionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), marginBottom: spacing(0.5) }}>
            <Text style={styles.collectionTitle}>{currentVaultCycle.name}</Text>
            <TierBadge tier={tier} size="small" />
          </View>
          <Text style={styles.collectionSubtitle}>
            Resets in {countdown.days}D {countdown.hours}H {countdown.minutes}M
          </Text>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={16} color={colors.gold} />
            <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="key" size={16} color={colors.accent} />
            <Text style={styles.statValue}>{state.userProfile.keysBalance}</Text>
            <Text style={styles.statLabel}>Keys</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, styles.clickableStatCard]}
            onPress={() => setCreditsPurchaseVisible(true)}
          >
            <Ionicons
              name={isPremium ? "diamond" : "sparkles"}
              size={16}
              color={isPremium ? colors.gold : colors.accent}
            />
            <Text style={styles.statValue}>
              {isPremium ? '∞' : credits.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>AI Credits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <PillButton
              key={tab.key}
              title={tab.label}
              onPress={() => setSelectedTab(tab.key)}
              style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
              textStyle={{ color: isActive ? colors.pillTextOnLight : colors.text }}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={80} color={colors.subtext} />
      <Text style={styles.emptyTitle}>No Items Available</Text>
      <Text style={styles.emptySubtitle}>
        Check back when the next cycle begins
      </Text>
    </View>
  );

  const filteredItems = getFilteredItems();

  // Placeholder images
  const PLACEHOLDER_IMAGES = {
    ice: 'https://images.unsplash.com/photo-1564808225-3e440c8c7b5e?w=400',
    acid: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400',
    batch: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
    speed: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400',
    cocktail: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=400',
    bar: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400',
    seasonal: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=400',
  };

  const PLAYBOOK_TYPE_LABELS: Record<TechniquePlaybookType, string> = {
    ICE_STRATEGY: 'Ice Strategy Playbooks',
    ACID_CONTROL: 'Acid Control Playbooks',
    BATCH_MATH: 'Batch Math Playbooks',
    SPEED_SYSTEM: 'Speed Systems',
  };

  const PLAYBOOK_TYPE_IMAGES: Record<TechniquePlaybookType, string> = {
    ICE_STRATEGY: PLACEHOLDER_IMAGES.ice,
    ACID_CONTROL: PLACEHOLDER_IMAGES.acid,
    BATCH_MATH: PLACEHOLDER_IMAGES.batch,
    SPEED_SYSTEM: PLACEHOLDER_IMAGES.speed,
  };

  // Helper function to get bar thumbnail from thumbnailKey
  const getBarThumbnail = (thumbnailKey?: string) => {
    if (!thumbnailKey) {
      return { uri: PLACEHOLDER_IMAGES.bar };
    }

    // Check if it's a BAR_PAGE_HEADERS key
    if (thumbnailKey in BAR_PAGE_HEADERS) {
      return BAR_PAGE_HEADERS[thumbnailKey as keyof typeof BAR_PAGE_HEADERS];
    }

    // Fallback to placeholder
    console.warn('Bar thumbnail not found for key:', thumbnailKey);
    return { uri: PLACEHOLDER_IMAGES.bar };
  };

  // Helper function to check if a bar is unlocked
  const isBarUnlocked = (barId: string): boolean => {
    return state.userProfile.unlockedItems.some(item => item.itemId === barId);
  };

  const renderContentItem = (item: any, imageUrl: string) => {
    const isLocked = !canAccessContent(tier, item.requiredTier);

    return (
      <View key={item.id} style={[styles.contentItemCard, isLocked && styles.lockedCard]}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.contentItemThumbnail, isLocked && styles.lockedThumbnail]}
          resizeMode="cover"
        />
        <View style={styles.contentItemInfo}>
          <Text style={styles.contentItemXP}>
            {isLocked ? `${item.requiredTier} Required` : `${item.xpCost} XP`}
          </Text>
          <Text style={styles.contentItemTitle}>{item.title || item.barName || item.seasonName}</Text>
          <Text style={styles.contentItemDescription} numberOfLines={2}>
            {item.shortDescription || item.description || `${item.city} • ${item.signatureCocktailName}`}
          </Text>
        </View>

        {isLocked ? (
          <LockedContentOverlay
            requiredTier={item.requiredTier}
            onUpgradePress={() => {
              nav.navigate('Paywall', {
                source: 'vault_locked_content',
                offering: item.requiredTier === 'PRO' ? 'pro' : null,
              });
            }}
            variant="compact"
          />
        ) : (
          <TouchableOpacity style={styles.contentItemUnlockButton} activeOpacity={0.8}>
            <Text style={styles.contentItemUnlockText}>Unlock</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInlineContent = () => {
    if (selectedTab === 'playbooks') {
      const playbookTypes = getAllPlaybookTypes();
      return (
        <View style={styles.inlineContent}>
          {playbookTypes.map((type) => {
            const playbooks = getTechniquePlaybooksByType(type, tier);
            if (playbooks.length === 0) return null;
            return (
              <View key={type} style={styles.contentSection}>
                <Text style={styles.contentSectionTitle}>{PLAYBOOK_TYPE_LABELS[type]}</Text>
                {playbooks.map((playbook) => renderContentItem(playbook, PLAYBOOK_TYPE_IMAGES[type]))}
              </View>
            );
          })}
        </View>
      );
    }

    if (selectedTab === 'variations') {
      const variations = getVariationsForDisplay(tier);
      const groupedByDifficulty: Record<string, typeof variations> = {
        simple: [],
        technique_forward: [],
        pro: [],
      };
      variations.forEach((v) => {
        groupedByDifficulty[v.difficulty].push(v);
      });
      const difficultyLabels = {
        simple: 'Simple Variations',
        technique_forward: 'Technique-Forward Variations',
        pro: 'Pro-Level Variations',
      };
      return (
        <View style={styles.inlineContent}>
          {Object.entries(groupedByDifficulty).map(([difficulty, items]) => {
            if (items.length === 0) return null;
            return (
              <View key={difficulty} style={styles.contentSection}>
                <Text style={styles.contentSectionTitle}>
                  {difficultyLabels[difficulty as keyof typeof difficultyLabels]}
                </Text>
                {items.map((variation) => renderContentItem(variation, PLACEHOLDER_IMAGES.cocktail))}
              </View>
            );
          })}
        </View>
      );
    }

    if (selectedTab === 'bars') {
      const bars = getBarFeaturesForDisplay(tier);

      const handleBarPress = (barId: string) => {
        // Navigate to specific bar detail screen based on bar ID
        if (barId === 'bar_untitled_champagne_lounge') {
          nav.navigate('UntitledLounge');
        } else if (barId === 'bar_employees_only') {
          console.log('Navigate to Employees Only');
        } else {
          console.log('Navigate to bar:', barId);
        }
      };

      return (
        <View style={styles.barSpotlightContainer}>
          {bars.map((bar) => {
            const unlocked = isBarUnlocked(bar.id);
            return (
              <TouchableOpacity
                key={bar.id}
                style={styles.barSpotlightCard}
                activeOpacity={0.7}
                onPress={() => unlocked && handleBarPress(bar.id)}
              >
                <Image
                  source={getBarThumbnail(bar.thumbnailKey)}
                  style={styles.barSpotlightImage}
                  resizeMode="cover"
                />
                <View style={styles.barSpotlightOverlay}>
                  <Text style={styles.barSpotlightTitle}>{bar.barName}, {bar.city}</Text>
                  <Text style={styles.barSpotlightDescription}>{bar.vibeDescription}</Text>
                  <View style={styles.barSpotlightFooter}>
                    {unlocked ? (
                      <>
                        <View style={styles.unlockedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                          <Text style={styles.unlockedText}>UNLOCKED</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.barUnlockButton, styles.barViewButton]}
                          activeOpacity={0.8}
                          onPress={() => handleBarPress(bar.id)}
                        >
                          <Text style={styles.barUnlockButtonText}>View</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.barSpotlightXP}>Unlock with {bar.xpCost} XP</Text>
                        <TouchableOpacity style={styles.barUnlockButton} activeOpacity={0.8}>
                          <Text style={styles.barUnlockButtonText}>Unlock</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (selectedTab === 'seasonal') {
      const drops = getAvailableSeasonalDropsForTier(tier);
      return (
        <View style={styles.inlineContent}>
          <View style={styles.contentSection}>
            <Text style={styles.contentSectionTitle}>Available Drops</Text>
            {drops.map((drop) => renderContentItem({ ...drop, xpCost: 'Limited Time' }, PLACEHOLDER_IMAGES.seasonal))}
          </View>
        </View>
      );
    }

    if (selectedTab === 'games') {
      const games = state.vaultItems.filter(item => item.category === 'games' && item.isActive);
      return (
        <View style={styles.inlineContent}>
          <View style={styles.contentSection}>
            <Text style={styles.contentSectionTitle}>Drinking Games</Text>
            <Text style={styles.contentSectionDescription}>
              Classic party games with official rules and variations. Perfect for social gatherings!
            </Text>
            {games.map((game) => (
              <View key={game.id} style={styles.contentItemCard}>
                <Image
                  source={{ uri: game.image }}
                  style={styles.contentItemThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.contentItemInfo}>
                  <Text style={styles.contentItemXP}>{game.xpCost} XP</Text>
                  <Text style={styles.contentItemTitle}>{game.name}</Text>
                  <Text style={styles.contentItemDescription} numberOfLines={2}>
                    {game.description}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.contentItemUnlockButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    analytics.trackVaultView(game.id, game.category, game.rarity);
                    dispatch({ type: 'SET_SELECTED_ITEM', payload: game });
                    dispatch({ type: 'SHOW_UNLOCK_MODAL', payload: true });
                  }}
                >
                  <Text style={styles.contentItemUnlockText}>Unlock</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  const isNewCategory = ['variations', 'playbooks', 'bars', 'seasonal', 'games'].includes(selectedTab);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {isNewCategory ? (
          renderInlineContent()
        ) : (
          <>
            {filteredItems.length === 0 ? (
              renderEmptyState()
            ) : (
              filteredItems.map((item) => (
                <View key={item.id}>
                  {renderVaultItem({ item })}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Unlock Modal */}
      <VaultUnlockModal
        visible={state.showUnlockModal}
        item={state.selectedItem}
        userProfile={state.userProfile}
        onClose={() => {
          dispatch({ type: 'SHOW_UNLOCK_MODAL', payload: false });
          dispatch({ type: 'SET_SELECTED_ITEM', payload: null });
        }}
      />

      {/* AI Credits Purchase Modal */}
      <AICreditsPurchaseModal
        visible={creditsPurchaseVisible}
        onClose={() => setCreditsPurchaseVisible(false)}
      />

      {/* XP Balance Modal */}
      <XPBalanceModal
        visible={xpBalanceModalVisible}
        onClose={() => setXpBalanceModalVisible(false)}
      />

      {/* Grocery List Modal */}
      <GroceryListModal
        visible={groceryListVisible}
        onClose={() => setGroceryListVisible(false)}
        recipe={selectedRecipe}
        navigation={nav}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing(4),
  },
  
  // Collection Header
  collectionHeader: {
    backgroundColor: colors.card,
    padding: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  
  collectionInfo: {
    marginBottom: spacing(1.5),
  },
  
  collectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  
  collectionSubtitle: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  
  quickStats: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  
  statCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    gap: spacing(0.5),
  },

  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  clickableStatCard: {
    borderWidth: 1,
    borderColor: colors.line,
    opacity: 0.9,
  },

  // Actions
  actionsContainer: {
    alignItems: 'center',
    padding: spacing(1.5),
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  
  actionsWrapper: {
    flexDirection: 'row',
    gap: spacing(2),
    alignItems: 'center',
  },
  
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
  },
  
  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
  },
  
  secondaryActionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  
  // Tabs
  tabsScrollView: {
    backgroundColor: colors.bg,
  },
  
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(1),
  },
  
  // List
  itemSeparator: {
    height: spacing(2),
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    paddingTop: spacing(8),
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },

  // Inline Content
  inlineContent: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(4),
  },

  contentSection: {
    marginBottom: spacing(4),
  },

  contentSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },

  contentSectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    marginBottom: spacing(3),
  },

  contentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },

  contentItemThumbnail: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.line,
  },

  contentItemInfo: {
    flex: 1,
  },

  contentItemXP: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },

  contentItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  contentItemDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },

  contentItemUnlockButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
  },

  contentItemUnlockText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },

  // Bar Spotlight Cards
  barSpotlightContainer: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(4),
    gap: spacing(3),
  },

  barSpotlightCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: spacing(3),
  },

  barSpotlightImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.line,
  },

  barSpotlightOverlay: {
    padding: spacing(2),
  },

  barSpotlightTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },

  barSpotlightDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    marginBottom: spacing(2),
  },

  barSpotlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  barSpotlightXP: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },

  barUnlockButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
  },

  barUnlockButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  barViewButton: {
    backgroundColor: colors.gold,
  },

  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  unlockedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
  },

  // Locked content styles
  lockedCard: {
    opacity: 0.7,
  },

  lockedThumbnail: {
    opacity: 0.5,
  },
});