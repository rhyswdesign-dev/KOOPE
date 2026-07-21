/**
 * PROFILE SAVED ITEMS SCREEN
 * Tabbed view of user's saved, liked, created, and imported recipes
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, fonts, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes, UserRecipe } from '../store/useUserRecipes';
import RecipeCard from '../components/RecipeCard';
import { handleRecipeView } from '../utils/recipeActions';
import { log } from '../lib/logger';
import InPageTabBar from '../components/ui/InPageTabBar';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { COLLECTIBLE_RECIPE_CARDS, getCollectibleRecipeCard } from '../data/recipeCards';
import RecipeCardCollectionTile from '../components/recipe-cards/RecipeCardCollectionTile';
import { useXPSystem } from '../store/useXPSystem';
import {
  getVariationsForDisplay,
  getBartenderHacksForDisplay,
  getTechniquePlaybooksByType,
  getAllPlaybookTypes,
} from '../config/vaultContent';

// 'saved' and 'imported' moved to the Drinks tab (1.4d/consolidation) —
// saved cocktails and recipe imports now live there exclusively, so this
// screen no longer duplicates them. What's left here is vault-unlocked
// collectible content plus recipes you've actually created.
type TabType = 'recipe_cards' | 'created' | 'variations' | 'playbooks' | 'hacks';

interface TabConfig {
  key: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: 'created', label: 'Created', icon: 'create-outline' },
  { key: 'recipe_cards', label: 'Recipe Cards', icon: 'albums-outline' },
  { key: 'variations', label: 'Variations', icon: 'wine-outline' },
  { key: 'playbooks', label: 'Playbooks', icon: 'book-outline' },
  { key: 'hacks', label: 'Hacks', icon: 'bulb-outline' },
];

export default function ProfileSavedItemsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { savedItems } = useSavedItems();
  const { recipes: userRecipes, loadRecipes, deleteRecipe } = useUserRecipes();
  const isVaultItemUnlocked = useXPSystem((state) => state.isVaultItemUnlocked);

  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [refreshing, setRefreshing] = useState(false);
  const [vaultDetailItem, setVaultDetailItem] = useState<any>(null);
  const onScrollHaptic = useScrollHaptic('selection', 800);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'My Collection',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontFamily: serif },
      headerShadowVisible: false,
    });
  }, [nav]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  // Get data for each tab
  const getCreatedRecipes = (): UserRecipe[] => {
    return userRecipes.filter((r) => r.type === 'created' || r.type === 'ai_generated');
  };

  const getSavedRecipeCards = () => {
    return (savedItems.savedRecipeCards || [])
      .map((item) => getCollectibleRecipeCard(item.id))
      .filter(Boolean);
  };

  const getRecipeCardLibrary = () => {
    const savedCards = getSavedRecipeCards();
    return savedCards.length > 0 ? savedCards : COLLECTIBLE_RECIPE_CARDS;
  };

  const getVariationItems = () =>
    getVariationsForDisplay().filter((v) => isVaultItemUnlocked(v.id));

  const getPlaybookItems = () =>
    getAllPlaybookTypes()
      .flatMap((type) => getTechniquePlaybooksByType(type))
      .filter((p) => isVaultItemUnlocked(p.id));

  const getHackItems = () => getBartenderHacksForDisplay().filter((h) => isVaultItemUnlocked(h.id));

  const getActiveData = () => {
    switch (activeTab) {
      case 'recipe_cards':
        return getRecipeCardLibrary();
      case 'created':
        return getCreatedRecipes();
      case 'variations':
        return getVariationItems();
      case 'playbooks':
        return getPlaybookItems();
      case 'hacks':
        return getHackItems();
      default:
        return [];
    }
  };

  const getTabCount = (tab: TabType): number => {
    switch (tab) {
      case 'recipe_cards':
        return getRecipeCardLibrary().length;
      case 'created':
        return getCreatedRecipes().length;
      case 'variations':
        return getVariationItems().length;
      case 'playbooks':
        return getPlaybookItems().length;
      case 'hacks':
        return getHackItems().length;
      default:
        return 0;
    }
  };

  const renderUserRecipe = ({ item }: { item: UserRecipe }) => {
    const isImported = (item.type as string) === 'imported';
    const firstAmount = item.ingredients?.[0]?.amount?.trim?.() || '';
    const amountLabel = firstAmount
      ? /\b(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts)\b/i.test(firstAmount)
        ? firstAmount
        : `${firstAmount} oz`
      : '';

    return (
      <View style={styles.recipeCardWrapper}>
        <RecipeCard
          recipe={{
            id: item.id,
            name: item.name,
            title: item.name,
            description: amountLabel
              ? `${amountLabel} • ${item.description || ''}`
              : item.description || '',
            image:
              item.thumbnailImage ||
              item.headerImage ||
              item.image ||
              'https://images.unsplash.com/photo-1514362545857-3f16c0c5604c?q=80&w=1200',
            difficulty: (item.difficulty as any) || 'Medium',
            time: item.prepTime ? `${item.prepTime} min` : '5 min',
          }}
          onPress={() => handleRecipeView(item as any, nav)}
          onDelete={() => handleDelete(item)}
          showDeleteButton={true}
          showSaveButton={false}
        />
        {/* Type Badge */}
        <View style={[styles.typeBadge, isImported ? styles.importedBadge : styles.createdBadge]}>
          <Ionicons
            name={isImported ? 'download-outline' : 'create-outline'}
            size={12}
            color={colors.white}
          />
          <Text style={styles.typeBadgeText}>
            {isImported ? 'Imported' : item.type === 'ai_generated' ? 'AI' : 'Created'}
          </Text>
        </View>
      </View>
    );
  };

  const renderRecipeCard = ({ item }: { item: any }) => {
    return (
      <RecipeCardCollectionTile
        card={item}
        onPress={() => nav.navigate('RecipeCardDetail', { cardId: item.id })}
      />
    );
  };

  const handleDelete = (recipe: UserRecipe) => {
    deleteRecipe(recipe.id);
    log.info('ProfileSavedItems', 'Recipe deleted', { id: recipe.id });
  };

  const renderVaultCard = (
    item: any,
    opts: {
      category: string;
      color: string;
      icon: React.ComponentProps<typeof Ionicons>['name'];
      descKey: 'shortDescription' | 'teaser';
    },
  ) => (
    <TouchableOpacity
      style={styles.vaultItemCard}
      onPress={() =>
        setVaultDetailItem({
          ...item,
          _category: opts.category,
          _color: opts.color,
          _icon: opts.icon,
        })
      }
      activeOpacity={0.78}
    >
      <View style={[styles.vaultItemStripe, { backgroundColor: opts.color }]} />
      <View
        style={[
          styles.vaultItemIconWrap,
          { backgroundColor: opts.color + '18', borderColor: opts.color + '33' },
        ]}
      >
        <Ionicons name={opts.icon} size={20} color={opts.color} />
      </View>
      <View style={styles.vaultItemBody}>
        <View style={styles.vaultItemTopRow}>
          <Text style={styles.vaultItemCategory}>{opts.category}</Text>
          <View style={styles.vaultItemUnlockedBadge}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.vaultItemUnlockedText}>Unlocked</Text>
          </View>
        </View>
        <Text style={styles.vaultItemTitle}>{item.title}</Text>
        {item[opts.descKey] ? (
          <Text style={styles.vaultItemDesc} numberOfLines={2}>
            {item[opts.descKey]}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={colors.subtext}
        style={styles.vaultItemChevron}
      />
    </TouchableOpacity>
  );

  const renderVariationItem = ({ item }: { item: any }) =>
    renderVaultCard(item, {
      category: 'VARIATION',
      color: '#D6B06E',
      icon: 'wine-outline',
      descKey: 'shortDescription',
    });

  const renderPlaybookItem = ({ item }: { item: any }) =>
    renderVaultCard(item, {
      category: 'PLAYBOOK',
      color: colors.accent,
      icon: 'book-outline',
      descKey: 'shortDescription',
    });

  const renderHackItem = ({ item }: { item: any }) =>
    renderVaultCard(item, {
      category: 'HACK',
      color: '#E89C40',
      icon: 'bulb-outline',
      descKey: 'teaser',
    });

  const renderEmptyState = () => {
    const emptyConfig = {
      recipe_cards: {
        icon: 'albums-outline',
        title: 'No collectible recipe cards yet',
        subtitle: 'Premium and mixology cards will live here once unlocked and saved',
        action: 'Browse Cards',
        onAction: () =>
          nav.navigate('RecipeCardDetail', { cardId: COLLECTIBLE_RECIPE_CARDS[0].id }),
      },
      created: {
        icon: 'create-outline',
        title: 'No recipes created yet',
        subtitle: 'Create your own cocktail recipes or generate one with AI',
        action: 'Create Recipe',
        onAction: () => nav.navigate('AddRecipe'),
      },
      variations: {
        icon: 'wine-outline',
        title: 'No variations unlocked yet',
        subtitle: 'Spend XP in the Vault to unlock pro-level cocktail variations',
        action: 'Explore Vault',
        onAction: () => (nav as any).navigate('Vault'),
      },
      playbooks: {
        icon: 'book-outline',
        title: 'No playbooks unlocked yet',
        subtitle: 'Earn XP and unlock technique playbooks from the Vault',
        action: 'Explore Vault',
        onAction: () => (nav as any).navigate('Vault'),
      },
      hacks: {
        icon: 'bulb-outline',
        title: 'No hacks unlocked yet',
        subtitle: 'Spend XP in the Vault to unlock bartender tips and techniques',
        action: 'Explore Vault',
        onAction: () => (nav as any).navigate('Vault'),
      },
    };

    const config = emptyConfig[activeTab as keyof typeof emptyConfig];

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name={config.icon as any} size={48} color={colors.muted} />
        </View>
        <Heading level={2} style={styles.emptyTitle}>
          {config.title}
        </Heading>
        <Text style={styles.emptySubtitle}>{config.subtitle}</Text>
        <TouchableOpacity style={styles.emptyAction} onPress={withHaptic(config.onAction)}>
          <Text style={styles.emptyActionText}>{config.action}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  const activeData = getActiveData();
  const vaultTotal = getVariationItems().length + getPlaybookItems().length + getHackItems().length;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Summary Header — horizontal stat strip */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryStatGroup}>
          <Text style={styles.summaryStatValue}>{getCreatedRecipes().length}</Text>
          <Text style={styles.summaryStatLabel}>Created</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStatGroup}>
          <Text style={styles.summaryStatValue}>{getRecipeCardLibrary().length}</Text>
          <Text style={styles.summaryStatLabel}>Cards</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStatGroup}>
          <Text style={[styles.summaryStatValue, vaultTotal > 0 && styles.summaryStatValueGold]}>
            {vaultTotal}
          </Text>
          <Text style={styles.summaryStatLabel}>Vault</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <InPageTabBar
          items={TABS.map((tab) => ({
            ...tab,
            badge: getTabCount(tab.key),
          }))}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabType)}
          scrollable
        />
      </View>

      {/* Content */}
      {activeData.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={activeData as any[]}
          renderItem={
            activeTab === 'recipe_cards'
              ? renderRecipeCard
              : activeTab === 'variations'
                ? renderVariationItem
                : activeTab === 'playbooks'
                  ? renderPlaybookItem
                  : activeTab === 'hacks'
                    ? renderHackItem
                    : renderUserRecipe
          }
          keyExtractor={(item) => item.id}
          onScrollBeginDrag={onScrollHaptic}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}

      {/* Vault Item Detail Modal */}
      <Modal
        visible={!!vaultDetailItem}
        transparent
        animationType="slide"
        onRequestClose={() => setVaultDetailItem(null)}
      >
        <View style={styles.vaultModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setVaultDetailItem(null)}
          />
          <View style={styles.vaultModalSheet}>
            {/* Handle */}
            <View style={styles.vaultModalHandle} />

            {/* Header */}
            <View style={styles.vaultModalHeader}>
              <View
                style={[
                  styles.vaultModalIconWrap,
                  {
                    backgroundColor: (vaultDetailItem?._color || colors.accent) + '18',
                    borderColor: (vaultDetailItem?._color || colors.accent) + '33',
                  },
                ]}
              >
                <Ionicons
                  name={vaultDetailItem?._icon || 'star-outline'}
                  size={22}
                  color={vaultDetailItem?._color || colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultModalCategory}>{vaultDetailItem?._category}</Text>
                <Text style={styles.vaultModalTitle}>{vaultDetailItem?.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVaultDetailItem(null)}
                style={styles.vaultModalClose}
              >
                <Ionicons name="close" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.vaultModalScroll}>
              {/* Hack: show body */}
              {vaultDetailItem?._category === 'HACK' && (
                <>
                  <Text style={styles.vaultModalTeaser}>{vaultDetailItem.teaser}</Text>
                  <View style={styles.vaultModalDivider} />
                  <Text style={styles.vaultModalBody}>{vaultDetailItem.body}</Text>
                  {vaultDetailItem.difficulty && (
                    <View style={styles.vaultModalMeta}>
                      <Ionicons name="fitness-outline" size={13} color={colors.subtext} />
                      <Text style={styles.vaultModalMetaText}>{vaultDetailItem.difficulty}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Playbook: show description + key outcomes */}
              {vaultDetailItem?._category === 'PLAYBOOK' && (
                <>
                  <Text style={styles.vaultModalTeaser}>{vaultDetailItem.shortDescription}</Text>
                  {Array.isArray(vaultDetailItem.keyOutcomes) &&
                    vaultDetailItem.keyOutcomes.length > 0 && (
                      <>
                        <View style={styles.vaultModalDivider} />
                        <Text style={styles.vaultModalSectionLabel}>WHAT YOU'LL LEARN</Text>
                        {vaultDetailItem.keyOutcomes.map((outcome: string, i: number) => (
                          <View key={i} style={styles.vaultModalOutcomeRow}>
                            <View
                              style={[
                                styles.vaultModalOutcomeDot,
                                { backgroundColor: vaultDetailItem._color },
                              ]}
                            />
                            <Text style={styles.vaultModalOutcomeText}>{outcome}</Text>
                          </View>
                        ))}
                      </>
                    )}
                </>
              )}

              {/* Variation: show description + tags */}
              {vaultDetailItem?._category === 'VARIATION' && (
                <>
                  <Text style={styles.vaultModalTeaser}>{vaultDetailItem.shortDescription}</Text>
                  {Array.isArray(vaultDetailItem.tags) && vaultDetailItem.tags.length > 0 && (
                    <View style={styles.vaultModalTags}>
                      {vaultDetailItem.tags.map((tag: string) => (
                        <View key={tag} style={styles.vaultModalTag}>
                          <Text style={styles.vaultModalTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={{ height: spacing(4) }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Summary Header
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryStatGroup: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    fontFamily: serif,
  },
  summaryStatValueGold: {
    color: colors.gold,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Tabs
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabs: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(1),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.full,
    backgroundColor: colors.card,
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
  },
  tabText: {
    fontSize: fonts.caption,
    fontWeight: '600',
    color: colors.subtext,
  },
  tabTextActive: {
    color: colors.accent,
  },
  tabBadge: {
    backgroundColor: colors.line,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    borderRadius: radii.full,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.accent,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
  },
  tabBadgeTextActive: {
    color: colors.white,
  },

  // List Content
  listContent: {
    padding: spacing(2),
    paddingBottom: spacing(12),
  },
  recipeCardWrapper: {
    position: 'relative',
    marginBottom: spacing(2),
  },
  typeBadge: {
    position: 'absolute',
    top: spacing(1.5),
    left: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.full,
  },
  createdBadge: {
    backgroundColor: colors.accent,
  },
  importedBadge: {
    backgroundColor: colors.accent,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  // Saved Item Cards (Games, Vault)
  savedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(2),
  },
  savedItemIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  savedItemTitle: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  savedItemSubtitle: {
    fontSize: fonts.caption,
    color: colors.subtext,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(10),
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  emptyTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fonts.body,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  emptyActionText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },

  // Vault item cards
  vaultItemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing(1.5),
    overflow: 'hidden',
  },
  vaultItemStripe: {
    width: 3,
    alignSelf: 'stretch',
  },
  vaultItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing(2),
    marginRight: spacing(1.5),
    alignSelf: 'flex-start',
    marginTop: spacing(2.25),
  },
  vaultItemBody: {
    flex: 1,
    paddingTop: spacing(2),
    paddingBottom: spacing(2),
    paddingRight: spacing(2),
  },
  vaultItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(0.4),
  },
  vaultItemCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  vaultItemUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(76,175,80,0.1)',
    paddingHorizontal: spacing(0.75),
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  vaultItemUnlockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  vaultItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.4),
    lineHeight: 20,
  },
  vaultItemDesc: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  vaultItemChevron: {
    alignSelf: 'center',
    marginRight: spacing(1.5),
  },

  // Vault Item Detail Modal
  vaultModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  vaultModalSheet: {
    backgroundColor: '#1F1510',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1.5),
  },
  vaultModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: spacing(2.5),
  },
  vaultModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(2.5),
  },
  vaultModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultModalCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  vaultModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  vaultModalScroll: {
    marginBottom: spacing(1),
  },
  vaultModalTeaser: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: spacing(0.5),
  },
  vaultModalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: spacing(2),
  },
  vaultModalBody: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: spacing(2),
  },
  vaultModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  vaultModalMetaText: {
    fontSize: 12,
    color: colors.subtext,
  },
  vaultModalSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: spacing(1.5),
  },
  vaultModalOutcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.25),
    marginBottom: spacing(1.25),
  },
  vaultModalOutcomeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  vaultModalOutcomeText: {
    flex: 1,
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  vaultModalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  vaultModalTag: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
  },
  vaultModalTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
    textTransform: 'capitalize',
  },
});
