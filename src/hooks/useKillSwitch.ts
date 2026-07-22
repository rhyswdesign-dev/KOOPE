/**
 * useKillSwitch
 *
 * Fetches the global kill-switch config from Supabase on every app launch.
 * Immediately hydrates from AsyncStorage cache so there is no flicker or
 * infinite loader while the network request resolves.
 *
 * Fail-safe behaviour:
 *   - Network down AND no cache  → app opens normally (fail-open).
 *   - Network down WITH cache    → cached state is applied.
 *   - Kill switch newly enabled  → re-render shows maintenance screen.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'koope_kill_switch_v1';

export interface KillSwitchConfig {
  killSwitchEnabled: boolean;
  messageTitle: string;
  messageBody: string;
  supportEmail?: string;
  retryAfterMinutes?: number;
}

const DEFAULTS: KillSwitchConfig = {
  killSwitchEnabled: false,
  messageTitle: 'Under Maintenance',
  messageBody: 'We\'re making KŌOPE better. Check back soon.',
};

export function useKillSwitch() {
  const [config, setConfig] = useState<KillSwitchConfig>(DEFAULTS);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Step 1: restore cached config instantly (no network required).
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && !cancelled) {
          setConfig(JSON.parse(raw) as KillSwitchConfig);
        }
      } catch {
        // cache miss — safe to ignore
      }

      // Step 2: fetch fresh config from Supabase.
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select(
            'kill_switch_enabled, message_title, message_body, support_email, retry_after_minutes'
          )
          .eq('id', 'global')
          .single();

        if (error || !data) throw error;

        const fresh: KillSwitchConfig = {
          killSwitchEnabled: data.kill_switch_enabled ?? false,
          messageTitle: data.message_title ?? DEFAULTS.messageTitle,
          messageBody: data.message_body ?? DEFAULTS.messageBody,
          supportEmail: data.support_email ?? undefined,
          retryAfterMinutes: data.retry_after_minutes ?? undefined,
        };

        if (!cancelled) setConfig(fresh);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch {
        // Network failure — cached value (or defaults) already applied.
        // Do NOT block the app; fail open so a network blip doesn't lock users out.
      } finally {
        if (!cancelled) setIsChecked(true);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isEnabled: config.killSwitchEnabled,
    config,
    /** True once the initial cache read + network fetch have both settled. */
    isChecked,
  };
}
