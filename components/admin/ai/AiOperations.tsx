'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, KeyRound, Plus, Route, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Input, Skeleton } from '@/components/ui';
import { ErrorState, PageHeader } from '@/components/shared';
import {
  getAdminAiSnapshot, saveAdminAiRouting, setAdminAiSecretState, upsertAdminAiSecret,
  type AdminAiConfig, type AdminAiFeature, type AdminAiMode, type AdminAiProviderId,
  type AdminAiProviders, type AdminAiRoute, type AdminAiRouteTarget,
  type AdminAiSecretProjection, type AdminAiSnapshot,
} from './client';

const PROVIDERS: AdminAiProviderId[] = ['groq', 'openrouter', 'gemini'];
const LABELS: Record<AdminAiProviderId, string> = { groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini' };
const FEATURES: Array<{ id: AdminAiFeature; label: string; capability: 'text' | 'multimodal' }> = [
  { id: 'insights', label: 'Academic insights', capability: 'text' },
  { id: 'forecast', label: 'Forecast', capability: 'text' },
  { id: 'whatif', label: 'What-if planner', capability: 'text' },
  { id: 'extract', label: 'Result extraction (OCR)', capability: 'multimodal' },
];
const MODE_HELP: Record<AdminAiMode, string> = {
  disabled: 'No AI request is sent for this feature.',
  'local-only': 'Uses an existing calculation without an AI provider.',
  single: 'Uses one selected provider, model, and credential.',
  'fallback-chain': 'Tries the next target when the first provider is unavailable.',
};
const MODEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,127}$/;
const selectClass = 'mt-1 min-h-11 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]';

function draftRoutes(config: AdminAiConfig | null): Record<AdminAiFeature, AdminAiRoute> {
  return FEATURES.reduce((draft, feature) => {
    const saved = config?.routes[feature.id];
    draft[feature.id] = saved ? { mode: saved.mode, chain: saved.chain.map((target) => ({ ...target })) } : { mode: 'disabled', chain: [] };
    return draft;
  }, {} as Record<AdminAiFeature, AdminAiRoute>);
}

function draftModels(providers: AdminAiProviders): Record<AdminAiProviderId, string[]> {
  return Object.fromEntries(PROVIDERS.map((id) => [id, [...providers[id].models]])) as Record<AdminAiProviderId, string[]>;
}

