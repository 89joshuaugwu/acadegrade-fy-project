import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));

import { resetActivityThrottleForTests, touchLastActive } from '@/lib/user/activity';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 14, 9, 0, 0);
let store: ReturnType<typeof queryTestDb>;
const lastActive = (uid: string) => (store.docs.get(`users/${uid}`)?.lastActiveAt as Date | undefined)?.getTime();
const userWrites = (uid: string) => store.writes.filter((write) => write.path === `users/${uid}`).length;

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  resetActivityThrottleForTests();
});

describe('touchLastActive', () => {
  it('writes at most once per 20 h', async () => {
    store.docs.set('users/a', { email: 'a@test.example' });
    await touchLastActive('a', T0);
    expect(lastActive('a')).toBe(T0);
    expect(store.docs.get('users/a').email).toBe('a@test.example'); // merge, not overwrite

    // A fresh instance (no throttle) 10 h later still skips: the stored value is under 20 h old.
    resetActivityThrottleForTests();
    await touchLastActive('a', T0 + 10 * HOUR);
    expect(lastActive('a')).toBe(T0);

    resetActivityThrottleForTests();
    await touchLastActive('a', T0 + 21 * HOUR);
    expect(lastActive('a')).toBe(T0 + 21 * HOUR);
    expect(userWrites('a')).toBe(2);
  });

  it('per-instance throttle', async () => {
    store.docs.set('users/a', {});
    await touchLastActive('a', T0);
    await touchLastActive('a', T0 + 1 * HOUR);
    await touchLastActive('a', T0 + 5 * HOUR);
    expect(userWrites('a')).toBe(1);

    // The throttle does not even read the profile within 6 h: drop the doc and nothing is recreated.
    store.docs.delete('users/a');
    await touchLastActive('a', T0 + 5.5 * HOUR);
    expect(store.docs.has('users/a')).toBe(false);
  });

  it('never throws, and never creates a profile that does not exist', async () => {
    await expect(touchLastActive('ghost', T0)).resolves.toBeUndefined();
    expect(store.docs.has('users/ghost')).toBe(false);

    state.db = { collection: () => { throw new Error('firestore down'); } };
    await expect(touchLastActive('b', T0)).resolves.toBeUndefined();
    await expect(touchLastActive('', T0)).resolves.toBeUndefined();
  });

  it('accepts a stored Firestore Timestamp', async () => {
    store.docs.set('users/c', { lastActiveAt: { toMillis: () => T0 - 2 * HOUR } });
    await touchLastActive('c', T0);
    expect(userWrites('c')).toBe(0);
  });
});
