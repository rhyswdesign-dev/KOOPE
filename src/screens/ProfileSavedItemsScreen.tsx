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

type TabType = 'saved' | 'created' | 'imported' | 'vault';

interface TabConfig {
  key: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { key: 'created', label: 'Created', icon: 'create-outline' },
  { key: 'imported', label: 'Imported', icon: 'download-outline' },
  { key: 'vault', label: 'Playbooks', icon: 'book-outline' },
];

export default function ProfileSavedItemsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { recipes: userRecipes, loadRecipes, deleteRecipe } = useUserRecipes();

  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [refreshing, setRefreshing] = useState(false);
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
  const getSavedRecipes = () => {
    return savedItems.savedCocktails || [];
  };

  const getCreatedRecipes = (): UserRecipe[] => {
    return userRecipes.filter((r) => r.type === 'created' || r.type === 'ai_generated');
  };

  const getImportedRecipes = (): UserRecipe[] => {
    return userRecipes.filter((r) => (r.type as string) === 'imported');
  };

  const getPlaybookItems = () => {
    return (savedItems.savedVaultItems || []).filter((item) => item.id.startsWith('playbook_'));
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'saved':
        return getSavedRecipes();
      case 'created':
        return getCreatedRecipes();
      case 'imported':
        return getImportedRecipes();
      case 'vault':
        return getPlaybookItems();
      default:
        return [];
    }
  };

  const getTabCount = (tab: TabType): number => {
    switch (tab) {
      case 'saved':
        return getSavedRecipes().length;
      case 'created':
        return getCreatedRecipes().length;
      case 'imported':
        return getImportedRecipes().length;
      case 'vault':
        return getPlaybookItems().length;
      default:
        return 0;
    }
  };

  const renderSavedItem = ({ item }: { item: any }) => {
    // Saved items from useSavedItems
    return (
      <RecipeCard
        recipe={{
          id: item.id,
          name: item.name,
          title: item.name,
          description: item.subtitle || '',
          image: item.image,
          difficulty: 'Medium',
          time: '5 min',
        }}
        onPress={() => handleRecipeView(item, nav)}
        onSave={() => toggleSavedCocktail(item)}
        isSaved={isCocktailSaved(item.id)}
        showSaveButton={true}
      />
    );
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
            description: amountLabel ? `${amountLabel} • ${item.description || ''}` : item.description || '',
            image: item.thumbnailImage || item.headerImage || item.image || 'https://images.unsplash.com/photo-1514362545857-3f16c0c5604c?q=80&w=1200',
            difficulty: (item.difficulty as any) || 'Medium',
            time: item.prepTime ? `${item.prepTime} min` : '5 min',
          }}
          onPress={() => handleRecipeView(item as any, nav)}
          onDelete={() => handleDelete(item)}
          showDeleteButton={true}
          showSaveButton={false}
        />
        {/* Type Badge */}
        <View
          style={[
            styles.typeBadge,
            isImported ? styles.importedBadge : styles.createdBadge,
          ]}
        >
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

  const handleDelete = (recipe: UserRecipe) => {
    deleteRecipe(recipe.id);
    log.info('ProfileSavedItems', 'Recipe deleted', { id: recipe.id });
  };

  const renderVaultItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.savedItemCard}>
        <View style={[styles.savedItemIcon, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="book-outline" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.savedItemTitle}>{item.name}</Text>
          <Text style={styles.savedItemSubtitle}>Technique Playbook</Text>
        </View>
        <Ionicons name="lock-open-outline" size={18} color={colors.success} />
      </View>
    );
  };

  const renderEmptyState = () => {
    const emptyConfig = {
      saved: {
        icon: 'bookmark-outline',
        title: 'No saved recipes yet',
        subtitle: 'Browse recipes and tap the bookmark icon to save them here',
        action: 'Browse Recipes',
        onAction: () => (nav as any).navigate('Main', { screen: 'Recipes' }),
      },
      created: {
        icon: 'create-outline',
        title: 'No recipes created yet',
        subtitle: 'Create your own cocktail recipes or generate one with AI',
        action: 'Create Recipe',
        onAction: () => nav.navigate('AddRecipe'),
      },
      imported: {
        icon: 'download-outline',
        title: 'No imported recipes yet',
        subtitle: 'Go to Camera tab and tap "Import from URL" to import recipes',
        action: 'Go to Camera',
        onAction: () => (nav as any).navigate('Main', { screen: 'Camera', params: { screen: 'RecipeURLImport' } }),
      },
      vault: {
        icon: 'book-outline',
        title: 'No playbooks yet',
        subtitle: 'Earn XP and unlock technique playbooks from the Vault',
        action: 'Explore Vault',
        onAction: () => (nav as any).navigate('Main', { screen: 'Vault' }),
      },
    };

    const config = emptyConfig[activeTab as keyof typeof emptyConfig];

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name={config.icon as any} size={48} color={colors.muted} />
        </View>
        <Heading level={2} style={styles.emptyTitle}>{config.title}</Heading>
        <Text style={styles.emptySubtitle}>{config.subtitle}</Text>
        <TouchableOpacity style={styles.emptyAction} onPress={withHaptic(config.onAction)}>
          <Text style={styles.emptyActionText}>{config.action}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  const activeData = getActiveData();
  const totalCount = getSavedRecipes().length + getCreatedRecipes().length + getImportedRecipes().length + getPlaybookItems().length;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Summary Header */}
      <View style={styles.summaryHeader}>
        <Heading level={1} style={styles.summaryCount}>{totalCount}</Heading>
        <Text style={styles.summaryLabel}>Total Items</Text>
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
            activeTab === 'saved' ? renderSavedItem
            : activeTab === 'vault' ? renderVaultItem
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
    alignItems: 'center',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryCount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
  },
  summaryLabel: {
    fontSize: fonts.caption,
    color: colors.subtext,
    marginTop: spacing(0.5),
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

});
