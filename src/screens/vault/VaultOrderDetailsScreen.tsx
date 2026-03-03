/**
 * VAULT ORDER DETAILS SCREEN
 * Shows detailed information about a specific order
 */

import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';

interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'keys' | 'booster' | 'bundle';
}

interface OrderDetails {
  id: string;
  date: string;
  status: 'completed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  itemsCount: number;
  total: number;
  primaryItem: string;
  items: TransactionItem[];
  paymentMethod: string;
  transactionId: string;
}

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'VaultOrderDetails'>;

export default function VaultOrderDetailsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<OrderDetailsRouteProp>();
  
  const { orderId } = route.params || {};
  
  // Mock order details - would come from backend in real app
  const getOrderDetails = (id: string): OrderDetails => {
    const orders: Record<string, OrderDetails> = {
      'order_1234567890': {
        id: 'order_1234567890',
        date: '2024-01-15T14:30:00Z',
        status: 'completed',
        itemsCount: 1,
        total: 299,
        primaryItem: 'Starter Key Pack',
        paymentMethod: 'Apple Pay',
        transactionId: 'txn_abc123def456',
        items: [
          { id: 'item_1', name: 'Starter Key Pack', price: 299, quantity: 1, type: 'keys' }
        ]
      },
      'order_0987654321': {
        id: 'order_0987654321',
        date: '2024-01-10T09:15:00Z',
        status: 'completed',
        itemsCount: 2,
        total: 398,
        primaryItem: '2x XP Booster + Keys',
        paymentMethod: 'Credit Card',
        transactionId: 'txn_xyz789ghi012',
        items: [
          { id: 'item_2', name: '2x XP Booster', price: 199, quantity: 1, type: 'booster' },
          { id: 'item_3', name: 'Small Key Pack', price: 199, quantity: 1, type: 'keys' }
        ]
      },
      'order_1122334455': {
        id: 'order_1122334455',
        date: '2024-01-05T16:45:00Z',
        status: 'delivered',
        itemsCount: 1,
        total: 699,
        primaryItem: 'Value Key Bundle',
        paymentMethod: 'PayPal',
        transactionId: 'txn_mno345pqr678',
        items: [
          { id: 'item_4', name: 'Value Key Bundle', price: 699, quantity: 1, type: 'bundle' }
        ]
      },
      'order_5544332211': {
        id: 'order_5544332211',
        date: '2023-12-28T11:20:00Z',
        status: 'completed',
        itemsCount: 3,
        total: 1497,
        primaryItem: 'Ultimate Collection',
        paymentMethod: 'Apple Pay',
        transactionId: 'txn_stu901vwx234',
        items: [
          { id: 'item_5', name: 'Ultimate Key Collection', price: 999, quantity: 1, type: 'bundle' },
          { id: 'item_6', name: '5x XP Booster', price: 299, quantity: 1, type: 'booster' },
          { id: 'item_7', name: 'Premium Key Pack', price: 199, quantity: 1, type: 'keys' }
        ]
      }
    };
    
    return orders[id] || orders['order_1234567890'];
  };

  const order = getOrderDetails(orderId || 'order_1234567890');
  
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Order Details',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const getStatusColor = (status: OrderDetails['status']): string => {
    switch (status) {
      case 'completed': return colors.accent;
      case 'processing': return colors.gold;
      case 'shipped': return '#2196F3';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return colors.destructive;
      default: return colors.subtext;
    }
  };

  const getStatusIcon = (status: OrderDetails['status']): string => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'processing': return 'time';
      case 'shipped': return 'car-outline';
      case 'delivered': return 'home';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getItemTypeIcon = (type: TransactionItem['type']): string => {
    switch (type) {
      case 'keys': return 'key';
      case 'booster': return 'flash';
      case 'bundle': return 'gift-outline';
      default: return 'cube-outline';
    }
  };

  const getItemTypeColor = (type: TransactionItem['type']): string => {
    switch (type) {
      case 'keys': return colors.accentLight;
      case 'booster': return colors.gold;
      case 'bundle': return colors.accent;
      default: return colors.subtext;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Would you like to contact support about this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact Support', onPress: () => {} }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.orderNumber}>Order #{order.id.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
        <Text style={styles.totalAmount}>${(order.total / 100).toFixed(2)}</Text>
      </View>

      {/* Transaction Items */}
      <View style={styles.itemsCard}>
        <Text style={styles.sectionTitle}>Items Purchased</Text>
        
        {order.items.map((item, index) => (
          <View key={item.id} style={[
            styles.transactionItem,
            index === order.items.length - 1 && styles.lastItem
          ]}>
            <View style={[styles.itemIcon, { backgroundColor: getItemTypeColor(item.type) }]}>
              <Ionicons 
                name={getItemTypeIcon(item.type) as any} 
                size={20} 
                color={colors.white} 
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • Quantity: {item.quantity}
              </Text>
            </View>
            <Text style={styles.itemPrice}>${(item.price / 100).toFixed(2)}</Text>
          </View>
        ))}
        
        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>${(order.total / 100).toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Information */}
      <View style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Method</Text>
          <Text style={styles.paymentValue}>{order.paymentMethod}</Text>
        </View>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Transaction ID</Text>
          <Text style={styles.paymentValue}>{order.transactionId}</Text>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.supportCard}>
        <Text style={styles.sectionTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          If you have any questions about this order, our support team is here to help.
        </Text>
        <Pressable style={styles.supportButton} onPress={handleContactSupport}>
          <Ionicons name="chatbubble" size={20} color={colors.accent} />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  content: {
    padding: spacing(2),
    paddingBottom: spacing(4),
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  
  statusBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  
  orderDate: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  
  totalAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
  },
  
  // Items Card
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: spacing(2),
  },
  
  lastItem: {
    borderBottomWidth: 0,
  },
  
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  itemInfo: {
    flex: 1,
  },
  
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  
  itemDetails: {
    fontSize: 12,
    color: colors.subtext,
  },
  
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing(2),
    marginTop: spacing(2),
    borderTopWidth: 2,
    borderTopColor: colors.line,
  },
  
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  
  // Payment Card
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  
  paymentLabel: {
    fontSize: 14,
    color: colors.subtext,
  },
  
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  
  // Support Card
  supportCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  
  supportText: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(2),
    lineHeight: 20,
  },
  
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    gap: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});