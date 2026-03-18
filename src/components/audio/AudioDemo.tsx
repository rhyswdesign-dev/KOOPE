// @ts-nocheck
/**
 * Audio Demo Component
 * Demonstrates all available audio features and sound effects
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, spacing, radii } from '../../theme/tokens';
import { useAudio } from '../../hooks/useAudio';
import { AudioButton } from '../ui/AudioButton';
import { CocktailSoundEffects, CocktailSoundEffectsRef, CocktailStep } from './CocktailSoundEffects';
import { AudioSettings } from '../settings/AudioSettings';
import { log } from '../../lib/logger';

export const AudioDemo: React.FC = () => {
  const audio = useAudio();
  const cocktailSoundsRef = useRef<CocktailSoundEffectsRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const feedbackSounds = [
    { key: 'correct', label: 'Correct Answer', action: () => audio.playCorrectAnswer() },
    { key: 'incorrect', label: 'Incorrect Answer', action: () => audio.playIncorrectAnswer() },
    { key: 'lesson', label: 'Lesson Complete', action: () => audio.playLessonComplete() },
    { key: 'perfect', label: 'Perfect Score', action: () => audio.playPerfectScore() },
    { key: 'streak', label: 'Streak', action: () => audio.playStreak() },
    { key: 'levelup', label: 'Level Up', action: () => audio.playLevelUp() },
  ];

  const cocktailSounds = [
    { key: 'shake', label: 'Shake Cocktail', action: () => cocktailSoundsRef.current?.shake() },
    { key: 'pour', label: 'Pour Liquid', action: () => cocktailSoundsRef.current?.pour() },
    { key: 'ice', label: 'Add Ice', action: () => cocktailSoundsRef.current?.addIce() },
    { key: 'stir', label: 'Stir (5s)', action: () => cocktailSoundsRef.current?.stir(5000) },
    { key: 'strain', label: 'Strain', action: () => cocktailSoundsRef.current?.strain() },
    { key: 'clink', label: 'Glass Clink', action: () => cocktailSoundsRef.current?.clink() },
  ];

  const handlePlaySequence = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    const margaritaSequence: CocktailStep[] = [
      { action: 'ice', delay: 0 },
      { action: 'pour', delay: 1000, options: { type: 'spirit' } },
      { action: 'pour', delay: 1500, options: { type: 'mixer' } },
      { action: 'shake', delay: 1000, duration: 3000 },
      { action: 'strain', delay: 3500 },
      { action: 'garnish', delay: 1500 },
      { action: 'clink', delay: 1000 },
    ];

    try {
      await cocktailSoundsRef.current?.sequence(margaritaSequence);
      setTimeout(() => setIsPlaying(false), 10000); // Total sequence time
    } catch (error) {
      log.error('AudioDemo', 'Failed to play cocktail sequence', error);
      setIsPlaying(false);
    }
  };

  const handleStopAll = async () => {
    try {
      await cocktailSoundsRef.current?.stopAll();
      await audio.stopAmbientBar();
      setIsPlaying(false);
    } catch (error) {
      log.error('AudioDemo', 'Failed to stop all sounds', error);
    }
  };

  const handleStartAmbient = async () => {
    try {
      await audio.startAmbientBar();
      Alert.alert('Ambient Started', 'Bar ambience is now playing in the background');
    } catch (error) {
      log.error('AudioDemo', 'Failed to start ambient sounds', error);
    }
  };

  if (showSettings) {
    return (
      <View style={styles.container}>
        <AudioButton
          title="Back to Demo"
          onPress={() => setShowSettings(false)}
          icon="arrow-back"
          customStyle={styles.backButton}
        />
        <AudioSettings />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Audio Demo</Text>
        <Text style={styles.subtitle}>
          Experience the immersive audio features of the bartending app
        </Text>

        {/* Audio Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Audio Status</Text>
          <Text style={styles.statusText}>
            System: {audio.isInitialized ? '✓ Ready' : '✗ Not Ready'}
          </Text>
          <Text style={styles.statusText}>
            Mode: {audio.settings.mode}
          </Text>
          <Text style={styles.statusText}>
            Volume: {Math.round(audio.settings.volume * 100)}%
          </Text>
        </View>

        {/* Settings Button */}
        <AudioButton
          title="Audio Settings"
          onPress={() => setShowSettings(true)}
          icon="settings"
          variant="secondary"
          customStyle={styles.settingsButton}
        />

        {/* Feedback Sounds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Feedback Sounds</Text>
          <Text style={styles.sectionDescription}>
            Audio feedback for student responses and achievements
          </Text>
          <View style={styles.buttonGrid}>
            {feedbackSounds.map((sound) => (
              <AudioButton
                key={sound.key}
                title={sound.label}
                onPress={sound.action}
                size="small"
                customStyle={styles.gridButton}
                disabled={!audio.isInitialized}
              />
            ))}
          </View>
        </View>

        {/* Cocktail Sounds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cocktail Preparation Sounds</Text>
          <Text style={styles.sectionDescription}>
            Realistic sound effects for cocktail making lessons
          </Text>
          <View style={styles.buttonGrid}>
            {cocktailSounds.map((sound) => (
              <AudioButton
                key={sound.key}
                title={sound.label}
                onPress={sound.action}
                variant="warning"
                size="small"
                customStyle={styles.gridButton}
                disabled={!audio.isInitialized}
              />
            ))}
          </View>
        </View>

        {/* Cocktail Sequence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Complete Cocktail Sequence</Text>
          <Text style={styles.sectionDescription}>
            Experience a full margarita preparation with timed sound effects
          </Text>
          <View style={styles.sequenceContainer}>
            <AudioButton
              title="Make Margarita"
              onPress={handlePlaySequence}
              variant="success"
              icon="play"
              disabled={!audio.isInitialized || isPlaying}
              loading={isPlaying}
              customStyle={styles.sequenceButton}
            />
            <AudioButton
              title="Stop All"
              onPress={handleStopAll}
              variant="danger"
              icon="stop"
              disabled={!audio.isInitialized}
              customStyle={styles.sequenceButton}
            />
          </View>
        </View>

        {/* Ambient Sounds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ambient Bar Atmosphere</Text>
          <Text style={styles.sectionDescription}>
            Background sounds to create an immersive bar environment
          </Text>
          <View style={styles.ambientContainer}>
            <AudioButton
              title="Start Bar Ambience"
              onPress={handleStartAmbient}
              variant="secondary"
              icon="musical-notes"
              disabled={!audio.isInitialized}
              customStyle={styles.ambientButton}
            />
            <AudioButton
              title="Stop Ambience"
              onPress={() => audio.stopAmbientBar()}
              variant="secondary"
              icon="volume-mute"
              disabled={!audio.isInitialized}
              customStyle={styles.ambientButton}
            />
          </View>
        </View>

        {/* Usage Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration Examples</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {`// Basic usage in components
const audio = useAudio();

// Play feedback sounds
await audio.playCorrectAnswer();
await audio.playLessonComplete();

// Cocktail preparation
const soundsRef = useRef<CocktailSoundEffectsRef>(null);
await soundsRef.current?.shake();
await soundsRef.current?.pour('spirit');

// Sequence of actions
const steps: CocktailStep[] = [
  { action: 'ice', delay: 0 },
  { action: 'pour', delay: 1000 },
  { action: 'shake', delay: 1500 }
];
await soundsRef.current?.sequence(steps);`}
            </Text>
          </View>
        </View>
      </View>

      {/* Hidden cocktail sound effects controller */}
      <CocktailSoundEffects ref={cocktailSoundsRef} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(4),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing(6),
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radii.medium,
    padding: spacing(4),
    marginBottom: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(2),
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing(1),
  },
  settingsButton: {
    marginBottom: spacing(6),
  },
  backButton: {
    marginBottom: spacing(4),
  },
  section: {
    marginBottom: spacing(6),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(2),
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing(4),
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  gridButton: {
    minWidth: '30%',
    marginBottom: spacing(2),
  },
  sequenceContainer: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  sequenceButton: {
    flex: 1,
  },
  ambientContainer: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  ambientButton: {
    flex: 1,
  },
  codeBlock: {
    backgroundColor: colors.card,
    borderRadius: radii.medium,
    padding: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
});

export default AudioDemo;