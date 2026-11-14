'use client';

export type AdminAiProviderId = 'groq' | 'openrouter' | 'gemini';

export interface AdminAiProvider {
  models: readonly string[];
  capabilities: readonly ('text' | 'multimodal')[];
}

export type AdminAiProviders = Record<AdminAiProviderId, AdminAiProvider>;

export interface AdminAiSecretProjection {
  secretId: string;
  providerId: AdminAiProviderId;
  state: 'active' | 'inactive' | 'retired';
  version: number;
  label?: string;
  modelId?: string;
  priority?: number;
  purpose?: 'general' | 'ocr' | 'fallback';
  /** The last "Test key" result. Absent until the key has been tested. */
  lastTest?: AdminAiKeyTest;
}

export interface AdminAiKeyTest {
  ok: boolean;
  /** ISO time of the test, when known. */
  at: string | null;
  latencyMs: number;
  error?: string;
}

export type AdminAiFeature = 'insights' | 'forecast' | 'whatif' | 'extract';
export type AdminAiMode = 'disabled' | 'local-only' | 'single' | 'fallback-chain';
export interface AdminAiRouteTarget {
  providerId: AdminAiProviderId;
  modelId: string;
  secretId?: string;
}
export type AdminAiDataCollection = 'deny' | 'allow';
export interface AdminAiRoute {
  mode: AdminAiMode;
  chain: AdminAiRouteTarget[];
  /** OpenRouter `provider.data_collection`. Absent means 'deny' on the server. */
  dataCollection?: AdminAiDataCollection;
}
export interface AdminAiConfig {
  source: 'bootstrap' | 'managed';
  revision: number;
  providerModels?: Record<AdminAiProviderId, string[]>;
  routes: Partial<Record<AdminAiFeature, AdminAiRoute>>;
}
export interface AdminAiSnapshot {
  providers: AdminAiProviders;
  config: AdminAiConfig | null;
  secrets: AdminAiSecretProjection[];
  /**
   * Gemini billing state, when the server reports it ('confirmed' or not).
   * Absent on servers that do not track it yet.
   */
  geminiBilling?: string;
}

export type AdminAiGeminiBilling = 'confirmed' | 'unconfirmed';

export class AdminAiClientError extends Error {}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : 'AI providers are temporarily unavailable.';
}

export async function getAdminAiSnapshot(token: string): Promise<AdminAiSnapshot> {
  const response = await fetch('/api/admin/ai', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));

  const body = await response.json() as Partial<AdminAiSnapshot>;
  if (!body.providers) throw new AdminAiClientError('AI provider metadata is unavailable.');
  return {
    providers: body.providers,
    config: body.config ?? null,
    secrets: body.secrets ?? [],
    ...(typeof body.geminiBilling === 'string' ? { geminiBilling: body.geminiBilling } : {}),
  };
}

export async function upsertAdminAiSecret(
  token: string,
  providerId: AdminAiProviderId,
  secretId: string,
  value: string,
  details?: { label: string; modelId: string; priority: number; purpose: 'general' | 'ocr' | 'fallback' },
): Promise<AdminAiSecretProjection> {
  const response = await fetch('/api/admin/ai', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'upsert-secret',
      providerId,
      secretId,
      value,
      ...details,
    }),
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));

  const body = await response.json() as { secret?: AdminAiSecretProjection };
  if (!body.secret || body.secret.providerId !== providerId) {
    throw new AdminAiClientError('AI key save did not return a valid provider record.');
  }
  return body.secret;
}

export async function saveAdminAiRouting(
  token: string,
  expectedRevision: number,
  routing: Record<AdminAiFeature, AdminAiRoute>,
  providerModels: Record<AdminAiProviderId, string[]>,
): Promise<AdminAiConfig> {
  const response = await fetch('/api/admin/ai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'save-routing', expectedRevision, routing, providerModels }),
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));
  const body = await response.json() as { config?: AdminAiConfig };
  if (!body.config || body.config.source !== 'managed') {
    throw new AdminAiClientError('AI routing save did not return a managed configuration.');
  }
  return body.config;
}

export async function setAdminAiGeminiBilling(token: string, geminiBilling: AdminAiGeminiBilling): Promise<AdminAiGeminiBilling> {
  const response = await fetch('/api/admin/ai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'set-gemini-billing', geminiBilling }),
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));
  const body = await response.json().catch(() => null) as { geminiBilling?: unknown } | null;
  return body?.geminiBilling === 'confirmed' || body?.geminiBilling === 'unconfirmed' ? body.geminiBilling : geminiBilling;
}

/** Sends one tiny request with a saved key. A failed test still resolves (ok: false); only a failed call throws. */
export async function testAdminAiSecret(token: string, secretId: string): Promise<AdminAiKeyTest & { providerId: string; modelId: string }> {
  const response = await fetch('/api/admin/ai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'test-secret', secretId }),
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));
  const body = await response.json().catch(() => null) as { ok?: unknown; latencyMs?: unknown; testedAt?: unknown; error?: unknown; providerId?: unknown; modelId?: unknown } | null;
  if (!body || typeof body.ok !== 'boolean') throw new AdminAiClientError('The key test returned an unexpected answer.');
  return {
    ok: body.ok,
    at: typeof body.testedAt === 'string' ? body.testedAt : null,
    latencyMs: Number(body.latencyMs) || 0,
    ...(typeof body.error === 'string' && body.error ? { error: body.error } : {}),
    providerId: String(body.providerId ?? ''),
    modelId: String(body.modelId ?? ''),
  };
}

export async function setAdminAiSecretState(
  token: string,
  secretId: string,
  state: 'active' | 'inactive' | 'retired',
) {
  const response = await fetch('/api/admin/ai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'set-secret-state', secretId, state }),
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));
}
