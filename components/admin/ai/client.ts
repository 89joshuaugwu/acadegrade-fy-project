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
}

export type AdminAiFeature = 'insights' | 'forecast' | 'whatif' | 'extract';
export type AdminAiMode = 'disabled' | 'local-only' | 'single' | 'fallback-chain';
export interface AdminAiRouteTarget {
  providerId: AdminAiProviderId;
  modelId: string;
  secretId?: string;
}
export interface AdminAiRoute {
  mode: AdminAiMode;
  chain: AdminAiRouteTarget[];
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
}

export class AdminAiClientError extends Error {}

async function getErrorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : 'AI Operations is temporarily unavailable.';
}

export async function getAdminAiSnapshot(token: string): Promise<AdminAiSnapshot> {
  const response = await fetch('/api/admin/ai', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new AdminAiClientError(await getErrorMessage(response));

  const body = await response.json() as Partial<AdminAiSnapshot>;
  if (!body.providers) throw new AdminAiClientError('AI provider metadata is unavailable.');
  return { providers: body.providers, config: body.config ?? null, secrets: body.secrets ?? [] };
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
