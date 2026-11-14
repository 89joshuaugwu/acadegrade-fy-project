import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  requireAdmin: vi.fn(),
  audit: vi.fn(),
  rate: vi.fn(),
  groq: vi.fn(),
  openrouter: vi.fn(),
  gemini: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: vi.fn() } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: state.rate,
  rateLimitResponse: (result: { retryAfterSeconds: number }, message: string) => new Response(JSON.stringify({ error: message }), { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }),
}));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class extends Error { status = 403; },
}));
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: state.groq } }; } }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: state.openrouter } }; } }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: state.gemini }; } }));

import { POST, GET } from '@/app/api/admin/ai/route';
import { encryptSecret } from '@/lib/ai/secrets';

let store: ReturnType<typeof queryTestDb>;
const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
const KEY = 'sk-live-super-secret-key-value';
const call = (body: unknown) => POST(new Request('https://app.test/api/admin/ai', { method: 'POST', body: JSON.stringify(body) }));

function addSecret(secretId: string, providerId: 'groq' | 'openrouter' | 'gemini', extra: Record<string, unknown> = {}) {
  store.docs.set(`_ai_secrets/${secretId}`, {
    secretId, providerId, state: 'active',
    ...encryptSecret(KEY, { secretId, providerId }),
    ...extra,
  });
}

beforeEach(() => {
  process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 5).toString('base64');
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
  state.rate.mockReset().mockResolvedValue({ allowed: true, remaining: 19, retryAfterSeconds: 0 });
  state.groq.mockReset().mockResolvedValue({ choices: [{ message: { content: 'OK' } }] });
  state.openrouter.mockReset().mockResolvedValue({ choices: [{ message: { content: 'OK' } }] });
  state.gemini.mockReset().mockResolvedValue({ text: 'OK' });
});
afterEach(() => { vi.useRealTimers(); });

