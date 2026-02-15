/**
 * Analytics Context Provider
 * Provides analytics capabilities throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsEvent } from '../services/analytics';

interface AnalyticsContextType {
  isInitialized: boolean;
  provider: 'memory' | 'posthog' | 'segment';
  error?: string;
  track: (event: AnalyticsEvent) => Promise<void>;
  flush: () => Promise<void>;
  trackScreen: (screenName: string, properties?: Record<string, any>) => Promise<void>;
  trackAudio: (soundType: string, context?: string) => Promise<void>;
  trackVaultView: (itemId: string, category: string, rarity: string) => Promise<void>;
  trackVaultUnlock: (itemId: string, xpSpent: number, cashSpent?: number) => Promise<void>;
  trackSearch: (query: string, category?: string, resultsCount?: number) => Promise<void>;
  identify: (userId: string, traits?: Record<string, any>) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const analytics = useAnalytics();

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalyticsContext = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};

// Convenience hook for tracking screen views
export const useScreenTracking = (screenName: string, properties?: Record<string, any>) => {
  const { trackScreen } = useAnalyticsContext();
  
  React.useEffect(() => {
    trackScreen(screenName, properties);
  }, [screenName, trackScreen]);
};

export default AnalyticsProvider;