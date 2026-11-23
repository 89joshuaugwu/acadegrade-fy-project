import { afterEach, describe, expect, it, vi } from 'vitest';

// A slow or offline network made web sign-out hang: the notification-token
// cleanup (service worker lookup, Firestore write, deleteToken) was awaited in
// full before signOut. The cleanup is now capped.

const slow = () => new Promise<never>(() => { /* never settles, like a stalled network */ });

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(slow),
  deleteToken: vi.fn(slow),
  onMessage: vi.fn(),
  isSupported: vi.fn(async () => true),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  updateDoc: vi.fn(slow),
  arrayRemove: vi.fn(),
  arrayUnion: vi.fn(),
  deleteField: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));
vi.mock('@/lib/firebase/client', () => ({ default: {}, app: {}, db: {}, auth: {} }));
vi.mock('@/lib/firebase/fcm-devices', () => ({
  buildWebDevice: vi.fn(),
  deviceIdFor: vi.fn(async () => 'device-1'),
  deviceLabel: vi.fn(),
}));

describe('sign-out never waits on a slow network', () => {
  afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

  it('gives up on token cleanup after the budget', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('acadegrade_fcm_token', 'token-1');
    const { removeNotificationTokenBeforeSignOut, SIGN_OUT_CLEANUP_BUDGET_MS } = await import('@/lib/firebase/fcm');

    let done = false;
    const pending = removeNotificationTokenBeforeSignOut('student-1').then(() => { done = true; });

    await vi.advanceTimersByTimeAsync(SIGN_OUT_CLEANUP_BUDGET_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
    expect(SIGN_OUT_CLEANUP_BUDGET_MS).toBeLessThanOrEqual(2500);
  });
});
