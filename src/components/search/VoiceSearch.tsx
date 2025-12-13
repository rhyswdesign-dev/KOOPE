/**
 * VOICE SEARCH COMPONENT
 * Speech-to-text search functionality for hands-free cocktail discovery
 * Includes visual feedback and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { colors, spacing, radii } from '../../theme/tokens';
import { log } from '../../lib/logger';

interface VoiceSearchProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  placeholder?: string;
}

type VoiceSearchState = 'idle' | 'listening' | 'processing' | 'error';

export default function VoiceSearch({
  visible,
  onClose,
  onResult,
  placeholder = "Try saying 'Old Fashioned' or 'Whiskey cocktails'",
}: VoiceSearchProps) {
  const [state, setState] = useState<VoiceSearchState>('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Animation values
  const pulseAnim = new Animated.Value(1);
  const waveAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      requestPermissions();
      setState('idle');
      setTranscribedText('');
      setError(null);
    }
  }, [visible]);

  // Start pulse animation when listening
  useEffect(() => {
    if (state === 'listening') {
      startPulseAnimation();
      startWaveAnimation();
    } else {
      stopAnimations();
    }
  }, [state]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access Required',
          'Please grant microphone access to use voice search.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Open settings */} },
          ]
        );
      }
    } catch (error) {
      log.error('VoiceSearch', 'Permission request failed', error);
      setHasPermission(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    waveAnim.stopAnimation();
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
  };

  const startListening = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    try {
      setState('listening');
      setError(null);

      // Mock speech recognition since Expo doesn't have built-in speech-to-text
      // In a real app, you'd integrate with Google Speech API, Azure Cognitive Services, etc.
      await mockSpeechRecognition();

    } catch (error) {
      log.error('VoiceSearch', 'Speech recognition failed', error);
      setError('Failed to start voice recognition');
      setState('error');
    }
  };

  // Mock speech recognition for demo purposes
  const mockSpeechRecognition = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Simulate listening for 3 seconds
      setTimeout(() => {
        setState('processing');

        // Simulate processing for 1 second
        setTimeout(() => {
          const mockResults = [
            'Old Fashioned',
            'Whiskey sour recipe',
            'Gin and tonic',
            'Margarita with salt',
            'Manhattan cocktail',
            'Espresso martini recipe',
            'Show me tequila drinks',
            'Easy cocktails for beginners',
          ];

          const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
          setTranscribedText(randomResult);
          setState('idle');
          resolve();
        }, 1000);
      }, 3000);
    });
  };

  const handleUseResult = () => {
    if (transcribedText) {
      onResult(transcribedText);
      onClose();
    }
  };

  const handleTryAgain = () => {
    setTranscribedText('');
    setError(null);
    setState('idle');
  };

  const speakInstructions = () => {
    Speech.speak('Tap the microphone and say what you\'re looking for. For example, say Old Fashioned or whiskey cocktails.', {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const getStateIcon = (): string => {
    switch (state) {
      case 'listening': return 'mic';
      case 'processing': return 'hourglass';
      case 'error': return 'alert-circle';
      default: return 'mic-outline';
    }
  };

  const getStateColor = (): string => {
    switch (state) {
      case 'listening': return colors.accent;
      case 'processing': return '#FF9800';
      case 'error': return '#F44336';
      default: return colors.subtext;
    }
  };

  const getStateText = (): string => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'error': return 'Error occurred';
      default: return 'Tap to start voice search';
    }
  };

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Voice Search</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.permissionContainer}>
            <Ionicons name="mic-off" size={80} color={colors.subtext} />
            <Text style={styles.permissionTitle}>Microphone Access Required</Text>
            <Text style={styles.permissionText}>
              Voice search needs microphone access to listen to your voice commands.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Search</Text>
          <TouchableOpacity onPress={speakInstructions}>
            <Ionicons name="help-circle-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Microphone Button */}
          <View style={styles.microphoneContainer}>
            <Animated.View
              style={[
                styles.microphoneWrapper,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              {/* Wave Animation */}
              {state === 'listening' && (
                <Animated.View
                  style={[
                    styles.waveRing,
                    {
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 0.2],
                      }),
                      transform: [{
                        scale: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2],
                        }),
                      }],
                    },
                  ]}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.microphoneButton,
                  { backgroundColor: getStateColor() + '20' }
                ]}
                onPress={startListening}
                disabled={state === 'listening' || state === 'processing'}
              >
                <Ionicons
                  name={getStateIcon() as any}
                  size={48}
                  color={getStateColor()}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Status Text */}
          <Text style={styles.statusText}>{getStateText()}</Text>

          {/* Placeholder */}
          <Text style={styles.placeholder}>{placeholder}</Text>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Transcribed Text */}
          {transcribedText && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>You said:</Text>
              <Text style={styles.resultText}>"{transcribedText}"</Text>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.resultButton}
                  onPress={handleUseResult}
                >
                  <Text style={styles.resultButtonText}>Use This</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resultButton, styles.secondaryButton]}
                  onPress={handleTryAgain}
                >
                  <Text style={[styles.resultButtonText, styles.secondaryButtonText]}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Voice Search Tips:</Text>
            <Text style={styles.tipText}>• Say "Old Fashioned recipe"</Text>
            <Text style={styles.tipText}>• Say "Show me whiskey drinks"</Text>
            <Text style={styles.tipText}>• Say "Easy cocktails for beginners"</Text>
            <Text style={styles.tipText}>• Say "Gin based cocktails"</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  microphoneWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing(4),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
    width: '100%',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1),
    fontWeight: '600',
  },
  resultText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(3),
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  resultButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.accent,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  tipText: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1),
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing(4),
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radii.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});