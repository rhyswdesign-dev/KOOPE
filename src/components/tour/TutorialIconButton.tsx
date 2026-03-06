import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../../theme/tokens';
import { withHaptic } from '../../lib/haptics';

interface TutorialIconButtonProps {
  onPress: () => void;
  size?: number;
  buttonSize?: number;
}

export default function TutorialIconButton({
  onPress,
  size = 18,
  buttonSize = 36,
}: TutorialIconButtonProps) {
  return (
    <Pressable
      onPress={withHaptic(onPress)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Open tutorials"
      style={({ pressed }) => [
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          opacity: pressed ? 1 : 0.66,
          transform: [{ scale: pressed ? 1.04 : 1 }],
        },
      ]}
    >
      <Ionicons name="help-circle-outline" size={size} color={colors.text} />
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
