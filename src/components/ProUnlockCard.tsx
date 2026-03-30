/**
 * ProUnlockCard — bottom-sheet modal that appears exactly once on trial day 6.
 *
 * Shows what PRO features just unlocked, with a CTA to take the guided tour
 * (trial_pro_unlock) that walks through Vault drops, recipe builder, and hosting.
 *
 * Persistence: AsyncStorage key prevents it re-showing after dismissal.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { useScreenTour } from '../hooks/useScreenTour';
import ScreenTourModal from './tour/ScreenTourModal';

const SEEN_KEY = '@KOOPE:trial_pro_unlock_shown';
const AMBER = '#D68A38';
const GOLD = '#E8B84B';

interface ProFeature {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  body: string;
}

const PRO_FEATURES: ProFeature[] = [
  {
    icon: 'flash',
    title: 'Vault Weekly Drops',
    body: 'A curated featured cocktail drops every week — full story, technique, and sourcing context.',
  },
  {
    icon: 'construct-outline',
    title: 'Pro Recipe Builder',
    body: 'Build from ratios. Remix classics. Save your own versions.',
  },
  {
    icon: 'people-outline',
    title: 'Hosting Tools',
    body: 'Guest count → cocktail picks → scaled ingredients → prep timeline.',
  },
];

export function ProUnlockCard() {
  const { isFirstProPhaseDay, isInTrial, daysRemaining } = useTrialStatus();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  // Tour hook — drives the "Take the tour" flow
  const tour = useScreenTour('trial_pro_unlock');

  // Check if we should show on mount / when pro phase starts
  useEffect(() => {
    if (!isFirstProPhaseDay && !isInTrial) return;
    // Check if already shown this phase
    AsyncStorage.getItem(SEEN_KEY).then((val) => {
      if (val !== 'true') setVisible(true);
    });
  }, [isFirstProPhaseDay, isInTrial]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const dismiss = useCallback(async () => {
    await AsyncStorage.setItem(SEEN_KEY, 'true');
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [slideAnim]);

  const handleTakeTour = useCallback(async () => {
    await dismiss();
    // Small delay so the card dismissal completes before tour slides up
    setTimeout(() => tour.openTour(), 300);
  }, [dismiss, tour]);

  if (!visible && !tour.visible) return null;

  return (
    <>
      {/* Card modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            <LinearGradient
              colors={['#2A1A0F', '#1A120D']}
              style={styles.sheetInner}
            >
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.flashBadge}>
                  <Ionicons name="flash" size={18} color="#1A120D" />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.eyebrow}>PRO UNLOCKED</Text>
                  <Text style={styles.headline}>
                    {daysRemaining} days to explore everything
                  </Text>
                </View>
              </View>

              {/* Feature rows */}
              <View style={styles.featureList}>
                {PRO_FEATURES.map((f) => (
                  <View key={f.title} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon} size={18} color={AMBER} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureBody}>{f.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* CTAs */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleTakeTour}
                activeOpacity={0.85}
              >
                <Ionicons name="compass-outline" size={16} color="#1A120D" />
                <Text style={styles.primaryBtnText}>TAKE THE GUIDED TOUR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={dismiss} activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>I'll explore on my own</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Tour modal — plays after card is dismissed */}
      <ScreenTourModal
        visible={tour.visible}
        slides={tour.slides}
        stepIndex={tour.stepIndex}
        onClose={tour.closeTour}
        onNext={tour.next}
        onPrevious={tour.previous}
        isFirstStep={tour.isFirstStep}
        isLastStep={tour.isLastStep}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetInner: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flashBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: GOLD,
    marginBottom: 2,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F2E5D5',
    lineHeight: 24,
  },
  featureList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F2E5D5',
    marginBottom: 2,
  },
  featureBody: {
    fontSize: 13,
    color: '#C7B8A5',
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AMBER,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#1A120D',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#C7B8A5',
    fontWeight: '600',
  },
});

export default ProUnlockCard;
