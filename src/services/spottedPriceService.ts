/**
 * Spotted Price Service — value-on-scan v1 (Phase 1.2)
 *
 * ONE write path for "I saw this bottle for $X." Every price capture in
 * the app — the at-scan chip on the value line, the post-wishlist
 * "Seen a price?" modal, HomeBar's log-price modal — calls
 * logSpottedPrice() and nothing else.
 *
 * Three effects per call, mirroring makeLogService's shape:
 *   1. Local journal write (useSpottedPrices — the source of truth the
 *      value verdict reads from; works offline and signed-out).
 *   2. Fire-and-forget sync to Supabase spotted_prices (the community
 *      price signal that bootstraps bottle_prices aggregation). Never
 *      throws; degrades to a logged warning if the network/table is
 *      unavailable or the user is signed out.
 *   3. The spotted_price_logged analytics event with its capture point.
 *
 * Requires migration 031_bottle_prices.sql for the server insert to
 * succeed — local journaling and the verdict work without it.
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { useSpottedPrices } from '../store/useSpottedPrices';
import { getConsentChoices } from '../lib/consentStore';
import { useXPSystem, XP_EARNING_RATES } from '../store/useXPSystem';

/**
 * Same gate scanContextService/recipeSignalService use. The local journal and
 * the value verdict are unaffected — only the community sync is withheld.
 */
async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const choices = await getConsentChoices();
    return choices.analytics === true;
  } catch (error) {
    log.warn('SpottedPriceService', 'Failed to read consent choices', { error });
    return false;
  }
}

export type PriceCapturePoint = 'at_scan' | 'post_wishlist' | 'home_bar';

export interface LogSpottedPriceParams {
  bottleId: string;
  price: number;
  currency: string;
  locationLabel?: string;
  capturePoint: PriceCapturePoint;
  /** Signed-in user id, if available — required for the server sync, not for the local journal. */
  userId?: string | null;
}

export async function logSpottedPrice(params: LogSpottedPriceParams): Promise<void> {
  const { bottleId, price, currency, locationLabel, capturePoint, userId } = params;
  if (!(price > 0)) return;

  // 1. Local journal — the value verdict reads from here immediately.
  try {
    useSpottedPrices.getState().logPrice({ bottleId, price, currency, locationLabel });
  } catch (error) {
    log.warn('SpottedPriceService', 'Failed to write local price journal', { error });
  }

  // 2. Community sync — fire-and-forget, and consent-gated the same way
  // scan_events is (previously ungated, which left three brand-insight
  // tables on three different consent postures).
  if (userId && (await hasAnalyticsConsent())) {
    try {
      const { error: insertError } = await supabase.from('spotted_prices').insert({
        user_id: userId,
        bottle_id: bottleId,
        price,
        currency,
        location_label: locationLabel ?? null,
      });
      if (insertError) {
        log.warn(
          'SpottedPriceService',
          'Failed to insert spotted_prices row (migration 031 applied?)',
          { error: insertError },
        );
      }
    } catch (error) {
      log.error('SpottedPriceService', 'spotted_prices insert threw', error, { bottleId });
    }
  }

  // 3. XP. Paid on the local journal write, not the server sync — the user
  // did the work either way. A price with a retailer attached is worth
  // materially more (location_label is the most commercially useful column
  // in spotted_prices), so it pays the higher rate.
  try {
    const withLocation = !!locationLabel?.trim();
    useXPSystem
      .getState()
      .earnXP(
        withLocation ? XP_EARNING_RATES.spottedPriceWithLocation : XP_EARNING_RATES.spottedPrice,
        'spotted-price',
        withLocation ? 'Price spotted (with store)' : 'Price spotted',
      );
  } catch (error) {
    log.warn('SpottedPriceService', 'Failed to award spotted-price XP', { error });
  }

  // 4. Analytics.
  trackEvent(ANALYTICS_EVENTS.SPOTTED_PRICE_LOGGED, {
    [ANALYTICS_PROPS.CAPTURE_POINT]: capturePoint,
    [ANALYTICS_PROPS.CURRENCY]: currency,
    bottle_id: bottleId,
  });
}
