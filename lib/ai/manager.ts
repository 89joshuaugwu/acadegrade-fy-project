import 'server-only';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { adminDb } from '@/lib/firebase/admin';
import { decryptSecret, type SupportedProviderId } from '@/lib/ai/secrets';
import { getAiRuntimeConfig, openRouterDataCollection, SUPPORTED_PROVIDERS, type AiFeature, type AiRouteTarget, type OpenRouterDataCollection, type StoredAiSecret } from '@/lib/ai/runtime-config';
import { safeParseJSON, extractJsonObjectAndParse } from '@/lib/utils/safeParseJSON';

export type AiGenerationResult = { text: string; providerId: SupportedProviderId; modelId: string; configRevision: number };
const publicProviderError = (error: any) => [400, 401, 403].includes(Number(error?.status ?? error?.response?.status)) ? new Error('AI provider authentication failed') : new Error('AI provider unavailable');
type TargetFailureCategory = 'credential_missing' | 'credential_inactive' | 'credential_decrypt' | 'credential_error' | 'provider_auth' | 'provider_rate_limit' | 'provider_rejected' | 'provider_unavailable' | 'provider_error' | 'empty_response' | 'invalid_response';
class AiTargetFailure extends Error {
  constructor(readonly category: TargetFailureCategory) { super(category); }
}
function providerStatus(error: unknown): number | null {
  const candidate = error as { status?: unknown; response?: { status?: unknown } } | null;
  const status = Number(candidate?.status ?? candidate?.response?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
}
function targetFailureCategory(error: unknown, stage: 'credential' | 'provider' | 'validation', status: number | null): TargetFailureCategory {
  if (error instanceof AiTargetFailure) return error.category;
  if (stage === 'credential') return 'credential_error';
  if (stage === 'validation') return 'invalid_response';
  if (status === 401 || status === 403) return 'provider_auth';
  if (status === 429) return 'provider_rate_limit';
  if (status === 400 || status === 422) return 'provider_rejected';
  if (status !== null && status >= 500) return 'provider_unavailable';
  return 'provider_error';
}

async function managedKey(target: AiRouteTarget) {
  if (!target.secretId) throw new AiTargetFailure('credential_missing');
  const snapshot = await adminDb.collection('_ai_secrets').doc(target.secretId).get();
  if (!snapshot.exists) throw new AiTargetFailure('credential_missing');
  const secret = snapshot.data() as StoredAiSecret;
  if (secret.state !== 'active' || secret.providerId !== target.providerId) throw new AiTargetFailure('credential_inactive');
  try {
    return decryptSecret(secret, { secretId: target.secretId, providerId: target.providerId });
  } catch {
    throw new AiTargetFailure('credential_decrypt');
  }
}
async function invoke(target: AiRouteTarget, apiKey: string, prompt: string | any[], responseMimeType: string | undefined, dataCollection: OpenRouterDataCollection): Promise<string> {
  if (target.providerId === 'groq') {
    const result = await new Groq({ apiKey }).chat.completions.create({ messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }], model: target.modelId, temperature: 0.7, max_tokens: 1024 });
    return result.choices[0]?.message?.content || '';
  }
  if (target.providerId === 'openrouter') {
    // OpenRouter provider routing: 'deny' skips providers that may store or train on inputs.
    // A model with no compliant provider fails here and the route falls through to its next target.
    const body = {
      messages: [{ role: 'user' as const, content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }],
      model: target.modelId, temperature: 0.65, max_tokens: 1024,
      provider: { data_collection: dataCollection },
    };
    const result = await new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey }).chat.completions.create(body);
    return result.choices[0]?.message?.content || '';
  }
  const response = await new GoogleGenAI({ apiKey }).models.generateContent({ model: target.modelId, contents: prompt, config: { maxOutputTokens: responseMimeType ? 2048 : 1024, temperature: responseMimeType ? 0.2 : 0.65, ...(responseMimeType ? { responseMimeType } : {}) } });
  return response.text || '';
}
async function generate(feature: AiFeature, prompt: string | any[], responseMimeType?: string, validateResponse?: (text: string) => void): Promise<AiGenerationResult> {
  const config = await getAiRuntimeConfig(adminDb);
  if (config.source !== 'managed') throw new Error('AI routing is not configured');
  const route = config.routes[feature];
  if (!route || route.mode === 'disabled' || route.mode === 'local-only') throw new Error('AI generation disabled');
  let lastError: unknown;
  for (const target of route.chain) {
    let stage: 'credential' | 'provider' | 'validation' = 'credential';
    try {
      const apiKey = await managedKey(target);
      if (!apiKey) throw new AiTargetFailure('credential_missing');
      stage = 'provider';
      const text = await invoke(target, apiKey, prompt, responseMimeType, openRouterDataCollection(route));
      if (!text) throw new AiTargetFailure('empty_response');
      stage = 'validation';
      validateResponse?.(text);
      return { text, providerId: target.providerId, modelId: target.modelId, configRevision: config.revision };
    } catch (error) {
      lastError = error;
      const status = providerStatus(error);
      // Only fixed identifiers and categories: never include provider error text, prompts, responses, or keys.
      console.warn('[AI target failed]', {
        feature, providerId: target.providerId, modelId: target.modelId,
        secretId: target.secretId ?? null, category: targetFailureCategory(error, stage, status), status,
      });
    }
  }
  throw publicProviderError(lastError);
}
/** Thrown by `testAiSecret` for a key that cannot be tested at all (the route turns it into 404 / 409). */
export class AiSecretTestError extends Error {
  constructor(message: string, readonly status: 404 | 409) { super(message); }
}
export type AiSecretTestResult = { ok: boolean; latencyMs: number; providerId: SupportedProviderId; modelId: string; error?: string };

