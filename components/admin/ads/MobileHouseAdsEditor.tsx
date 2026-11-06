'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseHouseConfig, type HouseConfig } from '@/lib/ads/house';

export function MobileHouseAdsEditor({ initialConfig, onSave }: { initialConfig: HouseConfig; onSave: (config: HouseConfig) => Promise<void> }) {
  const [draft, setDraft] = useState(() => parseHouseConfig(initialConfig));
  const [saved, setSaved] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    setError(''); setSaving(true);
    try {
      const snapshot = parseHouseConfig(draft);
      await onSave(snapshot);
      setSaved(snapshot);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save Android house promotions.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="android-house-heading" className="space-y-4">
    <div><h2 id="android-house-heading" className="text-2xl font-semibold text-[var(--acade-text)]">Android house promotions</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Opt in to share active website house campaigns with Android. Creative content, schedules, weights and caps stay managed under Web → My promotions. Website enable switches do not control Android.</p></div>
    <Card padding="lg">
      <div className="grid gap-5 sm:grid-cols-2">
        {([['enabled', 'Share website house campaigns on Android'], ['includeLegacy', 'Include legacy banner fallback']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><p className="font-medium text-[var(--acade-text)]">{label}</p><Switch aria-label={label} checked={draft[field]} onCheckedChange={value => setDraft(current => ({ ...current, [field]: value }))} /></div>)}
        {([['dashboard', 'House promotions on Dashboard overview'], ['results', 'House promotions on Results overview']] as const).map(([field, label]) => <div key={field} className="flex items-center justify-between gap-3"><p className="font-medium text-[var(--acade-text)]">{label}</p><Switch aria-label={label} checked={draft.placements[field]} onCheckedChange={value => setDraft(current => ({ ...current, placements: { ...current.placements, [field]: value } }))} /></div>)}
      </div>
      <p className="mt-4 text-sm text-[var(--acade-text-muted)]">Legacy banners are used only when no campaign is eligible. Caps are local to each Android installation and count visible promotions only. This is separate from AdMob, web delivery and rewarded refresh.</p>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--acade-danger)]">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--acade-border)] pt-4">
        <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved changes — Android house promotions only' : `Saved — Android house promotions ${saved.enabled ? 'on' : 'off'}`}</p>
        <Button disabled={!dirty || saving} onClick={() => { void save(); }}>{saving ? 'Saving house promotions…' : 'Save Android house promotions'}</Button>
      </div>
    </Card>
  </section>;
}