describe('POST /api/admin/ai { operation: "test-secret" }', () => {
  it('invokes the provider once, stores lastTest, audits, and never returns key material', async () => {
    addSecret('groq-primary', 'groq');
    const response = await call({ operation: 'test-secret', secretId: 'groq-primary' });
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(state.groq).toHaveBeenCalledTimes(1);
    expect(state.groq.mock.calls[0][0]).toMatchObject({ model: 'llama-3.3-70b-versatile', max_tokens: expect.any(Number) });
    expect(JSON.stringify(state.groq.mock.calls[0][0].messages)).toContain('Reply with the single word OK.');
    expect(body).toMatchObject({ ok: true, providerId: 'groq', modelId: 'llama-3.3-70b-versatile' });
    expect(typeof body.latencyMs).toBe('number');
    expect(typeof body.testedAt).toBe('string');

    expect(store.docs.get('_ai_secrets/groq-primary').lastTest).toMatchObject({ ok: true });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ai.test-secret', actorEmail: ADMIN.email, target: '_ai_secrets/groq-primary' }));

    const everything = JSON.stringify([body, state.audit.mock.calls]);
    expect(everything).not.toContain(KEY);
    expect(everything).not.toMatch(/ciphertext/i);
  });

  it('reports a rejected key as a plain-language problem, without the provider text, and records it', async () => {
    addSecret('groq-primary', 'groq');
    state.groq.mockRejectedValue(Object.assign(new Error('Invalid API Key sk-live-super-secret-key-value'), { status: 401 }));
    const body = await (await call({ operation: 'test-secret', secretId: 'groq-primary' })).json();

    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/rejected this key/i);
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(store.docs.get('_ai_secrets/groq-primary').lastTest).toMatchObject({ ok: false });
    expect(store.docs.get('_ai_secrets/groq-primary').lastTest.error).not.toContain(KEY);
  });

  it('maps rate limits, bad models and outages to clear messages', async () => {
    addSecret('groq-primary', 'groq');
    for (const [status, pattern] of [[429, /rate limit/i], [400, /model/i], [503, /unavailable/i]] as const) {
      state.groq.mockRejectedValueOnce(Object.assign(new Error('x'), { status }));
      const body = await (await call({ operation: 'test-secret', secretId: 'groq-primary' })).json();
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(pattern);
    }
  });

  it('treats an empty provider answer as a failed test', async () => {
    addSecret('groq-primary', 'groq');
    state.groq.mockResolvedValue({ choices: [{ message: { content: '' } }] });
    const body = await (await call({ operation: 'test-secret', secretId: 'groq-primary' })).json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/empty/i);
  });

  it('uses the saved model of the connection, a requested model, or the provider default', async () => {
    addSecret('gemini-ocr', 'gemini', { modelId: 'gemini-saved-model' });
    await call({ operation: 'test-secret', secretId: 'gemini-ocr' });
    expect(state.gemini.mock.calls[0][0].model).toBe('gemini-saved-model');

    await call({ operation: 'test-secret', secretId: 'gemini-ocr', modelId: 'gemini-other-model' });
    expect(state.gemini.mock.calls[1][0].model).toBe('gemini-other-model');

    addSecret('openrouter-main', 'openrouter');
    await call({ operation: 'test-secret', secretId: 'openrouter-main' });
    expect(state.openrouter.mock.calls[0][0].model).toBe('openrouter/free');
    // The test never lets OpenRouter providers collect the data.
    expect(state.openrouter.mock.calls[0][0].provider).toEqual({ data_collection: 'deny' });
  });

  it('can test a disabled (inactive) key, so it can be checked before switching it back on', async () => {
    addSecret('groq-spare', 'groq', { state: 'inactive' });
    const body = await (await call({ operation: 'test-secret', secretId: 'groq-spare' })).json();
    expect(body.ok).toBe(true);
  });

  it('404 for an unknown key and 409 for a retired one, without calling any provider', async () => {
    expect((await call({ operation: 'test-secret', secretId: 'groq-missing' })).status).toBe(404);
    addSecret('groq-old', 'groq', { state: 'retired' });
    expect((await call({ operation: 'test-secret', secretId: 'groq-old' })).status).toBe(409);
    expect(state.groq).not.toHaveBeenCalled();
  });

  it('400 for a missing key id or an invalid model id', async () => {
    addSecret('groq-primary', 'groq');
    expect((await call({ operation: 'test-secret' })).status).toBe(400);
    expect((await call({ operation: 'test-secret', secretId: 'groq-primary', modelId: 'http://evil' })).status).toBe(400);
    expect((await call({ operation: 'test-secret', secretId: 'groq-primary', modelId: 5 })).status).toBe(400);
    expect(state.groq).not.toHaveBeenCalled();
  });

  it('is rate limited per admin and does not call the provider when limited', async () => {
    addSecret('groq-primary', 'groq');
    state.rate.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 120 });
    const response = await call({ operation: 'test-secret', secretId: 'groq-primary' });
    expect(response.status).toBe(429);
    expect(state.rate).toHaveBeenCalledWith('admin-1', 'admin_ai_test', [{ name: 'hour', limit: 20, windowMs: 3_600_000 }]);
    expect(state.groq).not.toHaveBeenCalled();
  });

  it('gives up after 15 seconds and reports a timeout', async () => {
    addSecret('groq-primary', 'groq');
    state.groq.mockImplementation(() => new Promise(() => {}));
    vi.useFakeTimers();
    const pending = call({ operation: 'test-secret', secretId: 'groq-primary' });
    await vi.advanceTimersByTimeAsync(15_100);
    const body = await (await pending).json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/timed out/i);
  });

  it('is admin-only', async () => {
    const { AdminAuthorizationError } = await import('@/lib/api/admin-auth');
    state.requireAdmin.mockRejectedValue(new AdminAuthorizationError(403));
    addSecret('groq-primary', 'groq');
    expect((await call({ operation: 'test-secret', secretId: 'groq-primary' })).status).toBe(403);
    expect(state.groq).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/ai', () => {
  it('shows the last test result on each key, still without key material', async () => {
    addSecret('groq-primary', 'groq', { lastTest: { ok: true, at: new Date('2026-11-14T10:00:00Z'), latencyMs: 321 } });
    const json = await (await GET(new Request('https://app.test/api/admin/ai'))).json();
    expect(json.secrets[0].lastTest).toEqual({ ok: true, at: '2026-11-14T10:00:00.000Z', latencyMs: 321 });
    expect(JSON.stringify(json)).not.toMatch(/ciphertext|"iv"|"tag"/);
  });
});
