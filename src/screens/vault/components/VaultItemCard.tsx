/**
 * VAULT ITEM CARD
 * Shows XP pricing, stock counters, and rarity indicators
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii } from '../../../theme/tokens';
import { VaultItem, UserVaultProfile } from '../../../types/vault';
import { canUserUnlockItem } from '../../../data/vaultData';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { log } from '../../../lib/logger';

interface VaultItemCardProps {
  item: VaultItem;
  userProfile: UserVaultProfile;
  onPress: () => void;
}

export default function VaultItemCard({ item, userProfile, onPress }: VaultItemCardProps) {
  const navigation = useNavigation();
  const { isPro, isPrestige } = useSubscription();
  const { canUnlock, reason } = canUserUnlockItem(item, userProfile);

  // Check subscription requirements
  const requiresProAccess = item.requiresPro && !isPro && !isPrestige;
  const requiresPrestigeAccess = item.requiresPrestige && !isPrestige;
  const isSubscriptionLocked = requiresProAccess || requiresPrestigeAccess;

  const handleCardPress = () => {
    if (isSubscriptionLocked) {
      log.info('VaultItemCard', 'Subscription required - redirecting to Paywall', { itemId: item.id, requiresPro: requiresProAccess, requiresPrestige: requiresPrestigeAccess });
      navigation.navigate('Paywall' as never);
      return;
    }
    onPress();
  };

  const getRarityColor = (rarity: VaultItem['rarity']): string => {
    switch (rarity) {
      case 'common': return colors.subtext;
      case 'limited': return colors.accent;
      case 'rare': return colors.gold;
      case 'prestige': return colors.rarityPrestige;
      case 'mystery': return colors.rarityMystery;
      default: return colors.subtext;
    }
  };

  const getRarityIcon = (rarity: VaultItem['rarity']): string => {
    switch (rarity) {
      case 'common': return 'diamond-outline';
      case 'limited': return 'diamond';
      case 'rare': return 'star';
      case 'prestige': return 'trophy';
      case 'mystery': return 'lock-open';
      default: return 'diamond-outline';
    }
  };

  const getStockPercentage = (): number => {
    return (item.currentStock / item.totalStock) * 100;
  };

  const getStockColor = (): string => {
    const percentage = getStockPercentage();
    if (percentage <= 10) return colors.error;
    if (percentage <= 30) return '#FFA726';
    return colors.accent;
  };

  const isLowStock = getStockPercentage() <= 20;
  const isSoldOut = item.currentStock <= 0;
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        !canUnlock && styles.lockedCard,
        isSoldOut && styles.soldOutCard,
        isSubscriptionLocked && styles.subscriptionLockedCard
      ]}
      onPress={handleCardPress}
      activeOpacity={0.8}
      disabled={isSoldOut}
    >
      {/* Item Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        
        {/* Rarity Badge */}
        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
          <Ionicons 
            name={getRarityIcon(item.rarity) as any} 
            size={12} 
            color={colors.white} 
          />
          <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
        </View>
        
        {/* Partner Chip */}
        {(item as any).partner && !isSubscriptionLocked && (
          <View style={styles.partnerChip}>
            <Text style={styles.partnerText}>{(item as any).partner}</Text>
          </View>
        )}

        {/* Subscription Required Badge */}
        {isSubscriptionLocked && (
          <View style={styles.subscriptionBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.subscriptionBadgeText}>
              {requiresPrestigeAccess ? 'PRESTIGE ONLY' : 'PRO ONLY'}
            </Text>
          </View>
        )}

        {/* Stock Counter Bar */}
        <View style={styles.stockContainer}>
          <View style={styles.stockBar}>
            <View 
              style={[
                styles.stockFill, 
                { 
                  width: `${Math.max(0, getStockPercentage())}%`,
                  backgroundColor: getStockColor() 
                }
              ]} 
            />
          </View>
          <Text style={styles.stockText}>
            {isSoldOut ? 'SOLD OUT' : `${item.currentStock} left`}
          </Text>
        </View>
        
        {/* Lock Overlay for insufficient resources */}
        {!canUnlock && !isSoldOut && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={24} color={colors.white} />
          </View>
        )}
        
        {/* Sold Out Overlay */}
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
        
        {/* Low Stock Warning */}
        {isLowStock && !isSoldOut && (
          <View style={styles.lowStockWarning}>
            <Ionicons name="warning" size={12} color={colors.white} />
            <Text style={styles.lowStockText}>LOW STOCK</Text>
          </View>
        )}
      </View>
      
      {/* Item Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.estimatedValue && (
          <Text style={styles.estimatedValue}>{item.estimatedValue}</Text>
        )}
        
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        {/* XP Pricing */}
        <View style={styles.pricingContainer}>
          <View style={styles.costRow}>
            {/* XP Cost */}
            <View style={styles.costItem}>
              <MaterialCommunityIcons name="star" size={16} color={colors.gold} />
              <Text style={[
                styles.costText,
                userProfile.xpBalance < item.xpCost && styles.insufficientText
              ]}>
                {item.xpCost.toLocaleString()} XP
              </Text>
            </View>
          </View>
          
          {/* XP-as-Discount Option */}
          {item.discountOption && (
            <View style={styles.discountOption}>
              <Text style={styles.discountLabel}>OR</Text>
              <View style={styles.discountRow}>
                <MaterialCommunityIcons name="star" size={14} color={colors.gold} />
                <Text style={styles.discountXP}>
                  {item.discountOption.reducedXP.toLocaleString()} XP
                </Text>
                <Text style={styles.plus}>+</Text>
                <Text style={styles.discountPrice}>
                  ${item.discountOption.cashPrice.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* State-Aware Action Buttons */}
        <View style={styles.actionContainer}>
          {isSoldOut ? (
            <View style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Sold Out</Text>
            </View>
          ) : isSubscriptionLocked ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.upgradeButton]}
              onPress={handleCardPress}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={16} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                {requiresPrestigeAccess ? 'Upgrade to Prestige' : 'Upgrade to Pro'}
              </Text>
            </TouchableOpacity>
          ) : canUnlock ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.unlockButton]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-open" size={16} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Unlock
              </Text>
            </TouchableOpacity>
          ) : userProfile.xpBalance < item.xpCost && !(item as any).discountOption ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.earnXpButton]}
              onPress={() => {/* Navigate to Earn XP */}}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={16} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Earn XP
              </Text>
            </TouchableOpacity>
          ) : (item as any).discountOption && userProfile.xpBalance < item.xpCost ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.discountButton]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Ionicons name="card" size={16} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>
                Use XP Discount
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>{reason}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: spacing(2),
  },
  lockedCard: {
    opacity: 0.7,
  },
  soldOutCard: {
    opacity: 0.5,
  },
  subscriptionLockedCard: {
    bordercolor: colors.accent,
    borderWidth: 2,
  },
  
  // Image Section
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
  },
  rarityBadge: {
    position: 'absolute',
    top: spacing(1),
    left: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.5),
    zIndex: 5,
  },
  rarityText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  partnerChip: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    zIndex: 5,
  },
  partnerText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.5),
    zIndex: 5,
  },
  subscriptionBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  stockContainer: {
    position: 'absolute',
    bottom: spacing(1),
    left: spacing(1),
    right: spacing(1),
    zIndex: 3,
  },
  stockBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: spacing(0.5),
  },
  stockFill: {
    height: 4,
    borderRadius: 2,
  },
  stockText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  soldOutText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  lowStockWarning: {
    position: 'absolute',
    bottom: spacing(4), // Move above stock container
    left: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.5),
    zIndex: 10, // Ensure it appears above other elements
  },
  lowStockText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  
  // Item Info
  itemInfo: {
    padding: spacing(2.5),
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.5),
    lineHeight: 22,
  },
  estimatedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    marginBottom: spacing(1),
  },
  itemDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
    marginBottom: spacing(2),
  },
  
  // Pricing
  pricingContainer: {
    marginBottom: spacing(2),
  },
  costRow: {
    flexDirection: 'row',
    gap: spacing(3),
    marginBottom: spacing(1.5),
  },
  costItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  costText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  insufficientText: {
    color: colors.error,
  },
  
  // Discount Option
  discountOption: {
    alignItems: 'center',
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  discountLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '700',
    marginBottom: spacing(0.5),
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  discountXP: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  plus: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '700',
  },
  discountPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  
  // State-Aware Actions  
  actionContainer: {
    alignItems: 'center',
    marginTop: spacing(2),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    gap: spacing(0.75),
    minWidth: '100%',
  },
  unlockButton: {
    backgroundColor: colors.gold,
  },
  earnXpButton: {
    backgroundColor: colors.gold,
  },
  discountButton: {
    backgroundColor: '#9C27B0',
  },
  upgradeButton: {
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});