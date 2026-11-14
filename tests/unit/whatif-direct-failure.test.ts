import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The user is a consenting adult; every other document is absent.
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: (name: string) => ({ doc: () => ({ get: async () => ({ data: () => (name === 'users' ? { ageStatus: 'adult', consents: { ai: { granted: true } } } : undefined) }) }) }) } }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: vi.fn().mockResolvedValue({ uid: 'student-1' }) }));
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 2 }), rateLimitResponse: vi.fn() }));
vi.mock('@/lib/api/logger', () => ({ logApiCall: vi.fn(), apiTimer: () => () => 1 }));
vi.mock('@/lib/ai/manager', () => ({ generateFastResponseWithMetadata: vi.fn().mockRejectedValue(new Error('AI routing is not configured')) }));

import { POST } from '@/app/api/ai/whatif/route';
import { generateFastResponseWithMetadata } from '@/lib/ai/manager';
import { requiredAverageForTarget } from '@/lib/cgpa/academicRules';

describe('What-if direct AI testing', () => {
  it('reports an unavailable AI route instead of returning a local note as an AI success', async () => {
    const request = new NextRequest('http://localhost/api/ai/whatif', {
      method: 'POST',
      body: JSON.stringify({ currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: 'AI routing is not configured' });
  });

  it('rejects an empty provider response instead of substituting local guidance', async () => {
    vi.mocked(generateFastResponseWithMetadata).mockResolvedValueOnce({ text: '', providerId: 'groq', modelId: 'openai/gpt-oss-20b', configRevision: 1 });
    const request = new NextRequest('http://localhost/api/ai/whatif', {
      method: 'POST',
      body: JSON.stringify({ currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
  });

  it('subtracts the optional gradedInProgressUnits, ignores invalid values and rejects a plan with nothing left', async () => {
    vi.mocked(generateFastResponseWithMetadata).mockResolvedValue({ text: 'Keep going.', providerId: 'groq', modelId: 'openai/gpt-oss-20b', configRevision: 1 });
    const ask = (extra: Record<string, unknown>) => POST(new NextRequest('http://localhost/api/ai/whatif', {
      method: 'POST',
      body: JSON.stringify({ currentCGPA: 3.4, totalCredits: 30, targetCGPA: 3.6, remainingSemesters: 1, creditLoad: 18, ...extra }),
    }));

    const old = await (await ask({})).json();
    const withGraded = await (await ask({ gradedInProgressUnits: 9 })).json();
    expect(old.requiredGPA).toBeCloseTo(requiredAverageForTarget({ currentCgpa: 3.4, completedUnits: 30, remainingUnits: 18, targetCgpa: 3.6 }) as number, 10);
    expect(withGraded.requiredGPA).toBeCloseTo(requiredAverageForTarget({ currentCgpa: 3.4, completedUnits: 30, remainingUnits: 9, targetCgpa: 3.6 }) as number, 10);

    // Invalid values are ignored, so the result matches an old client.
    for (const bad of ['abc', -5, 5000, null]) {
      expect((await (await ask({ gradedInProgressUnits: bad })).json()).requiredGPA).toBeCloseTo(old.requiredGPA, 10);
    }

    const nothingLeft = await ask({ gradedInProgressUnits: 18 });
    expect(nothingLeft.status).toBe(400);
    await expect(nothingLeft.json()).resolves.toMatchObject({ error: expect.stringMatching(/Nothing left to plan/) });
  });

  it('requiredGPA in the response equals requiredAverageForTarget and the edges stay local', async () => {
    vi.mocked(generateFastResponseWithMetadata).mockResolvedValue({ text: 'Keep going.', providerId: 'groq', modelId: 'openai/gpt-oss-20b', configRevision: 1 });
    const ask = (body: Record<string, number>) => POST(new NextRequest('http://localhost/api/ai/whatif', { method: 'POST', body: JSON.stringify(body) }));

    const normal = { currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18 };
    const response = await ask(normal);
    expect(response.status).toBe(200);
    const json = await response.json();
    const expected = requiredAverageForTarget({ currentCgpa: 3.5, completedUnits: 100, remainingUnits: 36, targetCgpa: 3.8 }) as number;
    expect(json.requiredGPA).toBeCloseTo(expected, 10);
    expect(json.requiredAvgScore).toBeCloseTo((expected / 5) * 100, 10);

    vi.mocked(generateFastResponseWithMetadata).mockClear();
    const impossible = await (await ask({ currentCGPA: 1.5, totalCredits: 100, targetCGPA: 5, remainingSemesters: 1, creditLoad: 6 })).json();
    expect(impossible.requiredGPA).toBeGreaterThan(5);
    expect(impossible.feasibilityNote).toMatch(/impossible/i);
    const secured = await (await ask({ currentCGPA: 5, totalCredits: 100, targetCGPA: 1, remainingSemesters: 1, creditLoad: 6 })).json();
    expect(secured.requiredGPA).toBeLessThan(0);
    expect(secured.feasibilityNote).toMatch(/secured/i);
    expect(generateFastResponseWithMetadata).not.toHaveBeenCalled();
  });});
