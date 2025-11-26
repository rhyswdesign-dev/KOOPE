/**
 * OFFLINE INDICATOR
 * Shows network status and sync state to user
 * Provides feedback when offline and when syncing
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { offlineService, NetworkStatus } from '../services/offlineService';

interface OfflineIndicatorProps {
  style?: any;
}

/**
 * OfflineIndicator Component
 *
 * Displays a banner when device is offline or syncing
 */
export default function OfflineIndicator({ style }: OfflineIndicatorProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineService.getNetworkStatus()
  );
  const [queueSize, setQueueSize] = useState(offlineService.getQueueSize());
  const [showBanner, setShowBanner] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = offlineService.addNetworkListener((status) => {
      setNetworkStatus(status);
      setQueueSize(offlineService.getQueueSize());
    });

    // Check initial state
    setShowBanner(!offlineService.isOnline() || offlineService.getQueueSize() > 0);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const shouldShow = !networkStatus.isConnected || queueSize > 0;

    if (shouldShow !== showBanner) {
      setShowBanner(shouldShow);

      Animated.spring(slideAnim, {
        toValue: shouldShow ? 0 : -100,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [networkStatus.isConnected, queueSize]);

  const handleSync = () => {
    if (networkStatus.isConnected) {
      offlineService.syncOfflineQueue();
      setQueueSize(offlineService.getQueueSize());
    }
  };

  if (!showBanner) {
    return null;
  }

  const isOffline = !networkStatus.isConnected;
  const hasPendingSync = queueSize > 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOffline ? colors.error : colors.warning,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isOffline ? 'cloud-offline' : 'cloud-upload'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.text}>
          {isOffline
            ? 'You are offline - Changes will sync when connected'
            : hasPendingSync
            ? `${queueSize} ${queueSize === 1 ? 'change' : 'changes'} pending sync`
            : 'Connected'}
        </Text>
      </View>

      {hasPendingSync && networkStatus.isConnected && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  syncButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
