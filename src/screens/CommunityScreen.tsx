import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="people-outline" size={44} color={colors.accent} />
      <Text style={styles.title}>Community Coming Soon</Text>
      <Text style={styles.subtitle}>
        We are building this space for bartender stories, tips, and challenges.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  title: {
    marginTop: spacing(2),
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing(1),
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
