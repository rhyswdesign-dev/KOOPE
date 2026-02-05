/**
 * Vault Tab View - Simplified for Lessons Screen Integration
 * XP-based premium content unlocks
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useXPSystem } from '../store/useXPSystem';
import { useVault } from '../contexts/VaultContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function VaultTabView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { balance: xpBalance } = useXPSystem();
  const { state } = useVault();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'recipes', label: 'Recipes', icon: 'restaurant-outline' },
    { id: 'techniques', label: 'Techniques', icon: 'construct-outline' },
    { id: 'bars', label: 'Bars', icon: 'business-outline' },
  ];

  const vaultItems = [
    {
      id: '1',
      title: 'Classic Negroni',
      category: 'recipes',
      xpCost: 150,
      description: 'Perfect balance of bitter and sweet',
      icon: 'wine',
      unlocked: state.unlockedItemIds?.includes('1') || false,
    },
    {
      id: '2',
      title: 'Advanced Shaking',
      category: 'techniques',
      xpCost: 200,
      description: 'Master the art of proper dilution',
      icon: 'flask',
      unlocked: state.unlockedItemIds?.includes('2') || false,
    },
    {
      id: '3',
      title: 'Speakeasy Guide',
      category: 'bars',
      xpCost: 100,
      description: 'Exclusive bar recommendations',
      icon: 'location',
      unlocked: state.unlockedItemIds?.includes('3') || false,
    },
  ];

  const filteredItems = selectedCategory === 'all'
    ? vaultItems
    : vaultItems.filter(item => item.category === selectedCategory);

  const handleUnlock = (item: typeof vaultItems[0]) => {
    if (item.unlocked) {
      Alert.alert('Already Unlocked', `You already own ${item.title}`);
      return;
    }

    if (xpBalance < item.xpCost) {
      Alert.alert(
        'Not Enough XP',
        `You need ${item.xpCost} XP to unlock this. You have ${xpBalance} XP.\n\nComplete more lessons to earn XP!`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      `Unlock ${item.title}?`,
      `This will cost ${item.xpCost} XP. You'll have ${xpBalance - item.xpCost} XP remaining.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () => {
            // TODO: Implement actual unlock logic with useVault dispatch
            Alert.alert('Success!', `${item.title} has been unlocked!`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* XP Balance Header */}
      <View style={styles.xpHeader}>
        <View style={styles.xpBadge}>
          <Ionicons name="diamond" size={24} color={colors.gold} />
          <View style={styles.xpTextContainer}>
            <Text style={styles.xpLabel}>Your XP</Text>
            <Text style={styles.xpBalance}>{xpBalance}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Alert.alert('Vault Info', 'Unlock premium content using XP earned from lessons!')}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.id ? colors.goldText : colors.text}
            />
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === category.id && styles.categoryLabelActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vault Items Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemCard, item.unlocked && styles.itemCardUnlocked]}
            onPress={() => handleUnlock(item)}
          >
            <View style={styles.itemIcon}>
              <Ionicons
                name={item.icon as any}
                size={32}
                color={item.unlocked ? colors.gold : colors.subtext}
              />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>

              <View style={styles.itemFooter}>
                {item.unlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                    <Text style={styles.unlockedText}>Unlocked</Text>
                  </View>
                ) : (
                  <View style={styles.xpCost}>
                    <Ionicons name="diamond" size={16} color={colors.accent} />
                    <Text style={styles.xpCostText}>{item.xpCost} XP</Text>
                  </View>
                )}
              </View>
            </View>

            {!item.unlocked && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={24} color={colors.gold} />
              </View>
            )}
          </TouchableOpacity>
        ))}

        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={colors.accent} />
          <Text style={styles.tipText}>
            Complete lessons to earn XP and unlock premium recipes, techniques, and guides!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    paddingBottom: spacing(2),
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.gold}20`,
    borderRadius: radii.md,
    padding: spacing(2),
    gap: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
  },
  xpTextContainer: {
    gap: spacing(0.25),
  },
  xpLabel: {
    fontSize: 12,
    color: colors.subtext,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  xpBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gold,
  },
  infoButton: {
    padding: spacing(1),
  },
  categoriesContainer: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    gap: spacing(1.5),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    gap: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.goldText,
  },
  scrollContent: {
    padding: spacing(3),
    gap: spacing(2),
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
    overflow: 'hidden',
  },
  itemCardUnlocked: {
    borderColor: `${colors.gold}40`,
  },
  itemIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: `${colors.gold}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  itemContent: {
    flex: 1,
    gap: spacing(0.5),
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  itemFooter: {
    marginTop: spacing(1),
  },
  xpCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  xpCostText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  lockOverlay: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    backgroundColor: `${colors.bg}E6`,
    borderRadius: radii.sm,
    padding: spacing(1),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(6),
    gap: spacing(2),
  },
  emptyText: {
    fontSize: 16,
    color: colors.subtext,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.md,
    padding: spacing(2),
    gap: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    marginTop: spacing(2),
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
});
