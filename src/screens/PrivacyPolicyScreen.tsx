/**
 * PRIVACY POLICY SCREEN
 * Displays privacy policy content with search and anchor navigation
 * Marks policy as seen when viewed
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MarkdownView from '../components/MarkdownView';
import { useConsent } from '../hooks/useConsent';
import { colors, spacing, radii } from '../theme/tokens';
import type { PolicyDeepLink } from '../types/consent';
import { log } from '../lib/logger';

interface RouteParams {
  anchor?: string;
  lang?: string;
}

/**
 * Privacy Policy screen with markdown content, search, and version tracking
 */
export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { markPrivacySeen } = useConsent();
  const routeParams = route.params as RouteParams | undefined;

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  /**
   * Load privacy policy markdown content
   */
  const loadPrivacyPolicy = async () => {
    try {
      setLoading(true);
      setError(null);

      // For this implementation, we'll use the content we created
      // In production, you'd load from bundled assets or fetch from server
      const markdownContent = `---
title: Privacy Policy
updated: 2025-09-20
version: 1.0.0
language: en-CA
---

# Privacy Policy

**Effective Date:** September 20, 2025
**Last Updated:** September 20, 2025

## Introduction

Home Game Advantage ("we," "our," or "us") is committed to protecting your privacy and ensuring you have a positive experience on our bartending education mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.

By using our App, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

### Personal Information

When you create an account or use our App, we may collect:

- **Account Information**: Username, email address, profile preferences
- **Learning Progress**: Lesson completion, scores, achievements, and learning statistics
- **Device Information**: Device type, operating system, app version, and unique device identifiers
- **Usage Data**: How you interact with the App, features used, and time spent

### Automatically Collected Information

We automatically collect certain information when you use our App:

- **Device Identifiers**: Unique device and installation identifiers for app functionality
- **Usage Analytics**: App performance, feature usage, and user behavior patterns
- **Technical Data**: IP address (when applicable), device specifications, and app crash reports

## Tracking Technologies

As a mobile application, we use the following tracking technologies:

### Device Identifiers
- **Installation ID**: Unique identifier for your app installation
- **Device ID**: Platform-specific device identifiers (iOS IDFA, Android Advertising ID)
- **User ID**: Internal identifier for your account and progress

### Analytics SDKs
- **Performance Monitoring**: Crash reporting and performance analytics
- **Usage Analytics**: Feature usage and user behavior analysis
- **A/B Testing**: Testing different app versions to improve user experience

## Your Privacy Rights

Depending on your location, you may have the following rights regarding your personal information:

### General Rights
- **Access**: Request a copy of the personal information we hold about you
- **Correction**: Request that we correct any inaccurate or incomplete information
- **Deletion**: Request that we delete your personal information
- **Portability**: Request a copy of your data in a machine-readable format

### For Quebec Residents (Law 25)
- Right to request information about the collection and use of personal information
- Right to access and rectify personal information
- Right to request cessation of use or disclosure of personal information
- Right to portability of personal information

## Contact Us

If you have any questions about this Privacy Policy, please contact us:

**Email**: privacy@homegameadvantage.com
**Support**: support@homegameadvantage.com

**Personne responsable de la protection des renseignements personnels** (Quebec Law 25):
Privacy Officer
Email: privacy@homegameadvantage.com`;

      // Parse front-matter to extract metadata
      const { content: parsedContent, metadata } = parseFrontMatter(markdownContent);

      setContent(parsedContent);
      setFilteredContent(parsedContent);
      setLastUpdated(metadata.updated || 'September 20, 2025');

      // Mark privacy policy as seen
      await markPrivacySeen();

    } catch (err) {
      log.error('PrivacyPolicyScreen', 'Failed to load privacy policy', err);
      setError('Failed to load privacy policy. Please try again.');
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
   * Filter content based on search query
   */
  const filterContent = (query: string) => {
    if (!query.trim()) {
      setFilteredContent(content);
      return;
    }

    // Simple search: highlight sections containing the query
    const lines = content.split('\n');
    const filteredLines: string[] = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        // Add context before and after
        const start = Math.max(0, index - 2);
        const end = Math.min(lines.length - 1, index + 2);

        for (let i = start; i <= end; i++) {
          if (!filteredLines.includes(lines[i])) {
            filteredLines.push(lines[i]);
          }
        }
      }
    });

    setFilteredContent(filteredLines.length > 0 ? filteredLines.join('\n') : 'No matches found.');
  };

  /**
   * Handle search input changes
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    filterContent(query);
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
    loadPrivacyPolicy();
  }, []);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      title: 'Privacy Policy',
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
          <Text style={styles.loadingText}>Loading Privacy Policy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Error Loading Policy</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search privacy policy..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          ) : null}
        </View>

        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {lastUpdated}
          </Text>
        )}
      </View>

      {/* Content */}
      <MarkdownView
        content={filteredContent}
        scrollToAnchor={routeParams?.anchor}
        onLinkPress={handleLinkPress}
      />
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

  // Search
  searchContainer: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.card,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing(1),
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: spacing(0.5),
  },
  lastUpdated: {
    marginTop: spacing(1),
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
  },
});