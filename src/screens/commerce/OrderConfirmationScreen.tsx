import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { log } from '../../lib/logger';

type OrderConfirmationRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;

// Mock order data
const mockOrderData = {
  orderNumber: 'HGA-2025-001234',
  total: 249.97,
  estimatedDelivery: '2025-03-18',
  trackingNumber: 'UPS123456789',
  items: [
    { name: 'Premium Cocktail Shaker Set', quantity: 1, price: 79.99 },
    { name: 'The Art of Craft Cocktails', quantity: 1, price: 34.99 },
    { name: 'Essential Glassware Collection', quantity: 1, price: 149.99 },
  ],
};

export default function OrderConfirmationScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OrderConfirmationRouteProp>();
  const { orderId } = route.params;
  const isIOS = Platform.OS === 'ios';

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Order Confirmed',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const handleShareOrder = async () => {
    try {
      await Share.share({
        message: `My HomeGameAdvantage order ${mockOrderData.orderNumber} has been confirmed! 🍸`,
        title: 'Order Confirmation',
      });
    } catch (error) {
      log.error('OrderConfirmationScreen', 'Error sharing', error);
    }
  };

  if (isIOS) {
    return (
      <View style={styles.container}>
        <View style={styles.iosBlockedWrap}>
          <Ionicons name="information-circle-outline" size={72} color={colors.subtext} />
          <Text style={styles.iosBlockedTitle}>Order confirmation is disabled on iOS</Text>
          <Text style={styles.iosBlockedBody}>
            This build only supports App Store managed subscriptions on iOS.
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => nav.navigate('Main')}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color={colors.white} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.accent} />
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for your purchase. We'll send you tracking information once your order ships.
          </Text>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Number</Text>
            <Text style={styles.detailValue}>{mockOrderData.orderNumber}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailValuePrice}>${mockOrderData.total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Delivery</Text>
            <Text style={styles.detailValue}>{mockOrderData.estimatedDelivery}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          
          {mockOrderData.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* What's Next */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>What's Next?</Text>
          
          <View style={styles.stepItem}>
            <Ionicons name="mail-outline" size={24} color={colors.accent} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Email Confirmation</Text>
              <Text style={styles.stepDescription}>
                A confirmation email has been sent to your registered email address
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <Ionicons name="cube-outline" size={24} color={colors.accent} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Processing</Text>
              <Text style={styles.stepDescription}>
                We'll prepare your order and send tracking information within 1-2 business days
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <Ionicons name="car-outline" size={24} color={colors.accent} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Delivery</Text>
              <Text style={styles.stepDescription}>
                Your order will arrive by {mockOrderData.estimatedDelivery}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => nav.navigate('OrderHistory')}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>View Order History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShareOrder}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Share Order</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => nav.navigate('Pricing')}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => nav.navigate('Main')}
          activeOpacity={0.8}
        >
          <Ionicons name="home" size={20} color={colors.white} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
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
  scrollContent: {
    paddingBottom: spacing(4),
  },
  successHeader: {
    alignItems: 'center',
    padding: spacing(4),
    backgroundColor: colors.card,
  },
  iosBlockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(1.5),
  },
  iosBlockedTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  iosBlockedBody: {
    color: colors.subtext,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(1),
  },
  successIcon: {
    marginBottom: spacing(2),
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(1),
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  orderDetails: {
    margin: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  detailLabel: {
    fontSize: 15,
    color: colors.subtext,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  detailValuePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
  },
  itemsSection: {
    margin: spacing(2),
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(1.5),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  itemQuantity: {
    fontSize: 13,
    color: colors.subtext,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  nextStepsSection: {
    margin: spacing(2),
    marginTop: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(3),
    marginBottom: spacing(2),
    gap: spacing(3),
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  stepDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  actionsSection: {
    margin: spacing(2),
    marginTop: 0,
    gap: spacing(2),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    gap: spacing(2),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    gap: spacing(2),
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  bottomNavigation: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    gap: spacing(2),
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
