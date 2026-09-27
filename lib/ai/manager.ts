import 'server-only';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { adminDb } from '@/lib/firebase/admin';
import { decryptSecret, type SupportedProviderId } from '@/lib/ai/secrets';
import { getAiRuntimeConfig, type AiFeature, type AiRouteTarget, type StoredAiSecret } from '@/lib/ai/runtime-config';
import { safeParseJSON, extractJsonObjectAndParse } from '@/lib/utils/safeParseJSON';

export type AiGenerationResult = { text: string; providerId: SupportedProviderId; modelId: string; configRevision: number };
const publicProviderError = (error: any) => [400, 401, 403].includes(Number(error?.status ?? error?.response?.status)) ? new Error('AI provider authentication failed') : new Error('AI provider unavailable');

async function managedKey(target: AiRouteTarget) {
  if (!target.secretId) throw new Error('AI provider unavailable');
  const snapshot = await adminDb.collection('_ai_secrets').doc(target.secretId).get();
  if (!snapshot.exists) throw new Error('AI provider unavailable');
  const secret = snapshot.data() as StoredAiSecret;
  if (secret.state !== 'active' || secret.providerId !== target.providerId) throw new Error('AI provider unavailable');
  return decryptSecret(secret, { secretId: target.secretId, providerId: target.providerId });
}
async function invoke(target: AiRouteTarget, apiKey: string, prompt: string | any[], responseMimeType?: string): Promise<string> {
  if (target.providerId === 'groq') {
    const result = await new Groq({ apiKey }).chat.completions.create({ messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }], model: target.modelId, temperature: 0.7, max_tokens: 1024 });
    return result.choices[0]?.message?.content || '';
  }
  if (target.providerId === 'openrouter') {
    const result = await new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey }).chat.completions.create({ messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }], model: target.modelId, temperature: 0.65, max_tokens: 1024 });
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
    try {
      const apiKey = await managedKey(target);
      if (!apiKey) throw new Error('AI provider unavailable');
      const text = await invoke(target, apiKey, prompt, responseMimeType);
      if (!text) throw new Error('AI provider unavailable');
      validateResponse?.(text);
      return { text, providerId: target.providerId, modelId: target.modelId, configRevision: config.revision };
    } catch (error) { lastError = error; }
  }
  throw publicProviderError(lastError);
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
