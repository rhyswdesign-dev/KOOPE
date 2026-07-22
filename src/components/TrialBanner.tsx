/**
 * TrialBanner — floating pill shown during the 7-day PLUS trial.
 *
 * Rendered inside the Tabs navigator (not the root stack), so it is
 * automatically absent on any screen pushed on top of the tabs
 * (OCRCapture, AIRecipeFormat, SmartScan, etc.). No route detection needed.
 *
 * Days 1–5: amber, "PLUS TRIAL · X days left"
 * Days 6–7: gold with ⚡, "PRO UNLOCKED · X days left"
 * Expired:  "Trial ended — choose your plan"
 *
 * Hidden entirely for paid subscribers (PLUS / PRO).
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { useUserTier } from '../store/useUserTier';

const TAB_OFFSET = Platform.OS === 'ios' ? 92 : 66;
const AMBER = '#D68A38';
const AMBER_DARK = '#1A120D';
const PRO_GOLD = '#E8B84B';

export function TrialBanner() {
  const { isInTrial, trialDay, daysRemaining, isProPhase, trialExpired } = useTrialStatus();
  const tier = useUserTier((state) => state.tier);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const translateAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Never show for paying subscribers. The trial store doesn't clear
  // isTrialActive on conversion, so tier is the source of truth.
  const isPaidSubscriber = tier === 'PLUS' || tier === 'PRO';
  const visible = !isPaidSubscriber && (isInTrial || trialExpired);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateAnim, {
        toValue: visible ? 0 : 80,
        tension: 55,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateAnim, opacityAnim]);

  if (!visible) return null;

  const bgColor = isProPhase ? PRO_GOLD : AMBER;
  const icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap =
    isProPhase ? 'flash' : 'timer-outline';

  const label = trialExpired
    ? 'Trial ended — choose your plan'
    : isProPhase
    ? `PRO UNLOCKED · ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`
    : `PLUS TRIAL · Day ${trialDay} of 7 · ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`;

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          backgroundColor: bgColor,
          transform: [{ translateY: translateAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
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
        activeOpacity={0.85}
      >
        <Ionicons name={icon} size={14} color={AMBER_DARK} />
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Ionicons name="chevron-forward" size={13} color={AMBER_DARK} style={styles.chevron} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: TAB_OFFSET,
    left: 20,
    right: 20,
    borderRadius: 30,
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: AMBER_DARK,
    flex: 1,
    textAlign: 'center',
  },
  chevron: {
    opacity: 0.55,
  },
});

export default TrialBanner;
