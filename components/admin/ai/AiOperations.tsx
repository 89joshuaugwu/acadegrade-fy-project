'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Input, Modal, Skeleton, Switch } from '@/components/ui';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils/cn';
import { CustomInstructions } from './CustomInstructions';
import {
  getAdminAiSnapshot, saveAdminAiRouting, setAdminAiGeminiBilling, setAdminAiSecretState, upsertAdminAiSecret,
  type AdminAiConfig, type AdminAiFeature, type AdminAiMode, type AdminAiProviderId,
  type AdminAiProviders, type AdminAiRoute, type AdminAiRouteTarget,
  type AdminAiSecretProjection, type AdminAiSnapshot,
} from './client';

const PROVIDERS: AdminAiProviderId[] = ['groq', 'openrouter', 'gemini'];
const LABELS: Record<AdminAiProviderId, string> = { groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini' };
/** In the order students meet them, with the names students see. */
const FEATURES: Array<{ id: AdminAiFeature; label: string; capability: 'text' | 'multimodal' }> = [
  { id: 'insights', label: 'Written Analysis', capability: 'text' },
  { id: 'forecast', label: 'Forecast', capability: 'text' },
  { id: 'whatif', label: 'What-If guidance', capability: 'text' },
  { id: 'extract', label: 'Result scanning', capability: 'multimodal' },
];
const MODE_LABELS: Record<AdminAiMode, string> = {
  disabled: 'Off',
  'local-only': 'Calculator only (no AI)',
  single: 'One provider',
  'fallback-chain': 'Provider with backups',
};
/** Short form for the status chips. */
const MODE_CHIPS: Record<AdminAiMode, string> = {
  disabled: 'Off',
  'local-only': 'Calculator only',
  single: 'One provider',
  'fallback-chain': 'Backups',
};
const MODE_HELP: Record<AdminAiMode, string> = {
  disabled: 'No AI calls anywhere, on the website or Android.',
  'local-only': 'Shows the calculation without AI advice.',
  single: 'One provider, model and key answers.',
  'fallback-chain': 'Backups are tried in order when a provider fails.',
};
const BOOTSTRAP_MESSAGE = 'AI is off. No routing has been saved yet, so every AI request fails. Save routing to turn AI on.';
const GEMINI_BILLING_MESSAGE = "Gemini is on the free tier. Google may use what's sent to improve its products, including result slips. Enable billing on the Google Cloud project, then mark it confirmed here.";

function usesOpenRouter(route: AdminAiRoute) {
  return route.chain.some((target) => target.providerId === 'openrouter');
}

/** Routes as saved: the OpenRouter data-collection choice only rides on routes that use OpenRouter. */
function routingForSave(routes: Record<AdminAiFeature, AdminAiRoute>): Record<AdminAiFeature, AdminAiRoute> {
  return Object.fromEntries(Object.entries(routes).map(([id, route]) => {
    const { dataCollection, ...rest } = route;
    return [id, usesOpenRouter(route) ? { ...rest, dataCollection: dataCollection ?? 'deny' } : rest];
  })) as Record<AdminAiFeature, AdminAiRoute>;
}

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** Features whose saved routing sends requests with this key. */
function featuresUsingKey(config: AdminAiConfig | null, secretId: string) {
  return FEATURES.filter((feature) => {
    const route = config?.routes[feature.id];
    return route && (route.mode === 'single' || route.mode === 'fallback-chain')
      && route.chain.some((target) => target.secretId === secretId);
  }).map((feature) => feature.label);
}
const MODEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,127}$/;
const selectClass = 'mt-1 min-h-11 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]';

