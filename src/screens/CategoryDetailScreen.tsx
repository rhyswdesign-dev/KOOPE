import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUser } from '../contexts/UserContext';

type CategoryDetailRouteProp = RouteProp<RootStackParamList, 'CategoryDetail'>;

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  image: string;
  xpRequired: number;
  price?: number;
  value: string;
  contents: string[];
  type: 'new' | 'popular' | 'limited';
}

const categoryProducts: Record<string, Product[]> = {
  'mystery-drop': [
    {
      id: 'mystery-winter-2025',
      name: 'Winter Mystery Box 2025',
      brand: 'KŌOPE',
      description: 'Premium surprise collection with seasonal spirits and bar essentials worth over $350',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=60',
      xpRequired: 2000,
      price: 199,
      value: '$350+ Value',
      contents: ['Premium Mystery Spirit', 'Seasonal Cocktail Kit', 'Artisan Bar Tools', 'Recipe Collection', 'Surprise Garnishes'],
      type: 'new',
    },
    {
      id: 'mystery-premium-spring',
      name: 'Premium Spring Collection',
      brand: 'Curator\'s Choice',
      description: 'Hand-selected premium items for the sophisticated mixologist',
      image: 'https://images.unsplash.com/photo-1544925424-24f30b843ad5?auto=format&fit=crop&w=800&q=60',
      xpRequired: 2500,
      price: 249,
      value: '$400+ Value',
      contents: ['Rare Aged Spirit', 'Limited Edition Bitters', 'Crystal Glassware', 'Artisan Mixers', 'Exclusive Recipe Book'],
      type: 'limited',
    },
  ],
  'glassware': [
    {
      id: 'bohemia-crystal-set',
      name: 'Crystal Glassware Collection',
      brand: 'Bohemia Crystal',
      description: 'Hand-blown crystal glasses for the ultimate cocktail experience. Each piece is carefully crafted by master artisans.',
      image: 'https://images.unsplash.com/photo-1578662996442-48f30b843ad5?auto=format&fit=crop&w=800&q=60',
      xpRequired: 800,
      price: 125,
      value: '$180 Value',
      contents: ['2x Old Fashioned Glasses', '2x Coupe Glasses', '2x Highball Glasses', 'Premium Gift Box', 'Care Instructions'],
      type: 'popular',
    },
    {
      id: 'vintage-coupe-set',
      name: 'Vintage Coupe Collection',
      brand: 'Heritage Glass Co.',
      description: 'Elegant vintage-inspired coupe glasses perfect for classic cocktails',
      image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=800&q=60',
      xpRequired: 600,
      price: 89,
      value: '$120 Value',
      contents: ['4x Vintage Coupe Glasses', '2x Martini Glasses', 'Velvet Storage Case', 'Cocktail Recipe Cards'],
      type: 'new',
    },
  ],
  'cocktail-kit': [
    {
      id: 'negroni-deluxe',
      name: 'Deluxe Negroni Kit',
      brand: 'Aperitivo Co.',
      description: 'Everything you need to craft the perfect Negroni at home with premium ingredients',
      image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=60',
      xpRequired: 1500,
      price: 149,
      value: '$200 Value',
      contents: ['Premium Gin (50ml)', 'Artisan Sweet Vermouth', 'House Orange Bitters', 'Crystal Old Fashioned Glasses', 'Recipe Cards', 'Orange Peel Tool'],
      type: 'popular',
    },
  ],
  'bar-tools': [
    {
      id: 'japanese-master-set',
      name: 'Japanese Bar Master Set',
      brand: 'Shokunin Tools',
      description: 'Handcrafted Japanese bar tools used by Tokyo\'s finest bartenders. Each piece represents centuries of craftsmanship.',
      image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=800&q=60',
      xpRequired: 1200,
      price: 289,
      value: '$400 Value',
      contents: ['Handforged Damascus Jigger', 'Precision Bar Spoon', 'Professional Strainer', 'Bamboo Storage Box', 'Maintenance Kit'],
      type: 'limited',
    },
  ],
};

