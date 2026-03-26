// @ts-nocheck
/**
 * VAULT HOME SCREEN - XP ECONOMY
 * Clean layout matching app's current design patterns
 */

import React, { useLayoutEffect, useState, useEffect, useMemo } from 'react';
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
import { colors, spacing, radii, serif } from '../../theme/tokens';
import { VaultItem } from '../../types/vault';
import { useVault } from '../../contexts/VaultContext';
import { useUser } from '../../store/useUser';
import { useAICredits } from '../../store/useAICredits';
import { useXPSystem } from '../../store/useXPSystem';
import { currentVaultCycle, getVaultCountdown } from '../../data/vaultData';
import XPBalanceModal from '../../components/XPBalanceModal';
import InPageTabBar from '../../components/ui/InPageTabBar';
import VaultUnlockModal from './components/VaultUnlockModal';
import VaultItemCard from './components/VaultItemCard';
import VaultItemPreviewModal from './components/VaultItemPreviewModal';
import AICreditsPurchaseModal from '../../components/AICreditsPurchaseModal';
import {
  getBenefitsForVariation,
  getBenefitsForPlaybook,
  getBenefitsForBar,
  getBenefitsForGame,
  VARIATION_BENEFITS,
} from '../../config/vaultBenefits';
import { calculateTasteMatchPercent } from '../../services/tasteMatchService';
import { useScreenTracking, useAnalyticsContext } from '../../context/AnalyticsContext';
import { VaultCategory } from '../../config/vaultTypes';
import {
  vaultCategories,
  VaultCategoryConfig,
  getVariationsForDisplay,
  getTechniquePlaybooksByType,
  getAvailableSeasonalDropsForTier,
  getAllPlaybookTypes,
  TechniquePlaybookType,
  getDrinkingGamesForDisplay,
} from '../../config/vaultContent';
import AIRecommendations from '../../components/AIRecommendations';
import { useSavedItems } from '../../hooks/useSavedItems';
import GroceryListModal from '../../components/GroceryListModal';
import { useUserTier } from '../../store/useUserTier';
import { canAccessContent } from '../../utils/tierAccess';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import TierBadge from '../../components/TierBadge';
import LockedContentOverlay from '../../components/LockedContentOverlay';
import { log } from '../../lib/logger';
import UnlockCelebration from '../../components/UnlockCelebration';
import {
  getVaultPlaybookHeader,
  getVaultPlaybookThumbnail,
  getVaultSeasonalHeader,
  getVaultSeasonalThumbnail,
  getVaultVariationHeader,
  getVaultVariationThumbnail,
} from '../../data/vaultImages';


