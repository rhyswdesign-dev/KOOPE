import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../../theme/tokens';
import { ScreenTourSlide } from '../../config/screenTours';

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

interface ScreenTourModalProps {
  visible: boolean;
  slides: ScreenTourSlide[];
  stepIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function ScreenTourModal({
  visible,
  slides,
  stepIndex,
  onClose,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
}: ScreenTourModalProps) {
  const slide = slides[stepIndex];

  // Progress bar (layout animation — not native driver)
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Content fade + lift per step change
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslate = useRef(new Animated.Value(0)).current;

  // Icon ring spring entrance per step
  const ringScale = useRef(new Animated.Value(0.75)).current;

  // Glow pulse loop
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Sheet entrance
  const sheetTranslate = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      sheetTranslate.setValue(80);
      sheetOpacity.setValue(0);
      return;
    }

    // Sheet slides up on open
    Animated.parallel([
      Animated.spring(sheetTranslate, {
        toValue: 0,
        tension: 80,
        friction: 14,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse loop
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    glow.start();

    return () => glow.stop();
  }, [visible]);

  useEffect(() => {
    if (!visible || slides.length === 0) return;

    // Progress bar advances
    const target = slides.length > 1 ? stepIndex / (slides.length - 1) : 1;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 380,
      useNativeDriver: false,
    }).start();

    // Content fades out, updates, fades in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(contentTranslate, { toValue: 12, duration: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(contentTranslate, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();

    // Icon ring springs in on each step
    ringScale.setValue(0.65);
    Animated.spring(ringScale, {
      toValue: 1,
      tension: 130,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [stepIndex, visible]);

  if (!slide) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['4%', '100%'],
  });

  const counter = `${String(stepIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Dimmed backdrop */}
      <Pressable style={styles.backdrop} onPress={() => {}} />

      {/* Floating close pill — above sheet */}
      <Animated.View style={[styles.closePill, { opacity: sheetOpacity }]}>
        <Pressable onPress={onClose} style={styles.closePillInner} hitSlop={12}>
          <Ionicons name="close" size={16} color="rgba(242,229,213,0.55)" />
        </Pressable>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { opacity: sheetOpacity, transform: [{ translateY: sheetTranslate }] },
        ]}
      >
        {/* Gold progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Counter */}
        <Text style={styles.counter}>{counter}</Text>

        {/* Icon — layered glow rings */}
        <Animated.View style={[styles.iconOuter, { transform: [{ scale: ringScale }] }]}>
          <Animated.View style={[styles.iconGlowRing, { opacity: glowOpacity }]} />
          <View style={styles.iconMidRing}>
            <View style={styles.iconInner}>
              <Ionicons name={slide.icon} size={26} color={colors.gold} />
            </View>
          </View>
        </Animated.View>

        {/* Content block — fades per step */}
        <Animated.View
          style={[
            styles.content,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
          ]}
        >
          <Text style={styles.title}>{slide.title}</Text>
          <View style={styles.titleRule} />
          <Text style={styles.body}>{slide.body}</Text>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.backBtn} onPress={isFirstStep ? onClose : onPrevious}>
            <Text style={styles.backText}>{isFirstStep ? 'Skip' : '← Back'}</Text>
          </Pressable>

          <Pressable style={styles.nextBtn} onPress={onNext}>
            <LinearGradient
              colors={['#E89C40', '#C97B28']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>{isLastStep ? 'Done' : 'Next'}</Text>
              <Ionicons
                name={isLastStep ? 'checkmark' : 'arrow-forward'}
                size={15}
                color="#1A120D"
                style={styles.nextIcon}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,6,4,0.82)',
  },
  closePill: {
    position: 'absolute',
    bottom: 340,
    alignSelf: 'center',
  },
  closePillInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.22)',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(7),
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 1,
    marginBottom: spacing(2.5),
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 1,
  },
  counter: {
    color: 'rgba(214,138,56,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontFamily: serif,
    marginBottom: spacing(3),
  },
  // Icon rings
  iconOuter: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  iconGlowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 42,
    backgroundColor: colors.gold,
  },
  iconMidRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(214,138,56,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(214,138,56,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content
  content: {
    marginBottom: spacing(4),
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: serif,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: spacing(1.5),
  },
  titleRule: {
    width: 28,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 1,
    marginBottom: spacing(2),
  },
  body: {
    color: colors.subtext,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  backBtn: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(0.5),
  },
  backText: {
    color: 'rgba(242,229,213,0.38)',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
  },
  nextText: {
    color: '#1A120D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  nextIcon: {
    marginLeft: 6,
  },
});
