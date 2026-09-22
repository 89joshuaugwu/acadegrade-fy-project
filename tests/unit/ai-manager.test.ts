import { describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  get: vi.fn(),
  secretGet: vi.fn(),
}));
const groq = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: () => ({ get: name === '_ai_runtime' ? runtime.get : runtime.secretGet }),
    }),
  },
}));
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: groq.create } }; } }));

import { generateFastResponseWithMetadata } from '@/lib/ai/manager';

describe('managed AI manager', () => {
  it('uses a managed Groq credential and returns safe provenance', async () => {
    process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    const { encryptSecret } = await import('@/lib/ai/secrets');
    runtime.get.mockResolvedValue({ exists: true, data: () => ({
      source: 'managed', revision: 9,
      routes: {
        insights: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' }] },
        forecast: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' }] },
        whatif: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' }] },
        extract: { mode: 'local-only', chain: [] },
      },
    }) });
    runtime.secretGet.mockResolvedValue({ exists: true, data: () => ({
      secretId: 'groq-primary', providerId: 'groq', state: 'active',
      ...encryptSecret('managed-key', { secretId: 'groq-primary', providerId: 'groq' }),
    }) });
    groq.create.mockResolvedValue({ choices: [{ message: { content: 'managed response' } }] });
    process.env.GROQ_API_KEY_1 = 'old-env-key';

    await expect(generateFastResponseWithMetadata('hello')).resolves.toEqual({
      text: 'managed response', providerId: 'groq', modelId: 'llama-3.3-70b-versatile', configRevision: 9,
    });
  });
});
