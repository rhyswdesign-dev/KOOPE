import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { VoiceRecipeService, VoiceRecipeInput } from '../services/voiceRecipeService';
import { AIRecipeFormatter, RecipeInput, RecipeType } from '../services/aiRecipeFormatter';
import { log } from '../lib/logger';

type VoiceRecipeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function VoiceRecipeScreen() {
  const nav = useNavigation<VoiceRecipeScreenNavigationProp>();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [parsedVoiceInput, setParsedVoiceInput] = useState<VoiceRecipeInput | null>(null);
  const [voiceService] = useState(() => new VoiceRecipeService());
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    nav.setOptions({
      title: '🎤 Voice Recipe Input',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      voiceService.cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setParsedVoiceInput(null);

      await voiceService.startRecording();

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);

    } catch (error: any) {
      setIsRecording(false);
      Alert.alert('Recording Error', error.message);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }

      setIsRecording(false);
      setIsTranscribing(true);

      const audioUri = await voiceService.stopRecording();
      if (!audioUri) {
        throw new Error('No audio recorded');
      }

      log.info('VoiceRecipeScreen', 'Processing audio');
      const transcribedText = await voiceService.transcribeAudio(audioUri);
      setTranscription(transcribedText);

      log.info('VoiceRecipeScreen', 'Parsing recipe from transcription');
      const parsedInput = await voiceService.parseVoiceRecipe(transcribedText);
      setParsedVoiceInput(parsedInput);

    } catch (error: any) {
      Alert.alert('Processing Error', error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }

    setIsRecording(false);
    setRecordingTime(0);
    await voiceService.cancelRecording();
  };

  const formatWithAI = async (recipeType: RecipeType) => {
    if (!parsedVoiceInput) return;

    try {
      setIsProcessing(true);

      // Create a mock recipe object for AI formatting
      const recipeInput: RecipeInput = {
        title: parsedVoiceInput.title,
        extractedText: transcription,
        userNotes: 'Voice input recipe',
        recipeType: recipeType,
      };

      // Navigate to AI formatting screen
      nav.navigate('AIRecipeFormat', {
        recipe: {
          id: `voice-${Date.now()}`,
          title: parsedVoiceInput.title || 'Voice Recipe',
          sourceUrl: null,
          imageUrl: null,
          extractedText: transcription,
          recipeType: recipeType,
        }
      });

    } catch (error: any) {
      Alert.alert('AI Processing Error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetSession = () => {
    setTranscription('');
    setParsedVoiceInput(null);
    setRecordingTime(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Voice Recipe Input</Text>
          <Text style={styles.subtitle}>Speak your recipe aloud and let AI structure it for you</Text>
        </View>

        {/* Recording Controls */}
        <View style={styles.recordingSection}>
          {!isRecording && !transcription && (
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Ionicons name="mic" size={48} color={colors.white} />
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <View style={styles.recordingControls}>
              <View style={styles.recordingIndicator}>
                <View style={styles.pulseCircle} />
                <Ionicons name="mic" size={32} color={colors.error} />
              </View>
              <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
              <Text style={styles.recordingText}>Recording... Speak clearly</Text>

              <View style={styles.recordingButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
                  <Ionicons name="close" size={24} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <Ionicons name="stop" size={24} color={colors.white} />
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isTranscribing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.processingText}>Processing your voice...</Text>
              <Text style={styles.processingSubtext}>Converting speech to text</Text>
            </View>
          )}
        </View>

        {/* Transcription Results */}
        {transcription && !isTranscribing && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Transcription</Text>
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>

            {parsedVoiceInput && (
              <>
                <Text style={styles.sectionTitle}>Detected Components</Text>

                {parsedVoiceInput.title && (
                  <View style={styles.componentBox}>
                    <Text style={styles.componentLabel}>Title</Text>
                    <Text style={styles.componentText}>{parsedVoiceInput.title}</Text>
                  </View>
                )}

                {parsedVoiceInput.ingredients && (
                  <View style={styles.componentBox}>
                    <Text style={styles.componentLabel}>Ingredients</Text>
                    <Text style={styles.componentText}>{parsedVoiceInput.ingredients}</Text>
                  </View>
                )}

                {parsedVoiceInput.instructions && (
                  <View style={styles.componentBox}>
                    <Text style={styles.componentLabel}>Instructions</Text>
                    <Text style={styles.componentText}>{parsedVoiceInput.instructions}</Text>
                  </View>
                )}

                {/* AI Formatting Options */}
                <Text style={styles.sectionTitle}>Format with AI</Text>
                <Text style={styles.sectionSubtitle}>Choose the recipe type for optimized formatting</Text>

                <View style={styles.formatOptions}>
                  <TouchableOpacity
                    style={styles.formatOption}
                    onPress={() => formatWithAI('cocktail')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.formatOptionIcon}>🍸</Text>
                    <Text style={styles.formatOptionText}>Cocktail</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.formatOption}
                    onPress={() => formatWithAI('mocktail')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.formatOptionIcon}>🥤</Text>
                    <Text style={styles.formatOptionText}>Mocktail</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.formatOption}
                    onPress={() => formatWithAI('spirits-education')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.formatOptionIcon}>📚</Text>
                    <Text style={styles.formatOptionText}>Education</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.formatOption}
                    onPress={() => formatWithAI('general')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.formatOptionIcon}>🥃</Text>
                    <Text style={styles.formatOptionText}>General</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.resetButton} onPress={resetSession}>
                  <Text style={styles.resetButtonText}>Record New Recipe</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing(2),
  },
  header: {
    marginBottom: spacing(4),
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: spacing(4),
    paddingVertical: spacing(4),
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing(1),
  },
  recordingControls: {
    alignItems: 'center',
    gap: spacing(2),
  },
  recordingIndicator: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    opacity: 0.3,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    fontVariant: ['tabular-nums'],
  },
  recordingText: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: spacing(3),
    marginTop: spacing(2),
  },
  cancelButton: {
    alignItems: 'center',
    padding: spacing(2),
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing(0.5),
  },
  stopButton: {
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  stopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    gap: spacing(2),
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  processingSubtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: spacing(2),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(3),
    marginTop: -spacing(1),
  },
  transcriptionBox: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  componentBox: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2.5),
    marginBottom: spacing(2),
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  componentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  formatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  formatOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  formatOptionIcon: {
    fontSize: 32,
    marginBottom: spacing(1),
  },
  formatOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resetButton: {
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  resetButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
});