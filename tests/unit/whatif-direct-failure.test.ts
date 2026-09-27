import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: vi.fn().mockResolvedValue({ uid: 'student-1' }) }));
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 2 }), rateLimitResponse: vi.fn() }));
vi.mock('@/lib/api/logger', () => ({ logApiCall: vi.fn(), apiTimer: () => () => 1 }));
vi.mock('@/lib/ai/manager', () => ({ generateFastResponseWithMetadata: vi.fn().mockRejectedValue(new Error('AI routing is not configured')) }));

import { POST } from '@/app/api/ai/whatif/route';
import { generateFastResponseWithMetadata } from '@/lib/ai/manager';

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
});