export default function VaultScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, dispatch } = useVault();
  const { tier, setTier } = useUserTier();
  const { profile: personalizationProfile } = usePersonalization();
  const { gateWithTrigger: vaultProGate } = useFeatureAccess('vault_pro_drops');
  const analytics = useAnalyticsContext();
  const { balance: xpBalance, spendXP, unlockVaultItem, isVaultItemUnlocked } = useXPSystem();
  const { credits, isPremium } = useAICredits();
  const { savedItems, toggleSavedCocktail, isCocktailSaved, toggleSavedVaultItem } = useSavedItems();
  const [selectedTab, setSelectedTab] = useState<string>('variations');
  const [countdown, setCountdown] = useState(getVaultCountdown());
  const [creditsPurchaseVisible, setCreditsPurchaseVisible] = useState(false);
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Preview Modal State
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // Celebration State
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [unlockedItemName, setUnlockedItemName] = useState('');

  // Taste match scores for vault variations (PLUS/PRO only)
  const variationTasteScores = useMemo<Record<string, number>>(() => {
    if (tier === 'FREE' || !personalizationProfile) return {};
    const flavorPrefs: string[] = personalizationProfile.flavorPreferences || [];
    const spiritPrefs: string[] = personalizationProfile.favoriteSpirits || [];
    const allPrefs = new Set([...flavorPrefs, ...spiritPrefs]);
    if (allPrefs.size === 0) return {};

    const scores: Record<string, number> = {};
    const variations = getVariationsForDisplay();
    for (const v of variations) {
      const tags = v.tags.map((t) => t.toLowerCase());
      const matches = tags.filter((t) => allPrefs.has(t)).length;
      scores[v.id] = Math.min(100, Math.round((matches / Math.max(1, tags.length)) * 100));
    }
    return scores;
  }, [tier, personalizationProfile]);

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
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 22, fontFamily: serif },
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
                'XP (Experience Points):\n• Earn XP by completing lessons, challenges, and identity-track progress\n• Use XP to unlock master recipes, advanced technique playbooks, and collector-tier drops\n\nSubscription Tiers:\n• FREE: Limited access, earn XP to unlock select Vault items\n• KOOPE+ ($8.99/mo): Unlock the full Vault library with XP\n• KOOPE PRO ($17.99/mo): PLUS benefits + accelerated XP earning, elite drops, and early-access prestige content\n\nTip: Claiming your weekly Pro drops and finishing lessons helps your Vault identity compound faster.',
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

        </View>
      ),
    });
  }, [nav, tier, setTier, xpBalance]);

  const getFilteredItems = (): VaultItem[] => {
    const items = state.vaultItems.filter(item => item.isActive);

    switch (selectedTab) {
      case 'variations':
      case 'playbooks':
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
    { key: 'games', label: 'Games' },
    // Archived for future product expansion
    // { key: 'bars', label: 'Bar Features' },
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
          <Text style={styles.collectionSupportText}>
            Master recipes, rotating elite drops, and premium playbooks built for serious collectors.
          </Text>
        </View>
        
        {/* Quick Stats - Simplified: XP + AI Credits only (Keys removed) */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{xpBalance.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP Balance</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, styles.clickableStatCard]}
            onPress={() => setCreditsPurchaseVisible(true)}
          >
            <Ionicons
              name={isPremium ? "diamond" : "sparkles"}
              size={20}
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
      <View style={styles.tabsContainer}>
        <InPageTabBar
          items={tabs}
          activeKey={selectedTab}
          onChange={setSelectedTab}
          scrollable
        />
      </View>
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

  const toImageSource = (image: any) => {
    if (typeof image === 'number') return image;
    if (image && typeof image === 'object' && 'uri' in image) return image;
    if (typeof image === 'string') return { uri: image };
    return { uri: PLACEHOLDER_IMAGES.cocktail };
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
  // Helper function to check if a game is unlocked (persisted in XP store)
  const isGameUnlocked = (gameId: string): boolean => {
    return isVaultItemUnlocked(gameId);
  };

  // Map vault game IDs to GameDetailsScreen navigation IDs
  const getGameNavId = (vaultGameId: string): string => {
    return vaultGameId.replace('game_', '').replace(/_/g, '-');
  };

  // Open preview modal with item details and benefits
  const handleItemPreview = (item: any, imageSource: any, category: string) => {
    let benefits = [];
    let fullDescription = '';

    // Get benefits based on category
    switch (category) {
      case 'variation':
        // First try to get specific item benefits by ID (e.g., "spicy_margarita")
        const itemKey = item.id.replace('var_', '');
        const specificBenefits = VARIATION_BENEFITS[itemKey];
        const variationBenefits = specificBenefits || getBenefitsForVariation(item.difficulty || 'simple');
        benefits = variationBenefits.benefits;
        fullDescription = variationBenefits.fullDescription;
        break;
      case 'playbook':
        const playbookBenefits = getBenefitsForPlaybook(item.playbookType || item.type);
        benefits = playbookBenefits.benefits;
        fullDescription = playbookBenefits.fullDescription;
        break;
      case 'bar':
        const barBenefits = getBenefitsForBar(item.id);
        benefits = barBenefits.benefits;
        fullDescription = barBenefits.fullDescription;
        break;
      case 'game':
        const gameBenefits = getBenefitsForGame(item.id);
        benefits = gameBenefits.benefits;
        fullDescription = gameBenefits.fullDescription;
        break;
      case 'seasonal':
        // Seasonal items use a default template for now
        fullDescription = 'Limited-time seasonal content curated around holidays, ingredients, and cultural moments.';
        benefits = [
          { icon: 'calendar', title: 'Seasonal Relevance', description: 'Recipes perfectly timed to ingredient availability' },
          { icon: 'gift', title: 'Limited Availability', description: 'Exclusive content that rotates out' },
          { icon: 'star', title: 'Holiday Entertaining', description: 'Impress guests with drinks for celebrations' },
        ];
        break;
    }

    const previewData = {
      id: item.id,
      title: item.title || item.barName || item.name || item.seasonName,
      description: fullDescription,
      imageSource: toImageSource(imageSource),
      category,
      xpCost: item.xpCost,
      requiredTier: item.requiredTier,
      benefits,
      isUnlocked: isVaultItemUnlocked(item.id),
    };

    log.info('VaultScreen', 'Opening preview modal', { item: previewData });
    setPreviewItem(previewData);
    setPreviewModalVisible(true);
  };

  const renderContentItem = (item: any, imageSource: any, category: string = 'variation', previewImageSource?: any) => {
    const isTierLocked = !canAccessContent(tier, item.requiredTier);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.contentItemCard, isTierLocked && styles.lockedCard]}
        activeOpacity={0.7}
        onPress={() => handleItemPreview(item, previewImageSource || imageSource, category)}
      >
        <Image
          source={toImageSource(imageSource)}
          style={[styles.contentItemThumbnail, isTierLocked && styles.lockedThumbnail]}
          resizeMode="cover"
        />
        <View style={styles.contentItemInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <Text style={styles.contentItemXP}>{item.xpCost} XP</Text>
            {isTierLocked && item.requiredTier && (
              <View style={styles.tierRequiredBadge}>
                <Text style={styles.tierRequiredText}>{item.requiredTier} Required</Text>
              </View>
            )}
          </View>
          <Text style={styles.contentItemTitle}>{item.title || item.barName || item.seasonName}</Text>
          <Text style={styles.contentItemDescription} numberOfLines={2}>
            {item.shortDescription || item.description || `${item.city} • ${item.signatureCocktailName}`}
          </Text>
        </View>

        <View style={styles.contentItemUnlockButton}>
          <Text style={styles.contentItemUnlockText}>Unlock</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInlineContent = () => {
    if (selectedTab === 'playbooks') {
      const playbookTypes = getAllPlaybookTypes();
      return (
        <View style={styles.inlineContent}>
          {playbookTypes.map((type) => {
            const playbooks = getTechniquePlaybooksByType(type); // Show all items regardless of tier
            if (playbooks.length === 0) return null;
            return (
              <View key={type} style={styles.contentSection}>
                <Text style={styles.contentSectionTitle}>{PLAYBOOK_TYPE_LABELS[type]}</Text>
                {playbooks.map((playbook) =>
                  renderContentItem(
                    playbook,
                    getVaultPlaybookThumbnail(playbook.id),
                    'playbook',
                    getVaultPlaybookHeader(playbook.id)
                  )
                )}
              </View>
            );
          })}
        </View>
      );
    }

    if (selectedTab === 'variations') {
      const variations = getVariationsForDisplay(); // Show all items regardless of tier
      const groupedByDifficulty: Record<string, typeof variations> = {
        simple: [],
        technique_forward: [],
        pro: [],
      };
      variations.forEach((v) => {
        groupedByDifficulty[v.difficulty].push(v);
      });
      // Sort each group by taste match score when data is available
      const hasTasteScores = Object.keys(variationTasteScores).length > 0;
      if (hasTasteScores) {
        for (const key of Object.keys(groupedByDifficulty)) {
          groupedByDifficulty[key].sort((a, b) => (variationTasteScores[b.id] ?? 0) - (variationTasteScores[a.id] ?? 0));
        }
      }
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
                {items.map((variation) => {
                  const tasteScore = variationTasteScores[variation.id] ?? 0;
                  const showBadge = tasteScore >= 50;
                  return (
                    <View key={variation.id} style={{ position: 'relative' }}>
                      {renderContentItem(
                        variation,
                        getVaultVariationThumbnail(variation.id),
                        'variation',
                        getVaultVariationHeader(variation.id)
                      )}
                      {showBadge && (
                        <View style={styles.tasteMatchBadge}>
                          <Text style={styles.tasteMatchBadgeText}>Matches your taste</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      );
    }

    if (selectedTab === 'seasonal') {
      const drops = getAvailableSeasonalDropsForTier(); // Show all items regardless of tier
      return (
        <View style={styles.inlineContent}>
          <View style={styles.contentSection}>
            <Text style={styles.contentSectionTitle}>Available Drops</Text>
            {drops.map((drop) =>
              renderContentItem(
                { ...drop, xpCost: 'Limited Time' },
                getVaultSeasonalThumbnail(drop.id),
                'seasonal',
                getVaultSeasonalHeader(drop.id)
              )
            )}
          </View>
        </View>
      );
    }

    if (selectedTab === 'games') {
      const allGames = getDrinkingGamesForDisplay(); // Show all games regardless of tier
      const gameCategories: Record<string, string> = {
        classic: 'Classic Games',
        cultural: 'Cultural / International',
        app_enhanced: 'App-Enhanced Games',
        party: 'Party Games',
      };

      const groupedGames: Record<string, typeof allGames> = {
        classic: [],
        cultural: [],
        app_enhanced: [],
        party: [],
      };
      allGames.forEach((g) => {
        groupedGames[g.category].push(g);
      });

      return (
        <View style={styles.inlineContent}>
          {Object.entries(groupedGames).map(([cat, games]) => {
            if (games.length === 0) return null;
            return (
              <View key={cat} style={styles.contentSection}>
                <Text style={styles.contentSectionTitle}>{gameCategories[cat]}</Text>
                {games.map((game) => {
                  const unlocked = isGameUnlocked(game.id);
                  const isTierLocked = !canAccessContent(tier, game.requiredTier);

                  return (
                    <TouchableOpacity
                      key={game.id}
                      style={[styles.contentItemCard, isTierLocked && styles.lockedCard]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (unlocked) {
                          nav.navigate('GameDetails', { id: getGameNavId(game.id) });
                        } else {
                          handleItemPreview(
                            { ...game, title: game.title, shortDescription: game.shortDescription },
                            PLACEHOLDER_IMAGES.cocktail,
                            'game'
                          );
                        }
                      }}
                    >
                      <Image
                        source={{ uri: PLACEHOLDER_IMAGES.cocktail }}
                        style={[styles.contentItemThumbnail, isTierLocked && styles.lockedThumbnail]}
                        resizeMode="cover"
                      />
                      <View style={styles.contentItemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                          <Text style={styles.contentItemXP}>
                            {unlocked ? '' : `${game.xpCost} XP`}
                          </Text>
                          {unlocked && (
                            <View style={styles.unlockedBadge}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                              <Text style={styles.unlockedText}>UNLOCKED</Text>
                            </View>
                          )}
                          {!unlocked && isTierLocked && game.requiredTier && (
                            <View style={styles.tierRequiredBadge}>
                              <Text style={styles.tierRequiredText}>{game.requiredTier} Required</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.contentItemTitle}>{game.title}</Text>
                        <Text style={styles.contentItemDescription} numberOfLines={2}>
                          {game.shortDescription}
                        </Text>
                      </View>

                      <View style={styles.contentItemUnlockButton}>
                        <Text style={styles.contentItemUnlockText}>
                          {unlocked ? 'View' : 'Unlock'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      );
    }

    return null;
  };

  const isNewCategory = ['variations', 'playbooks', 'seasonal', 'games'].includes(selectedTab);

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

      {/* Item Preview Modal */}
      <VaultItemPreviewModal
        visible={previewModalVisible}
        onDismiss={() => setPreviewModalVisible(false)}
        onUnlock={async () => {
          // Handle unlock logic
          if (previewItem && typeof previewItem.xpCost === 'number') {
            const xpCost = previewItem.xpCost;

            // Check tier access — T11 gate for PRO-exclusive vault drops
            const tierAccess = !previewItem.requiredTier || canAccessContent(tier, previewItem.requiredTier);
            if (!tierAccess) {
              if (previewItem.requiredTier === 'PRO') {
                vaultProGate('T11');
              } else {
                Alert.alert(
                  'Subscription Required',
                  `This item requires ${previewItem.requiredTier}+ subscription to unlock.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'View Plans',
                      style: 'default',
                      onPress: () => {
                        setPreviewModalVisible(false);
                        nav.navigate('Paywall', {
                          source: 'vault_tier_locked',
                          offering: null,
                        });
                      },
                    },
                  ]
                );
              }
              return;
            }

            // Check if user can afford
            if (xpBalance < xpCost) {
              Alert.alert(
                'Insufficient XP',
                `You need ${xpCost.toLocaleString()} XP to unlock this item. You currently have ${xpBalance.toLocaleString()} XP.`,
                [{ text: 'OK', style: 'default' }]
              );
              return;
            }

            // Deduct XP
            const itemId = previewItem.id || `vault_${previewItem.category}_${previewItem.title.toLowerCase().replace(/\s+/g, '_')}`;
            const success = spendXP(xpCost, itemId, `Unlocked: ${previewItem.title}`);

            if (success) {
              // Track analytics
              analytics.trackVaultView(previewItem.title, previewItem.category, 'unlocked');

              // Close preview modal
              setPreviewModalVisible(false);

              // Show celebration animation
              setUnlockedItemName(previewItem.title);
              setCelebrationVisible(true);

              // Persist unlocked item to XP store
              unlockVaultItem(itemId);

              // Add to saved items so it appears in My Collection
              toggleSavedVaultItem({ id: itemId, name: previewItem.title });
            } else {
              Alert.alert(
                'Error',
                'Failed to unlock item. Please try again.',
                [{ text: 'OK', style: 'cancel' }]
              );
            }
          }
        }}
        item={previewItem}
        userXP={xpBalance}
        userKeys={0}
        userTier={tier}
      />

      {/* Grocery List Modal */}
      <GroceryListModal
        visible={groceryListVisible}
        onClose={() => setGroceryListVisible(false)}
        recipe={selectedRecipe}
        navigation={nav}
      />

      {/* Unlock Celebration */}
      <UnlockCelebration
        visible={celebrationVisible}
        itemName={unlockedItemName}
        onComplete={() => setCelebrationVisible(false)}
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
  
  collectionSupportText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
    marginTop: spacing(1),
    maxWidth: '92%',
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
  tierRequiredBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  tierRequiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bg,
    textTransform: 'uppercase',
  },
  tasteMatchBadge: {
    position: 'absolute',
    top: spacing(1.5),
    right: spacing(1.5),
    backgroundColor: 'rgba(18,18,18,0.85)',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  tasteMatchBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gold,
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

  // Vault upgrade card (for FREE tier limitations)
  vaultUpgradeCard: {
    marginTop: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.gold + '40',
    padding: spacing(3),
  },

  vaultUpgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  vaultUpgradeText: {
    flex: 1,
    gap: spacing(0.5),
  },

  vaultUpgradeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  vaultUpgradeSubtitle: {
    fontSize: 13,
    color: colors.subtext,
  },

  vaultUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.gold,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
  },

  vaultUpgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
