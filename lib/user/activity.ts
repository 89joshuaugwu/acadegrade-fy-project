import 'server-only';

import { adminDb } from '@/lib/firebase/admin';

const HOUR_MS = 60 * 60 * 1000;
/** Within one server instance, a uid is looked at no more than once per 6 hours. */
const INSTANCE_THROTTLE_MS = 6 * HOUR_MS;
/** The stored value is only rewritten once it is 20 hours old (about one write a day). */
const STORED_REFRESH_MS = 20 * HOUR_MS;
/** Bound the per-instance map so a long-lived instance cannot grow without limit. */
const MAX_TRACKED = 5_000;

const lastSeen = new Map<string, number>();

function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const stamp = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof stamp.toMillis === 'function') return stamp.toMillis();
  if (typeof stamp.toDate === 'function') return stamp.toDate().getTime();
  return null;
}

/**
 * Records that a student used the app (`users/{uid}.lastActiveAt`, server-owned).
 * Cheap by design: at most one profile read per uid per instance every 6 h, and a
 * write only when the stored value is missing or at least 20 h old. Call it
 * fire-and-forget; it never throws and never creates a missing profile.
 */
export async function touchLastActive(uid: string, now = Date.now()): Promise<void> {
  try {
    if (!uid) return;
    const previous = lastSeen.get(uid);
    if (previous !== undefined && now - previous < INSTANCE_THROTTLE_MS) return;
    if (lastSeen.size >= MAX_TRACKED) lastSeen.clear();
    lastSeen.set(uid, now);

    const ref = adminDb.collection('users').doc(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) return;
    const stored = toMillis(snapshot.data()?.lastActiveAt);
    if (stored !== null && now - stored < STORED_REFRESH_MS) return;
    // update(), not set(): touches one field and can never create a profile.
    await ref.update({ lastActiveAt: new Date(now) });
  } catch {
    // Activity is a metric only; it must never affect the request that triggered it.
  }
}

/** Test helper: forget the per-instance throttle. */
export function resetActivityThrottleForTests(): void {
  lastSeen.clear();
}
