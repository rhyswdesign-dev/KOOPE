/**
 * TIER COMPARISON CARD
 * Reusable component for displaying subscription tier information
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme/tokens';

interface TierComparisonCardProps {
  name: string;
  priceLabel: string;
  tagline?: string;
  bulletPoints: string[];
  recommended?: boolean;
  badge?: string;
  color: string;
  priceDetail?: string;
  onPress: () => void;
  isCurrent?: boolean;
  disabled?: boolean;
  buttonText?: string;
}

/**
 * TierComparisonCard Component
 *
 * Displays a subscription tier with pricing, features, and CTA button
 * Supports "recommended" badge and current subscription state
 */
export default function TierComparisonCard({
  name,
  priceLabel,
  tagline,
  bulletPoints,
  recommended = false,
  badge,
  color,
  priceDetail,
  onPress,
  isCurrent = false,
  disabled = false,
  buttonText,
}: TierComparisonCardProps) {

  // Default button text based on state
  const defaultButtonText = isCurrent ? 'Current Plan' : 'Select Plan';
  const displayButtonText = buttonText || defaultButtonText;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: recommended ? color : '#374151',
        },
      ]}
    >
      {/* Badge (Most Popular, Elite, etc) */}
      {badge && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      {/* Header Section */}
      <View style={styles.header}>
        {/* Left: Name & Tagline */}
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color }]}>{name}</Text>
          {tagline && (
            <Text style={styles.tagline}>{tagline}</Text>
          )}
        </View>

        {/* Right: Price */}
        <View style={styles.headerRight}>
          <Text style={[styles.priceLabel, { color }]}>{priceLabel}</Text>
          {priceDetail && (
            <Text style={styles.priceDetail}>{priceDetail}</Text>
          )}
        </View>
      </View>

      {/* Bullet Points */}
      <View style={styles.bulletContainer}>
        {bulletPoints.map((point, index) => (
          <View key={index} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color={color} />
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isCurrent ? '#3A3F45' : color,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled || isCurrent}
      >
        <Text
          style={[
            styles.buttonText,
            { color: isCurrent ? '#8B8B8B' : '#000000' },
          ]}
        >
          {displayButtonText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 2,
    padding: spacing(4),
    width: '100%',
    backgroundColor: '#1A1D23',
    marginBottom: spacing(3),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: 12,
    marginBottom: spacing(2),
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(3),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    marginLeft: spacing(2),
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: spacing(0.5),
  },
  tagline: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  priceLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  priceDetail: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  bulletContainer: {
    gap: spacing(1.5),
    marginBottom: spacing(3),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  bulletText: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
    flex: 1,
  },
  button: {
    paddingVertical: spacing(2.5),
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing(1),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
