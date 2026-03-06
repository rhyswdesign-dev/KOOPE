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
  Dimensions,
  ImageSourcePropType,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BACKGROUNDS: ImageSourcePropType[] = shuffleArray([
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
]);

export default function CameraHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Two-layer double buffer crossfade
  const [layerAIndex, setLayerAIndex] = useState(0);
  const [layerBIndex, setLayerBIndex] = useState(1);
  const layerAOpacity = useRef(new Animated.Value(1)).current;
  const layerBOpacity = useRef(new Animated.Value(0)).current;
  const activeLayerRef = useRef<0 | 1>(0);
  const currentIndexRef = useRef(0);

  // URL Input State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');

  useEffect(() => {
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
    let transitionTimer: ReturnType<typeof setTimeout> | null = null;
    const HOLD_MS = 4200;
    const FADE_MS = 1800;

    const queueNextTransition = () => {
      transitionTimer = setTimeout(() => {
        if (!isMounted) return;

        const incoming = (currentIndexRef.current + 1) % BACKGROUNDS.length;
        const currentLayer = activeLayerRef.current;
        const nextLayer: 0 | 1 = currentLayer === 0 ? 1 : 0;

        if (nextLayer === 0) {
          setLayerAIndex(incoming);
          layerAOpacity.setValue(0);
        } else {
          setLayerBIndex(incoming);
          layerBOpacity.setValue(0);
        }

        // Wait for image source swap to paint before animating.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const fadeIn = nextLayer === 0 ? layerAOpacity : layerBOpacity;
            const fadeOut = currentLayer === 0 ? layerAOpacity : layerBOpacity;

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
            ]).start(({ finished }) => {
              if (!finished || !isMounted) return;
              activeLayerRef.current = nextLayer;
              currentIndexRef.current = incoming;
              queueNextTransition();
            });
          })
        );
      }, HOLD_MS);
    };

    queueNextTransition();

    return () => {
      isMounted = false;
      pulse.stop();
      if (transitionTimer) clearTimeout(transitionTimer);
      layerAOpacity.stopAnimation();
      layerBOpacity.stopAnimation();
    };
  }, [pulseAnim, layerAOpacity, layerBOpacity]);

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
        resizeMode="cover"
        blurRadius={0}
        style={[styles.backgroundImage, { opacity: layerAOpacity }]}
      />
      {/* Background Layer B — crossfades in over A */}
      <Animated.Image
        source={BACKGROUNDS[layerBIndex]}
        resizeMode="cover"
        blurRadius={0}
        style={[styles.backgroundImage, { opacity: layerBOpacity }]}
      />

      <LinearGradient
        colors={['rgba(12,8,5,0.55)', 'rgba(12,8,5,0.15)', 'rgba(12,8,5,0.72)']}
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
              onPress={() => navigation.navigate('SmartScan')}
              activeOpacity={0.9}
            >
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.mainCameraButton}>
                <Ionicons name="camera" size={32} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.scanLabel}>S C A N</Text>

            {/* Quick Action Buttons - moved up */}
            <View style={styles.quickLinks}>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigation.navigate('SmartScan')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="wine" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>BOTTLE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigation.navigate('SmartScan')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="document-text" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>RECIPE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLink}
                onPress={() => navigation.navigate('SmartScan')}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name="leaf" size={20} color={colors.gold} />
                </View>
                <Text style={styles.quickText}>INGREDIENT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLink, showUrlInput && styles.quickLinkActive]}
                onPress={handleLinkPress}
              >
                <View style={[styles.quickIcon, showUrlInput && styles.quickIconActive]}>
                  <Ionicons name="link" size={20} color={showUrlInput ? colors.white : colors.gold} />
                </View>
                <Text style={[styles.quickText, showUrlInput && styles.quickTextActive]}>LINK</Text>
              </TouchableOpacity>
            </View>

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
                  onPress={handleUrlSubmit}
                  disabled={!urlText.trim()}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bottom tagline */}
          <View style={styles.taglineContainer}>
            <Text style={styles.taglineText}>
              Scan a bottle. Discover a recipe.
            </Text>
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
    color: 'rgba(255,255,255,0.6)',
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
  scanLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: spacing(6),
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(2),
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  quickText: {
    color: 'rgba(255,255,255,0.6)',
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
    marginTop: spacing(4),
    marginHorizontal: spacing(3),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
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
  taglineContainer: {
    alignItems: 'center',
    paddingBottom: spacing(6),
    paddingHorizontal: spacing(4),
  },
  taglineText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
