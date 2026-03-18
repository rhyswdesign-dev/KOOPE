// @ts-nocheck
import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { useCart } from '../../contexts/CartContext';
import { PromoCode } from '../../types/commerce';

// Mock promo codes for demo
const mockPromoCodes: PromoCode[] = [
  {
    id: 'WELCOME10',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    validUntil: '2025-12-31',
    minOrderValue: 50,
  },
  {
    id: 'SAVE20',
    code: 'SAVE20',
    discountType: 'fixed',
    discountValue: 20,
    validUntil: '2025-12-31',
    minOrderValue: 100,
  },
  {
    id: 'FREESHIP',
    code: 'FREESHIP',
    discountType: 'percentage',
    discountValue: 0, // This would remove shipping cost
    validUntil: '2025-12-31',
  },
];

export default function CartScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, removeFromCart, updateQuantity, applyPromoCode, removePromoCode } = useCart();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Cart',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = state.items.find(item => item.id === itemId);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + change);
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleApplyPromoCode = () => {
    if (!promoCodeInput.trim()) return;
    
    setIsApplyingPromo(true);
    
    // Simulate API call
    setTimeout(() => {
      const promoCode = mockPromoCodes.find(
        code => code.code.toLowerCase() === promoCodeInput.toLowerCase()
      );
      
      if (promoCode) {
        // Check minimum order value
        if (promoCode.minOrderValue && state.subtotal < promoCode.minOrderValue) {
          Alert.alert(
            'Invalid Promo Code',
            `This promo code requires a minimum order of $${promoCode.minOrderValue}`
          );
        } else {
          applyPromoCode(promoCode);
          setPromoCodeInput('');
          Alert.alert('Success!', `Promo code "${promoCode.code}" applied successfully!`);
        }
      } else {
        Alert.alert('Invalid Promo Code', 'Please check your promo code and try again.');
      }
      
      setIsApplyingPromo(false);
    }, 1000);
  };

  const handleRemovePromoCode = () => {
    removePromoCode();
    Alert.alert('Promo Code Removed', 'Your promo code has been removed from this order.');
  };

  const handleCheckout = () => {
    if (state.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }
    nav.navigate('Checkout');
  };

  if (state.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bag-outline" size={80} color={colors.subtext} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Browse our premium products and subscription plans to get started
        </Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => nav.navigate('Pricing')}
          activeOpacity={0.8}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cart Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items ({state.items.length})</Text>
          
          {state.items.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              )}

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemType}>
                  {item.type === 'plan' ? 'Subscription Plan' : 'Product'}
                </Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>

                {/* View Recipe Button */}
                {item.recipeId && (
                  <TouchableOpacity
                    style={styles.viewRecipeButton}
                    onPress={() => nav.navigate('CocktailDetail', { cocktailId: item.recipeId })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="book-outline" size={14} color={colors.accent} />
                    <Text style={styles.viewRecipeText}>View Recipe</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.id, -1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>

                <Text style={styles.quantityText}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.id, 1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.id)}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Promo Code Section */}
        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>Promo Code</Text>
          
          {state.promoCode ? (
            <View style={styles.appliedPromoContainer}>
              <View style={styles.appliedPromoInfo}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={styles.appliedPromoText}>
                  Code "{state.promoCode.code}" applied
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRemovePromoCode}
                hitSlop={12}
              >
                <Ionicons name="close" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                value={promoCodeInput}
                onChangeText={setPromoCodeInput}
                placeholder="Enter promo code"
                placeholderTextColor={colors.subtext}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardAppearance="dark"
              />
              <TouchableOpacity
                style={[styles.applyButton, isApplyingPromo && styles.applyButtonDisabled]}
                onPress={handleApplyPromoCode}
                disabled={isApplyingPromo || !promoCodeInput.trim()}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.applyButtonText,
                  (isApplyingPromo || !promoCodeInput.trim()) && styles.applyButtonTextDisabled
                ]}>
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${state.subtotal.toFixed(2)}</Text>
          </View>
          
          {state.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Discount ({state.promoCode?.code})
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -${state.discount.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${state.tax.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Shipping {state.subtotal > 100 && '(Free over $100)'}
            </Text>
            <Text style={styles.summaryValue}>
              {state.shipping === 0 ? 'Free' : `$${state.shipping.toFixed(2)}`}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${state.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.8}
        >
          <Text style={styles.checkoutButtonText}>
            Proceed to Checkout • ${state.total.toFixed(2)}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(2),
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing(4),
  },
  shopButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  itemsSection: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    marginRight: spacing(2),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  itemType: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  viewRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(1),
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1),
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    alignSelf: 'flex-start',
  },
  viewRecipeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing(2),
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: spacing(2),
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: spacing(1),
  },
  promoSection: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  appliedPromoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.accent,
  },
  appliedPromoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  appliedPromoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    fontSize: 16,
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: colors.subtext,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  applyButtonTextDisabled: {
    color: colors.white,
  },
  summarySection: {
    padding: spacing(2),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  discountLabel: {
    color: colors.accent,
  },
  discountValue: {
    color: colors.accent,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing(2),
    marginTop: spacing(1),
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  checkoutContainer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    gap: spacing(2),
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});