export function AiOperations() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<AdminAiSnapshot | null>(null);
  const [routes, setRoutes] = useState(() => draftRoutes(null));
  const [models, setModels] = useState<Record<AdminAiProviderId, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const next = await getAdminAiSnapshot(await user.getIdToken());
      setSnapshot(next); setRoutes(draftRoutes(next.config)); setModels(draftModels(next.providers));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load AI settings.');
    } finally { setLoading(false); }
  }, [user?.uid]);
  useEffect(() => { void reload(); }, [reload]);

  const saveKey = async (providerId: AdminAiProviderId, secretId: string, value: string, details: { label: string; modelId: string; priority: number; purpose: 'general' | 'ocr' | 'fallback' }) => {
    if (!user) throw new Error('Administrator session is unavailable.');
    const secret = await upsertAdminAiSecret(await user.getIdToken(), providerId, secretId, value, details);
    setSnapshot((current) => current ? { ...current, secrets: [...current.secrets.filter((item) => item.secretId !== secretId), secret] } : current);
    setModels((current) => current && !current[providerId].includes(details.modelId)
      ? { ...current, [providerId]: [...current[providerId], details.modelId] }
      : current);
    setNotice(`${secretId} saved. Select it in a route to use it.`);
  };

  const changeKeyState = async (secret: AdminAiSecretProjection) => {
    if (!user) return;
    const state = secret.state === 'active' ? 'inactive' : 'active';
    try {
      await setAdminAiSecretState(await user.getIdToken(), secret.secretId, state);
      setSnapshot((current) => current ? { ...current, secrets: current.secrets.map((item) => item.secretId === secret.secretId ? { ...item, state } : item) } : current);
      setNotice(`${secret.secretId} is now ${state}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update credential.'); }
  };

  const save = async () => {
    if (!user || !snapshot || !models) return;
    setError(null); setNotice(null); setSaving(true);
    try {
      for (const id of PROVIDERS) {
        if (!models[id].length || models[id].some((model) => !MODEL_ID.test(model))) throw new Error(`Check the ${LABELS[id]} model names.`);
      }
      for (const feature of FEATURES) {
        for (const target of routes[feature.id].chain) {
          if (!models[target.providerId].includes(target.modelId)) throw new Error(`${feature.label} uses a model missing from its catalog.`);
          if (!snapshot.secrets.some((secret) => secret.secretId === target.secretId && secret.providerId === target.providerId && secret.state === 'active')) {
            throw new Error(`${feature.label} needs an active ${LABELS[target.providerId]} credential.`);
          }
        }
      }
      const config = await saveAdminAiRouting(await user.getIdToken(), snapshot.config?.revision ?? 0, routes, models);
      setSnapshot((current) => current ? { ...current, config } : current);
      setRoutes(draftRoutes(config)); setNotice(`Routing and models saved as revision ${config.revision}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save AI settings.');
    } finally { setSaving(false); }
  };

  return <div className="space-y-7">
    <PageHeader title="AI Operations" eyebrow="Provider control plane" description="Manage the model names, keys, and order used by each AI feature." seam="none" />
    {error && <ErrorState title="AI settings need attention" description={error} onRetry={() => void reload()} />}
    {notice && <p role="status" className="rounded-xl border border-[var(--acade-success)]/30 bg-[var(--acade-success-dim)] px-4 py-3 text-sm text-[var(--acade-text)]">{notice}</p>}
    {loading && <div aria-label="Loading AI settings" aria-busy="true" className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <Skeleton key={item} className="h-72" />)}</div>}
    {snapshot && models && <>
      <section aria-labelledby="routing-title" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-[var(--acade-primary)]"><Route className="size-4" /> Runtime routing</p><h2 id="routing-title" className="mt-1 text-2xl font-bold text-[var(--acade-text)]">Choose how each feature runs</h2><p className="text-sm text-[var(--acade-text-muted)]">{snapshot.config?.source === 'managed' ? `Managed revision ${snapshot.config.revision}` : 'Bootstrap mode: saving activates managed routing.'}</p></div><Button loading={saving} loadingLabel="Saving…" onClick={() => void save()}><ShieldCheck className="size-4" /> Save models and routing</Button></div>
        <div className="grid gap-4 xl:grid-cols-2">{FEATURES.map((feature) => <RouteEditor key={feature.id} feature={feature} route={routes[feature.id]} providers={snapshot.providers} models={models} secrets={snapshot.secrets} onChange={(route) => setRoutes((current) => ({ ...current, [feature.id]: route }))} />)}</div>
      </section>
      <section aria-labelledby="catalog-title" className="space-y-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-[var(--acade-primary)]"><BrainCircuit className="size-4" /> Provider setup</p><h2 id="catalog-title" className="mt-1 text-2xl font-bold text-[var(--acade-text)]">Models and credentials</h2><p className="text-sm text-[var(--acade-text-muted)]">Add provider model IDs here, then choose them in the routes above. Model IDs are checked for format; confirm availability with the provider before activation.</p></div><div className="grid gap-4 xl:grid-cols-3">{PROVIDERS.map((id) => <ProviderEditor key={id} providerId={id} models={models[id]} secrets={snapshot.secrets.filter((secret) => secret.providerId === id)} onModelsChange={(next) => setModels((current) => current ? { ...current, [id]: next } : current)} onSaveKey={saveKey} onStateChange={changeKeyState} />)}</div></section>
    </>}
  </div>;
}

