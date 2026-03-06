import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { Order } from '../../types/commerce';

// Mock order data
const mockOrders: Order[] = [
  {
    id: 'ord_2025_001234',
    orderNumber: 'HGA-2025-001234',
    status: 'delivered',
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2025-03-15T14:30:00Z',
    items: [
      {
        id: '1',
        type: 'product',
        name: 'Premium Cocktail Shaker Set',
        quantity: 1,
        unitPrice: 79.99,
        totalPrice: 79.99,
        image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=400&q=60',
      },
      {
        id: '2',
        type: 'product',
        name: 'The Art of Craft Cocktails',
        quantity: 1,
        unitPrice: 34.99,
        totalPrice: 34.99,
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=60',
      },
    ],
    subtotal: 114.98,
    discount: 11.50,
    tax: 8.28,
    shipping: 0,
    total: 111.76,
    trackingNumber: 'UPS123456789',
  },
  {
    id: 'ord_2025_001133',
    orderNumber: 'HGA-2025-001133',
    status: 'shipped',
    createdAt: '2025-03-08T15:30:00Z',
    updatedAt: '2025-03-12T09:15:00Z',
    items: [
      {
        id: '3',
        type: 'plan',
        name: 'Premium Plan',
        quantity: 1,
        unitPrice: 19.99,
        totalPrice: 19.99,
      },
    ],
    subtotal: 19.99,
    discount: 0,
    tax: 1.60,
    shipping: 0,
    total: 21.59,
    estimatedDelivery: '2025-03-16',
  },
  {
    id: 'ord_2025_001089',
    orderNumber: 'HGA-2025-001089',
    status: 'processing',
    createdAt: '2025-03-06T12:15:00Z',
    updatedAt: '2025-03-06T12:15:00Z',
    items: [
      {
        id: '4',
        type: 'product',
        name: 'Essential Glassware Collection',
        quantity: 1,
        unitPrice: 149.99,
        totalPrice: 149.99,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=60',
      },
    ],
    subtotal: 149.99,
    discount: 0,
    tax: 12.00,
    shipping: 0,
    total: 161.99,
    estimatedDelivery: '2025-03-18',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return colors.gold;
    case 'shipped': return colors.accent;
    case 'processing': return colors.subtext;
    case 'cancelled': return colors.error;
    default: return colors.subtext;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered': return 'checkmark-circle';
    case 'shipped': return 'car';
    case 'processing': return 'time';
    case 'cancelled': return 'close-circle';
    default: return 'time';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function OrderHistoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Order History',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => nav.navigate('OrderDetails', { orderId: order.id })}
      activeOpacity={0.8}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Order {order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Ionicons
            name={getStatusIcon(order.status) as any}
            size={14}
            color={colors.white}
          />
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.orderItems}>
        {order.items.slice(0, 2).map((item) => (
          <View key={item.id} style={styles.orderItem}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemDetails}>
                Qty: {item.quantity} • ${item.unitPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
        
        {order.items.length > 2 && (
          <Text style={styles.moreItems}>
            +{order.items.length - 2} more item{order.items.length > 3 ? 's' : ''}
          </Text>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <View style={styles.orderTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
        </View>
        
        <View style={styles.orderActions}>
          {order.trackingNumber && (
            <Text style={styles.trackingText}>
              Tracking: {order.trackingNumber}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (mockOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={80} color={colors.subtext} />
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptySubtitle}>
          When you place orders, they'll appear here
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {mockOrders.length} Order{mockOrders.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.headerSubtitle}>
            Track your purchases and manage your orders
          </Text>
        </View>
        
        {mockOrders.map(renderOrderCard)}
      </ScrollView>
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
  header: {
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(1),
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.subtext,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    margin: spacing(2),
    padding: spacing(3),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(3),
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  orderDate: {
    fontSize: 14,
    color: colors.subtext,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    gap: spacing(0.5),
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  orderItems: {
    marginBottom: spacing(3),
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
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
  moreItems: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing(1),
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing(2),
  },
  orderTotal: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  orderActions: {
    alignItems: 'flex-end',
    gap: spacing(1),
  },
  trackingText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
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
});