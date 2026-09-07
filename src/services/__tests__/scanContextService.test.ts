import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logScanEvent, updateScanOutcome, shouldRecordPassOnExit } from '../scanContextService';

const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: (...args: any[]) => insertMock(...args),
      update: (...args: any[]) => updateMock(...args),
    })),
  },
}));

vi.mock('../../lib/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const getConsentChoicesMock = vi.fn();
vi.mock('../../lib/consentStore', () => ({
  getConsentChoices: (...args: any[]) => getConsentChoicesMock(...args),
}));

// Chainable stubs mirroring Supabase's thenable PostgrestFilterBuilder.
function insertChain(result: { data: any; error: unknown }) {
  return {
    select: () => ({
      single: () => Promise.resolve(result),
    }),
  };
}

function updateChain(result: { error: unknown }) {
  const builder: any = {
    eq: () => Promise.resolve(result),
  };
  return builder;
}

describe('scanContextService.logScanEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConsentChoicesMock.mockResolvedValue({
      essential: true,
      analytics: true,
      crash: false,
      marketing: false,
    });
  });

  it('returns null without inserting when there is no signed-in user', async () => {
    const result = await logScanEvent({ bottleName: 'Negroni' });

    expect(result).toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns null without inserting when analytics consent is not granted', async () => {
    getConsentChoicesMock.mockResolvedValue({
      essential: true,
      analytics: false,
      crash: false,
      marketing: false,
    });

    const result = await logScanEvent({ userId: 'user-1', bottleName: 'Negroni' });

    expect(result).toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts a scan_events row and returns its id when consent is granted', async () => {
    insertMock.mockReturnValue(insertChain({ data: { id: 'scan-1' }, error: null }));

    const result = await logScanEvent({
      userId: 'user-1',
      bottleId: 'bottle-1',
      bottleName: 'Negroni',
      brandName: 'Campari',
      scanSource: 'catalog',
    });

    expect(result).toBe('scan-1');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        bottle_id: 'bottle-1',
        bottle_name: 'Negroni',
        brand_name: 'Campari',
        scan_source: 'catalog',
      }),
    );
  });

  it('returns null (not a throw) when the insert fails', async () => {
    insertMock.mockReturnValue(
      insertChain({ data: null, error: { message: 'relation "scan_events" does not exist' } }),
    );

    const result = await logScanEvent({ userId: 'user-1', bottleName: 'Negroni' });

    expect(result).toBeNull();
  });

  it('returns null (not a throw) when the insert call itself throws', async () => {
    insertMock.mockImplementation(() => {
      throw new Error('network down');
    });

    const result = await logScanEvent({ userId: 'user-1', bottleName: 'Negroni' });

    expect(result).toBeNull();
  });
});

describe('scanContextService.shouldRecordPassOnExit', () => {
  const base = {
    hasScanEvent: true,
    outcomeAlreadyRecorded: false,
    wasWishlistedOnEntry: false,
  };

  it('records a pass when the user leaves without acting on a fresh bottle', () => {
    expect(shouldRecordPassOnExit(base)).toBe(true);
  });

  it('does NOT record a pass once an outcome is already recorded', () => {
    // The want-conversion bug: tapping "Want it" now sets this immediately,
    // so dismissing the optional price prompt and backing out leaves the
    // row as 'wanted'. It used to fall through to 'passed'.
    expect(shouldRecordPassOnExit({ ...base, outcomeAlreadyRecorded: true })).toBe(false);
  });

  it('does NOT record a pass when the bottle was already want-listed on entry', () => {
    // Re-opening a bottle from the Shelf/Want grid is browsing, not passing.
    expect(shouldRecordPassOnExit({ ...base, wasWishlistedOnEntry: true })).toBe(false);
  });

  it('does nothing without a scan_events row to update', () => {
    expect(shouldRecordPassOnExit({ ...base, hasScanEvent: false })).toBe(false);
  });
});

describe('scanContextService.updateScanOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConsentChoicesMock.mockResolvedValue({
      essential: true,
      analytics: true,
      crash: false,
      marketing: false,
    });
  });

  it('skips the update when analytics consent is not granted', async () => {
    getConsentChoicesMock.mockResolvedValue({
      essential: true,
      analytics: false,
      crash: false,
      marketing: false,
    });

    await updateScanOutcome({ scanEventId: 'scan-1', outcome: 'owned' });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('sets outcome + resolved_at together', async () => {
    updateMock.mockReturnValue(updateChain({ error: null }));

    await updateScanOutcome({ scanEventId: 'scan-1', outcome: 'owned', context: 'home' });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'owned',
        context: 'home',
        resolved_at: expect.any(String),
      }),
    );
  });

  it('updates context alone (e.g. gift mode) without touching outcome/resolved_at', async () => {
    updateMock.mockReturnValue(updateChain({ error: null }));

    await updateScanOutcome({ scanEventId: 'scan-1', context: 'gift' });

    const payload = updateMock.mock.calls[0][0];
    expect(payload).toEqual({ context: 'gift' });
  });

  it('never throws when the update fails', async () => {
    updateMock.mockReturnValue(updateChain({ error: { message: 'boom' } }));

    await expect(
      updateScanOutcome({ scanEventId: 'scan-1', outcome: 'passed' }),
    ).resolves.toBeUndefined();
  });

  it('never throws when the update call itself throws', async () => {
    updateMock.mockImplementation(() => {
      throw new Error('network down');
    });

    await expect(
      updateScanOutcome({ scanEventId: 'scan-1', outcome: 'passed' }),
    ).resolves.toBeUndefined();
  });
});