function draftRoutes(config: AdminAiConfig | null): Record<AdminAiFeature, AdminAiRoute> {
  return FEATURES.reduce((draft, feature) => {
    const saved = config?.routes[feature.id];
    draft[feature.id] = saved
      ? { mode: saved.mode, chain: saved.chain.map((target) => ({ ...target })), ...(saved.dataCollection ? { dataCollection: saved.dataCollection } : {}) }
      : { mode: 'disabled', chain: [] };
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
  const [keyToDisable, setKeyToDisable] = useState<{ secret: AdminAiSecretProjection; features: string[] } | null>(null);
  const [confirmBilling, setConfirmBilling] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);

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
            throw new Error(`${feature.label} needs an active ${LABELS[target.providerId]} key.`);
          }
        }
      }
      const config = await saveAdminAiRouting(await user.getIdToken(), snapshot.config?.revision ?? 0, routingForSave(routes), models);
      setSnapshot((current) => current ? { ...current, config } : current);
      setRoutes(draftRoutes(config)); setNotice(`Routing saved as revision ${config.revision}. AI is on.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save AI settings.');
    } finally { setSaving(false); }
  };

  const changeGeminiBilling = async (value: 'confirmed' | 'unconfirmed') => {
    if (!user) return;
    setBillingSaving(true); setError(null); setNotice(null);
    try {
      const geminiBilling = await setAdminAiGeminiBilling(await user.getIdToken(), value);
      setSnapshot((current) => current ? { ...current, geminiBilling } : current);
      setNotice(geminiBilling === 'confirmed' ? 'Gemini billing marked confirmed.' : 'Gemini billing marked unconfirmed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update Gemini billing.');
    } finally { setBillingSaving(false); }
  };

  const requestKeyState = async (secret: AdminAiSecretProjection) => {
    const features = secret.state === 'active' ? featuresUsingKey(snapshot?.config ?? null, secret.secretId) : [];
    if (features.length) { setKeyToDisable({ secret, features }); return; }
    await changeKeyState(secret);
  };

  const managed = snapshot?.config?.source === 'managed';
  const geminiWarning = snapshot?.geminiBilling !== undefined && snapshot.geminiBilling !== 'confirmed';
  const disablingSentence = keyToDisable
    ? `${joinNames(keyToDisable.features)} ${keyToDisable.features.length > 1 ? 'use' : 'uses'} this key. Disabling it makes ${keyToDisable.features.length > 1 ? 'those features' : 'that feature'} fail, or fall back to the next provider, immediately.`
    : '';

  return <div className="space-y-7">
    <AdminPageHeader title="AI providers" description="Choose which provider, model and key answer each AI feature, on the website and the Android app." helpId="admin.ai" />
    {error && <ErrorState title="AI settings need attention" description={error} onRetry={() => void reload()} />}
    {notice && <p role="status" className="rounded-xl border border-[var(--acade-success)]/30 bg-[var(--acade-success-dim)] px-4 py-3 text-sm text-[var(--acade-text)]">{notice}</p>}
    {loading && <div aria-label="Loading AI settings" aria-busy="true" className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <Skeleton key={item} className="h-72" />)}</div>}
    {snapshot && models && <>
      <section aria-label="AI status" className={cn('rounded-[var(--radius-surface)] border p-4 sm:p-5', managed ? 'border-[var(--acade-border)] bg-[var(--acade-surface)]' : 'border-[var(--acade-warning)]/35 bg-[var(--acade-warning)]/10')}>
        <p className="flex items-start gap-2 text-sm font-semibold text-[var(--acade-text)]">
          {!managed && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--acade-warning)]" aria-hidden="true" />}
          {managed ? `AI is on (revision ${snapshot.config?.revision})` : BOOTSTRAP_MESSAGE}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {FEATURES.map((feature) => {
            const mode = snapshot.config?.routes[feature.id]?.mode ?? 'disabled';
            return <li key={feature.id} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--acade-overlay)] px-3 text-xs">
              <span className="font-medium text-[var(--acade-text)]">{feature.label}</span>
              <span className="sr-only">: </span>
              <span className={mode === 'disabled' ? 'text-[var(--acade-text-muted)]' : 'font-semibold text-[var(--acade-primary)]'}>{MODE_CHIPS[mode]}</span>
            </li>;
          })}
        </ul>
      </section>
      {geminiWarning && <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-warning)]/35 bg-[var(--acade-warning)]/10 px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
        <AlertTriangle className="mt-1 size-4 shrink-0 text-[var(--acade-warning)]" aria-hidden="true" />
        <p className="min-w-0 flex-1 basis-64">{GEMINI_BILLING_MESSAGE}</p>
        <Button variant="outline" size="sm" loading={billingSaving} loadingLabel="Saving…" onClick={() => setConfirmBilling(true)}>Mark billing confirmed…</Button>
      </div>}
      {snapshot.geminiBilling === 'confirmed' && <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--acade-text-muted)]">
        Gemini billing is marked confirmed.
        <button type="button" disabled={billingSaving} onClick={() => void changeGeminiBilling('unconfirmed')} className="min-h-9 rounded-lg font-medium text-[var(--acade-primary)] underline-offset-2 hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">Mark as unconfirmed</button>
      </p>}
      <section aria-labelledby="routing-title" className="space-y-4">
        <div><h2 id="routing-title" className="text-xl font-bold text-[var(--acade-text)]">Features</h2><p className="text-sm text-[var(--acade-text-muted)]">Pick a mode, then the provider, model and key for each feature.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">{FEATURES.map((feature) => <RouteEditor key={feature.id} feature={feature} route={routes[feature.id]} providers={snapshot.providers} models={models} secrets={snapshot.secrets} onChange={(route) => setRoutes((current) => ({ ...current, [feature.id]: route }))}>
          {feature.id === 'insights' && <CustomInstructions />}
        </RouteEditor>)}</div>
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--acade-void)] px-1 py-3">
          <p className="min-w-0 flex-1 text-sm text-[var(--acade-text-muted)]">{managed ? `Saved routing: revision ${snapshot.config?.revision}.` : 'Nothing saved yet. AI stays off until you save.'}</p>
          <Button loading={saving} loadingLabel="Saving routing…" onClick={() => void save()}><ShieldCheck className="size-4" aria-hidden="true" /> Save routing</Button>
        </div>
      </section>
      <section aria-labelledby="catalog-title" className="space-y-4"><div><h2 id="catalog-title" className="text-xl font-bold text-[var(--acade-text)]">Provider keys and models</h2><p className="text-sm text-[var(--acade-text-muted)]">Models listed here can be chosen in the features above.</p></div><div className="grid gap-4 xl:grid-cols-3">{PROVIDERS.map((id) => <ProviderEditor key={id} providerId={id} models={models[id]} secrets={snapshot.secrets.filter((secret) => secret.providerId === id)} onModelsChange={(next) => setModels((current) => current ? { ...current, [id]: next } : current)} onSaveKey={saveKey} onStateChange={requestKeyState} />)}</div></section>
    </>}
    <Modal
      open={confirmBilling}
      onClose={() => setConfirmBilling(false)}
      title="Mark Gemini billing confirmed?"
      size="confirm"
    >
      <p className="text-sm leading-6 text-[var(--acade-text)]">Confirm that billing is enabled on the Google Cloud project that owns the Gemini key? Only confirm after checking in Google Cloud.</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => setConfirmBilling(false)}>Cancel</Button>
        <Button onClick={() => { setConfirmBilling(false); void changeGeminiBilling('confirmed'); }}>Mark billing confirmed</Button>
      </div>
    </Modal>
    <Modal
      open={keyToDisable !== null}
      onClose={() => setKeyToDisable(null)}
      title={`Disable ${keyToDisable?.secret.secretId ?? 'this key'}?`}
      confirm={{ label: 'Disable key', onConfirm: () => { const target = keyToDisable; setKeyToDisable(null); if (target) void changeKeyState(target.secret); } }}
    >
      <p className="text-sm leading-6 text-[var(--acade-text)]">{disablingSentence}</p>
    </Modal>
  </div>;
}

function RouteEditor({ feature, route, providers, models, secrets, onChange, children }: { feature: (typeof FEATURES)[number]; route: AdminAiRoute; providers: AdminAiProviders; models: Record<AdminAiProviderId, string[]>; secrets: AdminAiSecretProjection[]; onChange: (route: AdminAiRoute) => void; children?: React.ReactNode }) {
  const eligible = PROVIDERS.filter((id) => providers[id].capabilities.includes(feature.capability));
  const createTarget = (index: number): AdminAiRouteTarget => {
    const providerId: AdminAiProviderId = feature.id === 'extract' || feature.id === 'forecast' || index > 0
      ? 'gemini'
      : feature.id === 'insights' ? 'openrouter' : 'groq';
    return { providerId, modelId: models[providerId][0] ?? '', secretId: '' };
  };
  const setMode = (mode: AdminAiMode) => onChange({
    ...route,
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
    onChange({ ...route, mode: ordered.length > 1 ? 'fallback-chain' : ordered.length === 1 ? 'single' : 'disabled', chain: ordered });
  };
  return <Card padding="lg" className="space-y-4">
    <div><h3 className="text-lg font-bold text-[var(--acade-text)]">{feature.label}</h3>{feature.capability === 'multimodal' && <p className="text-sm text-[var(--acade-text-muted)]">Needs a provider that can read images.</p>}</div>
    <label className="block text-sm font-medium text-[var(--acade-text)]">Mode
      <select aria-label={`${feature.label} mode`} className={selectClass} value={route.mode} onChange={(event) => setMode(event.target.value as AdminAiMode)}>
        <option value="disabled">{MODE_LABELS.disabled}</option>{feature.id === 'whatif' && <option value="local-only">{MODE_LABELS['local-only']}</option>}<option value="single">{MODE_LABELS.single}</option><option value="fallback-chain">{MODE_LABELS['fallback-chain']}</option>
      </select>
    </label>
    <p className="text-xs text-[var(--acade-text-muted)]">{MODE_HELP[route.mode]}</p>
    <Button variant="outline" size="sm" aria-label={`${feature.label}: fill from saved keys`} onClick={useSavedPriorities}>Fill from saved keys</Button>
    {route.chain.map((target, index) => {
    const activeSecrets = secrets.filter((secret) => secret.providerId === target.providerId && secret.state === 'active');
    const update = (next: AdminAiRouteTarget) => onChange({ ...route, chain: route.chain.map((item, position) => position === index ? next : item) });
    return <fieldset key={index} className="grid gap-3 rounded-xl border border-[var(--acade-border)] p-3">
      <legend className="px-1 text-xs font-semibold text-[var(--acade-text-muted)]">{route.chain.length > 1 ? (index === 0 ? 'First choice' : `Backup ${index}`) : 'Target'}</legend>
      <label className="block text-xs text-[var(--acade-text-muted)]">Provider
        <select aria-label={`${feature.label} priority ${index + 1} provider`} className={selectClass} value={target.providerId} onChange={(event) => { const providerId = event.target.value as AdminAiProviderId; update({ providerId, modelId: models[providerId][0] ?? '', secretId: '' }); }}>{eligible.map((id) => <option key={id} value={id}>{LABELS[id]}</option>)}</select>
      </label>
      <label className="block text-xs text-[var(--acade-text-muted)]">Model
        <select aria-label={`${feature.label} priority ${index + 1} model`} className={selectClass} value={target.modelId} onChange={(event) => update({ ...target, modelId: event.target.value })}>{!models[target.providerId].includes(target.modelId) && <option value={target.modelId}>{target.modelId} (not in catalog)</option>}{models[target.providerId].map((model) => <option key={model} value={model}>{model}</option>)}</select>
      </label>
      <label className="block text-xs text-[var(--acade-text-muted)]">Key
        <select aria-label={`${feature.label} priority ${index + 1} key`} className={selectClass} value={target.secretId ?? ''} onChange={(event) => update({ ...target, secretId: event.target.value })}><option value="">Select an active key</option>{activeSecrets.map((secret) => <option key={secret.secretId} value={secret.secretId}>{secret.secretId}</option>)}</select>
      </label>
      {route.mode === 'fallback-chain' && <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${feature.label} priority ${index + 1} earlier`} onClick={() => moveTarget(index, -1)}>Move up</Button>
        <Button variant="outline" size="sm" disabled={index === route.chain.length - 1} aria-label={`Move ${feature.label} priority ${index + 1} later`} onClick={() => moveTarget(index, 1)}>Move down</Button>
        <Button variant="ghost" size="sm" disabled={route.chain.length <= 2} aria-label={`Remove ${feature.label} priority ${index + 1}`} onClick={() => onChange({ ...route, chain: route.chain.filter((_, position) => position !== index) })}>Remove</Button>
      </div>}
    </fieldset>;
  })}
  {route.mode === 'fallback-chain' && <Button variant="outline" disabled={route.chain.length >= 12} onClick={() => onChange({ ...route, chain: [...route.chain, createTarget(route.chain.length)] })}><Plus className="size-4" aria-hidden="true" /> Add backup</Button>}
  {usesOpenRouter(route) && <div className="flex items-start justify-between gap-4 rounded-xl bg-[var(--acade-overlay)] px-3 py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--acade-text)]">Allow OpenRouter data collection</p>
      <p className="mt-0.5 text-xs leading-5 text-[var(--acade-text-muted)]">Off sends data_collection: deny. Free models with no compliant provider fail over to the next target.</p>
    </div>
    <Switch aria-label={`${feature.label}: allow OpenRouter data collection`} checked={route.dataCollection === 'allow'} onCheckedChange={(allow) => onChange({ ...route, dataCollection: allow ? 'allow' : 'deny' })} />
  </div>}
  {children}
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
      setError('Enter a label, model ID, API key, a valid key name, and a priority from 1 to 12.'); return;
    }
    setSaving(true); setError(null);
    try { await onSaveKey(providerId, secretId, keyValue, { label: label.trim(), modelId: connectionModel.trim(), priority: Number(priority), purpose }); setKeyValue('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save key.');
    } finally { setSaving(false); }
  };
  return <Card padding="lg" className="space-y-5">
    <h3 className="text-lg font-bold text-[var(--acade-text)]">{LABELS[providerId]}</h3>
    <div><h4 className="text-sm font-semibold text-[var(--acade-text)]">Models</h4>
      <ul className="mt-2 space-y-2">{models.map((model) => <li key={model} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[var(--acade-overlay)] px-3 py-2"><span className="min-w-0 break-all font-mono text-xs text-[var(--acade-text)]">{model}</span><button type="button" aria-label={`Remove ${model} from ${LABELS[providerId]}`} onClick={() => onModelsChange(models.filter((item) => item !== model))} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-danger)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"><Trash2 className="size-4" aria-hidden="true" /></button></li>)}</ul>
      <div className="mt-3 flex gap-2"><input aria-label={`New ${LABELS[providerId]} model ID`} className={selectClass} value={newModel} onChange={(event) => setNewModel(event.target.value)} placeholder="Provider model ID" /><Button variant="outline" aria-label={`Add ${LABELS[providerId]} model`} onClick={addModel}><Plus className="size-4" aria-hidden="true" /></Button></div>
    </div>
    <div className="border-t border-[var(--acade-border)] pt-4"><h4 className="text-sm font-semibold text-[var(--acade-text)]">Saved keys</h4>
      {secrets.length === 0 && <p className="mt-2 text-xs text-[var(--acade-text-muted)]">No keys saved yet.</p>}
      {[...secrets].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)).map((secret) => <div key={secret.secretId} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--acade-overlay)] p-2 text-xs"><div className="min-w-0"><p className="font-semibold text-[var(--acade-text)]">{secret.label ?? secret.secretId} · priority {secret.priority ?? 'unset'}</p><p className="break-all font-mono text-[var(--acade-text-muted)]">{secret.secretId} · {secret.modelId ?? 'model unset'} · {secret.purpose ?? 'general'} · {secret.state}</p></div>{secret.state !== 'retired' && <button type="button" aria-label={`${secret.state === 'active' ? 'Disable' : 'Activate'} ${secret.secretId}`} className="min-h-9 rounded-lg px-2 font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]" onClick={() => void onStateChange(secret)}>{secret.state === 'active' ? 'Disable' : 'Activate'}</button>}</div>)}
    </div>
    <form onSubmit={saveKey} className="space-y-3 border-t border-[var(--acade-border)] pt-4"><h4 className="text-sm font-semibold text-[var(--acade-text)]">Add or rotate a key</h4>
      <Input id={`${providerId}-label`} label="Key label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input id={`${providerId}-slot`} label="Key name" value={slot} onChange={(event) => setSlot(event.target.value)} hint="Reusing a saved key name replaces its key." />
      {providerId === 'gemini' && <label className="block text-sm text-[var(--acade-text)]">Gemini role<select className={selectClass} value={purpose} onChange={(event) => setPurpose(event.target.value as 'ocr' | 'fallback')}><option value="ocr">OCR</option><option value="fallback">Fallback for text features</option></select></label>}
      <Input id={`${providerId}-model`} label={`${LABELS[providerId]} model ID`} value={connectionModel} onChange={(event) => setConnectionModel(event.target.value)} hint="Added to the models list when you save the key." />
      <Input id={`${providerId}-key`} label={`${LABELS[providerId]} API key`} type="password" autoComplete="new-password" value={keyValue} onChange={(event) => setKeyValue(event.target.value)} hint="Encrypted on save; never shown again." />
      <Input id={`${providerId}-priority`} label="Priority" type="number" min={1} max={12} value={priority} onChange={(event) => setPriority(event.target.value)} hint="1 is tried first by Fill from saved keys." />
      <Button type="submit" loading={saving} loadingLabel="Saving…" fullWidth><KeyRound className="size-4" aria-hidden="true" /> Save {LABELS[providerId]} key</Button>
    </form>
    {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
  </Card>;
}
