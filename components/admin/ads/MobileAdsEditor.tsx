'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseMobileAdsConfig, type MobileAdsConfig } from '@/lib/ads/mobile';

export function MobileAdsEditor({ initialConfig, onSave }: { initialConfig: MobileAdsConfig; onSave: (config: MobileAdsConfig) => Promise<void> }) {
  const [draft, setDraft] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const configured = Boolean(draft.bannerUnitId);
  const status = !draft.enabled ? 'Off' : draft.testMode ? 'Test ads enabled' : configured ? 'Live IDs enabled; serving unverified' : 'Incomplete';
  const save = async () => {
    setError(''); setSaving(true);
    try { const config = parseMobileAdsConfig(draft); await onSave(config); setDraft(config); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save Android ads.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="android-ads-heading" className="space-y-4">
    <div><h2 id="android-ads-heading" className="text-2xl font-semibold text-[var(--acade-text)]">Android AdMob</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Status: {status}. The native SDK and app ID require an Android rebuild; these controls only select delivery after installation.</p></div>
    <Card padding="lg"><div className="grid gap-5 sm:grid-cols-2">
      {([['enabled', 'Enable Android ads'], ['testMode', 'Use test ads']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><div><p className="font-medium text-[var(--acade-text)]">{label}</p>{field === 'testMode' && <p className="text-xs text-[var(--acade-text-muted)]">Keep on for development and APK testing.</p>}</div><Switch aria-label={label} checked={draft[field]} onCheckedChange={value => setDraft({ ...draft, [field]: value })} /></div>)}
      {([['dashboard', 'Dashboard overview banner'], ['results', 'Results overview banner']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><p className="font-medium text-[var(--acade-text)]">{label}</p><Switch aria-label={label} checked={draft.placements[field]} onCheckedChange={value => setDraft({ ...draft, placements: { ...draft.placements, [field]: value } })} /></div>)}
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">{([['bannerUnitId', 'Banner ad unit ID'], ['rewardedUnitId', 'Rewarded ad unit ID (reserved)']] as const).map(([field, label]) => <label key={field} className="block text-sm font-medium text-[var(--acade-text)]">{label}<input value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} placeholder="ca-app-pub-0000000000000000/0000000000" className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" /></label>)}</div>
    <p className="mt-3 text-sm text-[var(--acade-text-muted)]">Rewarded refresh is not active until server-side reward verification is implemented. Live status does not guarantee an AdMob account review or ad fill.</p>
    {error && <p role="alert" className="mt-3 text-sm text-[var(--acade-danger)]">{error}</p>}
    <div className="mt-5"><Button loading={saving} onClick={() => void save()}>Save Android ad settings</Button></div>
    </Card>
  </section>;
}
