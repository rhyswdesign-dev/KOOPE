/**
 * EMPTY STATE COMPONENT
 * Professional empty state designs with contextual illustrations and actions
 * Provides different empty states for various app scenarios
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface EmptyStateProps {
  variant?: 'search' | 'favorites' | 'history' | 'lessons' | 'vault' | 'notifications' | 'recipes' | 'network' | 'generic' | 'comingSoon' | 'noContent';
  type?: 'search' | 'favorites' | 'history' | 'lessons' | 'vault' | 'notifications' | 'recipes' | 'network' | 'generic' | 'comingSoon' | 'noContent';
  title?: string;
  message?: string;
  description?: string;
  icon?: string;
  actionText?: string;
  action?: { label: string; onPress: () => void };
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  illustration?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark' | 'accent';
}

const { width: screenWidth } = Dimensions.get('window');

interface EmptyStateConfig {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  secondaryActionText?: string;
}

const EMPTY_STATE_CONFIGS: Record<NonNullable<EmptyStateProps['type']>, EmptyStateConfig> = {
  search: {
    icon: 'search',
    title: 'No results found',
    message: 'We couldn\'t find any cocktails matching your search. Try different keywords or explore our featured recipes.',
    actionText: 'Browse Featured',
    secondaryActionText: 'Clear Filters',
  },
  favorites: {
    icon: 'heart-outline',
    title: 'No favorites yet',
    message: 'Start building your collection by favoriting cocktails you love. Tap the heart icon on any recipe!',
    actionText: 'Explore Recipes',
    secondaryActionText: 'Get Recommendations',
  },
  history: {
    icon: 'time-outline',
    title: 'No history yet',
    message: 'Your search history will appear here as you explore cocktails and recipes.',
    actionText: 'Start Searching',
  },
  lessons: {
    icon: 'school-outline',
    title: 'Ready to learn?',
    message: 'Begin your bartending journey with our interactive lessons. Master the fundamentals and advanced techniques.',
    actionText: 'Start First Lesson',
    secondaryActionText: 'View Curriculum',
  },
  vault: {
    icon: 'trophy-outline',
    title: 'Your vault awaits',
    message: 'Complete lessons and challenges to unlock exclusive recipes, tools, and bartending secrets.',
    actionText: 'Take a Lesson',
    secondaryActionText: 'Learn About XP',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'All caught up!',
    message: 'You\'re all up to date. We\'ll notify you about new content, achievements, and reminders.',
    actionText: 'Notification Settings',
  },
  recipes: {
    icon: 'restaurant-outline',
    title: 'No recipes found',
    message: 'There are no recipes in this category yet. Check back soon for new additions!',
    actionText: 'Browse All Recipes',
    secondaryActionText: 'Submit Recipe',
  },
  network: {
    icon: 'wifi-outline',
    title: 'Connection trouble',
    message: 'Unable to load content. Please check your internet connection and try again.',
    actionText: 'Try Again',
    secondaryActionText: 'Go Offline',
  },
  generic: {
    icon: 'folder-outline',
    title: 'Nothing here yet',
    message: 'This section is empty, but don\'t worry - there\'s plenty to explore elsewhere!',
    actionText: 'Explore App',
  },
  comingSoon: {
    icon: 'hourglass-outline',
    title: 'Not available in this build',
    message: 'This feature is not enabled in the current release build.',
  },
  noContent: {
    icon: 'document-outline',
    title: 'No Content Yet',
    message: 'There\'s nothing to display right now. Check back later for updates!',
  },
};

export default function EmptyState({
  variant,
  type = 'generic',
  title,
  message,
  description,
  icon,
  actionText,
  action,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  illustration,
  size = 'medium',
  theme = 'light',
}: EmptyStateProps) {
  const stateType = variant || type;
  const config = EMPTY_STATE_CONFIGS[stateType];

  const displayTitle = title || config.title;
  const displayMessage = description || message || config.message;
  const displayIcon = icon || config.icon;
  const displayActionText = action?.label || actionText || config.actionText;
  const handleAction = action?.onPress || onAction;
  const displaySecondaryActionText = secondaryActionText || config.secondaryActionText;

  const getIconSize = () => {
    switch (size) {
      case 'small': return 48;
      case 'large': return 96;
      default: return 72;
    }
  };

  const getContainerStyle = () => {
    const baseStyle: ViewStyle[] = [styles.container];

    if (theme === 'dark') {
      baseStyle.push(styles.darkContainer);
    } else if (theme === 'accent') {
      baseStyle.push(styles.accentContainer);
    }

    if (size === 'small') {
      baseStyle.push(styles.smallContainer);
    }

    return baseStyle;
  };

  const getTextStyles = () => {
    const titleStyle: TextStyle[] = [styles.title];
    const messageStyle: TextStyle[] = [styles.message];

    if (theme === 'dark') {
      titleStyle.push(styles.darkTitle);
      messageStyle.push(styles.darkMessage);
    } else if (theme === 'accent') {
      titleStyle.push(styles.accentTitle);
      messageStyle.push(styles.accentMessage);
    }

    if (size === 'small') {
      titleStyle.push(styles.smallTitle);
      messageStyle.push(styles.smallMessage);
    }

    return { titleStyle, messageStyle };
  };

  const getIconColor = () => {
    switch (theme) {
      case 'dark': return colors.white;
      case 'accent': return colors.white;
      default: return colors.subtext;
    }
  };

  const { titleStyle, messageStyle } = getTextStyles();

  const renderIllustration = () => {
    if (illustration) {
      return <View style={styles.illustrationContainer}>{illustration}</View>;
    }

    return (
      <View style={[styles.iconContainer, size === 'small' && styles.smallIconContainer]}>
        <View style={[styles.iconBackground, theme === 'accent' && styles.accentIconBackground]}>
          <Ionicons
            name={displayIcon as keyof typeof Ionicons.glyphMap}
            size={getIconSize()}
            color={getIconColor()}
          />
        </View>
      </View>
    );
  };

  const renderActions = () => {
    if (!displayActionText && !displaySecondaryActionText) {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {displayActionText && (
          <TouchableOpacity
            style={[
              styles.primaryAction,
              theme === 'accent' && styles.accentPrimaryAction,
              size === 'small' && styles.smallAction,
            ]}
            onPress={handleAction}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.primaryActionText,
                theme === 'accent' && styles.accentPrimaryActionText,
                size === 'small' && styles.smallActionText,
              ]}
            >
              {displayActionText}
            </Text>
          </TouchableOpacity>
        )}

        {displaySecondaryActionText && (
          <TouchableOpacity
            style={[styles.secondaryAction, size === 'small' && styles.smallAction]}
            onPress={onSecondaryAction}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryActionText,
                theme === 'dark' && styles.darkSecondaryActionText,
                size === 'small' && styles.smallActionText,
              ]}
            >
              {displaySecondaryActionText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.content}>
        {renderIllustration()}

        <View style={styles.textContainer}>
          <Text style={titleStyle}>{displayTitle}</Text>
          <Text style={messageStyle}>{displayMessage}</Text>
        </View>

        {renderActions()}

        {/* Decorative elements for certain types */}
        {stateType === 'vault' && (
          <View style={styles.decorativeElements}>
            <View style={styles.sparkle1}>
              <Ionicons name="sparkles" size={16} color={colors.gold} />
            </View>
            <View style={styles.sparkle2}>
              <Ionicons name="sparkles" size={12} color={colors.gold} />
            </View>
            <View style={styles.sparkle3}>
              <Ionicons name="sparkles" size={14} color={colors.gold} />
            </View>
          </View>
        )}

        {stateType === 'lessons' && (
          <View style={styles.progressIndicator}>
            <View style={styles.progressDots}>
              {[0, 1, 2, 3, 4].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === 0 && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>Your journey starts here</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    backgroundColor: colors.bg,
  },
  darkContainer: {
    backgroundColor: colors.card,
  },
  accentContainer: {
    backgroundColor: colors.accent,
  },
  smallContainer: {
    padding: spacing(2),
    minHeight: 200,
  },
  content: {
    alignItems: 'center',
    maxWidth: screenWidth * 0.85,
    position: 'relative',
  },
  illustrationContainer: {
    marginBottom: spacing(3),
  },
  iconContainer: {
    marginBottom: spacing(3),
    alignItems: 'center',
  },
  smallIconContainer: {
    marginBottom: spacing(2),
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
  },
  accentIconBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  darkTitle: {
    color: colors.white,
  },
  accentTitle: {
    color: colors.white,
  },
  smallTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  darkMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  accentMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  smallMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: spacing(2),
    width: '100%',
  },
  primaryAction: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  accentPrimaryAction: {
    backgroundColor: colors.white,
  },
  smallAction: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    maxWidth: 200,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  accentPrimaryActionText: {
    color: colors.accent,
  },
  smallActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  darkSecondaryActionText: {
    color: colors.white,
  },
  // Decorative elements
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sparkle1: {
    position: 'absolute',
    top: '20%',
    right: '15%',
  },
  sparkle2: {
    position: 'absolute',
    top: '35%',
    left: '10%',
  },
  sparkle3: {
    position: 'absolute',
    bottom: '30%',
    right: '20%',
  },
  progressIndicator: {
    alignItems: 'center',
    marginTop: spacing(2),
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
});
