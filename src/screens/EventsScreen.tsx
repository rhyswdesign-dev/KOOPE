import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { useSubscription } from '../contexts/SubscriptionContext';
import EmptyState from '../components/states/EmptyState';
import type { EventItem } from '../types/spirit';

export default function EventsScreen() {
  const { tier } = useSubscription();
  const [loading, setLoading] = useState(false);

  // Mock events data - replace with actual data source
  const events: EventItem[] = [
    {
      id: '1',
      title: 'Mixology Masterclass: Classic Cocktails',
      city: 'New York',
      dateISO: '2025-02-15T19:00:00Z',
    },
    {
      id: '2',
      title: 'Whiskey Tasting Experience',
      city: 'Chicago',
      dateISO: '2025-02-20T18:30:00Z',
    },
    {
      id: '3',
      title: 'Craft Cocktail Competition',
      city: 'Los Angeles',
      dateISO: '2025-03-01T20:00:00Z',
    },
  ];

  // Check subscription access
  const hasAccess = tier !== 'FREE';
  const isPro = tier === 'PRO';

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <EmptyState
          variant="comingSoon"
          title="Events Access Required"
          description="Upgrade to KOOPE+ or PRO to access exclusive bartending events, tastings, and masterclasses."
          action={{
            label: 'View Plans',
            onPress: () => {
              // Navigate to paywall
              // navigation.navigate('Paywall');
            },
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          variant="noContent"
          title="No Events Yet"
          description="Check back soon for upcoming bartending events, tastings, and masterclasses near you."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Events</Text>
        <Text style={styles.subtitle}>
          {isPro ? 'PRO Priority Access' : 'Core Tier Events'}
        </Text>
      </View>

      {/* Pro Badge */}
      {isPro && (
        <View style={styles.proBadge}>
          <Ionicons name="star" size={16} color={colors.accent} />
          <Text style={styles.proBadgeText}>
            As a PRO member, you get early access and bigger discounts!
          </Text>
        </View>
      )}

      {/* Events List */}
      <View style={styles.eventsList}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} isPro={isPro} />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          More events coming soon. Check back regularly!
        </Text>
      </View>
    </ScrollView>
  );
}

interface EventCardProps {
  event: EventItem;
  isPro: boolean;
}

function EventCard({ event, isPro }: EventCardProps) {
  const formatDate = (dateISO: string) => {
    try {
      const date = new Date(dateISO);
      if (isNaN(date.getTime())) return 'TBD';

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'TBD';
    }
  };

  const formatTime = (dateISO: string) => {
    try {
      const date = new Date(dateISO);
      if (isNaN(date.getTime())) return '';

      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.eventCard}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} event on ${formatDate(event.dateISO)}${event.city ? ` in ${event.city}` : ''}`}
      accessibilityHint="Tap to view event details"
    >
      <View style={styles.eventHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={24} color={colors.accent} />
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventMeta}>
            <Text style={styles.eventDate}>
              {formatDate(event.dateISO)}
            </Text>
            {formatTime(event.dateISO) && (
              <>
                <Text style={styles.eventMetaSeparator}>•</Text>
                <Text style={styles.eventTime}>
                  {formatTime(event.dateISO)}
                </Text>
              </>
            )}
          </View>
          {event.city && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color={colors.textMuted} />
              <Text style={styles.eventLocation}>{event.city}</Text>
            </View>
          )}
        </View>
      </View>

      {isPro && (
        <View
          style={styles.discountBadge}
          accessible={true}
          accessibilityLabel="PRO member discount available"
        >
          <Text style={styles.discountText}>PRO Discount</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.registerButton}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Learn more about this event"
      >
        <Text style={styles.registerButtonText}>Learn More</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  proBadgeText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  eventMetaSeparator: {
    fontSize: 14,
    color: colors.textMuted,
  },
  eventTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: colors.textMuted,
  },
  discountBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bg,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
