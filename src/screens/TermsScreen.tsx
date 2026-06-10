/**
 * TERMS OF SERVICE SCREEN
 * Displays terms content with acceptance tracking and version management
 * Requires explicit checkbox agreement on first run or version changes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MarkdownView from '../components/MarkdownView';
import { useConsent } from '../hooks/useConsent';
import { colors, spacing, radii } from '../theme/tokens';
import { TERMS_VERSION } from '../../config/privacy';
import { log } from '../lib/logger';

interface RouteParams {
  anchor?: string;
  lang?: string;
}

/**
 * Terms of Service screen with mandatory acceptance tracking
 */
export default function TermsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { hasAcceptedCurrentTerms, markTermsAccepted } = useConsent();
  const routeParams = route.params as RouteParams | undefined;

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  /**
   * Load terms of service markdown content
   */
  const loadTermsContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // For this implementation, we'll use embedded content
      // In production, you'd load from bundled assets or fetch from server
      const markdownContent = `---
title: Terms of Service
updated: 2026-05-31
version: 2026-05-31
language: en-CA
---

# Terms of Service

**Last Updated:** 31 May 2026

## Acceptance

By accessing or using KŌOPE, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.

## Eligibility

You must be of legal drinking age in your jurisdiction to access alcohol-related content within KŌOPE. By using the app, you confirm that you meet this requirement.

## Accounts

You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorised use.

## User-Generated Content

KŌOPE allows you to create and store content such as bottle scans and inventory data. You retain ownership of your content. By submitting content, you grant KŌOPE a limited licence to store and process it solely to provide the service.

## Subscriptions and Billing

Certain features require a paid subscription. Pricing, billing periods, and renewal terms are displayed before purchase. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are handled in accordance with applicable app store policies (Apple App Store or Google Play). To cancel, manage your subscription through your device’s app store settings.

## Intellectual Property

All KŌOPE branding, content, software, graphics, and educational materials are the property of KŌOPE or its licensors. You may not reproduce, distribute, or create derivative works without prior written permission.

## Responsible Consumption

KŌOPE promotes the responsible enjoyment of alcoholic beverages. You are solely responsible for your consumption decisions. Nothing in the app constitutes professional advice regarding alcohol consumption.

## Disclaimer and Limitation of Liability

KŌOPE is provided on an “as is” and “as available” basis without warranties of any kind. To the maximum extent permitted by law, KŌOPE shall not be liable for indirect, incidental, or consequential damages arising from use of the service.

## Governing Law

These Terms are governed by and construed in accordance with the laws of the Province of Ontario, Canada. Any disputes arising from these Terms shall be resolved in the courts of Ontario, Canada.

## Changes to These Terms

We may update these Terms periodically. We will notify you of material changes via the app or email. Continued use of KŌOPE after changes take effect constitutes acceptance of the revised Terms.

## Contact

Questions regarding these Terms may be directed to legal@koope.com.

**By using KŌOPE, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**`;

      // Parse front-matter to extract metadata
      const { content: parsedContent, metadata } = parseFrontMatter(markdownContent);

      setContent(parsedContent);
      setLastUpdated(metadata.updated || '2026-05-31');

      // Check if user has already accepted current terms
      const hasAcceptedCurrent = await hasAcceptedCurrentTerms;
      setHasAccepted(hasAcceptedCurrent);

    } catch (err) {
      log.error('TermsScreen', 'Failed to load terms', err as Error);
      setError('Failed to load terms of service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse front-matter from markdown content
   */
  const parseFrontMatter = (content: string) => {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);

    if (match) {
      const frontMatter = match[1];
      const markdownContent = match[2];

      // Parse YAML-like front-matter
      const metadata: Record<string, string> = {};
      frontMatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      });

      return {
        content: markdownContent,
        metadata,
      };
    }

    return {
      content,
      metadata: {},
    };
  };

  /**
   * Handle terms acceptance
   */
  const handleAcceptTerms = async () => {
    try {
      setIsAccepting(true);

      await markTermsAccepted();
      setHasAccepted(true);

      Alert.alert(
        'Terms Accepted',
        'Thank you for accepting our Terms of Service.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or to a specific screen if needed
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (err) {
      log.error('TermsScreen', 'Failed to accept terms', err as Error);
      Alert.alert('Error', 'Failed to save your acceptance. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Handle link presses in markdown content
   */
  const handleLinkPress = (url: string) => {
    if (url.startsWith('#')) {
      // Internal anchor link - handled by MarkdownView
      return;
    }

    if (url.startsWith('mailto:')) {
      // Email link
      Alert.alert('Contact', `Would you like to send an email to ${url.replace('mailto:', '')}?`);
      return;
    }

    // External link
    Alert.alert('External Link', 'This link leads to an external website.');
  };

  // Load content on mount
  useEffect(() => {
    loadTermsContent();
  }, []);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      title: 'Terms of Service',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
    });
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading Terms of Service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Error Loading Terms</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with version info */}
      <View style={styles.headerContainer}>
        <Text style={styles.versionText}>Version: {TERMS_VERSION}</Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
        )}
        {hasAccepted && (
          <View style={styles.acceptedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.acceptedText}>Accepted</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <MarkdownView
          content={content}
          scrollToAnchor={routeParams?.anchor}
          onLinkPress={handleLinkPress}
        />
      </View>

      {/* Acceptance Section */}
      {!hasAccepted && (
        <View style={styles.acceptanceContainer}>
          <View style={styles.acceptanceCard}>
            <View style={styles.checkboxContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.warning} />
              <Text style={styles.acceptanceText}>
                You must read and accept these Terms of Service to continue using the app.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                isAccepting && styles.acceptButtonDisabled,
              ]}
              onPress={handleAcceptTerms}
              disabled={isAccepting}
              activeOpacity={0.8}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                  <Text style={styles.acceptButtonText}>
                    I Accept These Terms of Service
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  loadingText: {
    marginTop: spacing(2),
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  errorText: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header
  headerContainer: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionText: {
    fontSize: 12,
    color: colors.subtext,
    fontFamily: 'monospace',
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.subtext,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  acceptedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginLeft: spacing(0.5),
  },

  // Content
  contentContainer: {
    flex: 1,
  },

  // Acceptance
  acceptanceContainer: {
    padding: spacing(2),
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  acceptanceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
  },
  acceptanceText: {
    flex: 1,
    marginLeft: spacing(1.5),
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
  },
  acceptButtonDisabled: {
    backgroundColor: colors.subtext,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
