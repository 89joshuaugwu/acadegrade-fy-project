import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify, getUser: state.getUser },
  adminRtdb: { ref: () => ({ transaction: vi.fn() }) },
  adminMessaging: { sendEachForMulticast: vi.fn() },
}));
vi.mock('@/lib/email/mailer', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), welcomeEmail: () => '<p>hi</p>' }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { POST as finalize } from '@/app/api/auth/register/finalize/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;

const send = (body: unknown) => finalize(new NextRequest('https://app.test/api/auth/register/finalize', {
  method: 'POST',
  headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

const body = (profile: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  authMethod: 'google',
  profile: {
    fullName: 'Alice Ade', matric: 'ABC/123', email: 'alice@test.example', university: 'Test University',
    department: 'Computer Science', programme: 'B.Sc Computer Science', courseDuration: 4, currentLevel: 100,
    entrySession: '2024/2025', recordMode: 'fromScratch', ...profile,
  },
  ...extra,
});

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example', email_verified: true });
  state.getUser.mockReset().mockResolvedValue({ providerData: [{ providerId: 'google.com' }], photoURL: null });
});

describe('finalize: direct entry and spill-over (A5)', () => {
  it('keeps old clients unchanged: no entryLevel or spill-over fields are stored', async () => {
    expect((await send(body())).status).toBe(201);
    const user = store.docs.get('users/alice');
    expect(user).not.toHaveProperty('entryLevel');
    expect(user).not.toHaveProperty('spilloverSemesters');
  });

  it('stores the graduation session from the programme years for direct entry', async () => {
    expect((await send(body())).status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ entrySession: '2024/2025', graduationSession: '2027/2028' });
    store = queryTestDb();
    state.db = store.db;
    expect((await send(body({ entryLevel: 200, currentLevel: 200 }))).status).toBe(201);
    // A 4-year course from 200 level is 3 years: 2024/2025, 2025/2026, 2026/2027.
    expect(store.docs.get('users/alice')).toMatchObject({ entryLevel: 200, graduationSession: '2026/2027' });
    store = queryTestDb();
    state.db = store.db;
    expect((await send(body({ courseDuration: 5, entryLevel: 300, currentLevel: 300 }))).status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ entryLevel: 300, graduationSession: '2026/2027' });
  });

  it('rejects a current level below the entry level', async () => {
    const response = await send(body({ entryLevel: 200, currentLevel: 100 }));
    expect(response.status).toBe(400);
    expect(store.paths('users')).toEqual([]);
  });

  it('rejects an entry level that is not 100, 200 or 300 and spill-over above 4', async () => {
    expect((await send(body({ entryLevel: 250, currentLevel: 300 }))).status).toBe(400);
    expect((await send(body({ spilloverSemesters: 5 }))).status).toBe(400);
  });

  it('stores entryLevel and spilloverSemesters and builds past semesters from the entry level', async () => {
    const response = await send(body(
      { entryLevel: 200, currentLevel: 300, recordMode: 'complete', semestersCompleted: 2, spilloverSemesters: 2 },
      { pastSemesters: [
        { level: 200, semester: 1, session: '2024/2025' },
        { level: 200, semester: 2, session: '2024/2025' },
      ] },
    ));
    expect(response.status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ entryLevel: 200, spilloverSemesters: 2, currentLevel: 300 });
    expect(store.paths('users/alice/semesters').sort()).toEqual(['users/alice/semesters/sem_200_1', 'users/alice/semesters/sem_200_2']);
  });

  it('rejects past semesters that start at 100 for a direct-entry student', async () => {
    const response = await send(body(
      { entryLevel: 200, currentLevel: 300, recordMode: 'complete', semestersCompleted: 2 },
      { pastSemesters: [
        { level: 100, semester: 1, session: '2024/2025' },
        { level: 100, semester: 2, session: '2024/2025' },
      ] },
    ));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'invalid-timeline' });
  });

  it('limits completed semesters to those from the entry level up to the current level', async () => {
    const response = await send(body(
      { entryLevel: 300, currentLevel: 300, recordMode: 'complete', semestersCompleted: 4 },
      { pastSemesters: [] },
    ));
    expect(response.status).toBe(400);
  });
});
