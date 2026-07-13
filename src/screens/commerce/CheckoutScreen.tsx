import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { useCart } from '../../contexts/CartContext';
import { Address, PaymentMethod } from '../../types/commerce';

// Mock addresses and payment methods for demo
const mockAddresses: Address[] = [
  {
    id: 'addr1',
    firstName: 'John',
    lastName: 'Doe',
    street1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US',
    isDefault: true,
  },
  {
    id: 'addr2',
    firstName: 'John',
    lastName: 'Doe',
    street1: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    country: 'US',
  },
];

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm1',
    type: 'card',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2028,
    isDefault: true,
  },
  {
    id: 'pm2',
    type: 'card',
    last4: '1234',
    brand: 'mastercard',
    expiryMonth: 6,
    expiryYear: 2027,
  },
];

export default function CheckoutScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, clearCart } = useCart();
  const isIOS = Platform.OS === 'ios';
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<Address>(
    mockAddresses.find(addr => addr.isDefault) || mockAddresses[0]
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    mockPaymentMethods.find(pm => pm.isDefault) || mockPaymentMethods[0]
  );
  const [useSameForBilling, setUseSameForBilling] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Checkout',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handlePlaceOrder = async () => {
    if (isIOS) {
      nav.navigate('Paywall', { source: 'checkout_ios_gate', displayCloseButton: true });
      return;
    }
    setIsProcessing(true);
    
    // Simulate payment processing
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock order
      const orderId = `ord_${Date.now()}`;
      
      // Clear cart
      clearCart();
      
      // Navigate to order confirmation
      nav.reset({
        index: 0,
        routes: [
          { name: 'Main' },
          { name: 'OrderConfirmation', params: { orderId } }
        ],
      });
      
    } catch (error) {
      Alert.alert('Payment Failed', 'Please try again or use a different payment method.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAddress = (address: Address) => {
    return `${address.firstName} ${address.lastName}\n${address.street1}\n${address.city}, ${address.state} ${address.zipCode}`;
  };

  const formatPaymentMethod = (pm: PaymentMethod) => {
    if (pm.type === 'card') {
      return `${pm.brand?.toUpperCase()} •••• ${pm.last4}`;
    }
    return pm.type.charAt(0).toUpperCase() + pm.type.slice(1);
  };

  if (isIOS) {
    return (
      <View style={styles.container}>
        <View style={styles.iosBlockedWrap}>
          <Ionicons name="information-circle-outline" size={64} color={colors.subtext} />
          <Text style={styles.iosBlockedTitle}>Checkout is disabled on iOS</Text>
          <Text style={styles.iosBlockedBody}>
            This build only supports App Store managed subscriptions on iOS.
          </Text>
          <TouchableOpacity
            style={styles.iosBlockedButton}
            onPress={() => nav.navigate('Paywall', { source: 'checkout_ios_notice', displayCloseButton: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.iosBlockedButtonText}>Open Paywall</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          
          <TouchableOpacity style={styles.addressCard} activeOpacity={0.8}>
            <View style={styles.addressInfo}>
              <Text style={styles.addressText}>{formatAddress(selectedShippingAddress)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Billing Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Billing Address</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Same as shipping</Text>
              <Switch
                value={useSameForBilling}
                onValueChange={setUseSameForBilling}
                trackColor={{ false: colors.line, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>
          </View>
          
          {!useSameForBilling && (
            <TouchableOpacity style={styles.addressCard} activeOpacity={0.8}>
              <View style={styles.addressInfo}>
                <Text style={styles.addressText}>{formatAddress(selectedShippingAddress)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity style={styles.paymentCard} activeOpacity={0.8}>
            <View style={styles.paymentInfo}>
              <Ionicons name="card-outline" size={24} color={colors.accent} />
              <Text style={styles.paymentText}>{formatPaymentMethod(selectedPaymentMethod)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({state.items.length} items)</Text>
          
          {state.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  Qty: {item.quantity} × ${item.price.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ${(item.quantity * item.price).toFixed(2)}
              </Text>
            </View>
          ))}
          
          <View style={styles.orderTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${state.subtotal.toFixed(2)}</Text>
            </View>
            
            {state.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, styles.discountLabel]}>
                  Discount ({state.promoCode?.code})
                </Text>
                <Text style={[styles.totalValue, styles.discountValue]}>
                  -${state.discount.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${state.tax.toFixed(2)}</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping</Text>
              <Text style={styles.totalValue}>
                {state.shipping === 0 ? 'Free' : `$${state.shipping.toFixed(2)}`}
              </Text>
            </View>
            
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${state.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isProcessing && styles.processingButton]}
          onPress={handlePlaceOrder}
          disabled={isProcessing || isIOS}
          activeOpacity={0.8}
        >
          <Text style={styles.placeOrderButtonText}>
            {isProcessing ? 'Processing...' : `Place Order • $${state.total.toFixed(2)}`}
          </Text>
          {!isProcessing && (
            <Ionicons name="card-outline" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
        
        <Text style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
          {' '}Your payment information is secure and encrypted
        </Text>
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
  section: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  switchLabel: {
    fontSize: 14,
    color: colors.text,
  },
  iosBlockedWrap: {
    margin: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
    alignItems: 'center',
    gap: spacing(1),
  },
  iosBlockedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  iosBlockedBody: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  iosBlockedButton: {
    marginTop: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
  },
  iosBlockedButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  itemDetails: {
    fontSize: 13,
    color: colors.subtext,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingVertical: spacing(1),
  },
  totalLabel: {
    fontSize: 15,
    color: colors.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  discountLabel: {
    color: colors.accent,
  },
  discountValue: {
    color: colors.accent,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing(2),
    marginTop: spacing(1),
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  checkoutContainer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  processingButton: {
    backgroundColor: colors.subtext,
  },
  placeOrderButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  securityNote: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 18,
  },
});
