/**
 * Scan Telemetry (Phase 1.3 — Aisle-grade scan performance, telemetry slice)
 *
 * Instruments the scan waterfall (SmartScanScreen) with per-layer latency
 * and success/failure so p50/p95 time-to-answer and scan success rate
 * become standing Mixpanel metrics (docs/KOOPE-ENGINEERING-WORKPLAN.md 1.3).
 *
 * Session lifecycle: createScanSession() at capture/barcode-detect ->
 * trackScanAttempt() -> exactly one of trackScanResolved() / trackScanFailed()
 * at whichever terminal handler the scan reaches.
 *
 * Success rate = SCAN_RESOLVED / SCAN_ATTEMPT.
 * p50/p95 time-to-answer = percentiles over SCAN_RESOLVED.duration_ms,
 * segmentable by scan_path and resolution_source.
 *
 * The prop builders are pure (no RN/analytics imports) so they're testable
 * directly; the track* wrappers are the only functions touching trackEvent.
 */

import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

export type ScanPath = 'photo' | 'barcode';

export type ScanFailureReason =
  | 'too_dark'
  | 'too_blurry'
  | 'not_a_bottle'
  | 'not_recognised'
  | 'connection_error'
  | 'invalid_barcode'
  | 'barcode_not_found'
  | 'rate_limited'
  | 'error';

export interface ScanSession {
  path: ScanPath;
  startedAt: number;
}

/** Per-layer server timings, as returned by bottle-recognize's `timings` field. */
export interface ScanServerTimings {
  totalMs?: number;
  visionMs?: number;
  catalogMs?: number;
  cacheMs?: number;
  claudeMs?: number;
}

export interface ScanResolvedExtras {
  /** 'catalog' | 'cache' | 'claude-vision' | 'barcode' | 'barcode_community' | ... */
  resolutionSource: string;
  /** Client-side image crop/downscale/base64 time (photo path only). */
  convertMs?: number;
  /** Client-perceived round trip to the edge function / lookup APIs. */
  networkMs?: number;
  server?: ScanServerTimings;
}

/** Starts a scan session clock. Call at the earliest client-visible moment —
 *  photo capture callback entry, or barcode-detect callback entry. */
export function createScanSession(path: ScanPath, now: number = Date.now()): ScanSession {
  return { path, startedAt: now };
}

export function buildResolvedProps(
  session: ScanSession,
  extras: ScanResolvedExtras,
  now: number = Date.now(),
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [ANALYTICS_PROPS.SCAN_PATH]: session.path,
    [ANALYTICS_PROPS.RESOLUTION_SOURCE]: extras.resolutionSource,
    [ANALYTICS_PROPS.DURATION_MS]: now - session.startedAt,
  };
  if (extras.convertMs !== undefined) {
    props[ANALYTICS_PROPS.CONVERT_MS] = extras.convertMs;
  }
  if (extras.networkMs !== undefined) {
    props[ANALYTICS_PROPS.NETWORK_MS] = extras.networkMs;
  }
  const server = extras.server;
  if (server) {
    if (server.totalMs !== undefined) props[ANALYTICS_PROPS.SERVER_TOTAL_MS] = server.totalMs;
    if (server.visionMs !== undefined) props[ANALYTICS_PROPS.SERVER_VISION_MS] = server.visionMs;
    if (server.catalogMs !== undefined) props[ANALYTICS_PROPS.SERVER_CATALOG_MS] = server.catalogMs;
    if (server.cacheMs !== undefined) props[ANALYTICS_PROPS.SERVER_CACHE_MS] = server.cacheMs;
    if (server.claudeMs !== undefined) props[ANALYTICS_PROPS.SERVER_CLAUDE_MS] = server.claudeMs;
  }
  return props;
}

export function buildFailedProps(
  session: ScanSession,
  reason: ScanFailureReason,
  now: number = Date.now(),
): Record<string, unknown> {
  return {
    [ANALYTICS_PROPS.SCAN_PATH]: session.path,
    [ANALYTICS_PROPS.FAILURE_REASON]: reason,
    [ANALYTICS_PROPS.DURATION_MS]: now - session.startedAt,
  };
}

export function trackScanAttempt(session: ScanSession): void {
  trackEvent(ANALYTICS_EVENTS.SCAN_ATTEMPT, { [ANALYTICS_PROPS.SCAN_PATH]: session.path });
}

export function trackScanResolved(
  session: ScanSession,
  extras: ScanResolvedExtras,
  now: number = Date.now(),
): void {
  trackEvent(ANALYTICS_EVENTS.SCAN_RESOLVED, buildResolvedProps(session, extras, now));
}

export function trackScanFailed(
  session: ScanSession,
  reason: ScanFailureReason,
  now: number = Date.now(),
): void {
  trackEvent(ANALYTICS_EVENTS.SCAN_FAILED, buildFailedProps(session, reason, now));
}
