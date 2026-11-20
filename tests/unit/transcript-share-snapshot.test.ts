import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { GET, POST } from '@/app/api/transcript/share/route';
import { shareMetadataFor } from '@/app/(public)/share/[shareId]/metadata';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;
const share = () => POST(new NextRequest('https://app.test/api/transcript/share', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: '{}' }));
const snapshot = () => store.docs.get(store.paths('shared_transcripts/')[0]);

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example' });
  store.docs.set('users/alice', { fullName: 'Alice', university: '  Enugu <b>State</b>\nUniversity  ', department: 'CS' });
  store.docs.set('users/alice/semesters/s1', { level: 100, semester: 1, isComplete: true, gpa: 4.5, pi: 4.4, creditLoaded: 20 });
  store.docs.set('users/alice/semesters/s2', { level: 100, semester: 2, isComplete: true, gpa: 3.5, pi: 3.6, creditLoaded: 20 });
  // In progress: must not count towards the shared CGPA or appear in the snapshot.
  store.docs.set('users/alice/semesters/s3', { level: 200, semester: 1, isComplete: false, gpa: 1.0, pi: 1.0, creditLoaded: 20 });
});

it("copies the owner's university as trimmed plain text", async () => {
  expect((await share()).status).toBe(200);
  expect(snapshot().university).toBe('Enugu State University');
});

it('stores an empty university when the profile has none', async () => {
  store.docs.set('users/alice', { fullName: 'Alice' });
  await share();
  expect(snapshot().university).toBe('');
});

it('computes the snapshot CGPA from completed semesters only, with the shared rule', async () => {
  await share();
  expect(snapshot().semesters.map((semester: { id: string }) => semester.id)).toEqual(['s1', 's2']);
  expect(snapshot()).toMatchObject({ cgpa: 4, pi: 4, totalCredits: 40 });
});

it('reports zero for a student with no completed semesters', async () => {
  store.docs.delete('users/alice/semesters/s1');
  store.docs.delete('users/alice/semesters/s2');
  await share();
  expect(snapshot()).toMatchObject({ semesters: [], cgpa: 0, pi: 0, totalCredits: 0 });
});

it('GET never returns uid', async () => {
  await share();
  const id = store.paths('shared_transcripts/')[0].split('/')[1];
  const response = await GET(new NextRequest('https://app.test/api/transcript/share?id=' + id));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.transcript).not.toHaveProperty('uid');
  expect(JSON.stringify(body)).not.toContain('alice');
  expect(body.transcript.university).toBe('Enugu State University');
});


it('metadata is generic for every link and names no student, live or not', () => {
  // Owner decision (17 Nov 2026): previews never show the student's name, because chat
  // apps cache them after a link ends; the metadata does not read the record.
  const meta = shareMetadataFor('abc');
  expect(meta.title).toBe('Shared transcript');
  expect(JSON.stringify(meta)).not.toContain('Alice');
  expect(JSON.stringify(meta)).not.toContain('logo.png');
  expect(meta.robots).toMatchObject({ index: false, follow: false });
});