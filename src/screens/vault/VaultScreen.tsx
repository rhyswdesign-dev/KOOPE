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
  FlatList,
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
import { currentVaultCycle, getVaultCountdown } from '../../data/vaultData';
import PillButton from '../../components/PillButton';
import VaultUnlockModal from './components/VaultUnlockModal';
import VaultItemCard from './components/VaultItemCard';
import AICreditsPurchaseModal from '../../components/AICreditsPurchaseModal';
import { useScreenTracking, useAnalyticsContext } from '../../context/AnalyticsContext';
import { VaultCategory } from '../../config/vaultTypes';
import { vaultCategories, VaultCategoryConfig } from '../../config/vaultContent';
import AIRecommendations from '../../components/AIRecommendations';
import { useSavedItems } from '../../hooks/useSavedItems';
import GroceryListModal from '../../components/GroceryListModal';


export default function VaultScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, dispatch } = useVault();
  const analytics = useAnalyticsContext();
  const { xp } = useUser();
  const { credits, isPremium } = useAICredits();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const [selectedTab, setSelectedTab] = useState<string>('variations');
  const [countdown, setCountdown] = useState(getVaultCountdown());
  const [creditsPurchaseVisible, setCreditsPurchaseVisible] = useState(false);
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
      headerLeft: () => null,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            hitSlop={12}
            onPress={() => {
              console.log('🔧 VaultScreen: Shop icon pressed, navigating to VaultStore');
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
  }, [nav]);

  const getFilteredItems = (): VaultItem[] => {
    const items = state.vaultItems.filter(item => item.isActive);

    switch (selectedTab) {
      case 'variations':
      case 'playbooks':
      case 'bars':
      case 'seasonal':
      case 'keys':
        return []; // New vault content categories (handled by category display)
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
    { key: 'variations', label: 'Variations' },
    { key: 'playbooks', label: 'Playbooks' },
    { key: 'bars', label: 'Bar Features' },
    { key: 'seasonal', label: 'Seasonal' },
    { key: 'keys', label: 'Keys' },
    { key: 'common', label: 'Common' },
    { key: 'limited', label: 'Limited' },
    { key: 'rare', label: 'Rare' },
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
          <Text style={styles.collectionTitle}>{currentVaultCycle.name}</Text>
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

  const renderCategoryCard = (category: VaultCategoryConfig) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => {
        // Navigate based on category
        if (category.id === 'VAULT_KEYS') {
          nav.navigate('VaultStore');
        } else {
          // Map category to the format expected by VaultCategory screen
          const categoryMap: Record<string, VaultCategory> = {
            'COCKTAIL_VARIATIONS': 'COCKTAIL_VARIATION',
            'TECHNIQUE_PLAYBOOKS': 'TECHNIQUE_PLAYBOOK',
            'BAR_FEATURES': 'BAR_FEATURE',
            'SEASONAL_DROPS': 'SEASONAL_DROP',
          };
          nav.navigate('VaultCategory', { category: categoryMap[category.id] as VaultCategory });
        }
      }}
    >
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.subtext} />
    </TouchableOpacity>
  );

  const renderNewCategoryContent = () => {
    let categoriesToShow: VaultCategoryConfig[] = [];

    if (selectedTab === 'variations') {
      categoriesToShow = [vaultCategories.find(c => c.id === 'COCKTAIL_VARIATIONS')!];
    } else if (selectedTab === 'playbooks') {
      categoriesToShow = [vaultCategories.find(c => c.id === 'TECHNIQUE_PLAYBOOKS')!];
    } else if (selectedTab === 'bars') {
      categoriesToShow = [vaultCategories.find(c => c.id === 'BAR_FEATURES')!];
    } else if (selectedTab === 'seasonal') {
      categoriesToShow = [vaultCategories.find(c => c.id === 'SEASONAL_DROPS')!];
    } else if (selectedTab === 'keys') {
      categoriesToShow = [vaultCategories.find(c => c.id === 'VAULT_KEYS')!];
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        <View style={styles.categoriesContainer}>
          {categoriesToShow.map(renderCategoryCard)}
        </View>
      </ScrollView>
    );
  };

  const isNewCategory = ['variations', 'playbooks', 'bars', 'seasonal', 'keys'].includes(selectedTab);

  return (
    <View style={styles.container}>
      {isNewCategory ? (
        renderNewCategoryContent()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderVaultItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={1}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(1),
    gap: spacing(1),
  },
  
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  
  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
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

  // Category Cards
  categoriesContainer: {
    padding: spacing(2),
    gap: spacing(2),
  },

  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },

  categoryContent: {
    flex: 1,
    gap: spacing(0.5),
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  categorySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  categoryDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    marginTop: spacing(0.5),
  },
});