import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/states/EmptyState';

export default function GameDetailsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        variant="comingSoon"
        title="Game Details"
        description="Detailed game instructions, rules, and variations are on the way. Check back soon!"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});