/**
 * VAULT EARN XP SCREEN
 * Clean, modern design following app's current patterns
 */

import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { useVault } from '../../contexts/VaultContext';

interface XPAction {
  id: string;
  title: string;
  description: string;
  expectedXP: number;
  icon: string;
  iconFamily: 'ionicons' | 'material';
  color: string;
  estimatedTime: string;
  navigationTarget?: keyof RootStackParamList;
}

export default function VaultEarnXPScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state } = useVault();
  
  const xpActions: XPAction[] = [
    {
      id: 'lesson',
      title: 'Complete a Lesson',
      description: 'Learn cocktail techniques and recipes',
      expectedXP: 50,
      icon: 'school',
      iconFamily: 'ionicons',
      color: colors.accent,
      estimatedTime: '5-10 min',
      navigationTarget: 'Main',
    },
    {
      id: 'daily_streak',
      title: 'Daily Login Streak',
      description: 'Keep your learning streak alive',
      expectedXP: 100,
      icon: 'calendar',
      iconFamily: 'ionicons',
      color: colors.error,
      estimatedTime: 'Daily',
    },
    {
      id: 'brand_video',
      title: 'Watch Brand Video',
      description: 'Learn from premium spirits brands',
      expectedXP: 50,
      icon: 'play-circle',
      iconFamily: 'ionicons',
      color: '#9C27B0',
      estimatedTime: '3-5 min',
      navigationTarget: 'Recipes',
    },
    {
      id: 'small_challenge',
      title: 'Complete Small Challenge',
      description: 'Quick skill challenges and competitions',
      expectedXP: 250,
      icon: 'trophy',
      iconFamily: 'ionicons',
      color: colors.gold,
      estimatedTime: '10-15 min',
      navigationTarget: 'Events',
    },
    {
      id: 'win_event',
      title: 'Win Competition Event',
      description: 'Participate in major competitions',
      expectedXP: 1000,
      icon: 'medal',
      iconFamily: 'ionicons',
      color: '#4CAF50',
      estimatedTime: '30-60 min',
      navigationTarget: 'Events',
    },
  ];
  
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Earn XP',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handleActionPress = (action: XPAction) => {
    if (action.navigationTarget) {
      nav.navigate(action.navigationTarget);
    }
  };

  const getMultipliedXP = (baseXP: number): number => {
    if (state.userProfile.activeBooster?.type === 'xp_multiplier') {
      const multiplier = state.userProfile.activeBooster.multiplier || 1;
      return Math.floor(baseXP * multiplier);
    }
    return baseXP;
  };

  const hasActiveBooster = state.userProfile.activeBooster?.type === 'xp_multiplier';
  const boosterMultiplier = state.userProfile.activeBooster?.multiplier || 1;

  const renderXPAction = ({ item }: { item: XPAction }) => {
    const finalXP = getMultipliedXP(item.expectedXP);
    const showBooster = hasActiveBooster && finalXP > item.expectedXP;
    
    return (
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => handleActionPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.actionIcon, { backgroundColor: item.color }]}>
          {item.iconFamily === 'ionicons' ? (
            <Ionicons name={item.icon as any} size={20} color={colors.white} />
          ) : (
            <MaterialCommunityIcons name={item.icon as any} size={20} color={colors.white} />
          )}
        </View>
        
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <Text style={styles.actionDescription}>{item.description}</Text>
          <Text style={styles.actionTime}>{item.estimatedTime}</Text>
        </View>
        
        <View style={styles.xpReward}>
          {showBooster && (
            <Text style={styles.originalXP}>
              {item.expectedXP} XP
            </Text>
          )}
          <Text style={[styles.rewardXP, showBooster && styles.boostedXP]}>
            +{finalXP}
          </Text>
          {showBooster && (
            <MaterialCommunityIcons name="flash" size={12} color={colors.gold} />
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Current XP Header */}
      <View style={styles.xpHeader}>
        <View style={styles.xpCard}>
          <MaterialCommunityIcons name="star" size={24} color={colors.gold} />
          <View style={styles.xpInfo}>
            <Text style={styles.currentXpValue}>
              {state.userProfile.xpBalance.toLocaleString()}
            </Text>
            <Text style={styles.currentXpLabel}>Current XP</Text>
          </View>
        </View>
        
        {hasActiveBooster && (
          <View style={styles.boosterCard}>
            <MaterialCommunityIcons name="flash" size={16} color={colors.white} />
            <Text style={styles.boosterText}>
              {boosterMultiplier}x Active
            </Text>
          </View>
        )}
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>Ways to Earn XP</Text>
    </View>
  );

  const renderFooter = () => (
    <View>
      {/* Get XP Boosters Upsell */}
      {!hasActiveBooster && (
        <TouchableOpacity 
          style={styles.boosterUpsell}
          onPress={() => nav.navigate('Vault')}
        >
          <View style={styles.upsellIcon}>
            <MaterialCommunityIcons name="flash" size={20} color={colors.gold} />
          </View>
          <View style={styles.upsellContent}>
            <Text style={styles.upsellTitle}>Get XP Boosters</Text>
            <Text style={styles.upsellDescription}>
              Multiply your XP earnings with boosters
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
      )}
      
      <View style={styles.bottomSpacer} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={xpActions}
        renderItem={renderXPAction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  },
  
  // XP Header
  xpHeader: {
    backgroundColor: colors.card,
    padding: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  
  xpCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    gap: spacing(1.5),
  },
  
  xpInfo: {
    flex: 1,
  },
  
  currentXpValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  
  currentXpLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  boosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    gap: spacing(0.5),
  },
  
  boosterText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginHorizontal: spacing(2),
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  
  // Action Cards
  actionCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    gap: spacing(2),
  },
  
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  actionContent: {
    flex: 1,
  },
  
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  
  actionDescription: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.25),
  },
  
  actionTime: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '600',
  },
  
  xpReward: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  
  originalXP: {
    fontSize: 10,
    color: colors.subtext,
    textDecorationLine: 'line-through',
  },
  
  rewardXP: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gold,
  },
  
  boostedXP: {
    color: colors.accent,
  },
  
  // Booster Upsell
  boosterUpsell: {
    backgroundColor: colors.card,
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    marginBottom: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    gap: spacing(2),
  },
  
  upsellIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  upsellContent: {
    flex: 1,
  },
  
  upsellTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  
  upsellDescription: {
    fontSize: 12,
    color: colors.subtext,
  },
  
  bottomSpacer: {
    height: spacing(4),
  },
});
