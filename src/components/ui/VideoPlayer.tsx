/**
 * VideoPlayer Component
 * Inline and fullscreen video player with controls
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  Dimensions, 
  StatusBar,
  ViewStyle 
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../../theme/tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface VideoPlayerProps {
  source: { uri: string } | number;
  poster?: string;
  title?: string;
  description?: string;
  style?: ViewStyle;
  height?: number;
  width?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  allowFullscreen?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
  onFullscreenEnter?: () => void;
  onFullscreenExit?: () => void;
}

interface VideoControls {
  isPlaying: boolean;
  position: number;
  duration: number;
  isLoaded: boolean;
  showControls: boolean;
}

export default function VideoPlayer({
  source,
  poster,
  title,
  description,
  style,
  height = 200,
  width = screenWidth - spacing(2),
  autoPlay = false,
  loop = false,
  muted = false,
  showControls = true,
  allowFullscreen = true,
  onPlaybackStatusUpdate,
  onFullscreenEnter,
  onFullscreenExit,
}: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controls, setControls] = useState<VideoControls>({
    isPlaying: false,
    position: 0,
    duration: 0,
    isLoaded: false,
    showControls: true,
  });
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Create video player instance
  const player = useVideoPlayer(source, (player) => {
    player.loop = loop;
    player.muted = muted;
    if (autoPlay) {
      player.play();
    }
  });

  useEffect(() => {
    // Set up event listeners for the video player
    const subscription = player.addListener('playingChange', ({ isPlaying }) => {
      setControls(prev => ({ ...prev, isPlaying }));
    });

    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setControls(prev => ({ 
          ...prev, 
          isLoaded: true,
          duration: player.duration * 1000 // Convert to milliseconds for consistency
        }));
      }
      
      onPlaybackStatusUpdate?.({ 
        isLoaded: status === 'readyToPlay',
        isPlaying: player.playing,
        positionMillis: player.currentTime * 1000,
        durationMillis: player.duration * 1000
      });
    });

    const timeSubscription = player.addListener('timeUpdate', ({ currentTime }) => {
      setControls(prev => ({ 
        ...prev, 
        position: currentTime * 1000 // Convert to milliseconds
      }));
    });

    return () => {
      subscription?.remove();
      statusSubscription?.remove(); 
      timeSubscription?.remove();
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [player, controlsTimeout, onPlaybackStatusUpdate]);

  const togglePlayPause = () => {
    if (controls.isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      onFullscreenExit?.();
    } else {
      setIsFullscreen(true);
      onFullscreenEnter?.();
    }
  };

  const showControlsTemporarily = () => {
    setControls(prev => ({ ...prev, showControls: true }));
    
    if (controlsTimeout) clearTimeout(controlsTimeout);
    
    const timeout = setTimeout(() => {
      if (controls.isPlaying) {
        setControls(prev => ({ ...prev, showControls: false }));
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const VideoContent = ({ isFullscreenMode = false }: { isFullscreenMode?: boolean }) => {
    const videoStyle = isFullscreenMode 
      ? { width: screenHeight, height: screenWidth }
      : { width, height };

    return (
      <View style={[styles.container, isFullscreenMode && styles.fullscreenContainer, style]}>
        <Pressable 
          style={[styles.videoWrapper, videoStyle]}
          onPress={showControlsTemporarily}
        >
          <VideoView
            style={[styles.video, videoStyle]}
            player={player}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            showsTimecodes={false}
          />
          
          {/* Video Overlay Controls */}
          {showControls && controls.showControls && controls.isLoaded && (
            <View style={styles.controlsOverlay}>
              {/* Play/Pause Button */}
              <Pressable style={styles.playButton} onPress={togglePlayPause}>
                <View style={styles.playButtonBackground}>
                  <Ionicons 
                    name={controls.isPlaying ? 'pause' : 'play'} 
                    size={24} 
                    color="white" 
                  />
                </View>
              </Pressable>

              {/* Bottom Controls Bar */}
              <View style={styles.bottomControls}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${(controls.position / controls.duration) * 100 || 0}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>

                {/* Time Display */}
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(controls.position)} / {formatTime(controls.duration)}
                  </Text>
                  
                  {/* Fullscreen Button */}
                  {allowFullscreen && (
                    <Pressable style={styles.fullscreenButton} onPress={toggleFullscreen}>
                      <Ionicons 
                        name={isFullscreenMode ? 'contract' : 'expand'} 
                        size={20} 
                        color="white" 
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Video Info */}
        {!isFullscreenMode && (title || description) && (
          <View style={styles.videoInfo}>
            {title && <Text style={styles.videoTitle}>{title}</Text>}
            {description && <Text style={styles.videoDescription}>{description}</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <VideoContent />
      
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <Modal 
          visible={true} 
          animationType="fade" 
          supportedOrientations={['landscape', 'portrait']}
          onRequestClose={toggleFullscreen}
        >
          <StatusBar hidden />
          <View style={styles.fullscreenModal}>
            <VideoContent isFullscreenMode />
          </View>
        </Modal>
      )}
    </>
  );
}

// Convenience components
export const InlineVideoPlayer: React.FC<Omit<VideoPlayerProps, 'allowFullscreen'>> = (props) => (
  <VideoPlayer {...props} allowFullscreen={false} />
);

export const CompactVideoPlayer: React.FC<VideoPlayerProps> = (props) => (
  <VideoPlayer {...props} height={120} showControls={false} />
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  videoWrapper: {
    position: 'relative',
    backgroundColor: 'black',
  },
  video: {
    backgroundColor: 'black',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    zIndex: 2,
  },
  playButtonBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing(1.5),
  },
  progressContainer: {
    marginBottom: spacing(1),
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: 'white',
    fontSize: fonts.caption,
    fontWeight: '500',
  },
  fullscreenButton: {
    padding: spacing(0.5),
  },
  videoInfo: {
    padding: spacing(2),
  },
  videoTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  videoDescription: {
    fontSize: fonts.caption,
    color: colors.subtext,
    lineHeight: 18,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
