'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FEATURE_IDS, MAX_FREE_DAILY_LIMIT, USAGE_FEATURES, parseUsagePolicy, type UsageFeatureId, type UsagePolicy } from '@/lib/usage/policy';

type Draft = Record<UsageFeatureId, string>;
function toDraft(policy: UsagePolicy): Draft {
  return Object.fromEntries(FEATURE_IDS.map(id => [id, String(policy.dailyLimits[id])])) as Draft;
}

export default function UsagePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<UsagePolicy | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/usage', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load allowances.');
      const policy = parseUsagePolicy(data);
      setSaved(policy); setDraft(toDraft(policy));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load allowances.'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const dirty = Boolean(saved && draft && FEATURE_IDS.some(id => draft[id] !== String(saved.dailyLimits[id])));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !saved || !draft || saving) return;
    const submitted = { ...draft };
    setError(''); setNotice('');
    if (FEATURE_IDS.some(id => !submitted[id].trim() || !Number.isInteger(Number(submitted[id])) || Number(submitted[id]) < 0 || Number(submitted[id]) > MAX_FREE_DAILY_LIMIT)) {
      setError('Daily limits must be whole numbers from 0 to 1000.'); return;
    }
    const policy = parseUsagePolicy({ dailyLimits: Object.fromEntries(FEATURE_IDS.map(id => [id, Number(submitted[id])])) });
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/usage', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(policy) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save allowances.');
      const persisted = parseUsagePolicy(data);
      setSaved(persisted);
      // Adopt normalization only for fields that have not changed in flight.
      setDraft(current => Object.fromEntries(FEATURE_IDS.map(id => [id,
        current && current[id] !== submitted[id] ? current[id] : String(persisted.dailyLimits[id]),
      ])) as Draft);
      setNotice('Submitted allowances saved. Later edits remain in your draft.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save allowances.'); }
    finally { setSaving(false); }
  }

  return <div className="max-w-4xl space-y-6">
    <header><h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold text-[var(--acade-text)]">Feature allowances</h1>
      <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Set free requests per user in each 24-hour window. Saving applies to future requests, including existing windows; it does not clear usage.</p></header>
    {!user ? <p className="text-sm text-[var(--acade-text-muted)]">Sign in as an administrator to manage allowances.</p>
      : loading ? <p role="status">Loading allowances…</p>
      : !saved || !draft ? <div className="space-y-3">{error && <p role="alert" className="text-[var(--acade-danger)]">{error}</p>}<Button onClick={() => void load()}>Retry</Button></div>
      : <>
        <Card><form noValidate onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">{FEATURE_IDS.map(id => <Input key={id}
            label={`${USAGE_FEATURES[id].label} daily limit`} type="number" min={0} max={MAX_FREE_DAILY_LIMIT} step={1}
            value={draft[id]} onChange={event => { setDraft(current => current ? { ...current, [id]: event.target.value } : current); setError(''); setNotice(''); }}
            hint={`Burst limit unchanged: ${USAGE_FEATURES[id].burstHelp}.${id === 'insights' ? ' Refresh cooldown: 12 hours.' : ''}`} />)}</div>
          <p className="text-sm text-[var(--acade-text-muted)]">Use 0 to pause free requests, or a whole number up to 1000. Fixed windows reset from the first request, not midnight. Cached results and local calculations do not spend an allowance.</p>
          {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
          <p role="status" className="text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved draft.' : 'No unsaved changes.'} {notice}</p>
          <Button type="submit" loading={saving} disabled={!dirty || saving}>Save allowances</Button>
        </form></Card>
        <section aria-label="Saved allowances" className="text-sm text-[var(--acade-text-muted)]"><h2 className="font-semibold text-[var(--acade-text)]">Saved allowances</h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{FEATURE_IDS.map(id => <li key={id}>{USAGE_FEATURES[id].label}: {saved.dailyLimits[id]} per 24 hours</li>)}</ul></section>
      </>}
    <Card><h2 className="font-semibold text-[var(--acade-text)]">Rewarded extras are separate</h2><p className="mt-2 text-sm text-[var(--acade-text-muted)]">Existing Written Analysis rewards remain separate: at most 2 per UTC day. Reward paths for Forecast, What-if guidance and result scanning are pending and cannot be enabled here.</p></Card>
  </div>;
}
