/**
 * Scan-context data schema (Phase 1.5) — one row per resolved scan,
 * created when the Answer Card (BottleDetailScreen.tsx) mounts, then
 * updated as the user acts on it. See migration
 * supabase/migrations/032_scan_context.sql for the full rationale and
 * the reference "brand X" rollup queries this table exists to serve.
 *
 * Consent-gated the same way analytics.ts gates Mixpanel — no DB-level
 * consent precedent exists in this codebase, so this reuses the same
 * app-level `consentStore` check and skips the write silently (never
 * blocks the scan flow) if analytics consent hasn't been granted.
 */
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { getConsentChoices } from '../lib/consentStore';

export type ScanContext = 'store' | 'home' | 'gift' | 'unknown';
export type ScanOutcome = 'owned' | 'wanted' | 'passed';

async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const choices = await getConsentChoices();
    return choices.analytics === true;
  } catch (error) {
    log.warn('scanContextService', 'Failed to read consent choices', { error });
    return false;
  }
}

/**
 * Log a resolved scan. Fire-and-forget safe: never throws, resolves to
 * null if consent isn't granted, there's no signed-in user, or the
 * insert fails (the table won't exist until migration 032 is applied).
 */
export async function logScanEvent(params: {
  userId?: string;
  bottleId?: string;
  bottleName: string;
  brandName?: string;
  scanSource?: string;
}): Promise<string | null> {
  const { userId, bottleId, bottleName, brandName, scanSource } = params;

  if (!userId) return null;
  if (!(await hasAnalyticsConsent())) return null;

  try {
    const { data, error } = await supabase
      .from('scan_events')
      .insert({
        user_id: userId,
        bottle_id: bottleId,
        bottle_name: bottleName,
        brand_name: brandName,
        scan_source: scanSource,
      })
      .select('id')
      .single();

    if (error || !data) {
      log.warn('scanContextService', 'Failed to insert scan_events row (migration 032 applied?)', {
        error,
      });
      return null;
    }

    return data.id as string;
  } catch (error) {
    log.error('scanContextService', 'scan_events insert threw', error as Error);
    return null;
  }
}

/**
 * Should leaving the Answer Card resolve this scan to 'passed'?
 *
 * Extracted from BottleDetailScreen's beforeRemove listener so the rule that
 * defines the want-conversion metric is testable rather than buried in a
 * 1,500-line screen. Two things must both be false for a pass to be recorded:
 *
 *  - `outcomeAlreadyRecorded` — the visit already resolved (owned/wanted).
 *    Tapping "Want it" sets this immediately, which is the fix for the
 *    inverted metric: 'wanted' used to be written only if the user went on
 *    to fill in the optional price prompt, so dismissing that prompt logged
 *    a pass on a bottle the user had just said they wanted.
 *  - `wasWishlistedOnEntry` — the bottle was already on the want-list when
 *    the screen opened (e.g. re-opened from the Shelf/Want grid). Browsing
 *    your own want-list is not a purchase decision and must not overwrite
 *    an earlier real signal.
 */
export function shouldRecordPassOnExit(params: {
  hasScanEvent: boolean;
  outcomeAlreadyRecorded: boolean;
  wasWishlistedOnEntry: boolean;
}): boolean {
  return params.hasScanEvent && !params.outcomeAlreadyRecorded && !params.wasWishlistedOnEntry;
}

/**
 * Update a scan_events row with an outcome and/or inferred context.
 * Never throws — degrades to a logged warning on any failure.
 */
export async function updateScanOutcome(params: {
  scanEventId: string;
  outcome?: ScanOutcome;
  context?: ScanContext;
  priceSeen?: number;
}): Promise<void> {
  const { scanEventId, outcome, context, priceSeen } = params;

  if (!(await hasAnalyticsConsent())) return;

  const updates: Record<string, unknown> = {};
  if (context !== undefined) updates.context = context;
  if (priceSeen !== undefined) updates.price_seen = priceSeen;
  if (outcome !== undefined) {
    updates.outcome = outcome;
    updates.resolved_at = new Date().toISOString();
  }
  if (Object.keys(updates).length === 0) return;

  try {
    const { error } = await supabase.from('scan_events').update(updates).eq('id', scanEventId);

    if (error) {
      log.warn('scanContextService', 'Failed to update scan_events row', { error, scanEventId });
    }
  } catch (error) {
    log.error('scanContextService', 'scan_events update threw', error as Error, { scanEventId });
  }
}
