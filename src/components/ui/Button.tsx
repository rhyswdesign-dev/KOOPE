import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../../theme/tokens';

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';

// Button sizes
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  // Content
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';

  // State
  loading?: boolean;
  disabled?: boolean;

  // Layout
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;

  // Events
  onPress: () => void;

  // Style overrides
  style?: ViewStyle;
  textStyle?: TextStyle;

  // Accessibility
  accessibilityLabel?: string;
}

// Size configurations
const SIZES: Record<ButtonSize, { height: number; fontSize: number; paddingHorizontal: number; iconSize: number }> = {
  small: {
    height: 36,
    fontSize: fonts.small,
    paddingHorizontal: spacing(2),
    iconSize: 16,
  },
  medium: {
    height: 48,
    fontSize: fonts.body,
    paddingHorizontal: spacing(3),
    iconSize: 20,
  },
  large: {
    height: 56,
    fontSize: fonts.h3,
    paddingHorizontal: spacing(4),
    iconSize: 24,
  },
};

// Variant configurations
const VARIANTS: Record<ButtonVariant, {
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  textColor: string;
  fontWeight: TextStyle['fontWeight'];
}> = {
  primary: {
    backgroundColor: colors.accent,
    textColor: colors.white,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
    borderWidth: 1.5,
    textColor: colors.accent,
    fontWeight: '600',
  },
  tertiary: {
    backgroundColor: colors.card,
    textColor: colors.text,
    fontWeight: '600',
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: colors.text,
    fontWeight: '600',
  },
  danger: {
    backgroundColor: colors.error,
    textColor: colors.white,
    fontWeight: '700',
  },
};

const Button: React.FC<ButtonProps> = ({
  title,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  variant = 'primary',
  onPress,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const sizeConfig = SIZES[size];
  const variantConfig = VARIANTS[variant];

  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    backgroundColor: variantConfig.backgroundColor,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    ...(variantConfig.borderWidth && {
      borderWidth: variantConfig.borderWidth,
      borderColor: variantConfig.borderColor,
    }),
    ...(fullWidth && { width: '100%' }),
    ...(isDisabled && { opacity: 0.5 }),
  };

  const textStyleComputed: TextStyle = {
    fontSize: sizeConfig.fontSize,
    fontWeight: variantConfig.fontWeight,
    color: variantConfig.textColor,
  };

  const renderIcon = (position: 'left' | 'right') => {
    if (!icon || iconPosition !== position) return null;
    if (loading && position === 'left') return null;

    return (
      <Ionicons
        name={icon}
        size={sizeConfig.iconSize}
        color={variantConfig.textColor}
      />
    );
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantConfig.textColor}
          style={styles.loader}
        />
      ) : (
        renderIcon('left')
      )}
      <Text style={[textStyleComputed, textStyle]}>{title}</Text>
      {renderIcon('right')}
    </TouchableOpacity>
  );
};

// Convenience components for common variants
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="secondary" />
);

export const TertiaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="tertiary" />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="ghost" />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="danger" />
);

const styles = StyleSheet.create({
  loader: {
    marginRight: spacing(0.5),
  },
});

export default Button;
