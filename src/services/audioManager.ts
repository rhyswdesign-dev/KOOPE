/**
 * Audio Manager Service
 * Handles all sound effects and audio feedback for the app
 */

import { log } from '../lib/logger';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

export type SoundType = 
  | 'answer_correct'
  | 'answer_incorrect'
  | 'lesson_complete'
  | 'perfect_score'
  | 'level_up'
  | 'streak'
  | 'button_tap'
  | 'shake_cocktail'
  | 'pour_liquid'
  | 'ice_drop'
  | 'glass_clink'
  | 'stirring'
  | 'carbonation'
  | 'ambient_bar';

interface SoundConfig {
  file: any; // require() import
  volume: number;
  shouldLoop: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

interface CachedSound {
  sound: Sound;
  config: SoundConfig;
  isLoaded: boolean;
}

class AudioManager {
  private sounds: Map<SoundType, CachedSound> = new Map();
  private isEnabled: boolean = true;
  private masterVolume: number = 0.7;
  private audioMode: 'education' | 'ambient' | 'silent' = 'education';

  // Sound definitions with placeholder paths
  private soundConfigs: Record<SoundType, SoundConfig> = {
    // Feedback sounds
    answer_correct: {
      file: null, // Will be populated with actual audio files
      volume: 0.8,
      shouldLoop: false,
    },
    answer_incorrect: {
      file: null,
      volume: 0.6,
      shouldLoop: false,
    },
    lesson_complete: {
      file: null,
      volume: 0.9,
      shouldLoop: false,
    },
    perfect_score: {
      file: null,
      volume: 1.0,
      shouldLoop: false,
    },
    level_up: {
      file: null,
      volume: 0.9,
      shouldLoop: false,
    },
    streak: {
      file: null,
      volume: 0.8,
      shouldLoop: false,
    },

    // UI sounds
    button_tap: {
      file: null,
      volume: 0.4,
      shouldLoop: false,
    },

    // Cocktail preparation sounds
    shake_cocktail: {
      file: null,
      volume: 0.7,
      shouldLoop: false,
    },
    pour_liquid: {
      file: null,
      volume: 0.6,
      shouldLoop: false,
    },
    ice_drop: {
      file: null,
      volume: 0.5,
      shouldLoop: false,
    },
    glass_clink: {
      file: null,
      volume: 0.6,
      shouldLoop: false,
    },
    stirring: {
      file: null,
      volume: 0.4,
      shouldLoop: true,
    },
    carbonation: {
      file: null,
      volume: 0.3,
      shouldLoop: false,
    },

    // Ambient sounds
    ambient_bar: {
      file: null,
      volume: 0.2,
      shouldLoop: true,
      fadeInDuration: 2000,
      fadeOutDuration: 1500,
    },
  };

  async initialize(): Promise<void> {
    try {
      // Set audio mode for optimal playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      log.info('AudioManager', 'Initialized successfully');
    } catch (error) {
      log.error('AudioManager', 'Initialization failed', { error });
    }
  }

  async preloadSounds(soundTypes: SoundType[] = []): Promise<void> {
    const soundsToLoad = soundTypes.length > 0 ? soundTypes : Object.keys(this.soundConfigs) as SoundType[];

    const loadPromises = soundsToLoad.map(async (soundType) => {
      try {
        const config = this.soundConfigs[soundType];
        if (!config.file) {
          // Skip loading if no file is configured (placeholder)
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          config.file,
          {
            shouldPlay: false,
            volume: config.volume * this.masterVolume,
            isLooping: config.shouldLoop,
          }
        );

        this.sounds.set(soundType, {
          sound,
          config,
          isLoaded: true,
        });

        log.debug('AudioManager', 'Sound preloaded', { soundType });
      } catch (error) {
        log.error('AudioManager', 'Failed to preload sound', { error, soundType });
      }
    });

    await Promise.all(loadPromises);
  }

