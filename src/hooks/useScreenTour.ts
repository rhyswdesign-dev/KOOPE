import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCREEN_TOURS, ScreenTourId } from '../config/screenTours';
import { log } from '../lib/logger';

const TOUR_PREFIX = '@KOOPE:screen_tour_seen_';

export function useScreenTour(tourId: ScreenTourId) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const slides = useMemo(() => SCREEN_TOURS[tourId], [tourId]);
  const lastIndex = Math.max(0, slides.length - 1);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const key = `${TOUR_PREFIX}${tourId}`;
        const seen = await AsyncStorage.getItem(key);
        if (!mounted) return;
        if (seen !== 'true') {
          setVisible(true);
          setStepIndex(0);
        }
      } catch (error) {
        log.warn('useScreenTour', 'Failed reading tour status', { tourId, error });
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [tourId]);

  const markSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(`${TOUR_PREFIX}${tourId}`, 'true');
    } catch (error) {
      log.warn('useScreenTour', 'Failed saving tour status', { tourId, error });
    }
  }, [tourId]);

  const openTour = useCallback(() => {
    setStepIndex(0);
    setVisible(true);
  }, []);

  const closeTour = useCallback(async () => {
    await markSeen();
    setVisible(false);
    setStepIndex(0);
  }, [markSeen]);

  const next = useCallback(async () => {
    if (stepIndex >= lastIndex) {
      await closeTour();
      return;
    }
    setStepIndex((prev) => Math.min(lastIndex, prev + 1));
  }, [closeTour, lastIndex, stepIndex]);

  const previous = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    isReady,
    visible,
    stepIndex,
    slides,
    openTour,
    closeTour,
    next,
    previous,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === lastIndex,
  };
}
