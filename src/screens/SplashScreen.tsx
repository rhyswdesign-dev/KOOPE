import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import theme from '../theme/safeTheme';
import { log } from '../lib/logger';

const { colors, spacing } = theme;
const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);

  // Array of video sources - all your bartending segments
  const videoSources = [
    require('../../assets/videos/bartending-splash-4.mov'),
    require('../../assets/videos/bartending-splash-5.mov'),
    require('../../assets/videos/bartending-splash-8.mov'),
  ];

  // Randomly select a video each time the splash screen loads
  const [selectedVideo] = useState(() => {
    const randomIndex = Math.floor(Math.random() * videoSources.length);
    const selectedVideoFile = videoSources[randomIndex];
    log.info('SplashScreen', 'Playing bartending video', {
      videoIndex: randomIndex + 1,
      totalVideos: videoSources.length,
    });
    return selectedVideoFile;
  });

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Keep startup snappy; the video is decorative and should not block entry.
    const timer = setTimeout(onFinish, 2800);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.fallbackImage}
        resizeMode="cover"
      />
      {!videoUnavailable ? (
        <Video
          style={styles.backgroundVideo}
          source={selectedVideo}
          shouldPlay
          isLooping
          isMuted
          resizeMode={ResizeMode.COVER}
          useNativeControls={false}
          onLoad={() => {
            log.info('SplashScreen', 'Video loaded successfully');
            setIsVideoLoaded(true);
          }}
          onLoadStart={() => {
            log.info('SplashScreen', 'Video started loading');
            setIsVideoLoaded(false);
          }}
          onError={(error) => {
            log.error('SplashScreen', 'Video error', error);
            setVideoUnavailable(true);
            setIsVideoLoaded(false);
          }}
        />
      ) : null}

      {/* Video overlay for better text contrast */}
      <View style={styles.videoOverlay} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      ></Animated.View>

      {/* Loading indicator - show while video is loading */}
      {!isVideoLoaded && !videoUnavailable && (
        <View style={styles.footer}>
          <Text style={styles.loadingText}>Loading...</Text>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundVideo: {
    position: 'absolute',
    top: -20,
    left: -20,
    bottom: -20,
    right: -20,
    width: width + 40,
    height: height + 40,
    minWidth: width + 40,
    minHeight: height + 40,
  },
  fallbackImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width,
    height,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    zIndex: 10, // Ensure content is above video
  },
  tagline: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    opacity: 0.95,
  },
  footer: {
    position: 'absolute',
    bottom: spacing(8),
    alignItems: 'center',
    zIndex: 10,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: '500',
  },
});