function RouteEditor({ feature, route, providers, models, secrets, onChange }: { feature: (typeof FEATURES)[number]; route: AdminAiRoute; providers: AdminAiProviders; models: Record<AdminAiProviderId, string[]>; secrets: AdminAiSecretProjection[]; onChange: (route: AdminAiRoute) => void }) {
  const eligible = PROVIDERS.filter((id) => providers[id].capabilities.includes(feature.capability));
  const createTarget = (index: number): AdminAiRouteTarget => {
    const providerId: AdminAiProviderId = feature.id === 'extract' || feature.id === 'forecast' || index > 0
      ? 'gemini'
      : feature.id === 'insights' ? 'openrouter' : 'groq';
    return { providerId, modelId: models[providerId][0] ?? '', secretId: '' };
  };
  const setMode = (mode: AdminAiMode) => onChange({
    mode,
    chain: mode === 'single'
      ? [route.chain[0] ?? createTarget(0)]
      : mode === 'fallback-chain'
        ? route.chain.length >= 2 ? route.chain : [route.chain[0] ?? createTarget(0), createTarget(1)]
        : [],
  });
  const moveTarget = (index: number, direction: -1 | 1) => {
    const next = [...route.chain];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange({ ...route, chain: next });
  };
  const useSavedPriorities = () => {
    const providerOrder: AdminAiProviderId[] = feature.id === 'insights'
      ? ['openrouter', 'gemini', 'groq']
      : feature.id === 'whatif' ? ['groq', 'openrouter', 'gemini']
        : ['gemini', 'openrouter', 'groq'];
    const ordered = secrets.filter((secret) => secret.state === 'active'
      && eligible.includes(secret.providerId)
      && (feature.id === 'extract' ? secret.providerId === 'gemini' && (secret.purpose === 'ocr' || !secret.purpose)
        : secret.purpose !== 'ocr'))
      .sort((a, b) => providerOrder.indexOf(a.providerId) - providerOrder.indexOf(b.providerId)
        || (a.priority ?? 99) - (b.priority ?? 99))
      .slice(0, 12)
      .map((secret) => ({ providerId: secret.providerId, modelId: secret.modelId && models[secret.providerId].includes(secret.modelId) ? secret.modelId : models[secret.providerId][0], secretId: secret.secretId }));
    onChange({ mode: ordered.length > 1 ? 'fallback-chain' : ordered.length === 1 ? 'single' : 'disabled', chain: ordered });
  };
  return <Card padding="lg" className="space-y-4">
    <div><h3 className="text-lg font-bold text-[var(--acade-text)]">{feature.label}</h3><p className="text-sm text-[var(--acade-text-muted)]">{feature.capability === 'multimodal' ? 'Image reading requires a multimodal provider.' : 'Text generation'}</p></div>
    <label className="block text-sm font-medium text-[var(--acade-text)]">Execution mode
      <select aria-label={`${feature.label} execution mode`} className={selectClass} value={route.mode} onChange={(event) => setMode(event.target.value as AdminAiMode)}>
        <option value="disabled">Disabled</option>{feature.id === 'whatif' && <option value="local-only">Local calculation only</option>}<option value="single">Single provider</option><option value="fallback-chain">Ordered fallback list</option>
      </select>
    </label>
    <p className="text-xs text-[var(--acade-text-muted)]">{MODE_HELP[route.mode]}</p>
    <Button variant="outline" size="sm" aria-label={`${feature.label}: use saved connection priorities`} onClick={useSavedPriorities}>Use saved connection priorities</Button>
    {route.chain.map((target, index) => {
    const activeSecrets = secrets.filter((secret) => secret.providerId === target.providerId && secret.state === 'active');
    const update = (next: AdminAiRouteTarget) => onChange({ ...route, chain: route.chain.map((item, position) => position === index ? next : item) });
    return <fieldset key={index} className="grid gap-3 rounded-xl border border-[var(--acade-border)] p-3">
      <legend className="px-1 text-xs font-semibold text-[var(--acade-text-muted)]">{route.chain.length > 1 ? `Priority ${index + 1}` : 'Target'}</legend>
      <label className="block text-xs text-[var(--acade-text-muted)]">Provider
        <select aria-label={`${feature.label} priority ${index + 1} provider`} className={selectClass} value={target.providerId} onChange={(event) => { const providerId = event.target.value as AdminAiProviderId; update({ providerId, modelId: models[providerId][0] ?? '', secretId: '' }); }}>{eligible.map((id) => <option key={id} value={id}>{LABELS[id]}</option>)}</select>
      </label>
      <label className="block text-xs text-[var(--acade-text-muted)]">Model
        <select aria-label={`${feature.label} priority ${index + 1} model`} className={selectClass} value={target.modelId} onChange={(event) => update({ ...target, modelId: event.target.value })}>{!models[target.providerId].includes(target.modelId) && <option value={target.modelId}>{target.modelId} (not in catalog)</option>}{models[target.providerId].map((model) => <option key={model} value={model}>{model}</option>)}</select>
      </label>
      <label className="block text-xs text-[var(--acade-text-muted)]">Credential
        <select aria-label={`${feature.label} priority ${index + 1} credential`} className={selectClass} value={target.secretId ?? ''} onChange={(event) => update({ ...target, secretId: event.target.value })}><option value="">Select an active key</option>{activeSecrets.map((secret) => <option key={secret.secretId} value={secret.secretId}>{secret.secretId}</option>)}</select>
      </label>
      {route.mode === 'fallback-chain' && <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${feature.label} priority ${index + 1} earlier`} onClick={() => moveTarget(index, -1)}>Move up</Button>
        <Button variant="outline" size="sm" disabled={index === route.chain.length - 1} aria-label={`Move ${feature.label} priority ${index + 1} later`} onClick={() => moveTarget(index, 1)}>Move down</Button>
        <Button variant="ghost" size="sm" disabled={route.chain.length <= 2} aria-label={`Remove ${feature.label} priority ${index + 1}`} onClick={() => onChange({ ...route, chain: route.chain.filter((_, position) => position !== index) })}>Remove</Button>
      </div>}
    </fieldset>;
  })}
  {route.mode === 'fallback-chain' && <Button variant="outline" disabled={route.chain.length >= 12} onClick={() => onChange({ ...route, chain: [...route.chain, createTarget(route.chain.length)] })}><Plus className="size-4" /> Add fallback target</Button>}
  </Card>;
}

function ProviderEditor({ providerId, models, secrets, onModelsChange, onSaveKey, onStateChange }: { providerId: AdminAiProviderId; models: string[]; secrets: AdminAiSecretProjection[]; onModelsChange: (models: string[]) => void; onSaveKey: (providerId: AdminAiProviderId, secretId: string, value: string, details: { label: string; modelId: string; priority: number; purpose: 'general' | 'ocr' | 'fallback' }) => Promise<void>; onStateChange: (secret: AdminAiSecretProjection) => Promise<void> }) {
  const [newModel, setNewModel] = useState('');
  const [slot, setSlot] = useState(providerId === 'gemini' ? 'ocr' : 'primary');
  const [label, setLabel] = useState(providerId === 'gemini' ? 'Gemini OCR' : `${LABELS[providerId]} primary`);
  const [connectionModel, setConnectionModel] = useState(models[0] ?? '');
  const [priority, setPriority] = useState('1');
  const [purpose, setPurpose] = useState<'general' | 'ocr' | 'fallback'>(providerId === 'gemini' ? 'ocr' : 'general');
  const [keyValue, setKeyValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const secretId = `${providerId}-${slot.trim().toLowerCase()}`;
  const addModel = () => { const value = newModel.trim(); if (!MODEL_ID.test(value) || value.includes('://') || models.includes(value) || models.length >= 20) { setError('Use a unique provider model ID (up to 128 characters).'); return; } onModelsChange([...models, value]); setNewModel(''); setError(null); };
  const saveKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!new RegExp(`^${providerId}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(secretId) || !keyValue.trim() || !label.trim() || !MODEL_ID.test(connectionModel) || connectionModel.includes('://') || !Number.isInteger(Number(priority)) || Number(priority) < 1 || Number(priority) > 12) {
      setError('Enter a label, model ID, API key, valid slot, and priority from 1 to 12.'); return;
    }
    setSaving(true); setError(null);
    try { await onSaveKey(providerId, secretId, keyValue, { label: label.trim(), modelId: connectionModel.trim(), priority: Number(priority), purpose }); setKeyValue('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save key.');
    } finally { setSaving(false); }
  };
  return <Card padding="lg" className="space-y-5">
    <div><h3 className="text-lg font-bold text-[var(--acade-text)]">{LABELS[providerId]} connections</h3><p className="text-xs text-[var(--acade-text-muted)]">{providerId === 'gemini' ? 'Create separate OCR and fallback connections.' : 'Add keys 1, 2, and 3 as separate connections.'}</p></div>
    <div><h4 className="text-sm font-semibold text-[var(--acade-text)]">Model catalog</h4>
      <ul className="mt-2 space-y-2">{models.map((model) => <li key={model} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[var(--acade-overlay)] px-3 py-2"><span className="min-w-0 break-all font-mono text-xs text-[var(--acade-text)]">{model}</span><button type="button" aria-label={`Remove ${model} from ${LABELS[providerId]}`} onClick={() => onModelsChange(models.filter((item) => item !== model))}><Trash2 className="size-4" /></button></li>)}</ul>
      <div className="mt-3 flex gap-2"><input aria-label={`New ${LABELS[providerId]} model ID`} className={selectClass} value={newModel} onChange={(event) => setNewModel(event.target.value)} placeholder="Provider model ID" /><Button variant="outline" aria-label={`Add ${LABELS[providerId]} model`} onClick={addModel}><Plus className="size-4" /></Button></div>
    </div>
    <div className="border-t border-[var(--acade-border)] pt-4"><h4 className="text-sm font-semibold text-[var(--acade-text)]">Saved connections</h4>
      {secrets.length === 0 && <p className="mt-2 text-xs text-[var(--acade-text-muted)]">No connections saved yet.</p>}
      {[...secrets].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)).map((secret) => <div key={secret.secretId} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--acade-overlay)] p-2 text-xs"><div className="min-w-0"><p className="font-semibold text-[var(--acade-text)]">{secret.label ?? secret.secretId} · priority {secret.priority ?? 'unset'}</p><p className="break-all font-mono text-[var(--acade-text-muted)]">{secret.secretId} · {secret.modelId ?? 'model unset'} · {secret.purpose ?? 'general'} · {secret.state}</p></div>{secret.state !== 'retired' && <button type="button" className="font-semibold text-[var(--acade-primary)]" onClick={() => void onStateChange(secret)}>{secret.state === 'active' ? 'Disable' : 'Activate'}</button>}</div>)}
    </div>
    <form onSubmit={saveKey} className="space-y-3 border-t border-[var(--acade-border)] pt-4"><h4 className="text-sm font-semibold text-[var(--acade-text)]">Add or rotate a connection</h4>
      <Input id={`${providerId}-label`} label="Connection label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input id={`${providerId}-slot`} label="Key slot" value={slot} onChange={(event) => setSlot(event.target.value)} hint="Unique short ID. Saving an existing slot rotates its key." />
      {providerId === 'gemini' && <label className="block text-sm text-[var(--acade-text)]">Gemini role<select className={selectClass} value={purpose} onChange={(event) => setPurpose(event.target.value as 'ocr' | 'fallback')}><option value="ocr">OCR</option><option value="fallback">Fallback for text features</option></select></label>}
      <Input id={`${providerId}-model`} label={`${LABELS[providerId]} model ID`} value={connectionModel} onChange={(event) => setConnectionModel(event.target.value)} hint="Exact provider model ID. Added to draft catalog on save." />
      <Input id={`${providerId}-key`} label={`${LABELS[providerId]} API key`} type="password" autoComplete="new-password" value={keyValue} onChange={(event) => setKeyValue(event.target.value)} hint="Encrypted on save; never shown again." />
      <Input id={`${providerId}-priority`} label="Priority" type="number" min={1} max={12} value={priority} onChange={(event) => setPriority(event.target.value)} hint="1 is first. Confirm the final order in the route above." />
      <Button type="submit" loading={saving} loadingLabel="Saving…" fullWidth><KeyRound className="size-4" /> Save {LABELS[providerId]} key</Button>
    </form>
    {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
  </Card>;
}
