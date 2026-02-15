/**
 * Analytics Hook
 * React hook for analytics tracking with provider management
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { initAnalytics, track, flush, AnalyticsEvent } from '../services/analytics';
import { AppState } from 'react-native';
import { log } from '../lib/logger';

interface AnalyticsState {
  isInitialized: boolean;
  provider: 'memory' | 'posthog' | 'segment';
  error?: string;
}

interface AnalyticsHook extends AnalyticsState {
  track: (event: AnalyticsEvent) => Promise<void>;
  flush: () => Promise<void>;
  trackScreen: (screenName: string, properties?: Record<string, any>) => Promise<void>;
  trackAudio: (soundType: string, context?: string) => Promise<void>;
  trackVaultView: (itemId: string, category: string, rarity: string) => Promise<void>;
  trackVaultUnlock: (itemId: string, xpSpent: number, cashSpent?: number) => Promise<void>;
  trackSearch: (query: string, category?: string, resultsCount?: number) => Promise<void>;
  identify: (userId: string, traits?: Record<string, any>) => Promise<void>;
}

export const useAnalytics = (): AnalyticsHook => {
  const [state, setState] = useState<AnalyticsState>({
    isInitialized: false,
    provider: 'memory'
  });
  
  const providerRef = useRef<any>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    initializeAnalytics();
    
    // Handle app state changes for flushing
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        flushEvents();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeAnalytics = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      const provider = (process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER as any) || 'memory';
      
      let config: any = { provider };
      
      switch (provider) {
        case 'posthog':
          config.apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
          config.host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
          if (!config.apiKey) {
            throw new Error('PostHog API key not configured');
          }
          break;
          
        case 'segment':
          config.writeKey = process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY;
          if (!config.writeKey) {
            throw new Error('Segment write key not configured');
          }
          break;
          
        case 'memory':
        default:
          // Memory provider needs no config
          break;
      }

      await initAnalytics(config);
      
      setState({
        isInitialized: true,
        provider,
        error: undefined
      });

      log.info('useAnalytics', 'Analytics initialized', { provider });
    } catch (error) {
      log.error('useAnalytics', 'Analytics initialization failed', error);
      setState({
        isInitialized: false,
        provider: 'memory',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to memory provider
      try {
        await initAnalytics({ provider: 'memory' });
        setState(prev => ({ ...prev, isInitialized: true, provider: 'memory' }));
      } catch (fallbackError) {
        log.error('useAnalytics', 'Fallback to memory provider failed', fallbackError);
      }
    } finally {
      isInitializingRef.current = false;
    }
  };

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    if (!state.isInitialized) {
      log.warn('useAnalytics', 'Analytics not initialized, queueing event', { eventType: event.type });
      return;
    }

    try {
      await track(event);
    } catch (error) {
      log.error('useAnalytics', 'Analytics tracking error', error);
    }
  }, [state.isInitialized]);

  const flushEvents = useCallback(async () => {
    try {
      await flush();
    } catch (error) {
      log.error('useAnalytics', 'Analytics flush error', error);
    }
  }, []);

  // Convenience tracking methods
  const trackScreen = useCallback(async (screenName: string, properties?: Record<string, any>) => {
    await trackEvent({
      type: 'screen.viewed',
      screenName,
      properties
    });
  }, [trackEvent]);

  const trackAudio = useCallback(async (soundType: string, context?: string) => {
    await trackEvent({
      type: 'audio.played',
      soundType,
      context
    });
  }, [trackEvent]);

  const trackVaultView = useCallback(async (itemId: string, category: string, rarity: string) => {
    await trackEvent({
      type: 'vault.item.viewed',
      itemId,
      category,
      rarity
    });
  }, [trackEvent]);

  const trackVaultUnlock = useCallback(async (itemId: string, xpSpent: number, cashSpent?: number) => {
    await trackEvent({
      type: 'vault.item.unlocked',
      itemId,
      xpSpent,
      cashSpent
    });
  }, [trackEvent]);

  const trackSearch = useCallback(async (query: string, category?: string, resultsCount?: number) => {
    await trackEvent({
      type: 'search.performed',
      query,
      category,
      resultsCount: resultsCount || 0
    });
  }, [trackEvent]);

  const identify = useCallback(async (userId: string, traits?: Record<string, any>) => {
    // Track identification event
    await trackEvent({
      type: 'user.identified',
      userId,
      traits
    });

    // Also call provider-specific identify if available
    try {
      if (state.provider === 'posthog' && providerRef.current?.identify) {
        await providerRef.current.identify(userId, traits);
      } else if (state.provider === 'segment' && providerRef.current?.identify) {
        await providerRef.current.identify(userId, traits);
      }
    } catch (error) {
      log.error('useAnalytics', 'Provider identify error', error);
    }
  }, [trackEvent, state.provider]);

  return {
    ...state,
    track: trackEvent,
    flush: flushEvents,
    trackScreen,
    trackAudio,
    trackVaultView,
    trackVaultUnlock,
    trackSearch,
    identify
  };
};

export default useAnalytics;