/**
 * Cocktail Sound Effects Component
 * Provides realistic cocktail preparation sound effects
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { log } from '../../lib/logger';

export interface CocktailSoundEffectsRef {
  shake: (duration?: number) => Promise<void>;
  pour: (type?: 'spirit' | 'mixer' | 'slow') => Promise<void>;
  stir: (duration?: number) => Promise<void>;
  stopStirring: () => Promise<void>;
  addIce: (amount?: 'single' | 'multiple') => Promise<void>;
  strain: () => Promise<void>;
  clink: () => Promise<void>;
  garnish: () => Promise<void>;
  sequence: (steps: CocktailStep[]) => Promise<void>;
  stopAll: () => Promise<void>;
}

export interface CocktailStep {
  action: 'shake' | 'pour' | 'stir' | 'ice' | 'strain' | 'clink' | 'garnish';
  duration?: number;
  delay?: number;
  options?: {
    type?: string;
    amount?: string;
    volume?: number;
  };
}

export const CocktailSoundEffects = forwardRef<CocktailSoundEffectsRef>((props, ref) => {
  const audio = useAudio();
  const stirringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceTimeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useImperativeHandle(ref, () => ({
    async shake(duration = 3000) {
      await audio.playShakeCocktail();
      
      // For longer shakes, we might want to loop or play multiple times
      if (duration > 2000) {
        setTimeout(async () => {
          await audio.playShakeCocktail();
        }, 1500);
      }
    },

    async pour(type = 'spirit') {
      const volumeOptions = {
        spirit: { volume: 0.7, playbackRate: 1.0 },
        mixer: { volume: 0.5, playbackRate: 1.2 },
        slow: { volume: 0.6, playbackRate: 0.8 },
      };

      await audio.playSound('pour_liquid', volumeOptions[type]);
    },

    async stir(duration = 5000) {
      await audio.playStirring();
      
      // Stop stirring after specified duration
      stirringTimeoutRef.current = setTimeout(async () => {
        await this.stopStirring();
      }, duration);
    },

    async stopStirring() {
      if (stirringTimeoutRef.current) {
        clearTimeout(stirringTimeoutRef.current);
        stirringTimeoutRef.current = null;
      }
      await audio.stopStirring();
    },

    async addIce(amount = 'multiple') {
      if (amount === 'single') {
        await audio.playIceDrop();
      } else {
        // Multiple ice cubes with slight delays
        for (let i = 0; i < 3; i++) {
          setTimeout(async () => {
            await audio.playIceDrop();
          }, i * 200);
        }
      }
    },

    async strain() {
      // Straining sound could be a variation of pouring
      await audio.playSound('pour_liquid', { 
        volume: 0.4, 
        playbackRate: 0.9 
      });
    },

    async clink() {
      await audio.playGlassClink();
    },

    async garnish() {
      // Gentle sound for garnish placement
      await audio.playSound('button_tap', { 
        volume: 0.2, 
        playbackRate: 0.7 
      });
    },

    async sequence(steps: CocktailStep[]) {
      // Clear any existing sequence timeouts
      sequenceTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      sequenceTimeoutRefs.current = [];

      let currentDelay = 0;

      for (const step of steps) {
        const timeout = setTimeout(async () => {
          try {
            switch (step.action) {
              case 'shake':
                await this.shake(step.duration);
                break;
              case 'pour':
                await this.pour(step.options?.type as any);
                break;
              case 'stir':
                await this.stir(step.duration);
                break;
              case 'ice':
                await this.addIce(step.options?.amount as any);
                break;
              case 'strain':
                await this.strain();
                break;
              case 'clink':
                await this.clink();
                break;
              case 'garnish':
                await this.garnish();
                break;
              default:
                log.warn('CocktailSoundEffects', 'Unknown cocktail action', { action: step.action });
            }
          } catch (error) {
            log.error('CocktailSoundEffects', `Error playing cocktail sound`, error, { action: step.action });
          }
        }, currentDelay);

        sequenceTimeoutRefs.current.push(timeout);
        currentDelay += (step.delay || 1000) + (step.duration || 0);
      }
    },

    async stopAll() {
      // Clear all timeouts
      if (stirringTimeoutRef.current) {
        clearTimeout(stirringTimeoutRef.current);
        stirringTimeoutRef.current = null;
      }
      
      sequenceTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      sequenceTimeoutRefs.current = [];

      // Stop any looping sounds
      await audio.stopStirring();
      await audio.stopAmbientBar();
    },
  }));

  // Don't render anything - this is a controller component
  return null;
});

CocktailSoundEffects.displayName = 'CocktailSoundEffects';

export default CocktailSoundEffects;