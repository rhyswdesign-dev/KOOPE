/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly fallback UI
 * Logs errors for debugging
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { log } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
      errorInfo: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and logging service
    log.error('ErrorBoundary', 'React error caught', error, {
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              We encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorInfo}>{this.state.errorInfo}</Text>
                )}
              </View>
            )}

            <Pressable style={styles.button} onPress={this.handleReset}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>

            <Text style={styles.helpText}>
              If the problem persists, please contact support.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  content: {
    alignItems: 'center',
    maxWidth: 400,
  },

  title: {
    ...fonts.title,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  message: {
    ...fonts.body,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },

  errorDetails: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
    maxHeight: 200,
  },

  errorTitle: {
    ...fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },

  errorText: {
    ...fonts.caption,
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Courier',
    marginBottom: spacing.xs,
  },

  errorInfo: {
    ...fonts.caption,
    fontSize: 11,
    color: colors.text.disabled,
    fontFamily: 'Courier',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },

  buttonText: {
    ...fonts.button,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  helpText: {
    ...fonts.caption,
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});
