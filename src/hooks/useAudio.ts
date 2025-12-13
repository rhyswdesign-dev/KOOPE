/**
 * Audio Hook
 * Provides easy access to audio functionality in components
 */

import { useEffect, useCallback, useState } from 'react';
import { audioManager, SoundType } from '../services/audioManager';
import { log } from '../lib/logger';

interface AudioSettings {
  enabled: boolean;
  volume: number;
  mode: 'education' | 'ambient' | 'silent';
}

export const useAudio = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>({
    enabled: true,
    volume: 0.7,
    mode: 'education'
  });

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioManager.initialize();
        
        // Preload essential sounds for better performance
        await audioManager.preloadSounds([
          'answer_correct',
          'answer_incorrect',
          'lesson_complete',
          'perfect_score',
          'button_tap'
        ]);
        
        setIsInitialized(true);
      } catch (error) {
        log.warn('useAudio', 'Audio initialization failed, continuing without audio', { error });
        // Continue without audio - don't block the app
        setIsInitialized(false);
        setSettings(prev => ({ ...prev, enabled: false }));
      }
    };

    initializeAudio();

    // Cleanup on unmount
    return () => {
      try {
        audioManager.cleanup();
      } catch (error) {
        log.warn('useAudio', 'Audio cleanup failed', { error });
      }
    };
  }, []);

  const playSound = useCallback(async (
    soundType: SoundType,
    options?: {
      volume?: number;
      playbackRate?: number;
      shouldLoop?: boolean;
    }
  ) => {
    if (!isInitialized || !settings.enabled) return;
    
    try {
      await audioManager.playSound(soundType, options);
    } catch (error) {
      log.warn('useAudio', 'Failed to play sound', { soundType, error });
    }
  }, [isInitialized, settings.enabled]);

  const stopSound = useCallback(async (soundType: SoundType) => {
    if (!isInitialized) return;
    
    try {
      await audioManager.stopSound(soundType);
    } catch (error) {
      log.warn('useAudio', 'Failed to stop sound', { soundType, error });
    }
  }, [isInitialized]);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    try {
      if (isInitialized) {
        audioManager.setEnabled(enabled);
      }
      setSettings(prev => ({ ...prev, enabled }));
    } catch (error) {
      log.warn('useAudio', 'Failed to set audio enabled', { error });
    }
  }, [isInitialized]);

  const setVolume = useCallback((volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      if (isInitialized) {
        audioManager.setMasterVolume(clampedVolume);
      }
      setSettings(prev => ({ ...prev, volume: clampedVolume }));
    } catch (error) {
      log.warn('useAudio', 'Failed to set volume', { error });
    }
  }, [isInitialized]);

  const setAudioMode = useCallback((mode: 'education' | 'ambient' | 'silent') => {
    try {
      if (isInitialized) {
        audioManager.setAudioMode(mode);
      }
      setSettings(prev => ({ 
        ...prev, 
        mode,
        enabled: mode !== 'silent',
        volume: isInitialized ? audioManager.getMasterVolume() : prev.volume
      }));
    } catch (error) {
      log.warn('useAudio', 'Failed to set audio mode', { error });
    }
  }, [isInitialized]);

  // Convenience methods for common interactions
  const playCorrectAnswer = useCallback(() => playSound('answer_correct'), [playSound]);
  const playIncorrectAnswer = useCallback(() => playSound('answer_incorrect'), [playSound]);
  const playLessonComplete = useCallback(() => playSound('lesson_complete'), [playSound]);
  const playPerfectScore = useCallback(() => playSound('perfect_score'), [playSound]);
  const playStreak = useCallback(() => playSound('streak'), [playSound]);
  const playLevelUp = useCallback(() => playSound('level_up'), [playSound]);
  const playButtonTap = useCallback(() => playSound('button_tap', { volume: 0.3 }), [playSound]);

  // Cocktail preparation sounds
  const playShakeCocktail = useCallback(() => playSound('shake_cocktail'), [playSound]);
  const playPourLiquid = useCallback(() => playSound('pour_liquid'), [playSound]);
  const playIceDrop = useCallback(() => playSound('ice_drop'), [playSound]);
  const playGlassClink = useCallback(() => playSound('glass_clink'), [playSound]);
  const playStirring = useCallback(() => playSound('stirring'), [playSound]);
  const stopStirring = useCallback(() => stopSound('stirring'), [stopSound]);

  // Ambient sounds
  const startAmbientBar = useCallback(async () => {
    try {
      await audioManager.startAmbientBar();
    } catch (error) {
      log.error('useAudio', 'Failed to start ambient bar sounds', error);
    }
  }, []);

  const stopAmbientBar = useCallback(async () => {
    try {
      await audioManager.stopAmbientBar();
    } catch (error) {
      log.error('useAudio', 'Failed to stop ambient bar sounds', error);
    }
  }, []);

  return {
    // State
    isInitialized,
    settings,
    
    // Core functions
    playSound,
    stopSound,
    
    // Settings
    setAudioEnabled,
    setVolume,
    setAudioMode,
    
    // Feedback sounds
    playCorrectAnswer,
    playIncorrectAnswer,
    playLessonComplete,
    playPerfectScore,
    playStreak,
    playLevelUp,
    playButtonTap,
    
    // Cocktail preparation sounds
    playShakeCocktail,
    playPourLiquid,
    playIceDrop,
    playGlassClink,
    playStirring,
    stopStirring,
    
    // Ambient sounds
    startAmbientBar,
    stopAmbientBar,
  };
};

export default useAudio;