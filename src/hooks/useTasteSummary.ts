/**
 * One display-ready read of the user's palate, for every surface that shows
 * it.
 *
 * The app used to answer "what is my taste?" in two contradicting ways: the
 * PRO radar read the learned profile, while Home Bar's card read a separate
 * local store built only from bottle scans, in a different vocabulary. A user
 * could see "Smoky · Peaty · Aged" on their shelf and a radar that disagreed,
 * because they were genuinely different numbers.
 *
 * Everything that displays a palate should read this hook, so there is exactly
 * one answer. Values come back in the canonical 7-axis vocabulary
 * (utils/flavorTaxonomy.ts) and already account for decay, steering and
 * confidence.
 */

import { useEffect, useState } from 'react';
import { log } from '../lib/logger';
import type { FlavorProfile } from '../types/userProfile';
import { CANONICAL_FLAVORS } from '../utils/flavorTaxonomy';
import { hydrateTasteGraph, generateRadarChart } from '../services/tasteGraphService';
import { loadUserProfile } from '../services/userProfileService';

/** Signals needed before a palate is worth showing at all. */
const MIN_SIGNALS_TO_DISPLAY = 5;

export interface TasteSummary {
  /** Enough signal to show a palate. */
  ready: boolean;
  /** Still fetching — distinct from "ready but empty", so callers don't flash. */
  loading: boolean;
  /** Strongest axes first, canonical vocabulary. */
  topFlavors: FlavorProfile[];
  /** 0-100 per axis, scaled so the strongest reads 100. For bars. */
  flavorScores: Partial<Record<FlavorProfile, number>>;
  /** 0-100, how much the app actually knows. */
  confidence: number;
  /** Total interactions behind the profile. */
  totalSignals: number;
}

const EMPTY: TasteSummary = {
  ready: false,
  loading: false,
  topFlavors: [],
  flavorScores: {},
  confidence: 0,
  totalSignals: 0,
};

export function useTasteSummary(userId?: string): TasteSummary {
  const [summary, setSummary] = useState<TasteSummary>({ ...EMPTY, loading: !!userId });

  useEffect(() => {
    let mounted = true;

    if (!userId) {
      setSummary({ ...EMPTY, loading: false });
      return;
    }

    (async () => {
      try {
        const profile = await loadUserProfile(userId).catch(() => null);
        const graph = hydrateTasteGraph(profile?.tasteProfile);

        if (!mounted) return;
        if (!graph) {
          setSummary({ ...EMPTY, loading: false });
          return;
        }

        const radar = generateRadarChart(graph);
        const totalSignals = graph.interactionCounts.total ?? 0;

        // Scale relative to the strongest axis. Raw normalised weights sum to
        // 1 across seven axes, so unscaled they'd render as uniformly short
        // bars and read as "the app knows nothing".
        const byAxis = CANONICAL_FLAVORS.map((flavor) => {
          const point = radar.flavorPoints.find(
            (p) => p.label.toLowerCase() === flavor.toLowerCase(),
          );
          return { flavor, value: point?.value ?? 0 };
        });
        const max = Math.max(...byAxis.map((a) => a.value), 0);

        const flavorScores: Partial<Record<FlavorProfile, number>> = {};
        for (const { flavor, value } of byAxis) {
          flavorScores[flavor] = max > 0 ? Math.round((value / max) * 100) : 0;
        }

        const topFlavors = byAxis
          .filter((a) => a.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 3)
          .map((a) => a.flavor);

        setSummary({
          ready: totalSignals >= MIN_SIGNALS_TO_DISPLAY && topFlavors.length > 0,
          loading: false,
          topFlavors,
          flavorScores,
          confidence: Math.round(radar.dataConfidence * 100),
          totalSignals,
        });
      } catch (error) {
        log.warn('useTasteSummary', 'Failed to build taste summary', { error });
        if (mounted) setSummary({ ...EMPTY, loading: false });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return summary;
}

/** Display label for a canonical axis. */
export function flavorLabel(flavor: FlavorProfile): string {
  return flavor.charAt(0).toUpperCase() + flavor.slice(1);
}
