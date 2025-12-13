/**
 * Audio Settings Component
 * Allows users to control their audio experience
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Slider } from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { useAudio } from '../../hooks/useAudio';
import { AudioButton } from '../ui/AudioButton';
import { log } from '../../lib/logger';

export const AudioSettings: React.FC = () => {
  const audio = useAudio();
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);

  const handleVolumeChange = (value: number) => {
    audio.setVolume(value);
  };

  const handleAudioModeChange = (mode: 'education' | 'ambient' | 'silent') => {
    audio.setAudioMode(mode);
  };

  const handleTestSound = async () => {
    if (testSoundPlaying) return;
    
    setTestSoundPlaying(true);
    
    try {
      await audio.playCorrectAnswer();
      setTimeout(() => {
        setTestSoundPlaying(false);
      }, 1000);
    } catch (error) {
      log.error('AudioSettings', 'Failed to play test sound', error);
      setTestSoundPlaying(false);
    }
  };

  const handleTestCocktailSounds = async () => {
    if (testSoundPlaying) return;

    setTestSoundPlaying(true);

    try {
      // Play a sequence of cocktail sounds
      await audio.playShakeCocktail();
      setTimeout(async () => {
        await audio.playPourLiquid();
      }, 1500);
      setTimeout(async () => {
        await audio.playGlassClink();
        setTestSoundPlaying(false);
      }, 3000);
    } catch (error) {
      log.error('AudioSettings', 'Failed to play cocktail test sounds', error);
      setTestSoundPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Settings</Text>
      
      {/* Audio Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Mode</Text>
        <Text style={styles.sectionDescription}>
          Choose how you want to experience audio feedback
        </Text>
        
        <View style={styles.modeContainer}>
          <AudioButton
            title="Education"
            onPress={() => handleAudioModeChange('education')}
            variant={audio.settings.mode === 'education' ? 'primary' : 'secondary'}
            size="small"
            icon="school"
            customStyle={styles.modeButton}
          />
          <AudioButton
            title="Ambient"
            onPress={() => handleAudioModeChange('ambient')}
            variant={audio.settings.mode === 'ambient' ? 'primary' : 'secondary'}
            size="small"
            icon="musical-notes"
            customStyle={styles.modeButton}
          />
          <AudioButton
            title="Silent"
            onPress={() => handleAudioModeChange('silent')}
            variant={audio.settings.mode === 'silent' ? 'primary' : 'secondary'}
            size="small"
            icon="volume-mute"
            customStyle={styles.modeButton}
          />
        </View>
      </View>

      {/* Volume Control */}
      {audio.settings.mode !== 'silent' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume</Text>
          <View style={styles.volumeContainer}>
            <Ionicons name="volume-low" size={20} color={colors.textSecondary} />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={audio.settings.volume}
              onValueChange={handleVolumeChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbStyle={styles.sliderThumb}
              step={0.1}
            />
            <Ionicons name="volume-high" size={20} color={colors.textSecondary} />
          </View>
          <Text style={styles.volumeValue}>
            {Math.round(audio.settings.volume * 100)}%
          </Text>
        </View>
      )}

      {/* Audio Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Features</Text>
        
        <View style={styles.featureItem}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>Feedback Sounds</Text>
            <Text style={styles.featureDescription}>
              Play sounds for correct/incorrect answers
            </Text>
          </View>
          <Switch
            value={audio.settings.enabled && audio.settings.mode !== 'silent'}
            onValueChange={(value) => audio.setAudioEnabled(value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>Cocktail Sound Effects</Text>
            <Text style={styles.featureDescription}>
              Realistic sounds during cocktail preparation lessons
            </Text>
          </View>
          <Switch
            value={audio.settings.enabled && audio.settings.mode !== 'silent'}
            onValueChange={(value) => audio.setAudioEnabled(value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Test Sounds */}
      {audio.settings.enabled && audio.settings.mode !== 'silent' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Audio</Text>
          <Text style={styles.sectionDescription}>
            Test your audio settings with sample sounds
          </Text>
          
          <View style={styles.testContainer}>
            <AudioButton
              title="Test Feedback"
              onPress={handleTestSound}
              variant="success"
              icon="play"
              disabled={testSoundPlaying || !audio.isInitialized}
              loading={testSoundPlaying}
              customStyle={styles.testButton}
            />
            
            <AudioButton
              title="Test Cocktail Sounds"
              onPress={handleTestCocktailSounds}
              variant="warning"
              icon="wine"
              disabled={testSoundPlaying || !audio.isInitialized}
              loading={testSoundPlaying}
              customStyle={styles.testButton}
            />
          </View>
        </View>
      )}

      {/* Audio Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Ionicons 
            name={audio.isInitialized ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={audio.isInitialized ? colors.success : colors.error} 
          />
          <Text style={[styles.statusText, { color: audio.isInitialized ? colors.success : colors.error }]}>
            Audio System: {audio.isInitialized ? 'Ready' : 'Not Ready'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Ionicons 
            name={audio.settings.enabled ? "volume-high" : "volume-mute"} 
            size={16} 
            color={audio.settings.enabled ? colors.primary : colors.textSecondary} 
          />
          <Text style={styles.statusText}>
            Status: {audio.settings.enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing(4),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(6),
  },
  section: {
    marginBottom: spacing(6),
  },
  sectionTitle: {
    fontSize: 18,
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
  modeContainer: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  modeButton: {
    flex: 1,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderThumb: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing(2),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureInfo: {
    flex: 1,
    marginRight: spacing(3),
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  testContainer: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  testButton: {
    flex: 1,
  },
  statusContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.medium,
    padding: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing(2),
  },
});

export default AudioSettings;