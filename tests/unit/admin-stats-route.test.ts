import { beforeEach, describe, expect, it, vi } from 'vitest';

type Semester = { gpa: number; pi: number; creditLoaded: number; isComplete?: boolean };
const state = vi.hoisted(() => ({ users: {} as Record<string, Semester[]> }));

vi.mock('@/lib/firebase/admin', () => {
  const snapshot = (docs: { id: string; data: Record<string, unknown> }[]) => ({
    size: docs.length,
    docs: docs.map((doc) => ({ id: doc.id, data: () => doc.data })),
  });
  return {
    adminAuth: { verifyIdToken: vi.fn(async () => ({ email: 'admin@example.com' })) },
    adminDb: {
      collection: (path: string) => {
        if (path === 'config') return { doc: () => ({ get: async () => ({ data: () => ({ emails: ['admin@example.com'] }) }) }) };
        if (path === 'users') {
          return { get: async () => snapshot(Object.keys(state.users).map((id) => ({ id, data: { department: 'CSC', currentLevel: 300 } }))) };
        }
        const uid = path.split('/')[1];
        const all = () => (state.users[uid] ?? []).map((data, i) => ({ id: `s${i}`, data: data as unknown as Record<string, unknown> }));
        return {
          get: async () => snapshot(all()),
          where: (field: string, _op: string, value: unknown) => ({ get: async () => snapshot(all().filter((doc) => doc.data[field] === undefined || doc.data[field] === value)) }),
        };
      },
    },
  };
});

import { GET } from '@/app/api/admin/stats/route';
import { GET as usersGET } from '@/app/api/admin/users/route';

async function degreeClassCounts() {
  const response = await GET(new Request('https://example.com/api/admin/stats', { headers: { Authorization: 'Bearer token' } }));
  expect(response.status).toBe(200);
  return (await response.json()).degreeClassCounts as Record<string, number>;
}

describe('/api/admin/stats degree classes', () => {
  beforeEach(() => { state.users = {}; });

  it('counts students by the same rounded classification students see', async () => {
    state.users = {
      first: [{ gpa: 4.495, pi: 4, creditLoaded: 1 }],
      upper: [{ gpa: 4.5, pi: 4, creditLoaded: 40 }, { gpa: 4.4875, pi: 4, creditLoaded: 80 }],
      pass: [{ gpa: 0.995, pi: 1, creditLoaded: 1 }],
      fail: [{ gpa: 0.5, pi: 1, creditLoaded: 18 }],
    };
    expect(await degreeClassCounts()).toEqual({
      'First Class': 1,
      'Second Class Upper': 1,
      'Second Class Lower': 0,
      'Third Class': 0,
      Pass: 1,
      Fail: 1,
    });
  });

  it('stats averages use every semester with graded credits', async () => {
    state.users = {
      mixed: [
        { gpa: 4, pi: 4, creditLoaded: 20, isComplete: true },
        { gpa: 2, pi: 2, creditLoaded: 20, isComplete: false },
      ],
    };
    const response = await GET(new Request('https://example.com/api/admin/stats', { headers: { Authorization: 'Bearer token' } }));
    const json = await response.json();
    // Student rule: every graded course counts. (4 + 2) / 2 = 3, not 4 from the complete semester alone.
    expect(json.avgCGPA).toBeCloseTo(3, 2);
    expect(json.avgPI).toBeCloseTo(3, 2);
  });
  it('users GET cgpa equals computeCumulativeCGPA over every semester', async () => {
    state.users = {
      mixed: [
        { gpa: 4, pi: 4, creditLoaded: 20, isComplete: true },
        { gpa: 2, pi: 2, creditLoaded: 20, isComplete: false },
      ],
    };
    const response = await usersGET(new Request('https://example.com/api/admin/users', { headers: { Authorization: 'Bearer token' } }));
    expect(response.status).toBe(200);
    const { users } = await response.json();
    expect(users).toHaveLength(1);
    expect(users[0].cgpa).toBeCloseTo(3, 10);
    expect(users[0].pi).toBeCloseTo(3, 10);
    expect(users[0].semesterCount).toBe(2);
  });});
