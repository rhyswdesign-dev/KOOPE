/**
 * Scan Counter Component
 * Displays remaining scans for free tier users
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface ScanCounterProps {
  scansRemaining: number;
  isPaidUser?: boolean;
  isGuest?: boolean;
}

export default function ScanCounter({ scansRemaining, isPaidUser, isGuest }: ScanCounterProps) {
  // Don't show counter for paid users (unlimited scans)
  if (isPaidUser) {
    return null;
  }

  // For guests, show default 10/10
  const displayRemaining = isGuest ? 10 : scansRemaining;
  const totalScans = 10;
  const isLow = displayRemaining <= 3;
  const isEmpty = displayRemaining === 0;

  return (
    <View style={[styles.container, isEmpty && styles.containerEmpty]}>
      <View style={styles.content}>
        <Ionicons
          name={isEmpty ? 'alert-circle' : 'scan-outline'}
          size={16}
          color={isEmpty ? colors.white : isLow ? '#FFA500' : colors.gold}
        />
        <Text style={[styles.text, isEmpty && styles.textEmpty]}>
          {isEmpty ? 'Limit reached' : `${displayRemaining}/${totalScans} scans left`}
        </Text>
      </View>
      {isGuest && (
        <Text style={styles.guestNote}>Sign in to track</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
  },
  containerEmpty: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderColor: '#DC3545',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  textEmpty: {
    color: colors.white,
  },
  guestNote: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing(0.5),
    fontStyle: 'italic',
  },
});
