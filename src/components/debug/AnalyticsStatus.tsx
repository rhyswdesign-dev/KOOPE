// @ts-nocheck
/**
 * Analytics Status Component
 * Shows analytics provider status for debugging
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { useAnalyticsContext } from '../../context/AnalyticsContext';
import { log } from '../../lib/logger';

interface AnalyticsStatusProps {
  showDetails?: boolean;
}

export const AnalyticsStatus: React.FC<AnalyticsStatusProps> = ({ showDetails = false }) => {
  const { isInitialized, provider, error, track } = useAnalyticsContext();

  const getStatusColor = () => {
    if (error) return colors.error;
    if (isInitialized) return colors.success;
    return colors.warning;
  };

  const getStatusIcon = () => {
    if (error) return 'warning-outline';
    if (isInitialized) return 'analytics-outline';
    return 'time-outline';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isInitialized) return `${provider} Ready`;
    return 'Initializing...';
  };

  const sendTestEvent = async () => {
    try {
      await track({
        type: 'screen.viewed',
        screenName: 'AnalyticsStatus',
        properties: { source: 'debug' }
      });
      log.info('AnalyticsStatus', 'Test analytics event sent');
    } catch (error) {
      log.error('AnalyticsStatus', 'Failed to send test event', error);
    }
  };

  if (!showDetails) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons 
          name={getStatusIcon()} 
          size={16} 
          color={getStatusColor()} 
        />
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          Analytics
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <Ionicons 
            name={getStatusIcon()} 
            size={20} 
            color={getStatusColor()} 
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        {isInitialized && (
          <Pressable 
            style={styles.testButton}
            onPress={sendTestEvent}
          >
            <Ionicons name="send-outline" size={16} color={colors.primary} />
            <Text style={styles.testText}>Test</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Provider: {provider}
        </Text>
        
        {isInitialized && (
          <Text style={styles.infoText}>
            ✓ Event tracking active
          </Text>
        )}
        
        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>

      <View style={styles.eventTypes}>
        <Text style={styles.sectionTitle}>Tracked Events:</Text>
        <Text style={styles.eventText}>• Lesson start/complete</Text>
        <Text style={styles.eventText}>• Item attempts</Text>
        <Text style={styles.eventText}>• Screen views</Text>
        <Text style={styles.eventText}>• Audio plays</Text>
        <Text style={styles.eventText}>• Vault interactions</Text>
        <Text style={styles.eventText}>• Search queries</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.medium,
    padding: spacing(3),
    marginVertical: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.primary + '20',
    borderRadius: radii.small,
  },
  testText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  details: {
    marginBottom: spacing(3),
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing(1),
  },
  infoText: {
    fontSize: 12,
    color: colors.success,
    marginBottom: spacing(1),
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontStyle: 'italic',
  },
  eventTypes: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(2),
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  eventText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing(0.5),
  },
});

export default AnalyticsStatus;