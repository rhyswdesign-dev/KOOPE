/**
 * ERROR STATE COMPONENT
 * Professional error handling with contextual messages and recovery actions
 * Provides different error states for various failure scenarios
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface ErrorStateProps {
  type?: 'network' | 'server' | 'auth' | 'notFound' | 'permission' | 'validation' | 'timeout' | 'generic';
  title?: string;
  message?: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  showDetails?: boolean;
  details?: string;
  size?: 'small' | 'medium' | 'large';
  severity?: 'low' | 'medium' | 'high';
}

const { width: screenWidth } = Dimensions.get('window');

interface ErrorConfig {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  secondaryActionText?: string;
  severity: 'low' | 'medium' | 'high';
}

const ERROR_CONFIGS: Record<NonNullable<ErrorStateProps['type']>, ErrorConfig> = {
  network: {
    icon: 'wifi-outline',
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again. Some features may not work offline.',
    actionText: 'Try Again',
    secondaryActionText: 'Go Offline',
    severity: 'medium' as const,
  },
  server: {
    icon: 'server-outline',
    title: 'Server Error',
    message: 'Our servers are experiencing issues. We\'re working to fix this as quickly as possible.',
    actionText: 'Try Again',
    secondaryActionText: 'Report Issue',
    severity: 'high' as const,
  },
  auth: {
    icon: 'lock-closed-outline',
    title: 'Authentication Required',
    message: 'You need to sign in to access this feature. Your session may have expired.',
    actionText: 'Sign In',
    secondaryActionText: 'Continue as Guest',
    severity: 'medium' as const,
  },
  notFound: {
    icon: 'search-outline',
    title: 'Content Not Found',
    message: 'The content you\'re looking for doesn\'t exist or has been moved. It might have been removed or renamed.',
    actionText: 'Go Back',
    secondaryActionText: 'Search Instead',
    severity: 'low' as const,
  },
  permission: {
    icon: 'shield-outline',
    title: 'Permission Denied',
    message: 'You don\'t have permission to access this content. Contact support if you think this is an error.',
    actionText: 'Contact Support',
    secondaryActionText: 'Go Back',
    severity: 'medium' as const,
  },
  validation: {
    icon: 'alert-circle-outline',
    title: 'Invalid Input',
    message: 'Please check your input and try again. Make sure all required fields are filled correctly.',
    actionText: 'Fix Input',
    severity: 'low' as const,
  },
  timeout: {
    icon: 'time-outline',
    title: 'Request Timeout',
    message: 'The request took too long to complete. This might be due to a slow connection or server issues.',
    actionText: 'Try Again',
    secondaryActionText: 'Check Connection',
    severity: 'medium' as const,
  },
  generic: {
    icon: 'warning-outline',
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    actionText: 'Try Again',
    secondaryActionText: 'Contact Support',
    severity: 'medium' as const,
  },
};

export default function ErrorState({
  type = 'generic',
  title,
  message,
  icon,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  showDetails = false,
  details,
  size = 'medium',
  severity,
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[type];
  const errorSeverity = severity || config.severity;

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayIcon = icon || config.icon;
  const displayActionText = actionText || config.actionText;
  const displaySecondaryActionText = secondaryActionText || config.secondaryActionText;

  const getIconSize = () => {
    switch (size) {
      case 'small': return 48;
      case 'large': return 96;
      default: return 72;
    }
  };

  const getSeverityColor = () => {
    switch (errorSeverity) {
      case 'low': return '#FF9800'; // Orange
      case 'high': return '#F44336'; // Red
      default: return '#FFC107'; // Amber
    }
  };

  const getSeverityBackgroundColor = () => {
    switch (errorSeverity) {
      case 'low': return '#FFF3E0';
      case 'high': return '#FFEBEE';
      default: return '#FFFDE7';
    }
  };

  const getContainerStyle = () => {
    const baseStyle: ViewStyle[] = [styles.container];

    if (size === 'small') {
      baseStyle.push(styles.smallContainer);
    }

    return baseStyle;
  };

  const renderErrorCode = () => {
    if (!showDetails || !details) return null;

    return (
      <View style={styles.detailsContainer}>
        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => {/* Toggle details visibility */}}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.subtext} />
          <Text style={styles.detailsToggleText}>Error Details</Text>
          <Ionicons name="chevron-down" size={16} color={colors.subtext} />
        </TouchableOpacity>
        <View style={styles.detailsContent}>
          <Text style={styles.detailsText}>{details}</Text>
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
              { backgroundColor: getSeverityColor() },
              size === 'small' && styles.smallAction,
            ]}
            onPress={onAction}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.primaryActionText,
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
                { color: getSeverityColor() },
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
        {/* Error Icon */}
        <View style={[styles.iconContainer, size === 'small' && styles.smallIconContainer]}>
          <View
            style={[
              styles.iconBackground,
              {
                backgroundColor: getSeverityBackgroundColor(),
                borderColor: getSeverityColor() + '40',
              },
            ]}
          >
            <Ionicons
              name={displayIcon as keyof typeof Ionicons.glyphMap}
              size={getIconSize()}
              color={getSeverityColor()}
            />
          </View>
        </View>

        {/* Error Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, size === 'small' && styles.smallTitle]}>
            {displayTitle}
          </Text>
          <Text style={[styles.message, size === 'small' && styles.smallMessage]}>
            {displayMessage}
          </Text>
        </View>

        {/* Error Details */}
        {renderErrorCode()}

        {/* Actions */}
        {renderActions()}

        {/* Helpful Tips */}
        {type === 'network' && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>• Check your WiFi or mobile data</Text>
              <Text style={styles.tipItem}>• Try moving to a different location</Text>
              <Text style={styles.tipItem}>• Restart your network connection</Text>
            </View>
          </View>
        )}

        {type === 'server' && (
          <View style={styles.statusContainer}>
            <TouchableOpacity style={styles.statusButton}>
              <Ionicons name="globe-outline" size={16} color={colors.accent} />
              <Text style={styles.statusButtonText}>Check Server Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Animated Error Illustration */}
        {type === 'notFound' && (
          <View style={styles.illustrationContainer}>
            <View style={styles.searchIllustration}>
              <Ionicons name="search" size={24} color={colors.subtext} />
              <View style={styles.magnifyingGlass}>
                <Ionicons name="close" size={16} color={colors.error} />
              </View>
            </View>
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
  smallContainer: {
    padding: spacing(2),
    minHeight: 200,
  },
  content: {
    alignItems: 'center',
    maxWidth: screenWidth * 0.85,
  },
  iconContainer: {
    marginBottom: spacing(3),
    alignItems: 'center',
  },
  smallIconContainer: {
    marginBottom: spacing(2),
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  smallTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  smallMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsContainer: {
    width: '100%',
    marginBottom: spacing(3),
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
    gap: spacing(0.5),
  },
  detailsToggleText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  detailsContent: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    marginTop: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailsText: {
    fontSize: 12,
    color: colors.subtext,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: spacing(2),
    width: '100%',
    marginBottom: spacing(3),
  },
  primaryAction: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
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
  },
  tipsContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  tipsList: {
    gap: spacing(0.5),
  },
  tipItem: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  statusButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  illustrationContainer: {
    marginTop: spacing(2),
  },
  searchIllustration: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  magnifyingGlass: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error + '20',
    borderRadius: 10,
    padding: spacing(0.25),
  },
});
