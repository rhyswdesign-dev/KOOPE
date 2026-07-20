import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createScanSession,
  buildResolvedProps,
  buildFailedProps,
  trackScanAttempt,
  trackScanResolved,
  trackScanFailed,
} from '../scanTelemetry';

const trackEventMock = vi.fn();
vi.mock('../../lib/analytics', () => ({
  trackEvent: (...args: any[]) => trackEventMock(...args),
  ANALYTICS_EVENTS: {
    SCAN_ATTEMPT: 'Scan Attempt',
    SCAN_RESOLVED: 'Scan Resolved',
    SCAN_FAILED: 'Scan Failed',
  },
  ANALYTICS_PROPS: {
    SCAN_PATH: 'scan_path',
    FAILURE_REASON: 'failure_reason',
    RESOLUTION_SOURCE: 'resolution_source',
    CONVERT_MS: 'convert_ms',
    NETWORK_MS: 'network_ms',
    SERVER_TOTAL_MS: 'server_total_ms',
    SERVER_VISION_MS: 'server_vision_ms',
    SERVER_CATALOG_MS: 'server_catalog_ms',
    SERVER_CACHE_MS: 'server_cache_ms',
    SERVER_CLAUDE_MS: 'server_claude_ms',
    DURATION_MS: 'duration_ms',
  },
}));

describe('scanTelemetry.createScanSession', () => {
  it('captures the path and start time', () => {
    const session = createScanSession('photo', 1000);
    expect(session).toEqual({ path: 'photo', startedAt: 1000 });
  });
});

describe('scanTelemetry.buildResolvedProps', () => {
  it('computes duration_ms from session start to now', () => {
    const session = createScanSession('photo', 1000);
    const props = buildResolvedProps(session, { resolutionSource: 'catalog' }, 1500);
    expect(props.duration_ms).toBe(500);
    expect(props.scan_path).toBe('photo');
    expect(props.resolution_source).toBe('catalog');
  });

  it('omits convert_ms/network_ms when not provided', () => {
    const session = createScanSession('barcode', 0);
    const props = buildResolvedProps(session, { resolutionSource: 'barcode' }, 100);
    expect(props).not.toHaveProperty('convert_ms');
    expect(props).not.toHaveProperty('network_ms');
  });

  it('includes convert_ms and network_ms when provided (photo path)', () => {
    const session = createScanSession('photo', 0);
    const props = buildResolvedProps(
      session,
      { resolutionSource: 'claude-vision', convertMs: 120, networkMs: 900 },
      1200,
    );
    expect(props.convert_ms).toBe(120);
    expect(props.network_ms).toBe(900);
    expect(props.duration_ms).toBe(1200);
  });

  it('passes through only the server timings that are present', () => {
    const session = createScanSession('photo', 0);
    const props = buildResolvedProps(
      session,
      { resolutionSource: 'claude-vision', server: { totalMs: 800, visionMs: 200, claudeMs: 500 } },
      900,
    );
    expect(props.server_total_ms).toBe(800);
    expect(props.server_vision_ms).toBe(200);
    expect(props.server_claude_ms).toBe(500);
    expect(props).not.toHaveProperty('server_catalog_ms');
    expect(props).not.toHaveProperty('server_cache_ms');
  });
});

describe('scanTelemetry.buildFailedProps', () => {
  it('carries the failure reason and elapsed duration', () => {
    const session = createScanSession('photo', 1000);
    const props = buildFailedProps(session, 'not_a_bottle', 1300);
    expect(props).toEqual({
      scan_path: 'photo',
      failure_reason: 'not_a_bottle',
      duration_ms: 300,
    });
  });
});

describe('scanTelemetry track* wrappers', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
  });

  it('trackScanAttempt fires Scan Attempt with scan_path only', () => {
    trackScanAttempt(createScanSession('barcode', 0));
    expect(trackEventMock).toHaveBeenCalledWith('Scan Attempt', { scan_path: 'barcode' });
  });

  it('trackScanResolved fires Scan Resolved with the built props', () => {
    const session = createScanSession('photo', 0);
    trackScanResolved(session, { resolutionSource: 'cache' }, 250);
    expect(trackEventMock).toHaveBeenCalledWith(
      'Scan Resolved',
      expect.objectContaining({ scan_path: 'photo', resolution_source: 'cache', duration_ms: 250 }),
    );
  });

  it('trackScanFailed fires Scan Failed with the built props', () => {
    const session = createScanSession('barcode', 0);
    trackScanFailed(session, 'invalid_barcode', 50);
    expect(trackEventMock).toHaveBeenCalledWith('Scan Failed', {
      scan_path: 'barcode',
      failure_reason: 'invalid_barcode',
      duration_ms: 50,
    });
  });
});
