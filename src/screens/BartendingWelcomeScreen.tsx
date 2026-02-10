import React, { useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions, InteractionManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, radii, textStyles } from '../theme/tokens';
const { width } = Dimensions.get('window');

interface BartendingWelcomeScreenProps {
  onComplete: () => void;
}

// Custom Bartending Illustration Component
function BartendingIllustration() {
  const scaleValue = useSharedValue(0.95);
  
  useEffect(() => {
    scaleValue.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  }, [scaleValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, { alignItems: 'center' }]}>
      <View style={styles.illustrationContainer}>
        {/* Cocktail Shaker */}
        <View style={styles.shaker} />
        <View style={styles.shakerTop} />
        
        {/* Jigger */}
        <View style={styles.jigger} />
        
        {/* Glass */}
        <View style={styles.glass} />
        <View style={styles.liquid} />
        
        {/* Garnish */}
        <View style={styles.garnish} />
        
        {/* Floating elements */}
        <View style={[styles.floatingDot, { top: 20, left: 10 }]} />
        <View style={[styles.floatingDot, { top: 40, right: 15 }]} />
        <View style={[styles.floatingDot, { bottom: 30, left: 20 }]} />
      </View>
    </Animated.View>
  );
}

export default function BartendingWelcomeScreen({ onComplete }: BartendingWelcomeScreenProps) {
  const handleComplete = () => {
    // Defer navigation until after animations complete
    InteractionManager.runAfterInteractions(() => {
      onComplete();
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Illustration */}
        <Animated.View
          entering={SlideInRight.delay(100).springify()}
          style={styles.iconContainer}
        >
          <BartendingIllustration />
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.Text
            entering={FadeInUp.delay(200).springify()}
            style={styles.title}
          >
            Learn Bartending at Your Own Pace
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(300).springify()}
            style={styles.subtitle}
          >
            Master the art of mixology from the comfort of your home
          </Animated.Text>

          {/* Bullet points */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.bulletContainer}
          >
            {[
              "Learn when it's convenient for you - no rush, no pressure",
              "Follow detailed tutorials designed for beginners",
              "Earn XP with each lesson to unlock premium recipes",
              "Build your Vault of cocktail mastery"
            ].map((bullet, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(500 + index * 100).springify()}
                style={styles.bulletItem}
              >
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInUp.delay(900).springify()}>
            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.continueButtonPressed
              ]}
            >
              <Text style={styles.continueText}>Start Learning</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Removed FeatureItem - now using inline bullet points to match guided tour style

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bartending tool styles
  shaker: {
    width: 40,
    height: 60,
    backgroundColor: colors.accent,
    borderRadius: 8,
    opacity: 0.8,
    position: 'absolute',
    top: 20,
    left: 30,
  },
  shakerTop: {
    width: 35,
    height: 15,
    backgroundColor: colors.accent,
    borderRadius: 8,
    opacity: 0.6,
    position: 'absolute',
    top: 15,
    left: 32.5,
  },
  jigger: {
    width: 20,
    height: 30,
    backgroundColor: colors.accent,
    borderRadius: 4,
    opacity: 0.7,
    position: 'absolute',
    top: 30,
    right: 25,
  },
  glass: {
    width: 30,
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 6,
    opacity: 0.6,
    position: 'absolute',
    bottom: 20,
    left: 45,
  },
  liquid: {
    width: 26,
    height: 15,
    backgroundColor: colors.accent,
    borderRadius: 2,
    opacity: 0.5,
    position: 'absolute',
    bottom: 22,
    left: 47,
  },
  garnish: {
    width: 8,
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 4,
    position: 'absolute',
    bottom: 35,
    left: 56,
  },
  floatingDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    opacity: 0.4,
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1.5),
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing(3),
    lineHeight: 24,
  },
  bulletContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing(3),
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(1.5),
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginRight: spacing(1.5),
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    flex: 1,
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  continueText: {
    color: colors.goldText,
    fontSize: 18,
    fontWeight: '800',
  },
});