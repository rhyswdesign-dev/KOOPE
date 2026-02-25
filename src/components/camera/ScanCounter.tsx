/**
 * Scan Counter / Scan Mode Badge
 * Shows the active scan mode for free vs paid users.
 * Free:  "BARCODE · FREE" badge — barcode + manual only
 * Paid:  hidden (unlimited AI scanning, no badge needed)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface ScanCounterProps {
  scansRemaining?: number; // kept for API compat, unused
  isPaidUser?: boolean;
  isGuest?: boolean;
}

export default function ScanCounter({ isPaidUser, isGuest }: ScanCounterProps) {
  // Paid users: unlimited AI scanning — no badge shown
  if (isPaidUser) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="barcode-outline" size={15} color={colors.gold} />
        <Text style={styles.text}>
          {isGuest ? 'BARCODE SCAN' : 'BARCODE · FREE'}
        </Text>
      </View>
      {isGuest && (
        <Text style={styles.guestNote}>Sign in to save</Text>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  guestNote: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing(0.5),
    fontStyle: 'italic',
  },
});
