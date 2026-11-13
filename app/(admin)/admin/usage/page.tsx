'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RewardedReadiness, type RewardedMobileAds } from '@/components/admin/rewarded/RewardedReadiness';
import { CoinSettings } from '@/components/admin/usage/CoinSettings';
import { FEATURE_LABELS, NUMBER_FIELDS, dailyKey, fallbackLabel, fromDraft, invalidFields, toDraft, type DraftValue, type PolicyDraft } from '@/components/admin/usage/draft';
import { FEATURE_IDS, MAX_FREE_DAILY_LIMIT, USAGE_FEATURES, parseCompleteUsagePolicy, type UsageFeatureId, type UsagePolicy, type UsagePolicySource } from '@/lib/usage/policy';

interface Loaded { policy: UsagePolicy; source: UsagePolicySource; fallbacks: string[] }
const SOURCES: UsagePolicySource[] = ['stored', 'default', 'partial', 'invalid'];
const LOAD_ERROR = 'Could not load free uses and coins.';

/** Extra limits that apply on top of the free uses, per feature. */
const EXTRA_HINTS: Partial<Record<UsageFeatureId, string>> = {
  insights: ' Regenerating is allowed once every 12 hours.',
  forecast: ' Forecasts are reused for up to 1 hour when results have not changed.',
};

/** Accept only a complete, valid envelope; never edit from guessed defaults. */
function parseEnvelope(data: unknown): Loaded {
  const value = (data ?? {}) as { policy?: unknown; source?: unknown; fallbacks?: unknown };
  if (!SOURCES.includes(value.source as UsagePolicySource) || !Array.isArray(value.fallbacks)) throw new Error(LOAD_ERROR);
  return { policy: parseCompleteUsagePolicy(value.policy), source: value.source as UsagePolicySource, fallbacks: value.fallbacks.map(String) };
}

function SourceWarning({ source, fallbacks }: Pick<Loaded, 'source' | 'fallbacks'>) {
  if (source === 'stored') return null;
  const fields = fallbacks.map(fallbackLabel).join(', ');
  const text = source === 'default' ? 'Nothing has been saved yet. The defaults shown here are in force until you save.'
    : source === 'invalid' ? `The saved settings could not be read, so every field uses its default${fields ? ` (${fields})` : ''}. Review and save to replace them.`
    : `Some saved settings could not be used, so defaults are in force for: ${fields}. Review and save to replace them.`;
  return <section aria-label="Policy source warning" className="flex gap-3 rounded-xl bg-[var(--acade-gold-dim)] p-4 text-sm text-[var(--acade-text)]">
    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--acade-gold)]" aria-hidden="true" />
    <p>{text}</p>
  </section>;
}

function isMobileAds(value: unknown): value is RewardedMobileAds {
  const config = value as Partial<RewardedMobileAds> | null;
  return Boolean(config) && typeof config?.enabled === 'boolean' && typeof config?.testMode === 'boolean';
}

