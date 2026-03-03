import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../../theme/tokens';

interface TutorialIconButtonProps {
  onPress: () => void;
  size?: number;
}

export default function TutorialIconButton({ onPress, size = 18 }: TutorialIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Open tutorials"
      style={styles.button}
    >
      <Ionicons name="compass-outline" size={size} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,31,23,0.92)',
    borderWidth: 1,
    borderColor: colors.line,
  },
});
