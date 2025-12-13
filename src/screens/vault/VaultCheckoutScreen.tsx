/**
 * VAULT CHECKOUT SCREEN
 * Handles payment for Keys/Boosters with address, tax, and shipping
 */

import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { useVault } from '../../contexts/VaultContext';
import { VaultAddress, VaultPurchaseRequest } from '../../types/vault';
import { log } from '../../lib/logger';

export default function VaultCheckoutScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, purchaseMonetizationItem } = useVault();
  
  const [shippingAddress, setShippingAddress] = useState<VaultAddress>({
    id: '',
    userId: state.userProfile.userId,
    firstName: '',
    lastName: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    isDefault: false,
    createdAt: new Date().toISOString()
  });
  
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Checkout',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => null,
    });
  }, [nav]);

  const hasPhysicalItems = state.cart.items.some(cartItem => {
    const item = state.monetizationItems.find(m => m.id === cartItem.monetizationItemId);
    return item?.type === 'merch';
  });

  const isAddressValid = () => {
    if (!hasPhysicalItems) return true;
    return (
      shippingAddress.firstName.trim() !== '' &&
      shippingAddress.lastName.trim() !== '' &&
      shippingAddress.street1.trim() !== '' &&
      shippingAddress.city.trim() !== '' &&
      shippingAddress.state.trim() !== '' &&
      shippingAddress.zipCode.trim() !== ''
    );
  };

  const handlePurchase = async () => {
    if (!isAddressValid()) {
      Alert.alert('Address Required', 'Please fill in all shipping address fields for physical items.');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create purchase request for entire cart
      const purchaseRequest: VaultPurchaseRequest = {
        userId: state.userProfile.userId,
        cartItems: state.cart.items,
        paymentMethodId: paymentMethod,
        shippingAddress: hasPhysicalItems ? shippingAddress : undefined,
        total: state.cart.total
      };

      const success = await purchaseMonetizationItem(purchaseRequest);
      
      if (success) {
        nav.navigate('VaultOrderConfirmation' as never, {
          orderId: 'order_' + Date.now(),
          total: state.cart.total
        } as never);
      } else {
        Alert.alert('Purchase Failed', 'Unable to process your payment. Please try again.');
      }
    } catch (error) {
      log.error('VaultCheckoutScreen', 'Purchase error', error, { total: state.cart.total });
      Alert.alert('Purchase Failed', 'Unable to process your payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {state.cart.items.map((cartItem) => {
            const item = state.monetizationItems.find(m => m.id === cartItem.monetizationItemId);
            if (!item) return null;
            
            return (
              <View key={cartItem.monetizationItemId} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemQty}>Qty: {cartItem.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  ${(cartItem.totalPrice / 100).toFixed(2)}
                </Text>
              </View>
            );
          })}
          
          <View style={styles.orderTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${(state.cart.subtotal / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${(state.cart.tax / 100).toFixed(2)}</Text>
            </View>
            {hasPhysicalItems && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>FREE</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                ${(state.cart.total / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Address (only for physical items) */}
        {hasPhysicalItems && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.textInput, styles.halfWidth]}
                placeholder="First Name"
                value={shippingAddress.firstName}
                onChangeText={(text) => setShippingAddress(prev => ({...prev, firstName: text}))}
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={[styles.textInput, styles.halfWidth]}
                placeholder="Last Name"
                value={shippingAddress.lastName}
                onChangeText={(text) => setShippingAddress(prev => ({...prev, lastName: text}))}
                placeholderTextColor={colors.subtext}
              />
            </View>
            
            <TextInput
              style={styles.textInput}
              placeholder="Street Address"
              value={shippingAddress.street1}
              onChangeText={(text) => setShippingAddress(prev => ({...prev, street1: text}))}
              placeholderTextColor={colors.subtext}
            />
            
            <TextInput
              style={styles.textInput}
              placeholder="Apartment, suite, etc. (optional)"
              value={shippingAddress.street2}
              onChangeText={(text) => setShippingAddress(prev => ({...prev, street2: text}))}
              placeholderTextColor={colors.subtext}
            />
            
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.textInput, styles.cityInput]}
                placeholder="City"
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress(prev => ({...prev, city: text}))}
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={[styles.textInput, styles.stateInput]}
                placeholder="State"
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress(prev => ({...prev, state: text}))}
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={[styles.textInput, styles.zipInput]}
                placeholder="ZIP"
                value={shippingAddress.zipCode}
                onChangeText={(text) => setShippingAddress(prev => ({...prev, zipCode: text}))}
                placeholderTextColor={colors.subtext}
              />
            </View>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={styles.paymentOption}
            onPress={() => nav.navigate('VaultPaymentMethods' as never)}
          >
            <View style={styles.paymentOptionContent}>
              <MaterialCommunityIcons name="credit-card" size={24} color={colors.accent} />
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>
                  {paymentMethod ? 'Card ending in ••••' : 'Select Payment Method'}
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {paymentMethod ? 'Tap to change' : 'Add a credit or debit card'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.placeOrderButton, isProcessing && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={isProcessing}
        >
          <Text style={styles.placeOrderText}>
            {isProcessing ? 'Processing...' : `Place Order • $${(state.cart.total / 100).toFixed(2)}`}
          </Text>
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
  content: {
    flex: 1,
  },
  
  // Sections
  section: {
    backgroundColor: colors.card,
    marginBottom: spacing(2),
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },
  
  // Order Summary
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: spacing(1),
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  orderItemQty: {
    fontSize: 12,
    color: colors.subtext,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  orderTotals: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1),
  },
  totalLabel: {
    fontSize: 14,
    color: colors.subtext,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  grandTotalRow: {
    marginTop: spacing(1),
    paddingTop: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  
  // Address Form
  textInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(2),
  },
  addressRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  halfWidth: {
    flex: 1,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    flex: 1,
  },
  
  // Payment Method
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionInfo: {
    marginLeft: spacing(2),
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: colors.subtext,
  },
  
  // Footer
  footer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: spacing(3),
  },
  placeOrderButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});