export default function UsagePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileAds, setMobileAds] = useState<RewardedMobileAds | null>(null);
  const [confirmCoins, setConfirmCoins] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/usage', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || LOAD_ERROR);
      let loaded: Loaded;
      try { loaded = parseEnvelope(data); } catch { throw new Error(`${LOAD_ERROR} The server returned an incomplete policy.`); }
      setSaved(loaded); setDraft(toDraft(loaded.policy)); setInvalid(new Set());
    } catch (cause) { setError(cause instanceof Error ? cause.message : LOAD_ERROR); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  // Read-only: the Android ad half of rewarded readiness lives in Advertising.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/ads/mobile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const body = await response.json().catch(() => null) as { config?: unknown } | null;
        if (!cancelled) setMobileAds(response.ok && isMobileAds(body?.config) ? body.config : null);
      } catch { if (!cancelled) setMobileAds(null); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const savedDraft = useMemo(() => saved ? toDraft(saved.policy) : null, [saved]);
  const dirty = Boolean(savedDraft && draft && Object.keys(savedDraft).some(key => draft[key] !== savedDraft[key]));

  function change(key: string, value: DraftValue) {
    setDraft(current => current ? { ...current, [key]: value } : current);
    setInvalid(current => { if (!current.has(key)) return current; const next = new Set(current); next.delete(key); return next; });
    setError(''); setNotice('');
  }

  function discard() {
    if (!savedDraft) return;
    setDraft(savedDraft); setInvalid(new Set()); setError(''); setNotice('Draft discarded.');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !saved || !draft || saving) return;
    setError(''); setNotice('');
    const bad = invalidFields(draft);
    if (bad.length) {
      setInvalid(new Set(bad));
      setError(NUMBER_FIELDS[bad[0]].message); return;
    }
    // Turning coins on changes what every Android student sees: confirm first.
    if (!saved.policy.coins.enabled && draft['coins.enabled'] === true) { setConfirmCoins(true); return; }
    void persist({ ...draft });
  }

  async function persist(submitted: PolicyDraft) {
    if (!user) return;
    const policy = fromDraft(submitted);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/usage', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(policy) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save free uses and coins.');
      const persisted = parseEnvelope(data);
      const persistedDraft = toDraft(persisted.policy);
      setSaved(persisted);
      // Adopt normalization only for fields that have not changed in flight.
      setDraft(current => Object.fromEntries(Object.keys(persistedDraft).map(key => [key,
        current && current[key] !== submitted[key] ? current[key] : persistedDraft[key],
      ])));
      setNotice('Saved. Later edits stay in your draft.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save free uses and coins.'); }
    finally { setSaving(false); }
  }

  const coins = saved?.policy.coins;
  return <div className="max-w-4xl space-y-6">
    <AdminPageHeader
      title="Free uses & coins"
      description="Free AI requests per student and feature, and the Android coins that pay for more. Saving applies to the next request; it does not clear anyone's count or balance."
      helpId="admin.usage"
    />
    {!user ? <p className="text-sm text-[var(--acade-text-muted)]">Sign in as an administrator to manage free uses and coins.</p>
      : loading ? <p role="status">Loading free uses and coins…</p>
      : !saved || !draft ? <div className="space-y-3">{error && <p role="alert" className="text-[var(--acade-danger)]">{error}</p>}<Button onClick={() => void load()}>Retry</Button></div>
      : <>
        <SourceWarning source={saved.source} fallbacks={saved.fallbacks} />
        <RewardedReadiness mobileAds={mobileAds} coinsEnabled={saved.policy.coins.enabled} />
        <form noValidate onSubmit={submit} className="space-y-6">
          <Card><section aria-labelledby="free-allowances-title" className="space-y-5">
            <div>
              <h2 id="free-allowances-title" className="text-lg font-semibold text-[var(--acade-text)]">Free uses per 24 hours</h2>
              <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Per student and per feature. The window starts at the first request; 0 pauses free use.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">{FEATURE_IDS.map(id => <Input key={id}
              label={`${FEATURE_LABELS[id]}: free uses per 24 hours`} type="number" inputMode="numeric" min={0} max={MAX_FREE_DAILY_LIMIT} step={1}
              value={String(draft[dailyKey(id)])} aria-invalid={invalid.has(dailyKey(id)) ? 'true' : undefined}
              onChange={event => change(dailyKey(id), event.target.value)}
              hint={`Also limited to ${USAGE_FEATURES[id].burstHelp}.${EXTRA_HINTS[id] ?? ''}`} />)}</div>
          </section></Card>
          <CoinSettings draft={draft} invalid={invalid} onChange={change} />
          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--acade-void)] px-1 py-3">
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              {error && <p role="alert" className="text-[var(--acade-danger)]">{error}</p>}
              <p role="status" aria-label="Save status" className="text-[var(--acade-text-muted)]">{dirty ? 'Unsaved draft.' : 'No unsaved changes.'} {notice}</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={discard} disabled={!dirty || saving}>Discard changes</Button>
              <Button type="submit" loading={saving} disabled={!dirty || saving}>Save free uses and coins</Button>
            </div>
          </div>
        </form>
        <section aria-label="Saved free uses" className="text-sm text-[var(--acade-text-muted)]"><h2 className="font-semibold text-[var(--acade-text)]">Saved free uses</h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{FEATURE_IDS.map(id => <li key={id}>{FEATURE_LABELS[id]}: {saved.policy.dailyLimits[id]} per 24 hours</li>)}</ul></section>
        {coins && <section aria-label="Saved coin settings" className="text-sm text-[var(--acade-text-muted)]"><h2 className="font-semibold text-[var(--acade-text)]">Saved coin settings</h2>
          <p className="mt-2">Coins {coins.enabled ? 'On' : 'Off'} · {coins.coinsPerAd} per ad · {coins.dailyEarnCap} per UTC day · balance cap {coins.balanceCap}</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">{FEATURE_IDS.map(id => <li key={id}>{FEATURE_LABELS[id]}: {coins.features[id].enabled ? `${coins.features[id].price} coins, ${coins.features[id].dailyUseCap} per day` : 'not offered'}</li>)}</ul></section>}
        <Modal
          open={confirmCoins}
          onClose={() => setConfirmCoins(false)}
          title="Turn coins on?"
          description="Students on Android will see coin prices and can watch ads to earn. Check Rewarded readiness first."
          confirm={{ label: 'Turn coins on and save', loading: saving, onConfirm: () => { setConfirmCoins(false); if (draft) void persist({ ...draft }); } }}
        >
          <p className="text-sm text-[var(--acade-text-muted)]">Your other changes are saved at the same time.</p>
        </Modal>
      </>}
  </div>;
}
