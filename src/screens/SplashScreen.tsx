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

  // Array of video sources - all your bartending segments
  const videoSources = [
    require('../../assets/videos/bartending-splash.mov'),      // Video 1: Original MixedMindStudios video (30MB)
    require('../../assets/videos/bartending-splash-2.mov'),    // Video 2: Second MixedMindStudios video (12MB)
    require('../../assets/videos/bartending-splash-3.mov'),    // Video 3: Screen Recording 1 (12MB)
    require('../../assets/videos/bartending-splash-4.mov'),    // Video 4: Screen Recording 2 (9.4MB)
    require('../../assets/videos/bartending-splash-5.mov'),    // Video 5: Screen Recording 3 (8.0MB)
    require('../../assets/videos/bartending-splash-6.mov'),    // Video 6: Screen Recording 4 (13MB)
    require('../../assets/videos/bartending-splash-7.mov'),    // Video 7: Screen Recording 5 (10MB)
    require('../../assets/videos/bartending-splash-8.mov'),    // Video 8: Screen Recording 6 (8.0MB)
    require('../../assets/videos/bartending-splash-9.mov'),    // Video 9: Video 1780 display (13MB)
  ];

  // Randomly select a video each time the splash screen loads
  const [selectedVideo] = useState(() => {
    const randomIndex = Math.floor(Math.random() * videoSources.length);
    const selectedVideoFile = videoSources[randomIndex];
    log.info('SplashScreen', 'Playing bartending video', { videoIndex: randomIndex + 1, totalVideos: videoSources.length });
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

    // Auto-finish after 5 seconds (longer to appreciate the video)
    const timer = setTimeout(onFinish, 5000);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <Video
        style={styles.backgroundVideo}
        source={selectedVideo}
        shouldPlay={isVideoLoaded}
        isLooping
        isMuted
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        posterSource={undefined}
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
          setIsVideoLoaded(false);
        }}
      />

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
      >
      </Animated.View>

      {/* Loading indicator - show while video is loading */}
      {!isVideoLoaded && (
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
    backgroundColor: colors.white,
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