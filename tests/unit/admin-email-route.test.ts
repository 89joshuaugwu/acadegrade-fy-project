import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const mocks = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), requireAdmin: vi.fn(), audit: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: mocks.requireAdmin, AdminAuthorizationError: class extends Error { status = 401; } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: mocks.audit }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return mocks.db; } }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ verify: mocks.verify }) } }));

import { GET, POST } from '@/app/api/admin/email/route';
import { encryptSecret } from '@/lib/ai/secrets';

let store: ReturnType<typeof queryTestDb>;
const PASSWORD = 'PRIVATE_APP_PASSWORD';
const request = (body: unknown) => new Request('http://localhost/api/admin/email', { method: 'POST', body: JSON.stringify(body) });
const saveCredential = (kind: 'general' | 'otp', email: string) => {
  store.docs.set(`_email_secrets/email-${kind}`, { email, ...encryptSecret(PASSWORD, { secretId: `email-${kind}`, providerId: 'smtp' }), updatedAt: new Date() });
};
const savedEnv = { GMAIL_USER: process.env.GMAIL_USER, GMAIL_PASS: process.env.GMAIL_PASS, OTP_GMAIL_USER: process.env.OTP_GMAIL_USER, OTP_GMAIL_PASS: process.env.OTP_GMAIL_PASS };

beforeEach(() => {
  store = queryTestDb();
  mocks.db = store.db;
  mocks.requireAdmin.mockReset().mockResolvedValue({ uid: 'admin', email: 'admin@example.com' });
  mocks.audit.mockReset().mockResolvedValue(undefined);
  mocks.verify.mockReset().mockResolvedValue(true);
  process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 4).toString('base64');
  for (const key of Object.keys(savedEnv)) delete process.env[key];
});
afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('admin email credentials', () => {
  it('encrypts an OTP app password and never returns it to the browser', async () => {
    const response = await POST(request({ operation: 'save', kind: 'otp', email: 'otp@example.com', appPassword: PASSWORD }));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain(PASSWORD);
    const saved = store.docs.get('_email_secrets/email-otp');
    expect(saved).toMatchObject({ email: 'otp@example.com', ciphertext: expect.any(String) });
    expect(JSON.stringify(saved)).not.toContain(PASSWORD);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(PASSWORD);
  });

  it('returns only account metadata when loading settings', async () => {
    store.docs.set('_email_secrets/email-general', { email: 'mail@example.com', ciphertext: 'SECRET_CIPHERTEXT', iv: 'PRIVATE_IV', tag: 'PRIVATE_TAG' });
    const response = await GET(new Request('http://localhost/api/admin/email'));
    expect(response.status).toBe(200);
    const body = JSON.stringify(await response.json());
    expect(body).toContain('mail@example.com');
    expect(body).not.toContain('SECRET_CIPHERTEXT');
    expect(body).not.toContain('PRIVATE_IV');
  });
});

describe('email verification status (R7)', () => {
  it('verify records the status with the source of the login, and audits it', async () => {
    saveCredential('general', 'general@example.com');
    const response = await POST(request({ operation: 'verify', kind: 'general' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ verified: true, email: 'general@example.com', source: 'saved' });

    expect(store.docs.get('_email_status/general')).toMatchObject({ ok: true, email: 'general@example.com', source: 'saved' });
    expect(store.docs.get('_email_status/general').verifiedAt).toBeInstanceOf(Date);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'email.verify', target: '_email_status/general', actorEmail: 'admin@example.com' }));
  });

  it('reports where the login comes from: the saved account, the general fallback, or the server environment', async () => {
    saveCredential('general', 'general@example.com');
    await POST(request({ operation: 'verify', kind: 'otp' }));
    expect(store.docs.get('_email_status/otp')).toMatchObject({ ok: true, source: 'fallback-general' });

    store.docs.delete('_email_secrets/email-general');
    process.env.OTP_GMAIL_USER = 'env@example.com';
    process.env.OTP_GMAIL_PASS = 'env-password-value';
    const env = await POST(request({ operation: 'verify', kind: 'otp' }));
    expect(await env.json()).toMatchObject({ verified: true, email: 'env@example.com', source: 'env' });
    expect(store.docs.get('_email_status/otp')).toMatchObject({ ok: true, source: 'env' });
  });

  it('a rejected login is stored as a problem without any password or provider text', async () => {
    saveCredential('general', 'general@example.com');
    mocks.verify.mockRejectedValue(new Error(`535 5.7.8 Username and Password not accepted ${PASSWORD}`));
    const response = await POST(request({ operation: 'verify', kind: 'general' }));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain(PASSWORD);

    const status = store.docs.get('_email_status/general');
    expect(status).toMatchObject({ ok: false, email: 'general@example.com', source: 'saved', error: expect.stringMatching(/rejected this login/i) });
    expect(status.verifiedAt).toBeUndefined();
    expect(JSON.stringify([status, mocks.audit.mock.calls])).not.toContain(PASSWORD);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'email.verify' }));
  });

  it('verify with no credentials changes nothing', async () => {
    const response = await POST(request({ operation: 'verify', kind: 'general' }));
    expect(response.status).toBe(400);
    expect(store.paths('_email_status/')).toHaveLength(0);
  });

  it('saving a new account clears its old status, because it has not been verified yet', async () => {
    saveCredential('general', 'general@example.com');
    await POST(request({ operation: 'verify', kind: 'general' }));
    expect(store.docs.has('_email_status/general')).toBe(true);

    await POST(request({ operation: 'save', kind: 'general', email: 'new@example.com', appPassword: 'another-app-password' }));
    expect(store.docs.has('_email_status/general')).toBe(false);
  });

  it('GET shows each account’s status: verified, problem or none', async () => {
    saveCredential('general', 'general@example.com');
    saveCredential('otp', 'otp@example.com');
    store.docs.set('_email_status/general', { ok: true, email: 'general@example.com', source: 'saved', checkedAt: new Date('2026-11-14T10:00:00Z'), verifiedAt: new Date('2026-11-14T10:00:00Z') });
    store.docs.set('_email_status/otp', { ok: false, email: 'otp@example.com', source: 'saved', checkedAt: new Date('2026-11-14T11:00:00Z'), error: 'Gmail rejected this login.' });

    const { accounts } = await (await GET(new Request('http://localhost/api/admin/email'))).json();
    const general = accounts.find((account: { kind: string }) => account.kind === 'general');
    const otp = accounts.find((account: { kind: string }) => account.kind === 'otp');
    expect(general.status).toEqual({ ok: true, verifiedAt: '2026-11-14T10:00:00.000Z', checkedAt: '2026-11-14T10:00:00.000Z', source: 'saved' });
    expect(otp.status).toEqual({ ok: false, verifiedAt: null, checkedAt: '2026-11-14T11:00:00.000Z', source: 'saved', error: 'Gmail rejected this login.' });

    store.docs.delete('_email_status/otp');
    const again = (await (await GET(new Request('http://localhost/api/admin/email'))).json()).accounts.find((account: { kind: string }) => account.kind === 'otp');
    expect(again.status).toBeNull();
  });
});
