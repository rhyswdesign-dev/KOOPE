/**
 * Welcome Screen - Luxury onboarding experience
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Animated, 
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, radii } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    
    // Orchestrated entrance animation
    const sequence = Animated.sequence([
      // Initial fade and slide in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Features stagger in
      Animated.timing(featuresAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      // Buttons slide up
      Animated.spring(buttonsAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: 400,
        useNativeDriver: true,
      }),
    ]);

    sequence.start();
  }, []);

  const handleGetStarted = () => {
    // Add haptic feedback and smooth transition
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start(() => {
        navigation.navigate('Consent');
      });
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Luxury gradient background */}
      <LinearGradient
        colors={[colors.bg, '#1A0F0B', colors.card]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Ambient lighting effects */}
      <Animated.View style={[styles.lightOrb, styles.lightOrbTop]} />
      <Animated.View style={[styles.lightOrb, styles.lightOrbBottom]} />

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow}>
              <Ionicons name="wine" size={48} color={colors.gold} />
            </View>
          </View>
          
          <Text style={styles.title}>
            Welcome to{'\n'}
            <Text style={styles.titleAccent}>Bartending School</Text>
          </Text>
          
          <Text style={styles.subtitle}>
            Master the art of mixology with personalized lessons designed for your taste and skill level
          </Text>
        </View>

        <Animated.View 
          style={[
            styles.features,
            {
              opacity: featuresAnim,
              transform: [{
                translateY: featuresAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            },
          ]}
        >
          {[
            { icon: 'cafe', text: 'Interactive lessons with premium cocktail recipes', delay: 0 },
            { icon: 'time', text: 'Just 3-5 minutes per lesson, perfect for busy schedules', delay: 100 },
            { icon: 'trophy', text: 'Earn XP, unlock rare spirits, and build your expertise', delay: 200 },
          ].map((feature, index) => (
            <Animated.View
              key={index}
              style={[
                styles.feature,
                {
                  opacity: featuresAnim,
                  transform: [{
                    translateX: featuresAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as any} size={28} color={colors.gold} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.actions,
          {
            opacity: buttonsAnim,
            transform: [{
              translateY: buttonsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={handleGetStarted}
        >
          <LinearGradient
            colors={[colors.gold, colors.accent]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryButtonText}>Begin Your Journey</Text>
          </LinearGradient>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.secondaryButtonText}>Explore First</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingTop: Platform.OS === 'ios' ? spacing(6) : spacing(4),
  },
  lightOrb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.gold,
    opacity: 0.03,
  },
  lightOrbTop: {
    top: -width * 0.4,
    right: -width * 0.3,
  },
  lightOrbBottom: {
    bottom: -width * 0.3,
    left: -width * 0.4,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  logoContainer: {
    marginBottom: spacing(4),
  },
  logoGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gold,
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing(2),
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: colors.gold,
    fontSize: 36,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 18,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
    letterSpacing: 0.2,
  },
  features: {
    gap: spacing(3),
    width: '100%',
    maxWidth: 360,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    opacity: 0.15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    lineHeight: 24,
    fontWeight: '500',
  },
  actions: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? spacing(6) : spacing(4),
    left: spacing(3),
    right: spacing(3),
    gap: spacing(2),
  },
  primaryButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    padding: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.goldText,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    padding: spacing(2.5),
    alignItems: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ scale: 0.98 }],
  },
  secondaryButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
});
