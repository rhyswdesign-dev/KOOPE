// @ts-nocheck
/**
 * Firebase Status Component
 * Shows Firebase connection status for debugging
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { useFirebase } from '../../context/FirebaseContext';

interface FirebaseStatusProps {
  showDetails?: boolean;
}

export const FirebaseStatus: React.FC<FirebaseStatusProps> = ({ showDetails = false }) => {
  const { isConnected, isInitialized, latency, error, reconnect } = useFirebase();

  const getStatusColor = () => {
    if (!isInitialized) return colors.warning;
    if (error) return colors.error;
    if (isConnected) return colors.success;
    return colors.textSecondary;
  };

  const getStatusIcon = () => {
    if (!isInitialized) return 'time-outline';
    if (error) return 'warning-outline';
    if (isConnected) return 'checkmark-circle-outline';
    return 'close-circle-outline';
  };

  const getStatusText = () => {
    if (!isInitialized) return 'Initializing...';
    if (error) return 'Connection Error';
    if (isConnected) return 'Connected';
    return 'Disconnected';
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
          Firebase
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
        
        {error && (
          <Pressable 
            style={styles.reconnectButton}
            onPress={reconnect}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={styles.reconnectText}>Retry</Text>
          </Pressable>
        )}
      </View>

      {latency && (
        <Text style={styles.latencyText}>
          Latency: {latency}ms
        </Text>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      {isConnected && (
        <Text style={styles.infoText}>
          ✓ Real-time database ready
        </Text>
      )}
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
    marginBottom: spacing(2),
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
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.primary + '20',
    borderRadius: radii.small,
  },
  reconnectText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  latencyText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontStyle: 'italic',
    marginBottom: spacing(1),
  },
  infoText: {
    fontSize: 12,
    color: colors.success,
  },
});

export default FirebaseStatus;