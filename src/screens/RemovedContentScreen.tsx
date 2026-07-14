/**
 * RemovedContentScreen
 *
 * Real, minimal placeholder for Kill List destinations (Master Plan §2.4).
 * Replaces the previous `LegacyRemovedContentScreen` alias, which silently
 * rendered the recipe catalog under a mismatched header — a room that still
 * looked live even though it had been killed. This screen says plainly that
 * the feature is gone and gets the user back to the app's front door.
 */
import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii } from '../theme/tokens';

export default function RemovedContentScreen() {
  const nav = useNavigation<any>();

  const goToCamera = () => {
    // Bubbles up to the root stack regardless of how deeply this screen is
    // nested (mirrors the pattern used for post-onboarding camera handoff).
    nav.navigate('Main', { screen: 'Camera' });
  };

  return (
    <View style={styles.container}>
      <Ionicons name="archive-outline" size={40} color={colors.subtext} />
      <Text style={styles.title}>This feature has been retired</Text>
      <Text style={styles.body}>
        We removed this to keep KŌOPE honest — nothing here to see.
      </Text>
      <Pressable style={styles.button} onPress={goToCamera} hitSlop={12}>
        <Text style={styles.buttonText}>Back to Camera</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  buttonText: {
    color: colors.goldText,
    fontSize: 15,
    fontWeight: '700',
  },
});
