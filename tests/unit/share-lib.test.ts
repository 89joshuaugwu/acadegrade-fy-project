import { describe, expect, it } from 'vitest';
import { hashPin, verifyPin } from '@/lib/share/pin';
import { parseShareOptions, isValidPin, SHARE_EXPIRY_CHOICES } from '@/lib/share/options';
import { decideShareAccess, PIN_LOCK_MS, PIN_MAX_FAILURES, VIEW_COUNT_INTERVAL_MS } from '@/lib/share/access';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 60 * 60 * 1000;

describe('share options', () => {
  it('defaults to 30 days, full and no PIN for an old { showPhoto } payload', () => {
    expect(parseShareOptions({ showPhoto: false })).toEqual({ ok: true, value: { showPhoto: false, expiresInDays: 30, level: 'full', pin: null } });
    expect(parseShareOptions({})).toEqual({ ok: true, value: { showPhoto: true, expiresInDays: 30, level: 'full', pin: null } });
  });

  it('treats a missing or non-object body as the old default', () => {
    for (const body of [undefined, null, 'x', 5, []]) {
      expect(parseShareOptions(body)).toEqual({ ok: true, value: { showPhoto: true, expiresInDays: 30, level: 'full', pin: null } });
    }
  });

  it('accepts only the listed expiry choices', () => {
    expect(SHARE_EXPIRY_CHOICES).toEqual([1, 7, 30]);
    for (const days of [1, 7, 30]) expect(parseShareOptions({ expiresInDays: days })).toMatchObject({ ok: true, value: { expiresInDays: days } });
    for (const bad of [0, 2, 365, '7', null, 7.5]) expect(parseShareOptions({ expiresInDays: bad })).toMatchObject({ ok: false, code: 'INVALID_EXPIRY' });
  });

  it('accepts full and summary levels only', () => {
    expect(parseShareOptions({ level: 'summary' })).toMatchObject({ ok: true, value: { level: 'summary' } });
    for (const bad of ['half', '', null, 1]) expect(parseShareOptions({ level: bad })).toMatchObject({ ok: false, code: 'INVALID_LEVEL' });
  });

  it('accepts a 4 to 6 digit PIN and never echoes a rejected PIN', () => {
    expect(isValidPin('0123')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    for (const bad of ['123', '1234567', 'abcd', '12 34', ' 1234', '١٢٣٤', 1234, null]) {
      expect(isValidPin(bad)).toBe(false);
      const result = parseShareOptions({ pin: bad });
      expect(result).toMatchObject({ ok: false, code: 'INVALID_PIN' });
      expect(JSON.stringify(result)).not.toContain(String(bad));
    }
  });
});

describe('PIN hashing', () => {
  it('stores a 64-byte scrypt hash and a 16-byte random salt, never the PIN', async () => {
    const a = await hashPin('4821');
    const b = await hashPin('4821');
    expect(a.pinHash).toMatch(/^[0-9a-f]{128}$/);
    expect(a.pinSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(a.pinSalt).not.toBe(b.pinSalt);
    expect(a.pinHash).not.toBe(b.pinHash);
    expect(JSON.stringify(a)).not.toContain('4821');
  });

  it('verifies the right PIN only, and never throws on bad stored values', async () => {
    const stored = await hashPin('4821');
    expect(await verifyPin('4821', stored.pinHash, stored.pinSalt)).toBe(true);
    expect(await verifyPin('4822', stored.pinHash, stored.pinSalt)).toBe(false);
    expect(await verifyPin('48210', stored.pinHash, stored.pinSalt)).toBe(false);
    expect(await verifyPin('4821', 'zz', stored.pinSalt)).toBe(false);
    expect(await verifyPin('4821', stored.pinHash.slice(2), stored.pinSalt)).toBe(false);
    expect(await verifyPin('4821', undefined, undefined)).toBe(false);
  });
});

describe('decideShareAccess', () => {
  const open = { expiresAt: new Date(NOW + HOUR) };

  it('lets an open link through and counts the first view', async () => {
    expect(await decideShareAccess(open, null, NOW)).toEqual({ kind: 'allow', update: { viewCount: 1, lastViewedAt: new Date(NOW) } });
  });

  it('counts a view at most once an hour', async () => {
    const recent = { ...open, viewCount: 3, lastViewedAt: new Date(NOW - HOUR + 1) };
    expect(await decideShareAccess(recent, null, NOW)).toEqual({ kind: 'allow', update: null });
    const older = { ...open, viewCount: 3, lastViewedAt: { toDate: () => new Date(NOW - VIEW_COUNT_INTERVAL_MS) } };
    expect(await decideShareAccess(older, null, NOW)).toEqual({ kind: 'allow', update: { viewCount: 4, lastViewedAt: new Date(NOW) } });
  });

  describe('with a PIN', () => {
    let record: Record<string, unknown>;
    const withPin = async (extra: Record<string, unknown> = {}) => {
      record = { ...open, ...(await hashPin('4821')), ...extra };
      return record;
    };

    it('asks for a missing PIN without counting a failure', async () => {
      expect(await decideShareAccess(await withPin(), null, NOW)).toEqual({ kind: 'pin-required', update: null });
      expect(await decideShareAccess(await withPin(), '', NOW)).toEqual({ kind: 'pin-required', update: null });
    });

    it('counts a wrong or malformed PIN', async () => {
      expect(await decideShareAccess(await withPin({ pinFailures: 2 }), '1111', NOW)).toEqual({ kind: 'pin-incorrect', update: { pinFailures: 3 } });
      expect(await decideShareAccess(await withPin(), 'not-a-pin', NOW)).toEqual({ kind: 'pin-incorrect', update: { pinFailures: 1 } });
    });

    it('locks for an hour on the tenth failure', async () => {
      expect(PIN_MAX_FAILURES).toBe(10);
      expect(PIN_LOCK_MS).toBe(HOUR);
      const result = await decideShareAccess(await withPin({ pinFailures: 9 }), '1111', NOW);
      expect(result).toEqual({ kind: 'locked', retryAfterSeconds: 3600, update: { pinFailures: 0, pinLockedUntil: new Date(NOW + HOUR) } });
    });

    it('refuses even the right PIN while locked, without touching the record', async () => {
      const locked = await withPin({ pinLockedUntil: new Date(NOW + 10 * 60 * 1000) });
      expect(await decideShareAccess(locked, '4821', NOW)).toEqual({ kind: 'locked', retryAfterSeconds: 600, update: null });
    });

    it('a right PIN resets the counter and counts the view', async () => {
      const failing = await withPin({ pinFailures: 4, pinLockedUntil: new Date(NOW - 1) });
      expect(await decideShareAccess(failing, '4821', NOW)).toEqual({
        kind: 'allow',
        update: { pinFailures: 0, pinLockedUntil: null, viewCount: 1, lastViewedAt: new Date(NOW) },
      });
    });

    it('a right PIN on a clean record within the hour writes nothing', async () => {
      const clean = await withPin({ viewCount: 1, lastViewedAt: new Date(NOW - 60_000) });
      expect(await decideShareAccess(clean, '4821', NOW)).toEqual({ kind: 'allow', update: null });
    });
  });
});