  async playSound(
    soundType: SoundType, 
    options: {
      volume?: number;
      playbackRate?: number;
      shouldLoop?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const cachedSound = this.sounds.get(soundType);
      
      if (cachedSound && cachedSound.isLoaded) {
        // Use preloaded sound
        const { sound, config } = cachedSound;
        
        await sound.setPositionAsync(0); // Reset to beginning
        await sound.setVolumeAsync((options.volume ?? config.volume) * this.masterVolume);
        
        if (options.playbackRate) {
          await sound.setRateAsync(options.playbackRate, true);
        }
        
        if (options.shouldLoop !== undefined) {
          await sound.setIsLoopingAsync(options.shouldLoop);
        }

        await sound.playAsync();
      } else {
        // Fallback: load and play immediately (for sounds not preloaded)
        const config = this.soundConfigs[soundType];
        if (!config.file) {
          log.warn('AudioManager', 'No audio file configured', { soundType });
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          config.file,
          {
            shouldPlay: true,
            volume: (options.volume ?? config.volume) * this.masterVolume,
            isLooping: options.shouldLoop ?? config.shouldLoop,
            rate: options.playbackRate ?? 1.0,
          }
        );

        // Clean up after playing (for non-looping sounds)
        if (!config.shouldLoop) {
          sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync();
            }
          });
        }
      }
    } catch (error) {
      log.error('AudioManager', 'Failed to play sound', { error, soundType });
    }
  }

  async stopSound(soundType: SoundType): Promise<void> {
    const cachedSound = this.sounds.get(soundType);
    if (cachedSound && cachedSound.isLoaded) {
      try {
        await cachedSound.sound.stopAsync();
      } catch (error) {
        log.error('AudioManager', 'Failed to stop sound', { error, soundType });
      }
    }
  }

  async pauseSound(soundType: SoundType): Promise<void> {
    const cachedSound = this.sounds.get(soundType);
    if (cachedSound && cachedSound.isLoaded) {
      try {
        await cachedSound.sound.pauseAsync();
      } catch (error) {
        log.error('AudioManager', 'Failed to pause sound', { error, soundType });
      }
    }
  }

  async fadeIn(soundType: SoundType, duration: number = 1000): Promise<void> {
    const cachedSound = this.sounds.get(soundType);
    if (!cachedSound?.isLoaded) return;

    const { sound, config } = cachedSound;
    const targetVolume = config.volume * this.masterVolume;
    
    try {
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      
      // Gradual volume increase
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = targetVolume / steps;
      
      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        await sound.setVolumeAsync(volumeStep * i);
      }
    } catch (error) {
      log.error('AudioManager', 'Failed to fade in sound', { error, soundType });
    }
  }

  async fadeOut(soundType: SoundType, duration: number = 1000): Promise<void> {
    const cachedSound = this.sounds.get(soundType);
    if (!cachedSound?.isLoaded) return;

    const { sound, config } = cachedSound;
    const currentVolume = config.volume * this.masterVolume;

    try {
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = currentVolume / steps;

      for (let i = steps - 1; i >= 0; i--) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        await sound.setVolumeAsync(volumeStep * i);
      }

      await sound.stopAsync();
    } catch (error) {
      log.error('AudioManager', 'Failed to fade out sound', { error, soundType });
    }
  }

  setAudioMode(mode: 'education' | 'ambient' | 'silent'): void {
    this.audioMode = mode;
    
    switch (mode) {
      case 'education':
        this.setEnabled(true);
        this.setMasterVolume(0.7);
        break;
      case 'ambient':
        this.setEnabled(true);
        this.setMasterVolume(0.3);
        break;
      case 'silent':
        this.setEnabled(false);
        break;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      // Stop all currently playing sounds
      this.sounds.forEach(async (cachedSound, soundType) => {
        if (cachedSound.isLoaded) {
          try {
            await cachedSound.sound.stopAsync();
          } catch (error) {
            log.error('AudioManager', 'Failed to stop sound when disabling', { error, soundType });
          }
        }
      });
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all loaded sounds
    this.sounds.forEach(async (cachedSound) => {
      if (cachedSound.isLoaded) {
        try {
          await cachedSound.sound.setVolumeAsync(cachedSound.config.volume * this.masterVolume);
        } catch (error) {
          log.error('AudioManager', 'Failed to update sound volume', { error });
        }
      }
    });
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  getAudioMode(): string {
    return this.audioMode;
  }

  async cleanup(): Promise<void> {
    const unloadPromises = Array.from(this.sounds.values()).map(async (cachedSound) => {
      if (cachedSound.isLoaded) {
        try {
          await cachedSound.sound.unloadAsync();
        } catch (error) {
          log.error('AudioManager', 'Failed to unload sound', { error });
        }
      }
    });

    await Promise.all(unloadPromises);
    this.sounds.clear();
    log.info('AudioManager', 'Cleaned up');
  }

  // Convenience methods for common sound effects
  async playCorrectAnswer(): Promise<void> {
    await this.playSound('answer_correct');
  }

  async playIncorrectAnswer(): Promise<void> {
    await this.playSound('answer_incorrect');
  }

  async playLessonComplete(): Promise<void> {
    await this.playSound('lesson_complete');
  }

  async playPerfectScore(): Promise<void> {
    await this.playSound('perfect_score');
  }

  async playStreak(): Promise<void> {
    await this.playSound('streak');
  }

  async playLevelUp(): Promise<void> {
    await this.playSound('level_up');
  }

  async playButtonTap(): Promise<void> {
    await this.playSound('button_tap', { volume: 0.3 });
  }

  async playShakeCocktail(): Promise<void> {
    await this.playSound('shake_cocktail');
  }

  async playPourLiquid(): Promise<void> {
    await this.playSound('pour_liquid');
  }

  async playGlassClink(): Promise<void> {
    await this.playSound('glass_clink');
  }

  async startAmbientBar(): Promise<void> {
    await this.fadeIn('ambient_bar', 2000);
  }

  async stopAmbientBar(): Promise<void> {
    await this.fadeOut('ambient_bar', 1500);
  }
}

// Singleton instance
export const audioManager = new AudioManager();

export default audioManager;