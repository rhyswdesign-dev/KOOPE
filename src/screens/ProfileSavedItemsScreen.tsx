/**
 * PROFILE SAVED ITEMS SCREEN
 * Tabbed view of user's saved, liked, created, and imported recipes
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes, UserRecipe } from '../store/useUserRecipes';
import RecipeCard from '../components/RecipeCard';
import { handleRecipeView } from '../utils/recipeActions';
import { log } from '../lib/logger';

type TabType = 'saved' | 'created' | 'imported';

interface TabConfig {
  key: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { key: 'created', label: 'Created', icon: 'create-outline' },
  { key: 'imported', label: 'Imported', icon: 'download-outline' },
];

export default function ProfileSavedItemsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { recipes: userRecipes, loadRecipes, deleteRecipe } = useUserRecipes();

  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'My Collection',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => nav.navigate('ImportRecipe', { url: '' })}
          style={styles.headerButton}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
        </TouchableOpacity>
      ),
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

  const getActiveData = () => {
    switch (activeTab) {
      case 'saved':
        return getSavedRecipes();
      case 'created':
        return getCreatedRecipes();
      case 'imported':
        return getImportedRecipes();
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

    return (
      <View style={styles.recipeCardWrapper}>
        <RecipeCard
          recipe={{
            id: item.id,
            name: item.name,
            title: item.name,
            description: item.description || '',
            image: item.image,
            difficulty: item.difficulty || 'Medium',
            time: item.prepTime ? `${item.prepTime} min` : '5 min',
          }}
          onPress={() =>
            nav.navigate('MyRecipes')
          }
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

  const renderEmptyState = () => {
    const emptyConfig = {
      saved: {
        icon: 'bookmark-outline',
        title: 'No saved recipes yet',
        subtitle: 'Browse recipes and tap the bookmark icon to save them here',
        action: 'Browse Recipes',
        onAction: () => nav.navigate('Main', { screen: 'Recipes' }),
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
        subtitle: 'Share a recipe from Instagram, Pinterest, or TikTok to import it',
        action: 'Import Recipe',
        onAction: () => nav.navigate('ImportRecipe', { url: '' }),
      },
    };

    const config = emptyConfig[activeTab];

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name={config.icon as any} size={48} color={colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>{config.title}</Text>
        <Text style={styles.emptySubtitle}>{config.subtitle}</Text>
        <TouchableOpacity style={styles.emptyAction} onPress={config.onAction}>
          <Text style={styles.emptyActionText}>{config.action}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  const activeData = getActiveData();
  const totalCount = getSavedRecipes().length + getCreatedRecipes().length + getImportedRecipes().length;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Summary Header */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryCount}>{totalCount}</Text>
        <Text style={styles.summaryLabel}>Total Recipes</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? colors.accent : colors.subtext}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {activeData.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={activeData}
          renderItem={activeTab === 'saved' ? renderSavedItem : renderUserRecipe}
          keyExtractor={(item) => item.id}
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

      {/* Quick Actions FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => nav.navigate('ImportRecipe', { url: '' })}
        >
          <Ionicons name="download-outline" size={20} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabPrimary]}
          onPress={() => nav.navigate('AddRecipe')}
        >
          <Ionicons name="add" size={24} color={colors.bg} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerButton: {
    padding: spacing(1),
    marginRight: spacing(1),
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
    backgroundColor: colors.accentBg,
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
    backgroundColor: colors.primary,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
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
    borderRadius: 40,
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

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: spacing(3),
    right: spacing(3),
    flexDirection: 'row',
    gap: spacing(2),
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fabPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
