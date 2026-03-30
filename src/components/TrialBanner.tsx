/**
 * TrialBanner — slim persistent banner shown during the 7-day PLUS trial.
 *
 * Days 1–5: amber, "PLUS TRIAL · X DAYS LEFT"
 * Days 6–7: gold with ⚡, "PRO UNLOCKED · X DAYS LEFT"
 *
 * Sits in the app layout flow (not absolute) so it doesn't cover content.
 * Tapping it opens the Paywall to prompt conversion.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTrialStatus } from '../hooks/useTrialStatus';

const BANNER_H = 36;
const AMBER = '#D68A38';
const AMBER_DARK = '#1A120D';
const PRO_GOLD = '#E8B84B';

export function TrialBanner() {
  const { isInTrial, trialDay, daysRemaining, isProPhase, trialExpired } = useTrialStatus();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = isInTrial || trialExpired;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: visible ? BANNER_H : 0,
        tension: 60,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [visible, heightAnim, opacityAnim]);

  if (!visible) return null;

  const bgColor = isProPhase ? PRO_GOLD : AMBER;
  const icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap =
    isProPhase ? 'flash' : 'timer-outline';

  const label = trialExpired
    ? 'Your trial has ended — choose a plan'
    : isProPhase
    ? `PRO UNLOCKED · ${daysRemaining} ${daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT`
    : `PLUS TRIAL · DAY ${trialDay} OF 7 · ${daysRemaining} ${daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT`;

  return (
    <Animated.View
      style={[
        styles.container,
        { height: heightAnim, opacity: opacityAnim, backgroundColor: bgColor },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={() =>
          nav.navigate('Paywall', {
            source: 'trial_banner',
            offering: isProPhase ? 'koope_pro' : null,
            displayCloseButton: true,
          })
        }
        activeOpacity={0.8}
      >
        <Ionicons name={icon} size={13} color={AMBER_DARK} />
        <Text style={styles.label}>{label}</Text>
        <Ionicons name="chevron-forward" size={13} color={AMBER_DARK} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: AMBER_DARK,
    flex: 1,
    textAlign: 'center',
  },
});

export default TrialBanner;
