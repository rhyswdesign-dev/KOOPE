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
  SafeAreaView,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';

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
  require('../../assets/images/backgrounds/camera/bg-13.png'),
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
];

export default function CameraHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CameraStackParamList>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Background Animation State
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

    // Background Rotation Loop
    const interval = setInterval(() => {
      // Fade Out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        // Change Image
        setCurrentBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        // Fade In
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      });
    }, 5000); // Change every 5 seconds

    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, [pulseAnim, fadeAnim]);

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
      {/* Animated Background Layer */}
      <Animated.Image
        source={BACKGROUNDS[currentBgIndex]}
        resizeMode="cover"
        style={[styles.backgroundImage, { opacity: fadeAnim }]}
        blurRadius={0}
      />

      <LinearGradient
        colors={['rgba(18,12,9,0.16)', 'rgba(18,12,9,0.08)', 'rgba(18,12,9,0.24)']}
        style={styles.gradientOverlay}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header - simplified */}
        <View style={styles.header}>
          <View style={{ width: 28 }} />
          <Text style={styles.headerTitle}>LENS</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: serifFont,
    textTransform: 'uppercase',
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
    // Active state styling
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
    fontSize: 9,
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
