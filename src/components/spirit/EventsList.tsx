import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventItem } from '../../types/spirit';
import { log } from '../../lib/logger';

export default function EventsList({ items }: { items: EventItem[] }) {
  return (
    <View>
      {items.map((event, index) => (
        <View key={event.id || `event-${index}`} style={s.row}>
          <Ionicons name="calendar" size={24} color="#E58B2B" />
          <View style={s.content}>
            <Text style={s.title}>{event.title}</Text>
            <Text style={s.date}>
              {(() => {
                try {
                  const date = new Date(event.dateISO);
                  if (isNaN(date.getTime())) {
                    return 'TBD';
                  }
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  });
                } catch (error) {
                  log.warn('EventsList', 'Invalid date format', { dateISO: event.dateISO });
                  return 'TBD';
                }
              })()}
              {event.city && ` • ${event.city}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3B312A'
  },
  content: {
    flex: 1,
    marginLeft: 12
  },
  title: {
    color: '#F4ECE4',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  date: {
    color: '#C9BEB3',
    fontSize: 14
  }
});