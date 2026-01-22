import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

type PillButtonVariant = 'filled' | 'outline' | 'ghost';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

// Utility to calculate luminance for accessible text color
const getLuminance = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

const getTextColor = (backgroundColor: string): string => {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const BrandPillButton: React.FC<PillButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  style,
  textStyle,
  disabled = false,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'outline':
        return [styles.button, styles.outline, style];
      case 'ghost':
        return [styles.button, styles.ghost, style];
      default:
        return [styles.button, styles.filled, style];
    }
  };

  const getTextStyle = () => {
    const baseTextColor = variant === 'filled' ? getTextColor(colors.accent) : colors.accent;

    switch (variant) {
      case 'outline':
        return [styles.text, { color: colors.accent }, textStyle];
      case 'ghost':
        return [styles.text, { color: colors.accent }, textStyle];
      default:
        return [styles.text, { color: baseTextColor }, textStyle];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.7}
    >
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: radii.full,
    paddingHorizontal: spacing(2),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  filled: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BrandPillButton;