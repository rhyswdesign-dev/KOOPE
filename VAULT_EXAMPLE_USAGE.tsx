/**
 * VAULT & XP ECOSYSTEM - EXAMPLE USAGE
 *
 * This file demonstrates how to integrate the Vault system into your existing app.
 * Copy these patterns into your actual components.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import the Vault system
import { useVaultState } from './src/state/vaultState';
import { VaultCategory } from './src/config/vaultTypes';
import { VaultItemCard } from './src/components/vault/VaultItemCard';
import { RootStackParamList } from './src/navigation/RootNavigator';

// ============================================================================
// EXAMPLE 1: Display XP Balance in Header
// ============================================================================

export function HeaderWithXP() {
  const { userState } = useVaultState();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>KOOPE</Text>
      <Pressable
        style={styles.xpBadge}
        onPress={() => navigation.navigate('Vault')}
      >
        <Text style={styles.xpText}>⚡ {userState.xp} XP</Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Navigate to Specific Vault Category
// ============================================================================

export function CategoryButtons() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const navigateToCategory = (category: VaultCategory) => {
    navigation.navigate('VaultCategory', { category });
  };

  return (
    <View style={styles.categoryButtons}>
      <Pressable
        style={styles.button}
        onPress={() => navigateToCategory('COCKTAIL_VARIATION')}
      >
        <Text>View Variations</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => navigateToCategory('TECHNIQUE_PLAYBOOK')}
      >
        <Text>View Playbooks</Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Display Single Vault Item
// ============================================================================

export function FeaturedVaultItem() {
  const {
    userState,
    allItems,
    isOwned,
    canUnlockWithXP,
    canUnlockWithKey,
    unlockWithXP,
    unlockWithKey,
  } = useVaultState();

  // Get a specific item (e.g., featured item)
  const featuredItem = allItems.find((item) => item.id === 'smoked_old_fashioned');

  if (!featuredItem) return null;

  const handleUnlockXP = () => {
    const result = unlockWithXP(featuredItem.id);
    if (result.success) {
      console.log('Unlocked with XP!');
    }
  };

  const handleUnlockKey = () => {
    const result = unlockWithKey(featuredItem.id);
    if (result.success) {
      console.log('Unlocked with Key!');
    }
  };

  return (
    <VaultItemCard
      item={featuredItem}
      userState={userState}
      isOwned={isOwned(featuredItem.id)}
      canUnlockWithXP={canUnlockWithXP(featuredItem)}
      canUnlockWithKey={canUnlockWithKey(featuredItem)}
      onUnlockWithXP={handleUnlockXP}
      onUnlockWithKey={handleUnlockKey}
    />
  );
}

// ============================================================================
// EXAMPLE 4: Check User's Unlock Eligibility
// ============================================================================

export function UnlockStatusChecker() {
  const { userState, allItems, canUnlockWithXP } = useVaultState();

  // Find items user can unlock right now
  const unlockableItems = allItems.filter((item) => canUnlockWithXP(item));

  return (
    <View>
      <Text>You can unlock {unlockableItems.length} items with your XP!</Text>
      {unlockableItems.map((item) => (
        <Text key={item.id}>
          • {item.title} ({item.xpCost} XP)
        </Text>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: Filter Items by Category
// ============================================================================

export function TechniquePlaybookList() {
  const { getItemsByCategory, userState, isOwned } = useVaultState();

  // Get all technique playbooks
  const playbooks = getItemsByCategory('TECHNIQUE_PLAYBOOK');

  return (
    <View>
      <Text style={styles.sectionTitle}>Technique Playbooks</Text>
      {playbooks.map((playbook) => (
        <View key={playbook.id} style={styles.playbookItem}>
          <Text style={styles.playbookTitle}>{playbook.title}</Text>
          {isOwned(playbook.id) ? (
            <Text style={styles.ownedBadge}>✓ Unlocked</Text>
          ) : (
            <Text style={styles.lockedBadge}>🔒 {playbook.xpCost} XP</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 6: Award XP After Completing a Lesson
// ============================================================================

export function LessonCompleteHandler() {
  const { userState } = useVaultState();

  const handleLessonComplete = (xpEarned: number) => {
    // TODO: In production, this would call your backend to award XP
    console.log(`Earned ${xpEarned} XP!`);
    console.log(`New total: ${userState.xp + xpEarned} XP`);

    // Example backend call:
    // await fetch('/api/user/award-xp', {
    //   method: 'POST',
    //   body: JSON.stringify({ xpEarned }),
    // });
  };

  return (
    <Pressable onPress={() => handleLessonComplete(100)}>
      <Text>Complete Lesson (+100 XP)</Text>
    </Pressable>
  );
}

// ============================================================================
// EXAMPLE 7: Display Vault Keys with Purchase Option
// ============================================================================

export function VaultKeysWidget() {
  const { userState, getItemsByCategory } = useVaultState();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBuyKeys = () => {
    // Navigate to key bundles category
    navigation.navigate('VaultCategory', { category: 'VAULT_KEY_BUNDLE' });
  };

  return (
    <View style={styles.keysWidget}>
      <Text style={styles.keysCount}>🔑 {userState.vaultKeys} Vault Keys</Text>
      <Pressable style={styles.buyButton} onPress={handleBuyKeys}>
        <Text>Buy More Keys</Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
// EXAMPLE 8: Check Tier Requirements
// ============================================================================

export function TierGate() {
  const { userState } = useVaultState();

  const canAccessProContent = userState.tier === 'PRO';
  const canAccessPlusContent = userState.tier === 'PLUS' || userState.tier === 'PRO';

  return (
    <View>
      <Text>Your tier: {userState.tier}</Text>
      {canAccessProContent && <Text>✓ PRO content unlocked</Text>}
      {canAccessPlusContent && <Text>✓ PLUS content unlocked</Text>}
      {!canAccessProContent && (
        <Text>Upgrade to PRO to access advanced content</Text>
      )}
    </View>
  );
}

// ============================================================================
// EXAMPLE 9: Seasonal/Limited-Time Items
// ============================================================================

export function SeasonalDropBanner() {
  const { availableItems } = useVaultState();

  // Find seasonal items
  const seasonalItems = availableItems.filter(
    (item) => item.isLimitedTime && item.category === 'SEASONAL_DROP'
  );

  if (seasonalItems.length === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>⏳ Limited Time!</Text>
      {seasonalItems.map((item) => (
        <Text key={item.id}>{item.title}</Text>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 10: Integration with Existing User System
// ============================================================================

/*
If you have an existing user system, you'll want to sync the Vault state with it:

import { useUser } from './src/store/useUser'; // Your existing user hook

export function SyncVaultWithUser() {
  const { user } = useUser(); // Your existing user data
  const vaultState = useVaultState();

  // On component mount, sync the vault state with your user data
  useEffect(() => {
    // Option 1: Initialize from your existing user object
    const syncedState = {
      userId: user.id,
      tier: user.subscriptionTier, // Map your tier system
      xp: user.experience || 0,
      vaultKeys: user.vaultKeys || 0,
      ownedItemIds: user.unlockedVaultItems || [],
    };

    // TODO: Set this in the vault state
    // This would require modifying useVaultState to accept initial state

    // Option 2: Fetch from backend
    // const vaultData = await fetchUserVaultData(user.id);
    // setVaultState(vaultData);
  }, [user]);

  return null;
}
*/

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  xpBadge: {
    backgroundColor: '#D68A38',
    padding: 8,
    borderRadius: 16,
  },
  xpText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  button: {
    backgroundColor: '#2B1F17',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playbookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#2B1F17',
    borderRadius: 8,
  },
  playbookTitle: {
    fontSize: 16,
  },
  ownedBadge: {
    color: '#4CAF50',
  },
  lockedBadge: {
    color: '#C7B8A5',
  },
  keysWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  keysCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buyButton: {
    backgroundColor: '#D68A38',
    padding: 8,
    borderRadius: 8,
  },
  banner: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
