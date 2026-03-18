// @ts-nocheck
/**
 * TERMS & CONDITIONS SCREEN
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
 * Terms & Conditions screen with mandatory acceptance tracking
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
   * Load terms & conditions markdown content
   */
  const loadTermsContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // For this implementation, we'll use embedded content
      // In production, you'd load from bundled assets or fetch from server
      const markdownContent = `---
title: Terms & Conditions
updated: 2025-09-20
version: 1.0.0
language: en-CA
---

# Terms & Conditions

**Effective Date:** September 20, 2025
**Last Updated:** September 20, 2025

## Agreement to Terms

By downloading, installing, or using the Home Game Advantage mobile application (the "App"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, do not use our App.

## Description of Service

Home Game Advantage is a bartending education mobile application that provides:
- Interactive bartending lessons and tutorials
- Cocktail recipes and mixing techniques
- Progress tracking and achievement systems
- Educational content about spirits, wine, and beverage service

## Eligibility

You must be of legal drinking age in your jurisdiction to use this App. In the United States, this means you must be at least 21 years old. By using our App, you represent and warrant that you meet this requirement and have the legal capacity to enter into these Terms.

## User Accounts

### Account Creation
- You must provide accurate and complete information when creating an account
- You are responsible for maintaining the security of your account credentials
- You must notify us immediately of any unauthorized use of your account

### Account Responsibilities
- You are solely responsible for all activity that occurs under your account
- You may not share your account with others or allow others to use your account
- You must keep your account information current and accurate

## Acceptable Use

### Permitted Uses
You may use our App for:
- Personal, non-commercial educational purposes
- Learning bartending skills and techniques
- Tracking your progress and achievements
- Accessing recipes and educational content

### Prohibited Activities
You may not:
- **Violate Laws**: Use the App for any unlawful purpose or in violation of local, provincial, or federal laws
- **Infringe Rights**: Violate intellectual property rights or other proprietary rights
- **Harm Others**: Harass, abuse, or harm other users or individuals
- **Misuse Content**: Copy, distribute, or create derivative works from our content without permission
- **Reverse Engineer**: Attempt to reverse engineer, decompile, or disassemble the App
- **Circumvent Security**: Bypass or circumvent security measures or access controls

## Educational Content Disclaimer

### Not Professional Advice
- Our App provides educational content for informational purposes only
- Content should not be considered professional bartending or business advice
- We recommend seeking professional training for commercial bartending roles

### Responsible Service
- Users are responsible for understanding and complying with local alcohol service laws
- Always practice responsible alcohol service and consumption
- We do not encourage excessive alcohol consumption or service to minors

## Intellectual Property

### Our Content
- All content in the App, including recipes, lessons, images, and text, is owned by us or our licensors
- Our content is protected by copyright, trademark, and other intellectual property laws
- You may not use our content outside the App without our written permission

### Trademarks
- "Home Game Advantage" and our logos are trademarks of our company
- You may not use our trademarks without our prior written consent

## Disclaimers and Limitations

### Service Availability
- We strive to keep the App available but cannot guarantee uninterrupted service
- We may suspend or terminate the service for maintenance, updates, or other reasons

### Content Accuracy
- We make reasonable efforts to ensure content accuracy but cannot guarantee it
- Recipes and techniques may vary based on local preferences and regulations
- Users should verify information and use their judgment when applying techniques

### Limitation of Liability
To the maximum extent permitted by law:
- We are not liable for any indirect, incidental, or consequential damages
- Our total liability is limited to the amount you paid for the App (if any)
- We disclaim all warranties except those that cannot be legally excluded

## Termination

### Your Right to Terminate
You may stop using the App at any time and delete your account through the App settings.

### Our Right to Terminate
We may suspend or terminate your access to the App if you:
- Violate these Terms or our policies
- Engage in prohibited activities
- Pose a risk to other users or our systems

## Updates and Changes

### Terms Updates
- We may modify these Terms from time to time
- We will notify you of material changes through the App or other means
- Your continued use after changes constitutes acceptance of the new Terms

## Governing Law

These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles.

## Contact Information

If you have questions about these Terms, please contact us:

**Email**: support@homegameadvantage.com
**Legal**: legal@homegameadvantage.com

---

**By using the Home Game Advantage app, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.**`;

      // Parse front-matter to extract metadata
      const { content: parsedContent, metadata } = parseFrontMatter(markdownContent);

      setContent(parsedContent);
      setLastUpdated(metadata.updated || 'September 20, 2025');

      // Check if user has already accepted current terms
      const hasAcceptedCurrent = await hasAcceptedCurrentTerms;
      setHasAccepted(hasAcceptedCurrent);

    } catch (err) {
      log.error('TermsScreen', 'Failed to load terms', err as Error);
      setError('Failed to load terms & conditions. Please try again.');
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
        'Thank you for accepting our Terms & Conditions.',
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
      title: 'Terms & Conditions',
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
          <Text style={styles.loadingText}>Loading Terms & Conditions...</Text>
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
                You must read and accept these Terms & Conditions to continue using the app.
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
                    I Accept These Terms & Conditions
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

  // Colors for success/warning (since they might not be in your theme)
  success: '#10b981',
  warning: '#f59e0b',
});
