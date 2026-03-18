// @ts-nocheck
/**
 * LOADING STATE COMPONENT
 * Professional loading indicators with animations and contextual messages
 * Provides different loading states for various app contexts
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface LoadingStateProps {
  type?: 'default' | 'splash' | 'content' | 'search' | 'upload' | 'lesson' | 'quiz';
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  progress?: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
  transparent?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const LOADING_MESSAGES = {
  default: {
    message: 'Loading...',
    subMessage: 'Please wait while we prepare everything',
  },
  splash: {
    message: 'Welcome to Home Game Advantage',
    subMessage: 'Your bartending journey begins here',
  },
  content: {
    message: 'Loading content...',
    subMessage: 'Fetching the latest cocktail recipes',
  },
  search: {
    message: 'Searching...',
    subMessage: 'Finding the perfect matches for you',
  },
  upload: {
    message: 'Uploading your creation...',
    subMessage: 'This may take a few moments',
  },
  lesson: {
    message: 'Preparing your lesson...',
    subMessage: 'Setting up interactive learning content',
  },
  quiz: {
    message: 'Loading quiz...',
    subMessage: 'Preparing questions to test your knowledge',
  },
};

export default function LoadingState({
  type = 'default',
  message,
  subMessage,
  showProgress = false,
  progress = 0,
  size = 'medium',
  overlay = false,
  transparent = false,
}: LoadingStateProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  const defaultMessages = LOADING_MESSAGES[type];
  const displayMessage = message || defaultMessages.message;
  const displaySubMessage = subMessage || defaultMessages.subMessage;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Continuous spin animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    // Pulse animation for splash
    if (type === 'splash') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    }

    return () => {
      spinAnimation.stop();
      scaleValue.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (showProgress) {
      Animated.timing(progressValue, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, showProgress]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getContainerStyle = () => {
    const baseStyle = [styles.container];

    if (overlay) {
      baseStyle.push(styles.overlay);
      if (transparent) {
        baseStyle.push(styles.transparent);
      }
    }

    if (type === 'splash') {
      baseStyle.push(styles.splashContainer);
    }

    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 64;
      default: return 48;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'splash': return 'wine';
      case 'search': return 'search';
      case 'upload': return 'cloud-upload';
      case 'lesson': return 'school';
      case 'quiz': return 'help-circle';
      default: return 'hourglass';
    }
  };

  const renderProgressBar = () => {
    if (!showProgress) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    );
  };

  const renderLoadingIndicator = () => {
    if (type === 'splash') {
      return (
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <Ionicons
            name={getIconName() as any}
            size={getIconSize()}
            color={colors.accent}
          />
        </Animated.View>
      );
    }

    if (size === 'small') {
      return (
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={styles.smallLoader}
        />
      );
    }

    return (
      <View style={styles.loaderContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <Ionicons
            name={getIconName() as any}
            size={getIconSize()}
            color={colors.accent}
          />
        </Animated.View>
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={styles.activityIndicator}
        />
      </View>
    );
  };

  return (
    <Animated.View style={[getContainerStyle(), { opacity: fadeValue }]}>
      <View style={styles.content}>
        {renderLoadingIndicator()}

        <View style={styles.messageContainer}>
          <Text style={[styles.message, size === 'small' && styles.smallMessage]}>
            {displayMessage}
          </Text>

          {displaySubMessage && size !== 'small' && (
            <Text style={styles.subMessage}>
              {displaySubMessage}
            </Text>
          )}
        </View>

        {renderProgressBar()}

        {type === 'splash' && (
          <View style={styles.splashFooter}>
            <Text style={styles.splashFooterText}>
              Crafting the perfect cocktail experience
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing(4),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  transparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  splashContainer: {
    backgroundColor: colors.accent,
  },
  content: {
    alignItems: 'center',
    maxWidth: screenWidth * 0.8,
  },
  loaderContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  activityIndicator: {
    position: 'absolute',
  },
  smallLoader: {
    marginBottom: spacing(1),
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  smallMessage: {
    fontSize: 16,
    fontWeight: '600',
  },
  subMessage: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing(2),
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing(1),
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  splashFooter: {
    position: 'absolute',
    bottom: spacing(8),
    alignItems: 'center',
  },
  splashFooterText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '500',
    opacity: 0.8,
  },
});