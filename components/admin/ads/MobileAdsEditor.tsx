'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseMobileAdsConfig, type MobileAdsConfig } from '@/lib/ads/mobile';

export function MobileAdsEditor({ initialConfig, onSave, platform = 'Android' }: { initialConfig: MobileAdsConfig; onSave: (config: MobileAdsConfig) => Promise<void>; platform?: 'Android' | 'iOS' }) {
  const [draft, setDraft] = useState(() => parseMobileAdsConfig(initialConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const configured = (!draft.placements.dashboard || Boolean(draft.dashboardBannerUnitId)) &&
    (!draft.placements.results || Boolean(draft.resultsBannerUnitId)) &&
    (!draft.rewardedEnabled || Boolean(draft.rewardedUnitId));
  const status = !draft.enabled ? 'Off' : draft.testMode ? 'Test ads enabled' : configured ? 'Live IDs enabled; serving unverified' : 'Incomplete';
  const save = async () => {
    setError(''); setSaving(true);
    try { const config = parseMobileAdsConfig(draft); await onSave(config); setDraft(config); }
    catch (cause) { setError(cause instanceof Error ? cause.message.replace(/Android/g, platform) : `Could not save ${platform} ads.`); }
    finally { setSaving(false); }
  };
  const headingId = `${platform.toLowerCase()}-ads-heading`;
  return <section aria-labelledby={headingId} className="space-y-4">
    <div><h2 id={headingId} className="text-2xl font-semibold text-[var(--acade-text)]">{platform} AdMob</h2><p className="mt-1 text-sm text-[var(--acade-text-muted)]">{platform === 'iOS' ? 'Configuration only — integration pending.' : `Selected configuration: ${status}.`} Changes take effect only after saving. The native SDK and app ID require a new {platform} build; these controls select delivery after installation.</p>{platform === 'iOS' && <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Save iOS ad units here for the upcoming iOS integration. Ad rendering is not connected in the iOS app yet.</p>}</div>
    <Card padding="lg"><div className="grid gap-5 sm:grid-cols-2">
      {([['enabled', `Enable ${platform} ads`], ['testMode', 'Use test ads']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><div><p className="font-medium text-[var(--acade-text)]">{label}</p>{field === 'testMode' && <p className="text-xs text-[var(--acade-text-muted)]">Keep on for development and device testing.</p>}</div><Switch aria-label={label} checked={draft[field]} onCheckedChange={value => setDraft({ ...draft, [field]: value })} /></div>)}
      {([['dashboard', 'Dashboard overview banner'], ['results', 'Results overview banner']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><p className="font-medium text-[var(--acade-text)]">{label}</p><Switch aria-label={label} checked={draft.placements[field]} onCheckedChange={value => setDraft({ ...draft, placements: { ...draft.placements, [field]: value } })} /></div>)}
      {platform === 'Android' && <div className="flex items-center justify-between gap-3"><div><p className="font-medium text-[var(--acade-text)]">Enable rewarded Insights refresh</p><p className="text-xs text-[var(--acade-text-muted)]">One extra Written Analysis refresh per verified reward; up to two rewards daily.</p></div><Switch aria-label="Enable rewarded Insights refresh" checked={draft.rewardedEnabled ?? false} onCheckedChange={value => setDraft({ ...draft, rewardedEnabled: value })} /></div>}
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">{([['dashboardBannerUnitId', 'Dashboard banner ad unit ID'], ['resultsBannerUnitId', 'Results banner ad unit ID'], ['rewardedUnitId', platform === 'Android' ? 'Rewarded ad unit ID' : 'Rewarded ad unit ID (reserved)']] as const).map(([field, label]) => <label key={field} className="block text-sm font-medium text-[var(--acade-text)]">{label}<input value={draft[field] ?? ''} onChange={event => setDraft({ ...draft, [field]: event.target.value })} placeholder="ca-app-pub-0000000000000000/0000000000" className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" /></label>)}</div>
    <p className="mt-3 text-sm text-[var(--acade-text-muted)]">{platform === 'Android' ? 'Rewarded refresh requires the deployed verification callback configured in AdMob. Test ads also require server confirmation.' : 'iOS rewarded refresh remains reserved for its native integration.'} Live status does not guarantee an AdMob account review or ad fill.</p>
    {error && <p role="alert" className="mt-3 text-sm text-[var(--acade-danger)]">{error}</p>}
    <div className="mt-5"><Button loading={saving} onClick={() => void save()}>Save {platform} ad settings</Button></div>
    </Card>
  </section>;
}
