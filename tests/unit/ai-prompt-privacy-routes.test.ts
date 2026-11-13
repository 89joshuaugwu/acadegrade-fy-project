import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, insight: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {
  collection: (name: string) => state.db.collection(name),
  runTransaction: (work: any) => state.db.runTransaction(work),
} }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: async () => ({ uid: 'alice', token: 't' }) }));
vi.mock('@/lib/ai/manager', () => ({ getAiConfigRevision: async () => 1, generateDeepInsightJSONWithMetadata: state.insight }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: async () => ({ allowed: true, remaining: 1 }), rateLimitResponse: vi.fn() }));

import { POST as insights } from '@/app/api/ai/insights/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

beforeEach(() => {
  state.db = queryTestDb().db;
  invalidatePlatformSettingsCache();
  state.db.collection('users').doc('alice').set({ ageStatus: 'adult', consents: { ai: { granted: true } } });
  state.insight.mockReset().mockResolvedValue({ data: { strengths: [], concerns: [], recommendations: [], degreeOutlook: 'x' }, provenance: { providerId: 'p' } });
});

it('never sends the student name, email or matric number to the provider', async () => {
  const semesterData = [{
    label: '100L First', gpa: 4.2, fullName: 'Ada Obi', email: 'ada@x.com', matric: 'ESUT/2020/1', uid: 'alice',
    courses: [{ code: 'CSC 101', title: 'Intro', units: 3, grade: 'A', studentName: 'Ada Obi' }],
  }];
  const response = await insights(new NextRequest('https://app.test/api/ai/insights', { method: 'POST', body: JSON.stringify({ semesterData, forceRegenerate: true }) }));
  expect(response.status).toBe(200);
  const prompt = state.insight.mock.calls[0][0] as string;
  expect(prompt).toContain('CSC 101');
  expect(prompt).toContain('4.2');
  expect(prompt).not.toMatch(/Ada Obi|ada@x\.com|ESUT\/2020|alice/);
});
