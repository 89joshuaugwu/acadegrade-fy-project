'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Card, Switch } from '@/components/ui';
import { parseMobileAdsConfig, type MobileAdsConfig } from '@/lib/ads/mobile';
import { cn } from '@/lib/utils/cn';

type UnitField = 'dashboardBannerUnitId' | 'resultsBannerUnitId' | 'rewardedUnitId';

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-[var(--acade-control-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';
const UNIT_PLACEHOLDER = 'ca-app-pub-0000000000000000/0000000000';

/** Off / Test ads / Live, unverified / Incomplete, from a draft or a saved config. */
export function admobBannerState(config: MobileAdsConfig) {
  if (!config.enabled) return 'Off';
  const slots = (['dashboard', 'results'] as const).filter((slot) => config.placements[slot]);
  if (slots.length === 0) return 'Off (no banner slots on)';
  if (config.testMode) return 'Test ads';
  const missing = slots.some((slot) => !(slot === 'dashboard' ? config.dashboardBannerUnitId : config.resultsBannerUnitId));
  return missing ? 'Incomplete' : 'Live, unverified';
}

export function MobileAdsEditor({ initialConfig, onSave, platform = 'Android', rewardedReadiness }: {
  initialConfig: MobileAdsConfig;
  onSave: (config: MobileAdsConfig) => Promise<void>;
  platform?: 'Android' | 'iOS';
  /** The shared Rewarded readiness strip, shown under the rewarded switch (Android only). */
  rewardedReadiness?: ReactNode;
}) {
  const [draft, setDraft] = useState(() => parseMobileAdsConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const android = platform === 'Android';
  const state = admobBannerState(draft);

  const save = async () => {
    setError(''); setSaving(true);
    try {
      const config = parseMobileAdsConfig(draft);
      await onSave(config);
      setDraft(current => JSON.stringify(current) === JSON.stringify(draft) ? config : current);
      setSavedConfig(config);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message.replace(/Android/g, platform) : `Could not save ${platform} ads.`); }
    finally { setSaving(false); }
  };

  const unitInput = (field: UnitField, label: string) => (
    <label className="block min-w-0 text-sm font-medium text-[var(--acade-text)]">
      {label}
      <input
        value={draft[field] ?? ''}
        onChange={event => setDraft({ ...draft, [field]: event.target.value })}
        placeholder={UNIT_PLACEHOLDER}
        spellCheck={false}
        className={inputClass}
      />
    </label>
  );

  const headingId = `${platform.toLowerCase()}-ads-heading`;
  return <section aria-labelledby={headingId} className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <h2 id={headingId} className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">{platform} AdMob</h2>
      <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium',
        state === 'Live, unverified' ? 'border-[var(--acade-success)]/30 bg-[var(--acade-success-dim)] text-[var(--acade-success)]'
          : state === 'Incomplete' ? 'border-[var(--acade-warning)]/30 bg-[var(--acade-warning)]/10 text-[var(--acade-warning)]'
          : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]')}>
        {android ? state : 'Not live'}
      </span>
    </div>
    {!android && <p className="text-sm text-[var(--acade-text-muted)]">Ad rendering is not connected in the iOS app yet. Settings saved here are kept for that integration.</p>}

    <Card padding="lg" className="space-y-6">
      <div className="space-y-1">
        <SwitchRow label={`Allow ads in the ${platform} app`} checked={draft.enabled} onChange={value => setDraft({ ...draft, enabled: value })} />
        <SwitchRow label="Use Google test ads (no revenue)" hint="Keep on for development and device testing." checked={draft.testMode} onChange={value => setDraft({ ...draft, testMode: value })} />
      </div>

      <fieldset className="space-y-3 border-t border-[var(--acade-border-subtle)] pt-5">
        <legend className="sr-only">Banners</legend>
        <h3 aria-hidden="true" className="text-base font-semibold text-[var(--acade-text)]">Banners</h3>
        {([['dashboard', 'Dashboard banner', 'dashboardBannerUnitId'], ['results', 'Results banner', 'resultsBannerUnitId']] as const).map(([slot, label, field]) => (
          <div key={slot} className="grid items-end gap-3 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)]">
            <div className="flex min-h-11 items-center justify-between gap-3 sm:pb-0.5">
              <p className="text-sm font-medium text-[var(--acade-text)]">{label}</p>
              <Switch aria-label={label} checked={draft.placements[slot]} onCheckedChange={value => setDraft({ ...draft, placements: { ...draft.placements, [slot]: value } })} />
            </div>
            {unitInput(field, `${label} ad unit ID`)}
          </div>
        ))}
      </fieldset>

      {android ? (
        <fieldset className="space-y-3 border-t border-[var(--acade-border-subtle)] pt-5">
          <legend className="sr-only">Rewarded ads</legend>
          <h3 aria-hidden="true" className="text-base font-semibold text-[var(--acade-text)]">Rewarded ads</h3>
          <SwitchRow
            label="Rewarded ads"
            hint="Needed for coins. When coins are off, a verified ad gives one extra Written Analysis refresh."
            checked={draft.rewardedEnabled ?? false}
            onChange={value => setDraft({ ...draft, rewardedEnabled: value })}
          />
          {unitInput('rewardedUnitId', 'Rewarded ad unit ID')}
          {rewardedReadiness}
          <p className="text-sm">
            <Link href="/admin/usage" className="font-medium text-[var(--acade-primary)] underline-offset-2 hover:underline">Coin prices and caps → Free uses &amp; coins</Link>
          </p>
        </fieldset>
      ) : (
        <div className="border-t border-[var(--acade-border-subtle)] pt-5">{unitInput('rewardedUnitId', 'Rewarded ad unit ID (reserved)')}</div>
      )}

      {android && <p className="text-sm text-[var(--acade-text-muted)]">Saved but no ad? Open Help at the top of this page for the delivery checklist.</p>}
      {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--acade-border)] pt-4">
        <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setDraft(savedConfig); setError(''); }}>Discard changes</Button>
        <Button loading={saving} loadingLabel={`Saving ${platform} settings…`} onClick={() => void save()}>Save {platform} ad settings</Button>
      </div>
    </Card>
  </section>;
}

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--acade-text)]">{label}</p>
        {hint && <p className="text-xs leading-5 text-[var(--acade-text-muted)]">{hint}</p>}
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
