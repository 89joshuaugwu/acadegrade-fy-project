import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, contact: null as string | null, sendEmail: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: vi.fn() } }));
vi.mock('@/lib/site/contact', () => ({ getContactEmail: async () => state.contact }));
vi.mock('@/lib/email/mailer', () => ({
  sendEmail: state.sendEmail,
  adminSupportRequestEmail: (category: string, email: string) => `<p>${category} ${email}</p>`,
}));

import { POST } from '@/app/api/support/public/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { PUBLIC_SUPPORT_CATEGORIES, parsePublicSupportRequest, PublicSupportValidationError } from '@/lib/support/public-request';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support/tickets';

let store: ReturnType<typeof queryTestDb>;
const GOOD = { name: 'Ada', email: 'Ada@Test.example ', category: 'account', message: 'I cannot sign in and the reset code never arrives.' };
const post = (body: unknown, ip = '203.0.113.7') => POST(new NextRequest('https://app.test/api/support/public', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1` }, body: JSON.stringify(body),
}));
const tickets = () => store.paths('support_tickets/').map((path) => store.docs.get(path));

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.contact = null;
  state.sendEmail.mockReset().mockResolvedValue(undefined);
  invalidatePlatformSettingsCache();
});

describe('parsePublicSupportRequest', () => {
  it('limits categories to the three a locked-out visitor needs', () => {
    expect(PUBLIC_SUPPORT_CATEGORIES).toEqual(['account', 'privacy', 'other']);
    for (const category of PUBLIC_SUPPORT_CATEGORIES) expect(SUPPORT_CATEGORY_LABELS[category]).toBeTruthy();
  });

  it('normalises the email and trims text', () => {
    expect(parsePublicSupportRequest(GOOD)).toMatchObject({ email: 'ada@test.example', name: 'Ada', category: 'account', route: '/support', honeypot: false });
  });

  it('rejects bad input with readable messages', () => {
    const bad = [
      { ...GOOD, email: 'not-an-email' },
      { ...GOOD, email: `${'a'.repeat(250)}@x.io` },
      { ...GOOD, category: 'grades' },
      { ...GOOD, message: 'short' },
      { ...GOOD, message: 'x'.repeat(2001) },
      { ...GOOD, name: 'n'.repeat(81) },
      { ...GOOD, route: 'https://evil.example' },
    ];
    for (const body of bad) expect(() => parsePublicSupportRequest(body)).toThrow(PublicSupportValidationError);
  });

  it('flags a filled honeypot', () => {
    expect(parsePublicSupportRequest({ ...GOOD, website: 'http://spam.example' }).honeypot).toBe(true);
  });
});

describe('POST /api/support/public', () => {
  it('stores a public ticket with no uid that the admin inbox can show', async () => {
    const response = await post(GOOD);
    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({ ok: true });
    expect(tickets()).toEqual([expect.objectContaining({
      uid: null, email: 'ada@test.example', name: 'Ada', category: 'account', source: 'public', platform: 'web',
      route: '/support', status: 'open', purgeAt: null, replies: [],
    })]);
  });

  it('accepts a request without a name', async () => {
    const { name: _name, ...rest } = GOOD;
    expect((await post(rest)).status).toBe(201);
    expect(tickets()[0].name).toBeNull();
  });

  it('answers a honeypot submission like a success but stores and sends nothing', async () => {
    state.contact = 'owner@test.example';
    const response = await post({ ...GOOD, website: 'spam' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(tickets()).toHaveLength(0);
    expect(state.sendEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid bodies with 400', async () => {
    expect((await post({ ...GOOD, category: 'ai' })).status).toBe(400);
    expect((await post('nonsense')).status).toBe(400);
    expect(tickets()).toHaveLength(0);
  });

  it('limits one email to 3 requests a day, across addresses', async () => {
    for (let index = 0; index < 3; index += 1) expect((await post(GOOD, `198.51.100.${index}`)).status).toBe(201);
    const blocked = await post(GOOD, '198.51.100.9');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(tickets()).toHaveLength(3);
  });

  it('limits one address to 3 requests an hour, across emails', async () => {
    for (let index = 0; index < 3; index += 1) expect((await post({ ...GOOD, email: `p${index}@test.example` })).status).toBe(201);
    expect((await post({ ...GOOD, email: 'p9@test.example' })).status).toBe(429);
  });

  it('never stores the raw address or email in the rate-limit records', async () => {
    await post(GOOD);
    const records = store.paths('_api_rate_limits/');
    expect(records.length).toBeGreaterThan(0);
    const dump = JSON.stringify(records.map((path) => [path, store.docs.get(path)]));
    expect(dump).not.toContain('203.0.113.7');
    expect(dump).not.toContain('ada@test.example');
  });

  it('respects the support kill switch', async () => {
    store.docs.set('config/settings', { disabledFeatures: ['support'] });
    invalidatePlatformSettingsCache();
    const response = await post(GOOD);
    expect(response.status).toBe(503);
    expect(tickets()).toHaveLength(0);
  });

  it('stays open during maintenance', async () => {
    store.docs.set('config/settings', { maintenanceMode: true });
    invalidatePlatformSettingsCache();
    expect((await post(GOOD)).status).toBe(201);
  });

  it('notifies the configured contact address when one is set, and never fails because of it', async () => {
    expect((await post(GOOD)).status).toBe(201);
    expect(state.sendEmail).not.toHaveBeenCalled();

    state.contact = 'owner@test.example';
    state.sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    expect((await post({ ...GOOD, email: 'b@test.example' }, '192.0.2.1')).status).toBe(201);
    expect(state.sendEmail).toHaveBeenCalledWith('owner@test.example', expect.stringContaining('support request'), expect.any(String));
  });
});
