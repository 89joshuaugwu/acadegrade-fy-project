import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  user: { uid: 'ada', email: 'ada@test.example' } as { uid: string; email: string } | null,
  revoke: vi.fn(),
  allowed: true,
}));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { revokeRefreshTokens: state.revoke } }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: async () => state.user }));
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: state.allowed, retryAfterSeconds: 60, limit: 20, remaining: 0, window: 'hourly' }),
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'slow down' }), { status: 429 }),
}));

import { POST } from '@/app/api/user/devices/route';

const id = (token: string) => createHash('sha256').update(token).digest('hex').slice(0, 16);
let store: ReturnType<typeof queryTestDb>;
const post = (body: unknown) => POST(new NextRequest('https://app.test/api/user/devices', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const profile = () => store.docs.get('users/ada');

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.user = { uid: 'ada', email: 'ada@test.example' };
  state.allowed = true;
  state.revoke.mockReset().mockResolvedValue(undefined);
  store.docs.set('users/ada', {
    fullName: 'Ada',
    fcmTokens: ['tok-a', 'tok-b'],
    fcmDevices: {
      [id('tok-a')]: { platform: 'android', label: 'Pixel 7', addedAt: 1, lastSeenAt: 2 },
      [id('tok-b')]: { platform: 'web', label: 'Chrome on Windows', addedAt: 3, lastSeenAt: 4 },
    },
  });
});

describe('POST /api/user/devices', () => {
  it('requires sign-in and respects the rate limit', async () => {
    state.user = null;
    expect((await post({ action: 'sign-out-all' })).status).toBe(401);
    state.user = { uid: 'ada', email: 'ada@test.example' };
    state.allowed = false;
    expect((await post({ action: 'sign-out-all' })).status).toBe(429);
    expect(state.revoke).not.toHaveBeenCalled();
  });

  it('rejects unknown actions and malformed device ids', async () => {
    for (const body of [{}, { action: 'nope' }, { action: 'remove' }, { action: 'remove', deviceId: 'xyz' }, { action: 'remove', deviceId: id('tok-a').toUpperCase() }]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(profile().fcmTokens).toHaveLength(2);
  });

  it('removes one device: its token and its record, nothing else', async () => {
    const response = await post({ action: 'remove', deviceId: id('tok-a') });
    expect(response.status).toBe(200);
    expect(profile().fcmTokens).toEqual(['tok-b']);
    expect(Object.keys(profile().fcmDevices)).toEqual([id('tok-b')]);
    expect(profile().fullName).toBe('Ada');
    expect(state.revoke).not.toHaveBeenCalled();
  });

  it('removing an unknown device is a harmless success', async () => {
    const response = await post({ action: 'remove', deviceId: '0123456789abcdef' });
    expect(response.status).toBe(200);
    expect(profile().fcmTokens).toHaveLength(2);
  });

  it('removes a legacy single fcmToken that matches', async () => {
    store.docs.set('users/ada', { ...profile(), fcmToken: 'tok-a' });
    await post({ action: 'remove', deviceId: id('tok-a') });
    expect(profile().fcmToken ?? null).toBeNull();
  });

  it('signs out everywhere: revokes refresh tokens and clears tokens and devices', async () => {
    const response = await post({ action: 'sign-out-all' });
    expect(response.status).toBe(200);
    expect(state.revoke).toHaveBeenCalledWith('ada');
    expect(profile().fcmTokens).toEqual([]);
    expect(profile().fcmDevices).toEqual({});
    expect(profile().fullName).toBe('Ada');
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.effect).toMatch(/within an hour/i);
  });

  it('sign-out-all still reports success to a user who has no profile fields yet', async () => {
    store.docs.set('users/ada', { fullName: 'Ada' });
    expect((await post({ action: 'sign-out-all' })).status).toBe(200);
    expect(state.revoke).toHaveBeenCalled();
  });

  it('answers 500 without leaking details when revocation fails', async () => {
    state.revoke.mockRejectedValue(new Error('internal secret'));
    const response = await post({ action: 'sign-out-all' });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('internal secret');
  });
});
