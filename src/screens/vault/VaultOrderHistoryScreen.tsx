/**
 * VAULT ORDER HISTORY SCREEN
 * Shows all past purchases of Keys, Boosters, and other monetization items
 */

import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import PillButton from '../../components/PillButton';

interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'keys' | 'booster' | 'bundle';
}

interface OrderSummary {
  id: string;
  date: string;
  status: 'completed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  itemsCount: number;
  total: number;
  primaryItem: string;
  items: TransactionItem[];
}

export default function VaultOrderHistoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  const [orders, setOrders] = useState<OrderSummary[]>([
    {
      id: 'order_1234567890',
      date: '2024-01-15T14:30:00Z',
      status: 'completed',
      itemsCount: 1,
      total: 299,
      primaryItem: 'Starter Key Pack',
      items: [
        { id: 'item_1', name: 'Starter Key Pack', price: 299, quantity: 1, type: 'keys' }
      ]
    },
    {
      id: 'order_0987654321',
      date: '2024-01-10T09:15:00Z',
      status: 'completed',
      itemsCount: 2,
      total: 398,
      primaryItem: '2x XP Booster + Keys',
      items: [
        { id: 'item_2', name: '2x XP Booster', price: 199, quantity: 1, type: 'booster' },
        { id: 'item_3', name: 'Small Key Pack', price: 199, quantity: 1, type: 'keys' }
      ]
    },
    {
      id: 'order_1122334455',
      date: '2024-01-05T16:45:00Z',
      status: 'delivered',
      itemsCount: 1,
      total: 699,
      primaryItem: 'Value Key Bundle',
      items: [
        { id: 'item_4', name: 'Value Key Bundle', price: 699, quantity: 1, type: 'bundle' }
      ]
    },
    {
      id: 'order_5544332211',
      date: '2023-12-28T11:20:00Z',
      status: 'completed',
      itemsCount: 3,
      total: 1497,
      primaryItem: 'Ultimate Collection',
      items: [
        { id: 'item_5', name: 'Ultimate Key Collection', price: 999, quantity: 1, type: 'bundle' },
        { id: 'item_6', name: '5x XP Booster', price: 299, quantity: 1, type: 'booster' },
        { id: 'item_7', name: 'Premium Key Pack', price: 199, quantity: 1, type: 'keys' }
      ]
    }
  ]);
  
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Order History',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status: OrderSummary['status']): string => {
    switch (status) {
      case 'completed': return colors.accent;
      case 'processing': return colors.gold;
      case 'shipped': return '#2196F3';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return colors.destructive;
      default: return colors.subtext;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFilteredOrders = (): OrderSummary[] => {
    if (selectedFilter === 'all') return orders;
    return orders.filter(order => order.status === selectedFilter);
  };

  const filters = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
    { key: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
    { key: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length }
  ];

  const filteredOrders = getFilteredOrders();

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

  const renderOrder = ({ item }: { item: OrderSummary }) => (
    <View style={styles.orderCard}>
      {/* Order Header */}
      <TouchableOpacity
        style={styles.orderHeader}
        onPress={() => nav.navigate('VaultOrderDetails' as never, { orderId: item.id } as never)}
        activeOpacity={0.8}
      >
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.primaryItem}</Text>
          <Text style={styles.orderDetails}>
            Order #{item.id.slice(-8)} • {formatDate(item.date)}
          </Text>
        </View>
        
        <View style={styles.orderMeta}>
          <Text style={styles.orderPrice}>${(item.total / 100).toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Transaction Items */}
      <View style={styles.itemsList}>
        {item.items.map((transactionItem, index) => (
          <View key={transactionItem.id} style={styles.transactionItem}>
            <View style={[styles.itemIcon, { backgroundColor: getItemTypeColor(transactionItem.type) }]}>
              <Ionicons 
                name={getItemTypeIcon(transactionItem.type) as any} 
                size={16} 
                color={colors.white} 
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{transactionItem.name}</Text>
              <Text style={styles.itemType}>
                {transactionItem.type.charAt(0).toUpperCase() + transactionItem.type.slice(1)} • Qty: {transactionItem.quantity}
              </Text>
            </View>
            <Text style={styles.itemPrice}>${(transactionItem.price / 100).toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={colors.subtext} />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? 'Your purchase history will appear here'
          : `No ${selectedFilter} orders found`
        }
      </Text>
    </View>
  );

  const renderHeader = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filtersScrollView}
      contentContainerStyle={styles.filtersContainer}
    >
      {filters.map((filter) => {
        const isActive = selectedFilter === filter.key;
        return (
          <PillButton
            key={filter.key}
            title={filter.label}
            onPress={() => setSelectedFilter(filter.key)}
            style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
            textStyle={{ color: isActive ? colors.pillTextOnLight : colors.text }}
          />
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
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
  
  filtersScrollView: {
    backgroundColor: colors.bg,
  },
  
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(2),
    gap: spacing(1),
  },
  
  
  orderCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  
  orderHeader: {
    flexDirection: 'row',
    padding: spacing(3),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  
  orderInfo: {
    flex: 1,
  },
  
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  
  orderDetails: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  
  orderDate: {
    fontSize: 11,
    color: colors.subtext,
  },
  
  orderMeta: {
    alignItems: 'flex-end',
    gap: spacing(1),
  },
  
  orderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  
  statusBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  
  statusText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  
  emptyContainer: {
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
  
  // Transaction Items
  itemsList: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
  },
  
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: spacing(2),
  },
  
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  itemInfo: {
    flex: 1,
  },
  
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  
  itemType: {
    fontSize: 11,
    color: colors.subtext,
  },
  
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});