/**
 * Offline Banner Component
 * Displays a banner when the app is offline
 * Uses the offlineService for unified state management
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts } from '../theme/tokens';
import { useOffline } from '../services/offlineService';

export const OfflineBanner: React.FC = () => {
  const { isOffline, queueSize } = useOffline();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (isOffline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, slideAnim]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={20} color={colors.white} />
        <Text style={styles.text}>
          You're offline
          {queueSize > 0 && `. ${queueSize} pending ${queueSize === 1 ? 'change' : 'changes'}`}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    paddingTop: 50, // Account for safe area / notch
    paddingBottom: spacing(1.5),
    paddingHorizontal: spacing(2),
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
  },
  text: {
    fontSize: fonts.small,
    color: colors.white,
    fontWeight: '600',
  },
});

export default OfflineBanner;
