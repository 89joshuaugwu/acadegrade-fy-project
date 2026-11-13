import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ get: vi.fn(), secretGet: vi.fn() }));
const openrouter = vi.hoisted(() => ({ create: vi.fn(), options: [] as unknown[] }));
const groq = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({ get: name === '_ai_runtime' ? runtime.get : () => runtime.secretGet(id) }),
    }),
  },
}));
vi.mock('openai', () => ({ default: class { constructor(options: unknown) { openrouter.options.push(options); } chat = { completions: { create: openrouter.create } }; } }));
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: groq.create } }; } }));

import { generateDeepInsightWithMetadata } from '@/lib/ai/manager';
import { createManagedRuntimeConfig, openRouterDataCollection, parseAiRuntimeConfig } from '@/lib/ai/runtime-config';
import { redactIdentityLines, scrubIdentityFields } from '@/lib/ai/prompt-privacy';

const routes = (insights: unknown) => ({
  insights,
  forecast: { mode: 'disabled', chain: [] }, whatif: { mode: 'disabled', chain: [] }, extract: { mode: 'disabled', chain: [] },
});

beforeEach(async () => {
  process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
  const { encryptSecret } = await import('@/lib/ai/secrets');
  runtime.secretGet.mockImplementation(async (secretId: string) => ({ exists: true, data: () => ({
    secretId, providerId: secretId.split('-')[0], state: 'active',
    ...encryptSecret(secretId, { secretId, providerId: secretId.split('-')[0] as 'groq' }),
  }) }));
  openrouter.create.mockReset();
  openrouter.options.length = 0;
  groq.create.mockReset();
});

describe('OpenRouter data collection setting', () => {
  it('defaults to deny at read time without needing a stored value', () => {
    const config = parseAiRuntimeConfig({ source: 'managed', revision: 1, routes: routes({ mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' }] }) });
    expect(config.routes.insights).toEqual({ mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' }] });
    expect(openRouterDataCollection(config.routes.insights!)).toBe('deny');
  });

  it('keeps an explicit per-route choice and rejects anything else', () => {
    const allow = createManagedRuntimeConfig({ source: 'managed', revision: 1, routes: routes({ mode: 'single', dataCollection: 'allow', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' }] }) });
    expect(allow.routes.insights?.dataCollection).toBe('allow');
    expect(openRouterDataCollection(allow.routes.insights!)).toBe('allow');
    expect(() => parseAiRuntimeConfig({ source: 'managed', revision: 1, routes: routes({ mode: 'single', dataCollection: 'maybe', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' }] }) }))
      .toThrow('Invalid OpenRouter data collection setting');
  });

  it('sends provider.data_collection = deny on every OpenRouter request by default', async () => {
    runtime.get.mockResolvedValue({ exists: true, data: () => ({ source: 'managed', revision: 3, routes: routes({ mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' }] }) }) });
    openrouter.create.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    await generateDeepInsightWithMetadata('prompt');
    expect(openrouter.create).toHaveBeenCalledWith(expect.objectContaining({ model: 'openrouter/free', provider: { data_collection: 'deny' } }));
  });

  it('falls through to the next route target when a free model is unavailable under deny', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    runtime.get.mockResolvedValue({ exists: true, data: () => ({ source: 'managed', revision: 4, routes: routes({ mode: 'fallback-chain', chain: [
      { providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-a' },
      { providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-b' },
    ] }) }) });
    openrouter.create.mockRejectedValue({ status: 404, message: 'No endpoints found matching your data policy' });
    groq.create.mockResolvedValue({ choices: [{ message: { content: 'from groq' } }] });
    await expect(generateDeepInsightWithMetadata('prompt')).resolves.toMatchObject({ text: 'from groq', providerId: 'groq' });
    expect(openrouter.create).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });
});

describe('prompt privacy', () => {
  it('removes identity fields from client-sent academic data at any depth', () => {
    const scrubbed = scrubIdentityFields([{
      label: '100L First', fullName: 'Ada Obi', email: 'ada@x.com', matric: 'ESUT/1', matricNumber: 'ESUT/1', uid: 'u1', userId: 'u1', avatarUrl: 'https://a',
      courses: [{ code: 'CSC 101', title: 'Intro', units: 3, studentName: 'Ada Obi', authorId: 'u1' }],
    }]);
    expect(scrubbed).toEqual([{ label: '100L First', courses: [{ code: 'CSC 101', title: 'Intro', units: 3 }] }]);
    expect(JSON.stringify(scrubbed)).not.toMatch(/Ada|ESUT|ada@x/);
  });

  it('redacts labelled name, matric and email lines from extracted slip text but keeps course rows', () => {
    const text = 'ENUGU STATE UNIVERSITY\nName: Ada Obi\nMatric No.: ESUT/2020/123\nReg. Number - 2020/123\nEmail: ada@x.com\nCSC 101 Intro to Computing 3 25 50\nContact ada@x.com for help';
    const redacted = redactIdentityLines(text);
    expect(redacted).toContain('CSC 101 Intro to Computing 3 25 50');
    expect(redacted).not.toMatch(/Ada Obi|ESUT\/2020|2020\/123|ada@x\.com/);
  });
});
