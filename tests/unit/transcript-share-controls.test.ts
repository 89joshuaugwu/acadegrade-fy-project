import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { GET, POST } from '@/app/api/transcript/share/route';
import { shareMetadataFor } from '@/app/(public)/share/[shareId]/metadata';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

const DAY = 24 * 60 * 60 * 1000;
let store: ReturnType<typeof queryTestDb>;

const share = (body: unknown) => POST(new NextRequest('https://app.test/api/transcript/share', {
  method: 'POST', headers: { Authorization: 'Bearer t' }, body: typeof body === 'string' ? body : JSON.stringify(body),
}));
const read = (id: string, pin?: string) => GET(new NextRequest(`https://app.test/api/transcript/share?id=${id}`, pin === undefined ? undefined : { headers: { 'X-Share-Pin': pin } }));
const doc = () => store.docs.get(store.paths('shared_transcripts/')[0]);
const docPath = () => store.paths('shared_transcripts/')[0];
const approxDays = (value: Date) => Math.round((value.getTime() - Date.now()) / DAY);

async function create(body: unknown = {}) {
  const response = await share(body);
  expect(response.status).toBe(200);
  return (await response.json()).shareId as string;
}

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example' });
  store.docs.set('users/alice', { fullName: 'Alice', avatarUrl: 'https://img.test/a.png', department: 'CS' });
  store.docs.set('users/alice/semesters/s1', { level: 100, semester: 1, isComplete: true, gpa: 4.5, pi: 4.4, creditLoaded: 20 });
  store.docs.set('users/alice/semesters/s1/courses/c1', { code: 'CSC101', title: 'Intro', units: 3, totalScore: 70, grade: 'A', gradePoint: 5 });
});

describe('POST /api/transcript/share: old payloads', () => {
  it('{ showPhoto } only behaves exactly as before: 30 days, full courses, no PIN', async () => {
    const id = await create({ showPhoto: false });
    expect(doc()).toMatchObject({ uid: 'alice', showPhoto: false, avatarUrl: null });
    expect(approxDays(doc().expiresAt)).toBe(30);
    expect(doc().semesters[0].courses).toHaveLength(1);
    expect(doc().pinHash).toBeUndefined();
    const response = await read(id);
    expect(response.status).toBe(200);
  });

  it('no body and invalid JSON still create a default share', async () => {
    await create('');
    expect(approxDays(doc().expiresAt)).toBe(30);
    expect(doc().showPhoto).toBe(true);
    expect(doc().semesters[0].courses).toHaveLength(1);
  });

  it('exactly { showPhoto: true } (the installed APK payload) keeps today\'s record and response', async () => {
    const response = await share({ showPhoto: true });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.shareId).toMatch(/^[0-9a-f]{12}$/);
    expect(body.shareUrl).toBe(`https://app.test/share/${body.shareId}`);
    expect(doc()).toMatchObject({
      uid: 'alice', studentName: 'Alice', department: 'CS', showPhoto: true, avatarUrl: 'https://img.test/a.png',
      cgpa: 4.5, totalCredits: 20,
    });
    expect(doc().semesters[0].courses[0]).toMatchObject({ code: 'CSC101', totalScore: 70 });
    for (const absent of ['pinHash', 'pinSalt', 'pinFailures', 'pinLockedUntil']) expect(doc()).not.toHaveProperty(absent);
    expect(approxDays(doc().expiresAt)).toBe(30);
    const view = await read(body.shareId);
    expect(view.status).toBe(200);
    const { transcript } = await view.json();
    expect(transcript.semesters[0].courses).toHaveLength(1);
    expect(transcript).not.toHaveProperty('uid');
  });

  it('answers with the old fields plus the new ones', async () => {
    const body = await (await share({})).json();
    expect(body).toMatchObject({ shareUrl: expect.stringContaining('/share/'), expiresInDays: 30, level: 'full', hasPin: false });
    expect(typeof body.shareId).toBe('string');
  });
});

describe('POST /api/transcript/share: new controls', () => {
  it('honours expiresInDays 1, 7 and 30 and rejects anything else', async () => {
    await create({ expiresInDays: 1 });
    expect(approxDays(doc().expiresAt)).toBe(1);
    store.docs.delete(docPath());
    await create({ expiresInDays: 7 });
    expect(approxDays(doc().expiresAt)).toBe(7);
    for (const bad of [0, 2, 365, '7', null]) expect((await share({ expiresInDays: bad })).status, String(bad)).toBe(400);
  });

  it('summary level stores no course rows, full keeps them', async () => {
    await create({ level: 'summary' });
    expect(doc().shareLevel).toBe('summary');
    expect(doc().semesters).toHaveLength(1);
    expect(doc().semesters[0].courses).toEqual([]);
    expect(doc()).toMatchObject({ cgpa: expect.any(Number), totalCredits: 20 });
    expect((await share({ level: 'half' })).status).toBe(400);
  });

  it('stores a PIN only as a scrypt hash and salt', async () => {
    await create({ pin: '123456' });
    expect(doc().pinHash).toMatch(/^[0-9a-f]{128}$/);
    expect(doc().pinSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(doc())).not.toContain('123456');
    for (const bad of ['12', '1234567', 'abcd', '12 34', 1234]) expect((await share({ pin: bad })).status, String(bad)).toBe(400);
  });

  it('rejects bad options before reading any data and never echoes the PIN', async () => {
    const before = store.paths('shared_transcripts/').length;
    const response = await share({ pin: '98765432' });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('INVALID_PIN');
    expect(JSON.stringify(body)).not.toContain('98765432');
    expect(store.paths('shared_transcripts/')).toHaveLength(before);
  });

  it('reports hasPin and the chosen level and expiry', async () => {
    const body = await (await share({ pin: '4821', level: 'summary', expiresInDays: 7 })).json();
    expect(body).toMatchObject({ expiresInDays: 7, level: 'summary', hasPin: true });
    expect(JSON.stringify(body)).not.toContain('4821');
    expect(Math.round((Date.parse(body.expiresAt) - Date.now()) / DAY)).toBe(7);
  });

  it('a summary link serves no course rows', async () => {
    const id = await create({ level: 'summary' });
    const { transcript } = await (await read(id)).json();
    expect(transcript.shareLevel).toBe('summary');
    expect(transcript.semesters[0].courses).toEqual([]);
    expect(JSON.stringify(transcript)).not.toContain('CSC101');
  });
});

