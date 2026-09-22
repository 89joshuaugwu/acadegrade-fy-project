import 'server-only';

import type { EncryptedSecret, SupportedProviderId } from '@/lib/ai/secrets';

export type AiFeature = 'insights' | 'forecast' | 'whatif' | 'extract';
export type AiMode = 'disabled' | 'local-only' | 'single' | 'fallback-chain';

type ProviderDefinition = {
  models: readonly string[];
  capabilities: readonly ('text' | 'multimodal')[];
};

export const SUPPORTED_PROVIDERS: Record<SupportedProviderId, ProviderDefinition> = {
  groq: { models: ['llama-3.3-70b-versatile'], capabilities: ['text'] },
  openrouter: { models: ['openrouter/free', 'google/gemma-4-31b-it:free'], capabilities: ['text'] },
  gemini: { models: ['gemini-3.1-flash-lite'], capabilities: ['text', 'multimodal'] },
};

export type AiRouteTarget = {
  providerId: SupportedProviderId;
  modelId: string;
  secretId?: string;
};

export type AiRoute = { mode: AiMode; chain: AiRouteTarget[] };
export type AiRuntimeConfig = {
  source: 'bootstrap' | 'managed';
  revision: number;
  routes: Partial<Record<AiFeature, AiRoute>>;
};

export type StoredAiSecret = EncryptedSecret & {
  secretId: string;
  providerId: SupportedProviderId;
  state: 'active' | 'inactive' | 'retired';
  updatedAt?: unknown;
};

const FEATURES: AiFeature[] = ['insights', 'forecast', 'whatif', 'extract'];
const MODES: AiMode[] = ['disabled', 'local-only', 'single', 'fallback-chain'];

function isProviderId(value: unknown): value is SupportedProviderId {
  return typeof value === 'string' && value in SUPPORTED_PROVIDERS;
}

function parseRoute(feature: AiFeature, value: unknown, managed: boolean): AiRoute {
  if (!value || typeof value !== 'object') throw new Error(`Missing AI route for ${feature}`);
  const route = value as { mode?: unknown; chain?: unknown };
  if (!MODES.includes(route.mode as AiMode)) throw new Error('Unsupported AI mode');
  if (!Array.isArray(route.chain)) throw new Error('AI route chain must be an array');
  const mode = route.mode as AiMode;
  if ((mode === 'disabled' || mode === 'local-only') && route.chain.length !== 0) throw new Error('Local AI route must not have providers');
  if (mode === 'single' && route.chain.length !== 1) throw new Error('Single AI route requires one provider');
  if (mode === 'fallback-chain' && route.chain.length < 2) throw new Error('Fallback AI route requires at least two providers');

  const requiredCapability = feature === 'extract' ? 'multimodal' : 'text';
  const chain = route.chain.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid AI route target');
    const target = candidate as { providerId?: unknown; modelId?: unknown; secretId?: unknown };
    if (!isProviderId(target.providerId)) throw new Error('Unsupported AI provider');
    if (typeof target.modelId !== 'string' || !SUPPORTED_PROVIDERS[target.providerId].models.includes(target.modelId)) {
      throw new Error('Unsupported AI model');
    }
    if (!SUPPORTED_PROVIDERS[target.providerId].capabilities.includes(requiredCapability)) {
      throw new Error(`AI provider does not support ${requiredCapability}`);
    }
    if (managed && (typeof target.secretId !== 'string' || !target.secretId.trim())) {
      throw new Error('Managed AI route requires an active secret');
    }
    return { providerId: target.providerId, modelId: target.modelId, ...(typeof target.secretId === 'string' ? { secretId: target.secretId } : {}) };
  });
  return { mode, chain };
}

export function parseAiRuntimeConfig(value: unknown): AiRuntimeConfig {
  if (!value || typeof value !== 'object') throw new Error('Invalid AI runtime config');
  const input = value as { source?: unknown; revision?: unknown; routes?: unknown };
  if (input.source !== 'bootstrap' && input.source !== 'managed') throw new Error('Invalid AI runtime source');
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0) throw new Error('Invalid AI runtime revision');
  if (!input.routes || typeof input.routes !== 'object') throw new Error('Invalid AI routes');
  const routesInput = input.routes as Record<string, unknown>;
  const routes: Partial<Record<AiFeature, AiRoute>> = {};
  for (const feature of FEATURES) {
    if (routesInput[feature] !== undefined) routes[feature] = parseRoute(feature, routesInput[feature], input.source === 'managed');
  }
  return { source: input.source, revision: input.revision as number, routes };
}

export function createManagedRuntimeConfig(value: unknown): AiRuntimeConfig {
  const config = parseAiRuntimeConfig(value);
  if (config.source !== 'managed') throw new Error('Managed configuration must use managed source');
  for (const feature of FEATURES) {
    if (!config.routes[feature]) throw new Error(`Missing AI route for ${feature}`);
  }
  return config;
}

export function createBootstrapRuntimeConfig(): AiRuntimeConfig {
  return {
    source: 'bootstrap',
    revision: 0,
    routes: {
      insights: { mode: 'fallback-chain', chain: [
        { providerId: 'openrouter', modelId: 'openrouter/free' },
        { providerId: 'openrouter', modelId: 'google/gemma-4-31b-it:free' },
        { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' },
      ] },
      forecast: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' }] },
      whatif: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile' }] },
      extract: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' }] },
    },
  };
}

export function toMaskedAdminProjection(secret: StoredAiSecret) {
  return {
    secretId: secret.secretId,
    providerId: secret.providerId,
    state: secret.state,
    version: secret.version,
  };
}

type FirestoreLike = { collection(name: string): { doc(id: string): { get(): Promise<{ exists: boolean; data(): unknown }> } } };

export async function getAiRuntimeConfig(db: FirestoreLike): Promise<AiRuntimeConfig> {
  const snapshot = await db.collection('_ai_runtime').doc('config').get();
  if (!snapshot.exists) return createBootstrapRuntimeConfig();
  const config = parseAiRuntimeConfig(snapshot.data());
  return config.source === 'bootstrap' ? createBootstrapRuntimeConfig() : createManagedRuntimeConfig(config);
}
