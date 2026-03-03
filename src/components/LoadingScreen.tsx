/**
 * Loading Screen Component
 * Displays loading state with spinner and optional message
 * Used for full-screen loading states
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '../theme/tokens';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  size = 'large',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.accent} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    padding: spacing.xl,
  },

  message: {
    ...fonts.body,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
