import { describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  get: vi.fn(),
  secretGet: vi.fn(),
}));
const groq = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({ get: name === '_ai_runtime' ? runtime.get : () => runtime.secretGet(id) }),
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

  it('tries three ordered keys when earlier keys fail', async () => {
    process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    const { encryptSecret } = await import('@/lib/ai/secrets');
    runtime.get.mockResolvedValue({ exists: true, data: () => ({
      source: 'managed', revision: 10,
      routes: {
        insights: { mode: 'disabled', chain: [] }, forecast: { mode: 'disabled', chain: [] },
        whatif: { mode: 'fallback-chain', chain: [1, 2, 3].map((number) => ({ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: `groq-key-${number}` })) },
        extract: { mode: 'disabled', chain: [] },
      },
    }) });
    runtime.secretGet.mockImplementation(async (secretId: string) => ({ exists: true, data: () => ({
      secretId, providerId: 'groq', state: 'active',
      ...encryptSecret(secretId, { secretId, providerId: 'groq' }),
    }) }));
    groq.create.mockReset();
    groq.create.mockRejectedValueOnce({ status: 401 }).mockRejectedValueOnce({ status: 429 }).mockResolvedValueOnce({ choices: [{ message: { content: 'third key worked' } }] });

    await expect(generateFastResponseWithMetadata('hello')).resolves.toMatchObject({ text: 'third key worked', configRevision: 10 });
    expect(runtime.secretGet.mock.calls.map(([id]) => id)).toEqual(['groq-key-1', 'groq-key-2', 'groq-key-3']);
    expect(groq.create).toHaveBeenCalledTimes(3);
  });
});