describe('GET /api/transcript/share: PIN', () => {
  it('asks for the PIN, rejects a wrong one and accepts the right one without leaking secrets', async () => {
    const id = await create({ pin: '4821' });
    const none = await read(id);
    expect(none.status).toBe(401);
    expect((await none.json()).code).toBe('PIN_REQUIRED');
    const wrong = await read(id, '0000');
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).code).toBe('PIN_INCORRECT');
    const ok = await read(id, '4821');
    expect(ok.status).toBe(200);
    const text = JSON.stringify(await ok.json());
    for (const hidden of ['pinHash', 'pinSalt', 'pinFailures', 'pinLockedUntil', 'viewCount', 'lastViewedAt', 'uid"']) expect(text).not.toContain(hidden);
  });

  it('locks the link for an hour after 10 wrong PINs, even for the right PIN', async () => {
    const id = await create({ pin: '4821' });
    for (let i = 0; i < 9; i++) expect((await read(id, '1111')).status).toBe(401);
    const tenth = await read(id, '1111');
    expect(tenth.status).toBe(429);
    expect((await tenth.json()).code).toBe('PIN_LOCKED');
    const locked = await read(id, '4821');
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('Retry-After'))).toBeGreaterThan(3000);
    // The hour passes: the right PIN works again.
    store.docs.set(docPath(), { ...doc(), pinLockedUntil: new Date(Date.now() - 1000) });
    expect((await read(id, '4821')).status).toBe(200);
    expect(doc().pinFailures).toBe(0);
  });

  it('a right PIN resets the failure counter', async () => {
    const id = await create({ pin: '4821' });
    for (let i = 0; i < 5; i++) await read(id, '1111');
    expect((await read(id, '4821')).status).toBe(200);
    expect(doc().pinFailures).toBe(0);
  });

  it('ignores a PIN in the URL: only the X-Share-Pin header counts', async () => {
    const id = await create({ pin: '4821' });
    const response = await GET(new NextRequest(`https://app.test/api/transcript/share?id=${id}&pin=4821&X-Share-Pin=4821`));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('PIN_REQUIRED');
  });

  it('never echoes the submitted PIN and is never cached', async () => {
    const id = await create({ pin: '4821' });
    const wrong = await read(id, '9137');
    expect(await wrong.text()).not.toContain('9137');
    expect(wrong.headers.get('Cache-Control')).toContain('no-store');
    expect((await read(id, '4821')).headers.get('Cache-Control')).toContain('no-store');
  });

  it('parallel guesses cannot get past the lock', async () => {
    const id = await create({ pin: '4821' });
    const results = await Promise.all(Array.from({ length: 14 }, () => read(id, '1111')));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(9);
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);
    expect((await read(id, '4821')).status).toBe(429);
  });

  it('an expired PIN link answers like any expired link, and an unknown id like today', async () => {
    const id = await create({ pin: '4821' });
    store.docs.set(docPath(), { ...doc(), expiresAt: new Date(Date.now() - 1000) });
    const expired = await read(id, '4821');
    expect(expired.status).toBe(410);
    expect(await expired.json()).toEqual({ error: 'This shared transcript has expired' });
    const unknown = await read('ffffffffffff', '4821');
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: 'Transcript not found or expired' });
  });

  it('does not count a view while the PIN is wrong', async () => {
    const id = await create({ pin: '4821' });
    await read(id, '1111');
    expect(doc().viewCount ?? 0).toBe(0);
  });
});

describe('GET /api/transcript/share: viewCount', () => {
  it('counts at most once an hour', async () => {
    const id = await create({});
    expect((await read(id)).status).toBe(200);
    expect(doc().viewCount).toBe(1);
    await read(id);
    await read(id);
    expect(doc().viewCount).toBe(1);
    store.docs.set(docPath(), { ...doc(), lastViewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) });
    await read(id);
    expect(doc().viewCount).toBe(2);
  });

  it('counts the first view of an older link that has no counter yet', async () => {
    store.docs.set('shared_transcripts/old1', { uid: 'alice', studentName: 'Alice', semesters: [], expiresAt: new Date(Date.now() + DAY) });
    expect((await read('old1')).status).toBe(200);
    expect(store.docs.get('shared_transcripts/old1').viewCount).toBe(1);
  });

  it('expired links still answer 410', async () => {
    store.docs.set('shared_transcripts/old2', { uid: 'alice', semesters: [], expiresAt: new Date(Date.now() - DAY) });
    expect((await read('old2')).status).toBe(410);
  });
});

describe('share metadata', () => {
  it('names no student for any link, PIN-protected or not', () => {
    // Owner decision (17 Nov 2026): link previews are generic for every link, so the
    // metadata no longer reads the record at all.
    const meta = shareMetadataFor('abc');
    expect(JSON.stringify(meta)).not.toContain('Alice');
    expect(meta.title).toBe('Shared transcript');
    expect(meta.openGraph?.title).toBe('Shared transcript | AcadeGrade');
  });
});
