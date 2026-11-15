import 'server-only';
import { isValidPin } from './options';
import { verifyPin } from './pin';

/** Wrong PINs allowed before the link locks. */
export const PIN_MAX_FAILURES = 10;
/** How long a link stays locked after too many wrong PINs. */
export const PIN_LOCK_MS = 60 * 60 * 1000;
/** `viewCount` and `lastViewedAt` move at most this often. */
export const VIEW_COUNT_INTERVAL_MS = 60 * 60 * 1000;

/** Fields on `shared_transcripts/{id}` the public GET must never return. */
export const SHARE_PRIVATE_FIELDS = ['uid', 'pinHash', 'pinSalt', 'pinFailures', 'pinLockedUntil', 'viewCount', 'lastViewedAt'] as const;

/** Firestore Timestamp, Date, string or number to epoch millis; null when absent or unreadable. */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const withToDate = value as { toDate?: () => Date };
  const date = typeof withToDate.toDate === 'function' ? withToDate.toDate() : new Date(value as string | number | Date);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export type ShareAccessUpdate = Partial<{
  pinFailures: number;
  pinLockedUntil: Date | null;
  viewCount: number;
  lastViewedAt: Date;
}>;

export type ShareAccessDecision =
  | { kind: 'allow'; update: ShareAccessUpdate | null }
  | { kind: 'pin-required'; update: null }
  | { kind: 'pin-incorrect'; update: ShareAccessUpdate }
  | { kind: 'locked'; retryAfterSeconds: number; update: ShareAccessUpdate | null };

function viewUpdate(record: Record<string, unknown>, now: number): ShareAccessUpdate | null {
  const last = toMillis(record.lastViewedAt);
  if (last !== null && now - last < VIEW_COUNT_INTERVAL_MS) return null;
  const count = typeof record.viewCount === 'number' && Number.isFinite(record.viewCount) ? record.viewCount : 0;
  return { viewCount: count + 1, lastViewedAt: new Date(now) };
}

/**
 * Decide whether a live (existing, unexpired) share record may be shown, and which
 * counters to write. The caller checks existence and expiry first, and runs this inside
 * a transaction so parallel guesses cannot slip past the failure limit.
 */
export async function decideShareAccess(
  record: Record<string, unknown>,
  pinHeader: string | null,
  now: number,
): Promise<ShareAccessDecision> {
  const protectedByPin = typeof record.pinHash === 'string' && record.pinHash.length > 0;
  if (!protectedByPin) return { kind: 'allow', update: viewUpdate(record, now) };

  const lockedUntil = toMillis(record.pinLockedUntil);
  if (lockedUntil !== null && lockedUntil > now) {
    return { kind: 'locked', retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - now) / 1000)), update: null };
  }

  const pin = pinHeader?.trim() ?? '';
  if (!pin) return { kind: 'pin-required', update: null };

  // A malformed PIN is a wrong guess too; it simply skips the hash.
  const correct = isValidPin(pin) && (await verifyPin(pin, record.pinHash, record.pinSalt));
  const failures = typeof record.pinFailures === 'number' && Number.isFinite(record.pinFailures) ? Math.max(0, record.pinFailures) : 0;

  if (!correct) {
    const next = failures + 1;
    if (next >= PIN_MAX_FAILURES) {
      return {
        kind: 'locked',
        retryAfterSeconds: Math.ceil(PIN_LOCK_MS / 1000),
        update: { pinFailures: 0, pinLockedUntil: new Date(now + PIN_LOCK_MS) },
      };
    }
    return { kind: 'pin-incorrect', update: { pinFailures: next } };
  }

  const reset: ShareAccessUpdate = failures > 0 || lockedUntil !== null ? { pinFailures: 0, pinLockedUntil: null } : {};
  const views = viewUpdate(record, now);
  const update = { ...reset, ...(views ?? {}) };
  return { kind: 'allow', update: Object.keys(update).length ? update : null };
}
