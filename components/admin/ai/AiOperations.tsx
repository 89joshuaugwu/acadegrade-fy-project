'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, CircleAlert, KeyRound, Route, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Input, Skeleton } from '@/components/ui';
import { ErrorState, PageHeader } from '@/components/shared';
import {
  getAdminAiSnapshot,
  saveAdminAiRouting,
  setAdminAiSecretState,
  upsertAdminAiSecret,
  type AdminAiConfig,
  type AdminAiFeature,
  type AdminAiMode,
  type AdminAiProviderId,
  type AdminAiRoute,
  type AdminAiRouteTarget,
  type AdminAiSecretProjection,
  type AdminAiSnapshot,
} from './client';

const PROVIDER_ORDER: AdminAiProviderId[] = ['groq', 'openrouter', 'gemini'];
const FEATURES: Array<{ id: AdminAiFeature; label: string; capability: 'text' | 'multimodal' }> = [
  { id: 'insights', label: 'Academic insights', capability: 'text' },
  { id: 'forecast', label: 'Forecast', capability: 'text' },
  { id: 'whatif', label: 'What-if planner', capability: 'text' },
  { id: 'extract', label: 'Result extraction (OCR)', capability: 'multimodal' },
];
const PROVIDER_LABELS: Record<AdminAiProviderId, string> = { groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini' };
const MODE_LABELS: Record<AdminAiMode, string> = {
  disabled: 'Disabled',
  'local-only': 'Local only',
  single: 'Single provider',
  'fallback-chain': 'Fallback chain',
};

function maskSuffix(value: string) { return `••••${value.slice(-4)}`; }
function defaultTarget(feature: AdminAiFeature): AdminAiRouteTarget {
  return feature === 'extract'
    ? { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-primary' }
    : { providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' };
}
function createDraftRoutes(config: AdminAiConfig | null): Record<AdminAiFeature, AdminAiRoute> {
  return FEATURES.reduce((routes, feature) => {
    const existing = config?.routes[feature.id];
    routes[feature.id] = existing ? { mode: existing.mode, chain: existing.chain.map((target) => ({ ...target })) } : { mode: 'disabled', chain: [] };
    return routes;
  }, {} as Record<AdminAiFeature, AdminAiRoute>);
}

export function AiOperations() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<AdminAiSnapshot | null>(null);
  const [routes, setRoutes] = useState<Record<AdminAiFeature, AdminAiRoute>>(() => createDraftRoutes(null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<AdminAiProviderId | null>(null);
  const [savingRoutes, setSavingRoutes] = useState(false);
  const [changingSecret, setChangingSecret] = useState<string | null>(null);
  const [savedSuffixes, setSavedSuffixes] = useState<Partial<Record<AdminAiProviderId, string>>>({});

  const loadSnapshot = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const next = await getAdminAiSnapshot(await user.getIdToken());
      setSnapshot(next); setRoutes(createDraftRoutes(next.config));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load AI provider metadata.');
    } finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);

  const saveSecret = async (providerId: AdminAiProviderId, value: string) => {
    if (!user) throw new Error('Your administrator session is unavailable.');
    setSavingProvider(providerId);
    try {
      const secret = await upsertAdminAiSecret(await user.getIdToken(), providerId, value);
      setSavedSuffixes((current) => ({ ...current, [providerId]: maskSuffix(value) }));
      setSnapshot((current) => current ? { ...current, secrets: [...current.secrets.filter((item) => item.secretId !== secret.secretId), secret] } : current);
    } finally { setSavingProvider(null); }
  };
  const updateSecretState = async (secret: AdminAiSecretProjection) => {
    if (!user) return;
    const nextState = secret.state === 'active' ? 'inactive' : 'active';
    setChangingSecret(secret.secretId);
    try {
      await setAdminAiSecretState(await user.getIdToken(), secret.secretId, nextState);
      setSnapshot((current) => current ? { ...current, secrets: current.secrets.map((item) => item.secretId === secret.secretId ? { ...item, state: nextState } : item) } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update credential state.');
    } finally { setChangingSecret(null); }
  };
  const saveRoutes = async () => {
    if (!user || !snapshot) return;
    setSavingRoutes(true); setError(null);
    try {
      const config = await saveAdminAiRouting(await user.getIdToken(), snapshot.config?.revision ?? 0, routes);
      setSnapshot((current) => current ? { ...current, config } : current); setRoutes(createDraftRoutes(config));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save AI routing.');
    } finally { setSavingRoutes(false); }
  };
  const runtimeLabel = snapshot?.config?.source === 'managed' ? `Managed routing · revision ${snapshot.config.revision}` : 'Bootstrap environment routing';

  return <div className="space-y-8">
    <PageHeader title="AI Operations" eyebrow="Provider control plane" description="Manage encrypted credentials and the approved models that power each AcadeGrade AI capability." seam="none" />
    {error && <ErrorState title="AI Operations needs attention" description={error} onRetry={() => void loadSnapshot()} />}
    {loading && <AiOperationsSkeleton />}
    {snapshot && <>
      <section aria-labelledby="ai-routing-heading" className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-[var(--acade-primary)]"><Route className="size-5" aria-hidden="true" /><p className="text-sm font-semibold">Runtime routing</p></div><h2 id="ai-routing-heading" className="mt-1 font-[family-name:var(--font-bricolage)] text-2xl font-bold text-[var(--acade-text)]">Choose how each AI feature runs</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">{runtimeLabel}. Saving applies the managed revision atomically.</p></div><Button onClick={() => void saveRoutes()} loading={savingRoutes} loadingLabel="Applying routing…"><ShieldCheck className="size-4" aria-hidden="true" /> Save and activate routing</Button></div>
        <div className="grid gap-4 xl:grid-cols-2">{FEATURES.map((feature) => <RouteEditor key={feature.id} feature={feature} route={routes[feature.id]} providers={snapshot.providers} secrets={snapshot.secrets} onChange={(route) => setRoutes((current) => ({ ...current, [feature.id]: route }))} />)}</div>
      </section>
      <section aria-labelledby="ai-providers-heading"><div className="mb-4 flex items-center gap-3"><BrainCircuit className="size-5 text-[var(--acade-primary)]" aria-hidden="true" /><div><h2 id="ai-providers-heading" className="font-[family-name:var(--font-bricolage)] text-xl font-bold text-[var(--acade-text)]">Provider credentials</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Keys are encrypted before storage and are never reloaded into this page.</p></div></div><div className="grid gap-5 xl:grid-cols-3">{PROVIDER_ORDER.map((providerId) => <ProviderCard key={providerId} providerId={providerId} provider={snapshot.providers[providerId]} secret={snapshot.secrets.find((item) => item.secretId === `${providerId}-primary`)} savedSuffix={savedSuffixes[providerId]} saving={savingProvider === providerId} changingState={changingSecret === `${providerId}-primary`} onSave={saveSecret} onChangeState={updateSecretState} />)}</div></section>
    </>}
  </div>;
}

function RouteEditor({ feature, route, providers, secrets, onChange }: { feature: (typeof FEATURES)[number]; route: AdminAiRoute; providers: AdminAiSnapshot['providers']; secrets: AdminAiSecretProjection[]; onChange: (route: AdminAiRoute) => void }) {
  const targetCount = route.mode === 'fallback-chain' ? 2 : route.mode === 'single' ? 1 : 0;
  const eligibleProviders = PROVIDER_ORDER.filter((providerId) => providers[providerId].capabilities.includes(feature.capability));
  const targets = Array.from({ length: targetCount }, (_, index) => route.chain[index] ?? defaultTarget(feature.id));
  const setMode = (mode: AdminAiMode) => onChange({ mode, chain: mode === 'fallback-chain' ? [route.chain[0] ?? defaultTarget(feature.id), route.chain[1] ?? defaultTarget(feature.id)] : mode === 'single' ? [route.chain[0] ?? defaultTarget(feature.id)] : [] });
  const updateTarget = (index: number, target: AdminAiRouteTarget) => onChange({ ...route, chain: targets.map((item, itemIndex) => itemIndex === index ? target : item) });
  return <Card variant="default" padding="lg" className="space-y-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">{feature.label}</h3><p className="mt-1 text-xs text-[var(--acade-text-muted)]">Requires {feature.capability} capability.</p></div><CircleAlert className="mt-1 size-4 text-[var(--acade-text-faint)]" aria-hidden="true" /></div><label className="block text-sm font-medium text-[var(--acade-text)]">Execution mode<select aria-label={`${feature.label} execution mode`} value={route.mode} onChange={(event) => setMode(event.target.value as AdminAiMode)} className="mt-2 min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]">{Object.entries(MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{targets.map((target, index) => <RouteTargetEditor key={index} label={targetCount === 2 ? `Priority ${index + 1}` : 'Provider target'} target={target} providers={providers} providerIds={eligibleProviders} secrets={secrets} onChange={(next) => updateTarget(index, next)} />)}{route.mode === 'fallback-chain' && <p className="rounded-lg bg-[var(--acade-overlay)] px-3 py-2 text-xs leading-5 text-[var(--acade-text-muted)]">The first provider is tried first; the second is used only for a retryable failure.</p>}</Card>;
}

function RouteTargetEditor({ label, target, providers, providerIds, secrets, onChange }: { label: string; target: AdminAiRouteTarget; providers: AdminAiSnapshot['providers']; providerIds: AdminAiProviderId[]; secrets: AdminAiSecretProjection[]; onChange: (target: AdminAiRouteTarget) => void }) {
  const models = providers[target.providerId].models;
  const activeSecrets = secrets.filter((secret) => secret.providerId === target.providerId && secret.state === 'active');
  const selectedSecret = activeSecrets.some((secret) => secret.secretId === target.secretId) ? target.secretId : '';
  return <fieldset className="grid gap-3 rounded-xl border border-[var(--acade-border-subtle)] bg-[var(--acade-overlay)]/40 p-3"><legend className="px-1 text-xs font-semibold text-[var(--acade-text-muted)]">{label}</legend><label className="text-xs font-medium text-[var(--acade-text-muted)]">Provider<select aria-label={`${label} provider`} value={target.providerId} onChange={(event) => { const providerId = event.target.value as AdminAiProviderId; onChange({ providerId, modelId: providers[providerId].models[0], secretId: '' }); }} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--acade-border)] bg-[var(--acade-surface)] px-2 text-sm text-[var(--acade-text)]">{providerIds.map((providerId) => <option key={providerId} value={providerId}>{PROVIDER_LABELS[providerId]}</option>)}</select></label><label className="text-xs font-medium text-[var(--acade-text-muted)]">Model<select aria-label={`${label} model`} value={models.includes(target.modelId) ? target.modelId : models[0]} onChange={(event) => onChange({ ...target, modelId: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--acade-border)] bg-[var(--acade-surface)] px-2 text-sm text-[var(--acade-text)]">{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label><label className="text-xs font-medium text-[var(--acade-text-muted)]">Active credential<select aria-label={`${label} credential`} value={selectedSecret} onChange={(event) => onChange({ ...target, secretId: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--acade-border)] bg-[var(--acade-surface)] px-2 text-sm text-[var(--acade-text)]"><option value="">Select an active credential</option>{activeSecrets.map((secret) => <option key={secret.secretId} value={secret.secretId}>{secret.secretId} · active</option>)}</select></label></fieldset>;
}

function ProviderCard({ providerId, provider, secret, savedSuffix, saving, changingState, onSave, onChangeState }: { providerId: AdminAiProviderId; provider: AdminAiSnapshot['providers'][AdminAiProviderId]; secret?: AdminAiSecretProjection; savedSuffix?: string; saving: boolean; changingState: boolean; onSave: (providerId: AdminAiProviderId, value: string) => Promise<void>; onChangeState: (secret: AdminAiSecretProjection) => Promise<void> }) {
  const [value, setValue] = useState(''); const [formError, setFormError] = useState<string | null>(null); const label = PROVIDER_LABELS[providerId]; const stateLabel = secret ? `${secret.state[0].toUpperCase()}${secret.state.slice(1)}` : 'Not configured';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const key = value.trim(); if (!key) { setFormError('Enter a new key before saving.'); return; } setFormError(null); try { await onSave(providerId, key); setValue(''); } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'The key could not be saved.'); } };
  return <Card variant="default" padding="lg" className="flex h-full flex-col"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Zap className="size-4 text-[var(--acade-gold)]" aria-hidden="true" /><h3 className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">{label}</h3></div><p className="mt-1 text-xs text-[var(--acade-text-muted)]">Credential: <span className="font-[family-name:var(--font-geist-mono)]">{providerId}-primary</span></p></div><span className="rounded-full bg-[var(--acade-overlay)] px-2.5 py-1 text-xs font-semibold text-[var(--acade-text-muted)]">{stateLabel}</span></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--acade-text-faint)]">Approved models</p><ul className="mt-2 space-y-2" aria-label={`${label} approved models`}>{provider.models.map((model) => <li key={model} className="break-all rounded-lg bg-[var(--acade-overlay)]/55 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text)]">{model}</li>)}</ul></div>{savedSuffix && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-[var(--acade-success)]"><ShieldCheck className="size-4" aria-hidden="true" /> Saved as {savedSuffix}</p>}<form className="mt-5 space-y-3 border-t border-[var(--acade-border-subtle)] pt-5" onSubmit={submit}><Input id={`${providerId}-api-key`} label={`${label} API key`} type="password" autoComplete="new-password" value={value} onChange={(event) => setValue(event.target.value)} error={formError ?? undefined} hint="Entered only to encrypt and replace this credential. It is never reloaded into this form." /><Button type="submit" loading={saving} loadingLabel="Saving encrypted key…" fullWidth><KeyRound className="size-4" aria-hidden="true" />{secret ? `Rotate ${label} key` : `Save ${label} key`}</Button></form>{secret && secret.state !== 'retired' && <Button variant="outline" size="sm" className="mt-3" loading={changingState} onClick={() => void onChangeState(secret)}>{secret.state === 'active' ? `Disable ${label}` : `Activate ${label}`}</Button>}</Card>;
}

function AiOperationsSkeleton() { return <div className="grid gap-5 xl:grid-cols-3" aria-busy="true" aria-label="Loading AI provider metadata">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[420px] rounded-[var(--radius-surface)]" />)}</div>; }