export default function CategoryDetailScreen() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CategoryDetailRouteProp>();
  const { categoryId, categoryName } = route.params;
  const { user } = useUser();
  const userXP = user.xp;
  const { toggleSavedVaultItem, isVaultItemSaved } = useSavedItems();
  const isIOS = Platform.OS === 'ios';

  const products = categoryProducts[categoryId] || [];

  useLayoutEffect(() => {
    nav.setOptions({
      title: categoryName,
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav, categoryName]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'new': return colors.accent;
      case 'popular': return colors.gold;
      case 'limited': return '#9C27B0';
      default: return colors.subtext;
    }
  };

  const handlePurchaseXP = (product: Product) => {
    if (userXP >= product.xpRequired) {
      Alert.alert(
        'Purchase with XP',
        `Purchase ${product.name} for ${product.xpRequired} XP?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Purchase', 
            onPress: () => {
              Alert.alert('Success!', `${product.name} has been purchased with XP!`);
            }
          }
        ]
      );
    } else {
      const xpNeeded = product.xpRequired - userXP;
      Alert.alert(
        'Insufficient XP', 
        `You need ${xpNeeded} more XP to purchase this item. Complete more challenges to earn XP!`
      );
    }
  };

  const handlePurchaseMoney = (product: Product) => {
    if (isIOS) {
      nav.navigate('Paywall', { source: 'category_detail_ios_money_disabled', displayCloseButton: true });
      return;
    }
    if (!product.price) return;
    
    Alert.alert(
      'Purchase',
      `Purchase ${product.name} for $${product.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: () => {
            Alert.alert('Success!', `${product.name} has been purchased!`);
          }
        }
      ]
    );
  };

  const renderProductCard = (product: Product) => (
    <Pressable
      key={product.id}
      style={[
        styles.productCard,
        userXP < product.xpRequired && styles.lockedCard
      ]}
      onPress={() => setSelectedProduct(product)}
    >
      <View style={styles.productImageContainer}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        {userXP < product.xpRequired && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={24} color={colors.white} />
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(product.type) }]}>
          <Text style={styles.typeBadgeText}>{product.type.toUpperCase()}</Text>
        </View>
        <Pressable 
          style={styles.saveButton} 
          onPress={() => toggleSavedVaultItem({
            id: product.id,
            name: product.name,
            subtitle: product.brand,
            image: product.image
          })}
          hitSlop={12}
        >
          <Ionicons 
            name={isVaultItemSaved(product.id) ? "bookmark" : "bookmark-outline"} 
            size={20} 
            color={isVaultItemSaved(product.id) ? colors.accent : colors.text} 
          />
        </Pressable>
      </View>
      
      <View style={styles.productContent}>
        <Text style={styles.productBrand}>{product.brand}</Text>
        <Text style={styles.productTitle}>{product.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>
        
        <View style={styles.productFooter}>
          <View style={styles.xpRequirement}>
            <MaterialCommunityIcons name="star" size={16} color={colors.gold} />
            <Text style={styles.xpText}>{product.xpRequired} XP</Text>
          </View>
          <Text style={styles.productValue}>{product.value}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          {userXP >= product.xpRequired ? (
            <View style={styles.buttonRow}>
              <Pressable 
                style={styles.xpButton}
                onPress={() => handlePurchaseXP(product)}
              >
                <MaterialCommunityIcons name="star" size={20} color={colors.white} />
                <Text style={styles.xpButtonText}>Use XP</Text>
              </Pressable>
              {product.price && !isIOS && (
                <Pressable 
                  style={styles.purchaseButton}
                  onPress={() => handlePurchaseMoney(product)}
                >
                  <Text style={styles.purchaseButtonText}>${product.price}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable 
                style={[styles.xpButton, styles.lockedButton]}
                onPress={() => handlePurchaseXP(product)}
              >
                <Ionicons name="lock-closed" size={16} color={colors.white} />
                <Text style={styles.lockedButtonText}>
                  {product.xpRequired - userXP} XP needed
                </Text>
              </Pressable>
              {product.price && !isIOS && (
                <Pressable 
                  style={styles.purchaseButton}
                  onPress={() => handlePurchaseMoney(product)}
                >
                  <Text style={styles.purchaseButtonText}>${product.price}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(8) }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <Text style={styles.headerSubtitle}>
            {products.length} premium items available
          </Text>
          {isIOS ? (
            <Text style={styles.iosNoticeText}>
              Cash purchase options are disabled on iOS in this build.
            </Text>
          ) : null}
        </View>

        <View style={styles.productsContainer}>
          {products.length > 0 ? (
            products.map(renderProductCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={colors.subtext} />
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptyDescription}>
                This category does not have products in this build yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
              <Pressable onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} />
              
              <View style={styles.modalInfo}>
                <Text style={styles.modalBrand}>{selectedProduct.brand}</Text>
                <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                
                <Text style={styles.contentsHeader}>What's Included:</Text>
                {selectedProduct.contents.map((item, index) => (
                  <View key={index} style={styles.contentItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    <Text style={styles.contentText}>{item}</Text>
                  </View>
                ))}

                <View style={styles.modalButtonContainer}>
                  {userXP >= selectedProduct.xpRequired ? (
                    <View style={styles.modalButtonRow}>
                      <Pressable 
                        style={styles.modalXpButton}
                        onPress={() => handlePurchaseXP(selectedProduct)}
                      >
                        <MaterialCommunityIcons name="star" size={20} color={colors.white} />
                        <Text style={styles.modalXpButtonText}>Purchase with {selectedProduct.xpRequired} XP</Text>
                      </Pressable>
                      {selectedProduct.price && !isIOS && (
                        <Pressable 
                          style={styles.modalPurchaseButton}
                          onPress={() => handlePurchaseMoney(selectedProduct)}
                        >
                          <Text style={styles.modalPurchaseButtonText}>Purchase for ${selectedProduct.price}</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View style={styles.modalButtonRow}>
                      <Pressable 
                        style={[styles.modalXpButton, styles.modalLockedButton]}
                        onPress={() => handlePurchaseXP(selectedProduct)}
                      >
                        <Ionicons name="lock-closed" size={16} color={colors.white} />
                        <Text style={styles.modalLockedButtonText}>
                          Need {selectedProduct.xpRequired - userXP} more XP
                        </Text>
                      </Pressable>
                      {selectedProduct.price && !isIOS && (
                        <Pressable 
                          style={styles.modalPurchaseButton}
                          onPress={() => handlePurchaseMoney(selectedProduct)}
                        >
                          <Text style={styles.modalPurchaseButtonText}>Purchase for ${selectedProduct.price}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.subtext,
  },
  iosNoticeText: {
    marginTop: spacing(1),
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
  },
  productsContainer: {
    padding: spacing(3),
    gap: spacing(3),
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  lockedCard: {
    opacity: 0.8,
  },
  productImageContainer: {
    position: 'relative',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  saveButton: {
    position: 'absolute',
    top: spacing(1),
    left: spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  productContent: {
    padding: spacing(3),
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  productDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  xpRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  productValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  buttonContainer: {
    marginTop: spacing(1),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  xpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
    flex: 1,
  },
  lockedButton: {
    backgroundColor: colors.subtext,
  },
  xpButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  lockedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  purchaseButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.bg,
  },
  modalInfo: {
    padding: spacing(3),
  },
  modalBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing(1),
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing(3),
  },
  contentsHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(1.5),
  },
  contentText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  modalButtonContainer: {
    marginTop: spacing(3),
  },
  modalButtonRow: {
    gap: spacing(2),
  },
  modalXpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  modalLockedButton: {
    backgroundColor: colors.subtext,
  },
  modalXpButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalLockedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalPurchaseButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPurchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
