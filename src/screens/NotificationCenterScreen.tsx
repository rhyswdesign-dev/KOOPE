import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { useNotifications, AppNotification, NotificationType } from '../services/notificationService';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Map notification types to icons
const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  lesson_reminder: 'book-outline',
  vault_item_available: 'gift-outline',
  xp_milestone: 'trophy-outline',
  streak_reminder: 'flame-outline',
  event_reminder: 'calendar-outline',
  daily_challenge: 'ribbon-outline',
  hearts_refilled: 'heart',
};

// Format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const icon = NOTIFICATION_ICONS[notification.type] || 'notifications-outline';

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !notification.read && styles.unreadItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, !notification.read && styles.unreadIcon]}>
        <Ionicons
          name={icon}
          size={22}
          color={notification.read ? colors.subtext : colors.accent}
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !notification.read && styles.unreadTitle]} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.timestamp}>{formatRelativeTime(notification.timestamp)}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
    </TouchableOpacity>
  );
};

export default function NotificationCenterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllReadText}>Mark All Read</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unreadCount, markAllAsRead]);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      // Mark as read
      markAsRead(notification.id);

      // Navigate to action URL if provided
      if (notification.actionUrl) {
        // Parse the action URL and navigate
        // Format: "screen://ScreenName?param=value"
        try {
          const [screenName, queryString] = notification.actionUrl.replace('screen://', '').split('?');
          const params: Record<string, string> = {};

          if (queryString) {
            queryString.split('&').forEach((pair) => {
              const [key, value] = pair.split('=');
              params[key] = decodeURIComponent(value);
            });
          }

          // Navigate to the screen (you may need to adjust based on your navigation setup)
          (navigation as any).navigate(screenName, params);
        } catch (error) {
          console.warn('Failed to navigate to notification action:', error);
        }
      }
    },
    [markAsRead, navigation]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // In a real app, you would refresh notifications from the server here
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem notification={item} onPress={() => handleNotificationPress(item)} />
    ),
    [handleNotificationPress]
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="notifications-outline"
      title="No Notifications"
      message="You're all caught up! We'll let you know when something important happens."
    />
  );

  const sortedNotifications = React.useMemo(
    () => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
    [notifications]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={sortedNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          sortedNotifications.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerButton: {
    paddingHorizontal: spacing(2),
  },
  markAllReadText: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },
  unreadBanner: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
  },
  unreadBannerText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.white,
  },
  listContent: {
    padding: spacing(2),
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
  },
  unreadItem: {
    backgroundColor: 'rgba(214, 138, 56, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.2)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  unreadIcon: {
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing(1),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: spacing(1),
  },
  body: {
    fontSize: fonts.small,
    color: colors.subtext,
    marginTop: spacing(0.5),
    lineHeight: 18,
  },
  timestamp: {
    fontSize: fonts.caption,
    color: colors.muted,
    marginTop: spacing(1),
  },
  separator: {
    height: spacing(1),
  },
});
