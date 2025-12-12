/**
 * VAULT CATEGORY SCREEN
 *
 * Generic screen for displaying items in a specific Vault category.
 * Shows filterable list of items with unlock capabilities.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../../theme/tokens';
import { useVaultState } from '../../state/vaultState';
import { VaultItemCard } from '../../components/vault/VaultItemCard';
import { VaultCategory, VaultItem } from '../../config/vaultTypes';
import { vaultCategoryMetadata } from '../../config/vaultData';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'VaultCategory'>;

export default function VaultCategoryScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const {
    userState,
    getItemsByCategory,
    isOwned,
    canUnlockWithXP,
    canUnlockWithKey,
    unlockWithXP,
    unlockWithKey,
  } = useVaultState();

  const [showOwned, setShowOwned] = useState(true);
  const [showLocked, setShowLocked] = useState(true);

  // Get category metadata
  const categoryMeta = vaultCategoryMetadata.find((c) => c.category === category);

  // Get items for this category
  const categoryItems = getItemsByCategory(category);

  // Filter items based on user preferences
  const filteredItems = categoryItems.filter((item) => {
    const owned = isOwned(item.id);
    if (owned && !showOwned) return false;
    if (!owned && !showLocked) return false;
    return true;
  });

  // Handle unlock with XP
  const handleUnlockWithXP = (item: VaultItem) => {
    Alert.alert(
      'Unlock with XP?',
      `Unlock "${item.title}" for ${item.xpCost} XP?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: () => {
            const result = unlockWithXP(item.id);
            if (result.success) {
              Alert.alert('Unlocked!', `You unlocked "${item.title}"`);
            } else {
              Alert.alert('Error', 'Failed to unlock item. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle unlock with Key
  const handleUnlockWithKey = (item: VaultItem) => {
    Alert.alert(
      'Use Vault Key?',
      `Use 1 Vault Key to unlock "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Key',
          onPress: () => {
            const result = unlockWithKey(item.id);
            if (result.success) {
              Alert.alert('Unlocked!', `You unlocked "${item.title}" with a Vault Key`);
            } else {
              Alert.alert('Error', 'Failed to unlock item. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={colors.subtext} />
      <Text style={styles.emptyText}>No items found</Text>
      <Text style={styles.emptySubtext}>
        {!showOwned && !showLocked
          ? 'Adjust your filters to see items'
          : 'Check back later for new content'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerIcon}>{categoryMeta?.icon}</Text>
          <Text style={styles.headerTitle}>{categoryMeta?.displayName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Balance Bar */}
      <View style={styles.balanceBar}>
        <View style={styles.balanceItem}>
          <Ionicons name="flash" size={16} color={colors.accent} />
          <Text style={styles.balanceText}>{userState.xp} XP</Text>
        </View>
        <View style={styles.balanceItem}>
          <Ionicons name="key" size={16} color={colors.accent} />
          <Text style={styles.balanceText}>{userState.vaultKeys} Keys</Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Show:</Text>
        <Pressable
          style={[styles.filterChip, showOwned && styles.filterChipActive]}
          onPress={() => setShowOwned(!showOwned)}
        >
          <Text style={[styles.filterText, showOwned && styles.filterTextActive]}>
            Unlocked
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, showLocked && styles.filterChipActive]}
          onPress={() => setShowLocked(!showLocked)}
        >
          <Text style={[styles.filterText, showLocked && styles.filterTextActive]}>
            Locked
          </Text>
        </Pressable>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VaultItemCard
            item={item}
            userState={userState}
            isOwned={isOwned(item.id)}
            canUnlockWithXP={canUnlockWithXP(item)}
            canUnlockWithKey={canUnlockWithKey(item)}
            onUnlockWithXP={() => handleUnlockWithXP(item)}
            onUnlockWithKey={() => handleUnlockWithKey(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmpty()}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(3),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  balanceText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.text,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(1),
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterLabel: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginRight: spacing(0.5),
  },
  filterChip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.subtext,
  },
  filterTextActive: {
    color: colors.accent,
  },
  listContainer: {
    padding: spacing(2),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
  },
  emptyText: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
  },
  emptySubtext: {
    fontSize: fonts.body,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
  },
});
