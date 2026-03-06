/**
 * Audio-Enabled Button Component
 * A button that automatically plays sound effects on interaction
 */

import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { useAudio } from '../../hooks/useAudio';
import { triggerHaptic } from '../../lib/haptics';

interface AudioButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  soundEnabled?: boolean;
  customStyle?: ViewStyle;
  customTextStyle?: TextStyle;
  hapticFeedback?: boolean;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  soundEnabled = true,
  customStyle,
  customTextStyle,
  hapticFeedback = true,
}) => {
  const audio = useAudio();

  const handlePress = async () => {
    if (disabled || loading) return;

    // Play button tap sound
    if (soundEnabled) {
      audio.playButtonTap();
    }

    // Haptic feedback (on supported devices)
    if (hapticFeedback) {
      triggerHaptic('light');
    }

    // Execute the actual onPress function
    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };

    // Size variations
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = spacing(1.5);
        baseStyle.paddingHorizontal = spacing(3);
        break;
      case 'large':
        baseStyle.paddingVertical = spacing(4);
        baseStyle.paddingHorizontal = spacing(6);
        break;
      default: // medium
        baseStyle.paddingVertical = spacing(3);
        baseStyle.paddingHorizontal = spacing(4);
    }

    // Variant colors
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'success':
        baseStyle.backgroundColor = colors.success;
        break;
      case 'warning':
        baseStyle.backgroundColor = colors.warning;
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.error;
        break;
      default: // primary
        baseStyle.backgroundColor = colors.primary;
    }

    // Disabled state
    if (disabled) {
      baseStyle.backgroundColor = colors.border;
      baseStyle.shadowOpacity = 0;
      baseStyle.elevation = 0;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size variations
    switch (size) {
      case 'small':
        baseStyle.fontSize = 14;
        break;
      case 'large':
        baseStyle.fontSize = 18;
        break;
      default: // medium
        baseStyle.fontSize = 16;
    }

    // Text color
    baseStyle.color = disabled ? colors.textSecondary : colors.white;

    return baseStyle;
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const renderIcon = () => {
    if (!icon) return null;

    return (
      <Ionicons
        name={icon as any}
        size={getIconSize()}
        color={disabled ? colors.textSecondary : colors.white}
        style={iconPosition === 'left' ? { marginRight: spacing(2) } : { marginLeft: spacing(2) }}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[getTextStyle(), customTextStyle]}>Loading...</Text>
        </View>
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text style={[getTextStyle(), customTextStyle]}>{title}</Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        getButtonStyle(),
        customStyle,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AudioButton;
