import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  sendOtpEmail: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { getUserByEmail: state.getUserByEmail, updateUser: state.updateUser },
}));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));
vi.mock('@/lib/email/mailer', () => ({
  sendOtpEmail: state.sendOtpEmail,
  registrationOtpEmail: (code: string) => `<p>${code}</p>`,
  resetPasswordOtpEmail: (code: string) => `<p>${code}</p>`,
}));

import { POST as sendOtp } from '@/app/api/auth/otp/send/route';
import { POST as resetPassword } from '@/app/api/auth/password/reset/route';

let store: ReturnType<typeof queryTestDb>;
const json = (url: string, body: unknown) => new NextRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const send = (email: string) => sendOtp(json('https://app.test/api/auth/otp/send', { email, type: 'reset' }));
const reset = (body: unknown) => resetPassword(json('https://app.test/api/auth/password/reset', body));
const ts = (date: Date) => ({ toMillis: () => date.getTime() });

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.getUserByEmail.mockReset().mockImplementation(async (email: string) => {
    if (email === 'ada@test.example') return { uid: 'ada' };
    throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
  });
  state.updateUser.mockReset().mockResolvedValue(undefined);
  state.sendOtpEmail.mockReset().mockResolvedValue(undefined);
});

describe('POST /api/auth/otp/send (reset): no account discovery', () => {
  it('answers a real account and an unknown email with the same status and body', async () => {
    const real = await send('ada@test.example');
    const unknown = await send('nobody@test.example');
    expect(real.status).toBe(200);
    expect(unknown.status).toBe(real.status);
    expect(await unknown.json()).toEqual(await real.json());
  });

  it('emails a code only to a real account', async () => {
    await send('ada@test.example');
    await send('nobody@test.example');
    expect(state.sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(state.sendOtpEmail.mock.calls[0][0]).toBe('ada@test.example');
  });

  it('keeps the 60-second cooldown for both, so a second try cannot tell them apart either', async () => {
    await send('ada@test.example');
    await send('nobody@test.example');
    const real = await send('ada@test.example');
    const unknown = await send('nobody@test.example');
    expect(real.status).toBe(429);
    expect(unknown.status).toBe(429);
    const [realBody, unknownBody] = [await real.json(), await unknown.json()];
    expect(Object.keys(unknownBody).sort()).toEqual(Object.keys(realBody).sort());
    expect(unknownBody.error).toBe(realBody.error);
  });

  it('stores no usable code for an unknown email, so verify and reset always fail', async () => {
    await send('nobody@test.example');
    const marker = store.docs.get('otps/nobody@test.example_reset');
    expect(marker).toMatchObject({ type: 'reset', used: false, code: null });
    expect(marker.expiresAt).toBeInstanceOf(Date);
  });

  it('still reports a lookup failure that is not "user not found"', async () => {
    state.getUserByEmail.mockRejectedValueOnce(Object.assign(new Error('down'), { code: 'auth/internal-error' }));
    expect((await send('ada@test.example')).status).toBe(500);
  });
});

describe('POST /api/auth/password/reset', () => {
  beforeEach(() => {
    const now = new Date();
    store.docs.set('otps/ada@test.example_reset', {
      email: 'ada@test.example', code: '123456', type: 'reset', used: true,
      verifiedAt: ts(now), expiresAt: ts(new Date(now.getTime() + 60_000)), attempts: 0,
    });
  });

  it('refuses passwords shorter than 8 characters, matching the page', async () => {
    const response = await reset({ email: 'ada@test.example', code: '123456', newPassword: 'abc1234' });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Password must be at least 8 characters');
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it('accepts 8 characters', async () => {
    const response = await reset({ email: 'ada@test.example', code: '123456', newPassword: 'abcd1234' });
    expect(response.status).toBe(200);
    expect(state.updateUser).toHaveBeenCalledWith('ada', { password: 'abcd1234' });
  });

  it('rejects the code-less marker left for an unknown email', async () => {
    store.docs.set('otps/nobody@test.example_reset', { email: 'nobody@test.example', code: null, type: 'reset', used: false, expiresAt: ts(new Date(Date.now() + 60_000)) });
    const response = await reset({ email: 'nobody@test.example', code: 'null', newPassword: 'abcd1234' });
    expect(response.status).toBe(400);
    expect(state.updateUser).not.toHaveBeenCalled();
  });
});