const TEST_PROMPT = 'Reply with the single word OK.';
const TEST_TIMEOUT_MS = 15_000;
class AiTestTimeout extends Error {}
// Plain-language reasons. Provider error text is never shown: it can echo the key or request.
const TEST_FAILURE_MESSAGES: Partial<Record<TargetFailureCategory, string>> = {
  provider_auth: 'The provider rejected this key. Check that it is correct and still active.',
  provider_rate_limit: 'The provider is rate limiting this key right now. Try again in a few minutes.',
  provider_rejected: 'The provider rejected the test request. Check that the model name is valid for this key.',
  provider_unavailable: 'The provider is unavailable at the moment. Try again later.',
  empty_response: 'The provider answered with an empty reply.',
};

/**
 * Sends one tiny request ("Reply with the single word OK.") with a saved key, to check
 * that it works. An inactive key can be tested; a retired or unknown one cannot.
 * OpenRouter is asked not to let providers collect the request. Never returns key material.
 */
export async function testAiSecret(secretId: string, options: { modelId?: string } = {}): Promise<AiSecretTestResult> {
  const snapshot = await adminDb.collection('_ai_secrets').doc(secretId).get();
  if (!snapshot.exists) throw new AiSecretTestError('Credential was not found.', 404);
  const secret = snapshot.data() as StoredAiSecret;
  if (secret.state === 'retired') throw new AiSecretTestError('Retired credentials cannot be tested.', 409);
  const provider = SUPPORTED_PROVIDERS[secret.providerId];
  if (!provider) throw new AiSecretTestError('This credential uses an unsupported provider.', 409);

  const modelId = options.modelId ?? secret.modelId ?? provider.models[0];
  const startedAt = Date.now();
  const finish = (ok: boolean, error?: string): AiSecretTestResult => ({
    ok, latencyMs: Date.now() - startedAt, providerId: secret.providerId, modelId, ...(error ? { error } : {}),
  });

  let apiKey: string;
  try {
    apiKey = decryptSecret(secret, { secretId, providerId: secret.providerId });
  } catch {
    return finish(false, 'The saved key could not be read. Save it again.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const text = await Promise.race([
      invoke({ providerId: secret.providerId, modelId, secretId }, apiKey, TEST_PROMPT, undefined, 'deny'),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new AiTestTimeout()), TEST_TIMEOUT_MS); }),
    ]);
    if (!text?.trim()) return finish(false, TEST_FAILURE_MESSAGES.empty_response);
    return finish(true);
  } catch (error) {
    if (error instanceof AiTestTimeout) return finish(false, 'The provider did not answer within 15 seconds (timed out).');
    const status = providerStatus(error);
    const category = targetFailureCategory(error, 'provider', status);
    // Only fixed identifiers and categories, as in generate().
    console.warn('[AI key test failed]', { providerId: secret.providerId, modelId, secretId, category, status });
    return finish(false, TEST_FAILURE_MESSAGES[category] ?? 'The test request failed.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getAiConfigRevision() { return (await getAiRuntimeConfig(adminDb)).revision; }
export const generateFastResponseWithMetadata = (prompt: string) => generate('whatif', prompt);
export const generateDeepInsightWithMetadata = (prompt: string) => generate('insights', prompt);
export const generateForecastResponseWithMetadata = (prompt: string) => generate('forecast', prompt);
export const generateMultimodalGeminiContentWithMetadata = (contents: any[], responseMimeType?: string) => generate('extract', contents, responseMimeType);
export async function generateFastResponse(prompt: string) { return (await generateFastResponseWithMetadata(prompt)).text; }
export async function generateDeepInsight(prompt: string) { return (await generateDeepInsightWithMetadata(prompt)).text; }
export async function generateGeminiContent(prompt: string) { return (await generateForecastResponseWithMetadata(prompt)).text; }
export async function generateMultimodalGeminiContent(contents: any[], responseMimeType?: string) { return (await generateMultimodalGeminiContentWithMetadata(contents, responseMimeType)).text; }
function parseJson<T>(text: string, label: string): T { const cleaned = text.replace(/```json|```/g, '').trim(); const parsed = safeParseJSON<T>(cleaned, label); if (parsed.ok) return parsed.value; const extracted = extractJsonObjectAndParse<T>(cleaned, `${label}-extract`); if (extracted.ok) return extracted.value; throw new Error('AI returned invalid JSON'); }
export async function generateGeminiJSON<T>(prompt: string): Promise<T> { return parseJson<T>(await generateGeminiContent(prompt), 'gemini-json'); }
export async function generateDeepInsightJSON<T>(prompt: string): Promise<T> { return parseJson<T>(await generateDeepInsight(prompt), 'insight-json'); }
export async function generateDeepInsightJSONWithMetadata<T>(prompt: string): Promise<{ data: T; provenance: Omit<AiGenerationResult, 'text'> }> {
  const result = await generate('insights', prompt, undefined, (text) => { parseJson<T>(text, 'insight-json'); });
  const { text, ...provenance } = result;
  return { data: parseJson<T>(text, 'insight-json'), provenance };
}
