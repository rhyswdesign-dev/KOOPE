/**
 * VAULT STORE SCREEN - KEYS & BOOSTERS
 * Clean, modern design following app's current patterns
 */

import React, { useLayoutEffect, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { useVault } from '../../contexts/VaultContext';
import { MonetizationItem } from '../../types/vault';
import PillButton from '../../components/PillButton';
import { log } from '../../lib/logger';

export default function VaultStoreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { state, addToCart, getCartItemCount } = useVault();
  const hasProcessedInitialParams = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    // Check initial route params
    const params = route.params as any;
    log.info('VaultStoreScreen', 'Initial route params', { params });
    return params?.tab || 'hearts';
  });
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);

  useEffect(() => {
    // Only process initial navigation params once
    const params = route.params as any;
    log.info('VaultStoreScreen', 'Route params changed', { params });
    if (params?.tab && !hasProcessedInitialParams.current) {
      log.info('VaultStoreScreen', 'Setting category', { category: params.tab });
      setSelectedCategory(params.tab);
      hasProcessedInitialParams.current = true;
    }
  }, [route.params]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Keys & Boosters',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
      headerRight: () => (
        <Pressable 
          hitSlop={12} 
          onPress={() => nav.navigate('VaultCart')}
          style={styles.headerButton}
        >
          <Ionicons name="bag-outline" size={24} color={colors.text} />
          {getCartItemCount() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
            </View>
          )}
        </Pressable>
      ),
    });
  }, [nav, getCartItemCount()]);

  const getFilteredItems = (): MonetizationItem[] => {
    // For hearts category, show placeholder hearts items
    if (selectedCategory === 'hearts') {
      return [
        {
          id: 'heart-1',
          name: '1 Heart',
          description: 'Restore 1 heart to continue playing',
          type: 'hearts' as any,
          price: 99, // $0.99
          inStock: true,
          heartsGranted: 1
        },
        {
          id: 'heart-5',
          name: '5 Hearts',
          description: 'Restore 5 hearts with bonus value',
          type: 'hearts' as any,
          price: 399, // $3.99
          originalPrice: 495, // $4.95 (save $0.96)
          inStock: true,
          heartsGranted: 5
        },
        {
          id: 'heart-unlimited',
          name: 'Unlimited Hearts',
          description: '24 hours of unlimited hearts',
          type: 'hearts' as any,
          price: 799, // $7.99
          inStock: true,
          heartsGranted: 999
        }
      ];
    }

    // For AI credits category, show AI credit packages matching AICreditsPurchaseModal
    if (selectedCategory === 'ai_credits') {
      return [
        {
          id: 'starter',
          name: 'Starter Pack',
          description: 'Import ~16 recipes from TikTok, Instagram & more!',
          type: 'keys' as any,
          price: 299, // $2.99
          inStock: true,
          keysGranted: 50
        },
        {
          id: 'popular',
          name: 'Popular Pack',
          description: 'Import ~58 social recipes + scan bottles & get AI recommendations',
          type: 'keys' as any,
          price: 699, // $6.99
          inStock: true,
          keysGranted: 175, // 150 + 25 bonus
          originalPrice: 824 // Show savings
        },
        {
          id: 'power_user',
          name: 'Power User',
          description: 'Import ~166 recipes! Build your complete cocktail library',
          type: 'keys' as any,
          price: 1499, // $14.99
          inStock: true,
          keysGranted: 500, // 400 + 100 bonus
          originalPrice: 1999 // Show savings
        },
        {
          id: 'unlimited_monthly',
          name: 'Unlimited Monthly',
          description: 'Unlimited everything for 30 days',
          type: 'keys' as any,
          price: 1999, // $19.99
          inStock: true,
          keysGranted: 999999
        }
      ];
    }

    // For bar features category, show purchasable bar experiences
    if (selectedCategory === 'bar_features') {
      return [
        {
          id: 'untitled-champagne-lounge',
          name: 'Untitled Champagne Lounge',
          description: 'Experience NYC\'s premier champagne bar with exclusive recipes & insider tips',
          type: 'pass' as any,
          price: 499, // $4.99
          inStock: true,
          barFeature: {
            location: 'New York City',
            signatureCocktails: ['French 75', 'Champagne Cocktail', 'Kir Royale'],
            brief: 'Discover the art of champagne cocktails at one of NYC\'s most exclusive lounges',
            debrief: 'Learn the secrets behind crafting perfect champagne-based cocktails',
            atmosphere: 'Elegant & Sophisticated',
            priceRange: '$$$'
          }
        },
        {
          id: 'the-dead-rabbit',
          name: 'The Dead Rabbit',
          description: 'World\'s best bar - Irish pub meets cocktail excellence',
          type: 'pass' as any,
          price: 599, // $5.99
          inStock: true,
          popular: true,
          barFeature: {
            location: 'New York City',
            signatureCocktails: ['Irish Coffee', 'Whiskey Smash', 'Emerald Isle'],
            brief: 'Explore award-winning Irish-American cocktail culture',
            debrief: 'Master traditional Irish drinks with modern twists',
            atmosphere: 'Historic & Lively',
            priceRange: '$$'
          }
        },
        {
          id: 'attaboy',
          name: 'Attaboy',
          description: 'Secret speakeasy with legendary bartenders',
          type: 'pass' as any,
          price: 699, // $6.99
          inStock: true,
          barFeature: {
            location: 'New York City',
            signatureCocktails: ['Martinez', 'Old Fashioned', 'Boulevardier'],
            brief: 'Uncover speakeasy secrets from world-class mixologists',
            debrief: 'Learn classic cocktails from the masters',
            atmosphere: 'Intimate & Classic',
            priceRange: '$$$'
          }
        }
      ];
    }

    // For bundles category, show attractive bundle packages
    if (selectedCategory === 'bundles') {
      return [
        {
          id: 'starter-bundle',
          name: '🎁 Starter Bundle',
          description: 'Perfect start! Get hearts, AI credits & XP boost',
          type: 'pass' as any,
          price: 499, // $4.99 (normally $7.97 value)
          originalPrice: 797,
          inStock: true,
          bundleContents: '5 Hearts • 50 AI Credits • 2x XP (1hr)',
          keysGranted: 50, // Will show as AI Credits
          heartsGranted: 5,
          boosterEffect: {
            type: '2x_xp',
            multiplier: 2,
            duration: 3600,
            description: '2x XP for 1 hour'
          }
        },
        {
          id: 'mega-value-bundle',
          name: '💎 Mega Value Bundle',
          description: '⭐ BEST VALUE! Everything you need to level up fast',
          type: 'pass' as any,
          price: 1499, // $14.99 (normally $26.97 value - 44% OFF!)
          originalPrice: 2697,
          inStock: true,
          popular: true,
          bundleContents: '15 Hearts • 200 AI Credits • 3x XP (3hr) • Mystery Bonus',
          keysGranted: 200,
          heartsGranted: 15,
          boosterEffect: {
            type: '3x_xp',
            multiplier: 3,
            duration: 10800,
            description: '3x XP for 3 hours'
          }
        },
        {
          id: 'ultimate-bundle',
          name: '👑 Ultimate Master Bundle',
          description: 'Go unlimited! Everything you need to dominate',
          type: 'pass' as any,
          price: 2999, // $29.99 (normally $49.95 value - 40% OFF!)
          originalPrice: 4995,
          inStock: true,
          bundleContents: 'Unlimited Hearts (7 days) • 500 AI Credits • 5x XP (5hr) • Exclusive Badge',
          keysGranted: 500,
          heartsGranted: 999, // Unlimited
          boosterEffect: {
            type: '5x_xp',
            multiplier: 5,
            duration: 18000,
            description: '5x XP for 5 hours + Mystery Rewards'
          }
        },
        {
          id: 'weekend-special',
          name: '⚡ Weekend Warrior',
          description: '🔥 LIMITED TIME! Perfect for weekend grinding',
          type: 'pass' as any,
          price: 999, // $9.99 (normally $15.97 value)
          originalPrice: 1597,
          inStock: true,
          bundleContents: '10 Hearts • 100 AI Credits • 3x XP (2hr) • Weekend Badge',
          keysGranted: 100,
          heartsGranted: 10,
          boosterEffect: {
            type: '3x_xp',
            multiplier: 3,
            duration: 7200,
            description: '3x XP for 2 hours'
          }
        }
      ];
    }

    return state.monetizationItems.filter(item => {
      if (selectedCategory === 'boosters') return item.type === 'booster';
      if (selectedCategory === 'bundles') return item.type === 'pass';
      return true;
    });
  };

  const getItemIcon = (type: MonetizationItem['type'] | 'hearts', itemId?: string): string => {
    // Check if this is an AI credits item by ID
    if (itemId?.includes('starter') || itemId?.includes('popular') || itemId?.includes('power_user') || itemId?.includes('unlimited_monthly')) {
      return 'sparkles';
    }

    switch (type) {
      case 'keys': return 'key';
      case 'booster': return 'flash';
      case 'pass': return 'gift';
      case 'hearts': return 'heart';
      default: return 'cube';
    }
  };

  const getItemColor = (type: MonetizationItem['type'] | 'hearts'): string => {
    switch (type) {
      case 'keys': return colors.accent;
      case 'booster': return colors.gold;
      case 'pass': return '#9C27B0';
      case 'hearts': return '#FF6B6B';
      default: return colors.accent;
    }
  };

  const handleAddToCart = async (item: MonetizationItem) => {
    try {
      const success = await addToCart(item.id, 1);
      if (success) {
        Alert.alert('Added to Cart', `${item.name} has been added to your cart.`);
      } else {
        Alert.alert('Error', 'Failed to add item to cart. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const categories = [
    { key: 'hearts', label: 'Hearts' },
    { key: 'boosters', label: 'Boosters' },
    { key: 'ai_credits', label: 'AI Credits' },
    { key: 'bar_features', label: 'Bar Features' },
    { key: 'bundles', label: 'Bundles' },
  ];

  const renderStoreItem = ({ item }: { item: MonetizationItem }) => {
    const isBundle = item.id.includes('bundle');
    const savingsPercent = item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0;

    return (
      <View style={[styles.storeItemCard, (item as any).popular && styles.popularCard]}>
        {/* Item Header */}
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, { backgroundColor: getItemColor(item.type) }]}>
            {(item.id.includes('starter') || item.id.includes('popular') || item.id.includes('power_user') || item.id.includes('unlimited_monthly')) ? (
              <Ionicons
                name={getItemIcon(item.type, item.id) as any}
                size={20}
                color={colors.white}
              />
            ) : (
              <MaterialCommunityIcons
                name={getItemIcon(item.type) as any}
                size={20}
                color={colors.white}
              />
            )}
          </View>

          {item.originalPrice && item.originalPrice > item.price && (
            <View style={[styles.saveBadge, savingsPercent >= 40 && styles.megaSaveBadge]}>
              <Text style={styles.saveText}>
                {savingsPercent}% OFF
              </Text>
            </View>
          )}

          {(item as any).popular && (
            <View style={styles.bestValueBadge}>
              <Ionicons name="star" size={12} color={colors.white} />
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
          )}
        </View>

      {/* Item Content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>

        {/* Bundle Contents (if bundle) */}
        {(item as any).bundleContents && (
          <View style={styles.bundleContentsBox}>
            <Text style={styles.bundleContentsText}>{(item as any).bundleContents}</Text>
          </View>
        )}

        {/* What You Get */}
        <View style={styles.benefitsContainer}>
          {item.keysGranted && !isBundle && (
            <View style={styles.benefitRow}>
              {(item.id.includes('starter') || item.id.includes('popular') || item.id.includes('power_user') || item.id.includes('unlimited_monthly')) ? (
                <>
                  <Ionicons name="sparkles" size={14} color={colors.accent} />
                  <Text style={styles.benefitText}>
                    {item.keysGranted === 999999 ? 'Unlimited Credits' : `${item.keysGranted} AI Credits`}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                  <Text style={styles.benefitText}>
                    {item.keysGranted} Key{item.keysGranted !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </View>
          )}

          {(item as any).heartsGranted && !isBundle && (
            <View style={styles.benefitRow}>
              <Ionicons name="heart" size={14} color="#FF6B6B" />
              <Text style={styles.benefitText}>
                {(item as any).heartsGranted === 999 ? 'Unlimited Hearts' : `${(item as any).heartsGranted} Heart${(item as any).heartsGranted !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}

          {item.boosterEffect && !isBundle && (
            <View style={styles.benefitRow}>
              <MaterialCommunityIcons name="flash" size={14} color={colors.gold} />
              <Text style={styles.benefitText}>
                {item.boosterEffect.description}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Pricing & Purchase */}
      <View style={styles.purchaseSection}>
        <View style={styles.priceContainer}>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.originalPrice}>
              ${(item.originalPrice / 100).toFixed(2)}
            </Text>
          )}
          <Text style={[styles.currentPrice, (item as any).popular && styles.highlightedPrice]}>
            ${(item.price / 100).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (item as any).popular && styles.popularPurchaseButton,
            !item.inStock && styles.disabledButton
          ]}
          onPress={() => handleAddToCart(item)}
          disabled={!item.inStock}
          activeOpacity={0.8}
        >
          <Ionicons
            name={item.inStock ? (isBundle ? "gift" : "bag-add") : "close-circle"}
            size={16}
            color={colors.white}
          />
          <Text style={styles.purchaseButtonText}>
            {item.inStock ? (isBundle ? 'Get Bundle' : 'Add to Cart') : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

  const renderHeader = () => (
    <View>
      {/* Store Header */}
      <View style={styles.storeHeader}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeTitle}>Unlock Premium Content</Text>
            <Text style={styles.storeSubtitle}>
              Get Keys to unlock rare items and Boosters to accelerate your progress
            </Text>
          </View>
          {selectedCategory === 'ai_credits' && (
            <TouchableOpacity
              onPress={() => setShowAIInfoModal(true)}
              style={styles.infoButton}
              hitSlop={12}
            >
              <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category.key;
          return (
            <PillButton
              key={category.key}
              title={category.label}
              onPress={() => setSelectedCategory(category.key)}
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
      <Ionicons name="storefront-outline" size={80} color={colors.subtext} />
      <Text style={styles.emptyTitle}>No Items Available</Text>
      <Text style={styles.emptySubtitle}>
        Check back later for new Keys and Boosters
      </Text>
    </View>
  );

  const filteredItems = getFilteredItems();

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderStoreItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={1}
      />

      {/* AI Credits Info Modal */}
      <Modal
        visible={showAIInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAIInfoModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAIInfoModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="sparkles" size={28} color={colors.accent} />
              <Text style={styles.modalTitle}>What can you do with AI Credits?</Text>
              <TouchableOpacity
                onPress={() => setShowAIInfoModal(false)}
                hitSlop={12}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Social Link Importer - Featured */}
              <View style={[styles.featureCard, styles.featuredFeatureCard]}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="link" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>🔗 Social Recipe Importer</Text>
                    <Text style={styles.featureCost}>3 credits per import</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Paste any link from TikTok, Instagram, YouTube, or recipe sites and AI automatically formats it into a beautiful recipe card with ingredients, steps, and details!
                </Text>
                <View style={styles.featureHighlight}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={styles.featureHighlightText}>Most popular feature!</Text>
                </View>
              </View>

              {/* Image Analysis - Bottle Scanner */}
              <View style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: '#00BCD4' }]}>
                    <Ionicons name="camera" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>📸 Bottle Scanner</Text>
                    <Text style={styles.featureCost}>5 credits per scan</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Snap a photo of any bottle and instantly discover cocktails you can make! Perfect for stocking your bar or finding new drinks.
                </Text>
              </View>

              {/* Recipe Generation */}
              <View style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: '#9C27B0' }]}>
                    <Ionicons name="create" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>Custom Recipe Creator</Text>
                    <Text style={styles.featureCost}>3 credits per recipe</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Generate unique cocktail recipes based on your ingredients, preferences, or mood. Get creative!
                </Text>
              </View>

              {/* Recommendations */}
              <View style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.gold }]}>
                    <Ionicons name="bulb" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>AI Recommendations</Text>
                    <Text style={styles.featureCost}>2 credits per session</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Get personalized cocktail suggestions based on your taste profile and drinking history.
                </Text>
              </View>

              {/* Search Enhancement */}
              <View style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: '#FF6B6B' }]}>
                    <Ionicons name="search" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>Smart Search</Text>
                    <Text style={styles.featureCost}>1 credit per search</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Enhanced search that understands natural language. Try "something fruity and refreshing" or "strong whiskey drink."
                </Text>
              </View>

              {/* OCR Processing */}
              <View style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: '#00BCD4' }]}>
                    <MaterialCommunityIcons name="text-recognition" size={20} color={colors.white} />
                  </View>
                  <View style={styles.featureTitleContainer}>
                    <Text style={styles.featureTitle}>Text Recognition</Text>
                    <Text style={styles.featureCost}>2 credits per image</Text>
                  </View>
                </View>
                <Text style={styles.featureDescription}>
                  Extract recipes from photos of menus, books, or handwritten notes. Never lose a recipe again!
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAIInfoModal(false)}
              >
                <Text style={styles.modalButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  headerButton: {
    position: 'relative',
  },
  
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing(4),
  },
  
  // Store Header
  storeHeader: {
    backgroundColor: colors.card,
    padding: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
  },

  infoButton: {
    padding: spacing(0.5),
  },

  storeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  storeSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
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
  
  // Store Item Card
  storeItemCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing(2),
    paddingBottom: spacing(1),
  },
  
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  saveBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
  },

  megaSaveBadge: {
    backgroundColor: '#FF3B3B',
    paddingHorizontal: spacing(1.5),
  },

  bestValueBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -45 }],
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },

  bestValueText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },

  saveText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },

  popularCard: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.gold + '05',
  },

  bundleContentsBox: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(1.5),
    marginTop: spacing(1),
    marginBottom: spacing(1.5),
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },

  bundleContentsText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 18,
  },

  highlightedPrice: {
    color: colors.gold,
  },

  popularPurchaseButton: {
    backgroundColor: colors.gold,
  },
  
  itemContent: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1.5),
  },
  
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  
  itemDescription: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
    marginBottom: spacing(1.5),
  },
  
  // Benefits
  benefitsContainer: {
    gap: spacing(0.75),
  },
  
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  
  // Purchase Section
  purchaseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing(2),
  },
  
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  
  originalPrice: {
    fontSize: 12,
    color: colors.subtext,
    textDecorationLine: 'line-through',
  },
  
  currentPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(0.75),
    minWidth: 120,
    justifyContent: 'center',
  },
  
  disabledButton: {
    backgroundColor: colors.subtext,
    opacity: 0.6,
  },
  
  purchaseButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
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

  // AI Info Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(2),
  },

  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
    paddingBottom: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: spacing(1.5),
  },

  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  modalCloseButton: {
    padding: spacing(0.5),
  },

  modalBody: {
    padding: spacing(2),
  },

  featureCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },

  featuredFeatureCard: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '08',
  },

  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
    gap: spacing(1.5),
  },

  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureTitleContainer: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  featureCost: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },

  featureDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },

  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(1),
    paddingTop: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  featureHighlightText: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '600',
  },

  modalFooter: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  modalButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },

  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});