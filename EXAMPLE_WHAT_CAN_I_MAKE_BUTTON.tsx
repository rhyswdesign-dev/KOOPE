/**
 * EXAMPLE: How to add a "What Can I Make?" button to any screen
 *
 * Copy this code into any screen where you want to add the button
 * (e.g., RecipesScreen, HomeScreen, or as a tab in your navigation)
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from './src/theme/tokens';
import type { RootStackParamList } from './src/navigation/RootNavigator';

// EXAMPLE 1: Simple Button
export function WhatCanIMakeButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.simpleButton}
      onPress={() => navigation.navigate('WhatCanIMake')}
    >
      <Ionicons name="search" size={20} color={colors.white} />
      <Text style={styles.simpleButtonText}>What Can I Make?</Text>
    </TouchableOpacity>
  );
}

// EXAMPLE 2: Prominent Hero Card (recommended for top of RecipesScreen)
export function WhatCanIMakeHeroCard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={() => navigation.navigate('WhatCanIMake')}
      activeOpacity={0.8}
    >
      <View style={styles.heroIcon}>
        <Ionicons name="wine" size={32} color={colors.gold} />
      </View>

      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>What Can I Make?</Text>
        <Text style={styles.heroSubtitle}>
          Discover cocktails you can make with your ingredients
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={24} color={colors.accent} />
    </TouchableOpacity>
  );
}

// EXAMPLE 3: Floating Action Button (shows over content)
export function WhatCanIMakeFAB() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('WhatCanIMake')}
    >
      <Ionicons name="search" size={24} color={colors.white} />
    </TouchableOpacity>
  );
}

// EXAMPLE 4: Quick Action Card with Stats (shows how many you can make)
export function WhatCanIMakeQuickAction({ canMakeCount = 0 }: { canMakeCount?: number }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => navigation.navigate('WhatCanIMake')}
    >
      <View style={styles.quickActionHeader}>
        <Ionicons name="wine-outline" size={24} color={colors.gold} />
        <Text style={styles.quickActionTitle}>What Can I Make?</Text>
      </View>

      {canMakeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{canMakeCount} cocktails</Text>
        </View>
      )}

      <Text style={styles.quickActionDescription}>
        Find cocktails based on your inventory
      </Text>
    </TouchableOpacity>
  );
}

// ============================================
// HOW TO USE IN YOUR SCREENS
// ============================================

/*

1. IN RECIPES SCREEN (add at top of content):

   import { WhatCanIMakeHeroCard } from './EXAMPLE_WHAT_CAN_I_MAKE_BUTTON';

   // Inside your render/return:
   <ScrollView>
     <WhatCanIMakeHeroCard />
     {/* rest of your content *\/}
   </ScrollView>


2. AS A FLOATING ACTION BUTTON:

   import { WhatCanIMakeFAB } from './EXAMPLE_WHAT_CAN_I_MAKE_BUTTON';

   // Inside your render/return:
   <View style={{ flex: 1 }}>
     {/* your screen content *\/}
     <WhatCanIMakeFAB />
   </View>


3. IN A QUICK ACTIONS SECTION:

   import { WhatCanIMakeQuickAction } from './EXAMPLE_WHAT_CAN_I_MAKE_BUTTON';

   // Inside your render/return:
   <View style={styles.quickActionsGrid}>
     <WhatCanIMakeQuickAction canMakeCount={12} />
     {/* other quick action cards *\/}
   </View>

*/

const styles = StyleSheet.create({
  // Simple Button
  simpleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  simpleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // Hero Card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(3),
    marginHorizontal: spacing(3),
    marginVertical: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: spacing(3),
    right: spacing(3),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Quick Action Card
  quickAction: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 120,
  },
  quickActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    marginBottom: spacing(1),
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
  quickActionDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
});
