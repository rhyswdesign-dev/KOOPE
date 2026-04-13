/**
 * Lens Hub Screen (formerly Camera Hub)
 * Premium landing page for the camera experience
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Dimensions,
  ImageSourcePropType,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Asset } from 'expo-asset';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import { withHaptic } from '../lib/haptics';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const BACKGROUNDS: ImageSourcePropType[] = [
  require('../../assets/images/backgrounds/camera/bg-01.png'),
  require('../../assets/images/backgrounds/camera/bg-02.png'),
  require('../../assets/images/backgrounds/camera/bg-03.png'),
  require('../../assets/images/backgrounds/camera/bg-04.png'),
  require('../../assets/images/backgrounds/camera/bg-05.png'),
  require('../../assets/images/backgrounds/camera/bg-06.png'),
  require('../../assets/images/backgrounds/camera/bg-07.png'),
  require('../../assets/images/backgrounds/camera/bg-08.png'),
  require('../../assets/images/backgrounds/camera/bg-09.png'),
  require('../../assets/images/backgrounds/camera/bg-10.png'),
  require('../../assets/images/backgrounds/camera/bg-11.png'),
  require('../../assets/images/backgrounds/camera/bg-12.png'),
  require('../../assets/images/backgrounds/camera/bg-14.png'),
  require('../../assets/images/backgrounds/camera/bg-15.png'),
  require('../../assets/images/backgrounds/camera/bg-16.png'),
  require('../../assets/images/backgrounds/camera/bg-17.png'),
  require('../../assets/images/backgrounds/camera/bg-18.png'),
  require('../../assets/images/backgrounds/camera/bg-19.png'),
  require('../../assets/images/backgrounds/camera/bg-20.png'),
  require('../../assets/images/backgrounds/camera/bg-21.png'),
  require('../../assets/images/backgrounds/camera/bg-22.png'),
  require('../../assets/images/backgrounds/camera/bg-23.png'),
  require('../../assets/images/backgrounds/camera/bg-24.png'),
  require('../../assets/images/backgrounds/camera/bg-25.png'),
  require('../../assets/images/backgrounds/camera/bg-26.png'),
  require('../../assets/images/backgrounds/camera/bg-27.png'),
  require('../../assets/images/backgrounds/camera/bg-28.png'),
  require('../../assets/images/backgrounds/camera/bg-29.png'),
  require('../../assets/images/backgrounds/camera/bg-30.png'),
  require('../../assets/images/backgrounds/camera/bg-31.png'),
  require('../../assets/images/backgrounds/camera/bg-32.png'),
  require('../../assets/images/backgrounds/camera/bg-33.png'),
  require('../../assets/images/backgrounds/camera/bg-34.png'),
  require('../../assets/images/backgrounds/camera/bg-35.png'),
];

export default function CameraHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Two-layer double buffer crossfade
  const [layerAIndex, setLayerAIndex] = useState(0);
  const [layerBIndex, setLayerBIndex] = useState(1);
  const layerAOpacity = useRef(new Animated.Value(1)).current;
  const layerBOpacity = useRef(new Animated.Value(0)).current;
  const layerAScale = useRef(new Animated.Value(1.01)).current;
  const layerBScale = useRef(new Animated.Value(1.04)).current;
  const [assetsReady, setAssetsReady] = useState(false);
  const activeLayerRef = useRef<0 | 1>(0);
  const currentIndexRef = useRef(0);
  const pendingTransitionRef = useRef<{ currentLayer: 0 | 1; nextLayer: 0 | 1; incoming: number } | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layerALoadedIndexRef = useRef<number | null>(null);
  const layerBLoadedIndexRef = useRef<number | null>(null);
  const queueNextTransitionRef = useRef<(() => void) | null>(null);
  const runPendingTransitionRef = useRef<(() => void) | null>(null);

  // URL Input State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      BACKGROUNDS.map((background) => Asset.fromModule(background).downloadAsync().catch(() => null))
    ).finally(() => {
      if (!cancelled) {
        setAssetsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assetsReady) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    let isMounted = true;
    const HOLD_MS = 4200;
    const FADE_MS = 1600;
    const ACTIVE_DRIFT_MS = HOLD_MS + FADE_MS;
    const DRIFT_START = 1.01;
    const DRIFT_END = 1.05;
    const INCOMING_START = 1.045;
    const INCOMING_SETTLE = 1.02;
    const OUTGOING_END = 1.06;

    const animateDrift = (scale: Animated.Value, from: number, to: number, duration: number) => {
      scale.setValue(from);
      return Animated.timing(scale, {
        toValue: to,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    };

    animateDrift(layerAScale, DRIFT_START, DRIFT_END, ACTIVE_DRIFT_MS).start();

    const runPendingTransition = () => {
      const pending = pendingTransitionRef.current;
      if (!pending) return;

      const readyIndex = pending.nextLayer === 0 ? layerALoadedIndexRef.current : layerBLoadedIndexRef.current;
      if (readyIndex !== pending.incoming) return;

      pendingTransitionRef.current = null;

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const fadeIn = pending.nextLayer === 0 ? layerAOpacity : layerBOpacity;
          const fadeOut = pending.currentLayer === 0 ? layerAOpacity : layerBOpacity;
          const incomingScale = pending.nextLayer === 0 ? layerAScale : layerBScale;
          const outgoingScale = pending.currentLayer === 0 ? layerAScale : layerBScale;

          Animated.parallel([
            Animated.timing(fadeIn, {
              toValue: 1,
              duration: FADE_MS,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(fadeOut, {
              toValue: 0,
              duration: FADE_MS,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(incomingScale, {
              toValue: INCOMING_SETTLE,
              duration: FADE_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(outgoingScale, {
              toValue: OUTGOING_END,
              duration: FADE_MS,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (!finished || !isMounted) return;
            activeLayerRef.current = pending.nextLayer;
            currentIndexRef.current = pending.incoming;
            animateDrift(incomingScale, INCOMING_SETTLE, DRIFT_END, ACTIVE_DRIFT_MS).start();
            queueNextTransitionRef.current?.();
          });
        })
      );
    };
    runPendingTransitionRef.current = runPendingTransition;

    const queueNextTransition = () => {
      transitionTimerRef.current = setTimeout(() => {
        if (!isMounted) return;

        const incoming = (currentIndexRef.current + 1) % BACKGROUNDS.length;
        const currentLayer = activeLayerRef.current;
        const nextLayer: 0 | 1 = currentLayer === 0 ? 1 : 0;
        pendingTransitionRef.current = { currentLayer, nextLayer, incoming };

        if (nextLayer === 0) {
          setLayerAIndex(incoming);
          layerAOpacity.setValue(0);
          layerAScale.setValue(INCOMING_START);
          runPendingTransitionRef.current?.();
        } else {
          setLayerBIndex(incoming);
          layerBOpacity.setValue(0);
          layerBScale.setValue(INCOMING_START);
          runPendingTransitionRef.current?.();
        }
      }, HOLD_MS);
    };
    queueNextTransitionRef.current = queueNextTransition;

    if (layerALoadedIndexRef.current === 0) {
      queueNextTransition();
    }

    return () => {
      isMounted = false;
      pulse.stop();
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      pendingTransitionRef.current = null;
      layerAOpacity.stopAnimation();
      layerBOpacity.stopAnimation();
      layerAScale.stopAnimation();
      layerBScale.stopAnimation();
      queueNextTransitionRef.current = null;
      runPendingTransitionRef.current = null;
    };
  }, [assetsReady, pulseAnim, layerAOpacity, layerBOpacity, layerAScale, layerBScale]);

  const handleLayerLoaded = (layer: 0 | 1, index: number) => {
    if (layer === 0) {
      layerALoadedIndexRef.current = index;
    } else {
      layerBLoadedIndexRef.current = index;
    }

    if (!assetsReady) return;

    const pending = pendingTransitionRef.current;
    if (!pending) {
      if (layer === 0 && index === currentIndexRef.current && !transitionTimerRef.current) {
        queueNextTransitionRef.current?.();
      }
      return;
    }

    const readyIndex = pending.nextLayer === 0 ? layerALoadedIndexRef.current : layerBLoadedIndexRef.current;
    if (readyIndex !== pending.incoming) return;
    runPendingTransitionRef.current?.();
  };

  const handleUrlSubmit = () => {
    if (urlText.trim()) {
      Keyboard.dismiss();
      setShowUrlInput(false);
      navigation.navigate('RecipeURLImport', { url: urlText.trim() });
      setUrlText('');
    }
  };

  const handleLinkPress = () => {
    setShowUrlInput(!showUrlInput);
    if (!showUrlInput) {
      // Focus will happen via autoFocus
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Layer A — always visible */}
      <Animated.Image
        source={BACKGROUNDS[layerAIndex]}
        onLoadEnd={() => handleLayerLoaded(0, layerAIndex)}
        resizeMode="cover"
        blurRadius={0}
        style={[
          styles.backgroundImage,
          { opacity: layerAOpacity, transform: [{ scale: layerAScale }] },
        ]}
      />
      {/* Background Layer B — crossfades in over A */}
      <Animated.Image
        source={BACKGROUNDS[layerBIndex]}
        onLoadEnd={() => handleLayerLoaded(1, layerBIndex)}
        resizeMode="cover"
        blurRadius={0}
        style={[
          styles.backgroundImage,
          { opacity: layerBOpacity, transform: [{ scale: layerBScale }] },
        ]}
      />

      <LinearGradient
        colors={['rgba(12,8,5,0.65)', 'rgba(12,8,5,0.45)', 'rgba(12,8,5,0.82)']}
        style={styles.gradientOverlay}
      />

      <TouchableWithoutFeedback
        onPress={() => {
          if (showUrlInput) {
            setShowUrlInput(false);
            setUrlText('');
            Keyboard.dismiss();
          }
        }}
      >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 28 }} />
          <Text style={styles.headerTitle}>Camera/Scanner</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          {/* Hero Section - centered */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Curious?</Text>
            <Text style={styles.heroSubtitle}>Point your camera at anything</Text>

            {/* Central Pulse Action */}
            <TouchableOpacity
              style={styles.mainCameraButtonWrapper}
              onPress={withHaptic(() => navigation.navigate('SmartScan'), 'medium')}
              activeOpacity={0.9}
            >
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.mainCameraButton}>
                <Ionicons name="camera" size={32} color={colors.white} />
              </View>
            </TouchableOpacity>
            <View style={styles.scanLabelPill}>
              <Text style={styles.scanLabel}>S C A N</Text>
            </View>
          </View>

          {/* Bottom section — quick actions + tagline */}
          <View style={styles.bottomSection}>
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />

            {/* Quick Action Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickLinks}
            >
              <TouchableOpacity
                style={styles.quickLink}
                onPress={withHaptic(() => navigation.navigate('SmartScan'), 'selection')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="wine" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>BOTTLE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={withHaptic(() => navigation.navigate('OCRCapture'), 'selection')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="document-text" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>RECIPE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={withHaptic(() => navigation.navigate('IngredientScan'), 'selection')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="leaf" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>INGREDIENT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={withHaptic(() => navigation.navigate('ManualBottleEntry', {}), 'selection')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="add-circle" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>ADD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLink, showUrlInput && styles.quickLinkActive]}
                onPress={withHaptic(handleLinkPress, 'selection')}
              >
                <View style={[styles.quickIcon, showUrlInput && styles.quickIconActive]}>
                  <Ionicons name="link" size={20} color={showUrlInput ? colors.white : colors.gold} />
                </View>
                <Text style={[styles.quickText, showUrlInput && styles.quickTextActive]}>LINK</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* URL Input - shown when LINK is tapped */}
            {showUrlInput && (
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="Paste recipe URL here..."
                  placeholderTextColor={colors.subtext}
                  value={urlText}
                  onChangeText={setUrlText}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleUrlSubmit}
                />
                <TouchableOpacity
                  style={[styles.urlSubmitButton, !urlText.trim() && styles.urlSubmitButtonDisabled]}
                  onPress={withHaptic(handleUrlSubmit, 'medium')}
                  disabled={!urlText.trim()}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.taglineText}>Scan a bottle. Discover a recipe.</Text>
          </View>
        </View>
      </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  headerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: serifFont,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing(1),
    fontFamily: serifFont,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing(6),
  },
  mainCameraButtonWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  mainCameraButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(214, 138, 56, 0.25)',
    zIndex: 1,
  },
  scanLabelPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(0.75),
    borderRadius: 20,
  },
  scanLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  bottomSection: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing(3),
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing(4),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    marginBottom: spacing(3),
  },
  quickLink: {
    alignItems: 'center',
    gap: spacing(1),
  },
  quickLinkActive: {
    opacity: 1,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  quickText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  quickTextActive: {
    color: colors.gold,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  urlInput: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    fontSize: 15,
    color: colors.white,
  },
  urlSubmitButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlSubmitButtonDisabled: {
    opacity: 0.5,
  },
  taglineText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
