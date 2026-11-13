'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseProviderConfig, type ProviderConfig } from '@/lib/ads/providers';
import { cn } from '@/lib/utils/cn';

type NetworkState = 'On' | 'Incomplete' | 'Off';

/** On / Incomplete / Off for each web network, from a draft or a saved config. */
export function networkStates(config: ProviderConfig): { adsense: NetworkState; adsterra: NetworkState } {
  const adsenseReady = Boolean(config.adsense.publisherId.trim() && config.adsense.slotId.trim());
  const adsterraReady = Boolean(config.adsterra.smartLinkUrl.trim());
  return {
    adsense: !config.adsense.enabled ? 'Off' : adsenseReady ? 'On' : 'Incomplete',
    adsterra: !config.adsterra.enabled ? 'Off' : adsterraReady ? 'On' : 'Incomplete',
  };
}

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-[var(--acade-control-border)] bg-[var(--acade-surface)] px-3 text-sm text-[var(--acade-text)] placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';

function StateChip({ state }: { state: NetworkState }) {
  return (
    <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium',
      state === 'On' ? 'border-[var(--acade-success)]/30 bg-[var(--acade-success-dim)] text-[var(--acade-success)]'
        : state === 'Incomplete' ? 'border-[var(--acade-warning)]/30 bg-[var(--acade-warning)]/10 text-[var(--acade-warning)]'
        : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]')}>
      {state}
    </span>
  );
}

export function ProviderEditor({ initialConfig, onSave }: { initialConfig: ProviderConfig; onSave: (config: ProviderConfig) => Promise<void> }) {
  const [config, setConfig] = useState(initialConfig);
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const states = networkStates(config);
  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const valid = parseProviderConfig(config);
      await onSave(valid);
      setConfig(current => JSON.stringify(current) === JSON.stringify(config) ? valid : current);
      setSavedConfig(valid);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save web ad networks.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="provider-heading" className="space-y-4">
    <div>
      <h2 id="provider-heading" className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Web ad networks</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Web Dashboard only.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-[var(--acade-text)]">Google AdSense</h3><StateChip state={states.adsense} /></div>
          <Switch aria-label="Enable AdSense" checked={config.adsense.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsense: { ...config.adsense, enabled } })} />
        </div>
        <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Needs Google&apos;s site approval as well as both IDs.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-publisher">Publisher ID</label>
        <input id="adsense-publisher" value={config.adsense.publisherId} placeholder="ca-pub-0000000000000000" spellCheck={false} onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, publisherId: event.target.value } })} className={inputClass} />
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-slot">Slot ID</label>
        <input id="adsense-slot" value={config.adsense.slotId} placeholder="Numeric ad unit ID" inputMode="numeric" onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, slotId: event.target.value } })} className={inputClass} />
      </Card>
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-[var(--acade-text)]">Adsterra SmartLink</h3><StateChip state={states.adsterra} /></div>
          <Switch aria-label="Enable Adsterra SmartLink" checked={config.adsterra.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsterra: { ...config.adsterra, enabled } })} />
        </div>
        <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Shows an outbound link button, not a banner.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsterra-link">SmartLink HTTPS URL</label>
        <input id="adsterra-link" type="url" value={config.adsterra.smartLinkUrl} placeholder="https://…" onChange={(event) => setConfig({ ...config, adsterra: { ...config.adsterra, smartLinkUrl: event.target.value } })} className={inputClass} />
      </Card>
    </div>
    {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--acade-border)] pt-4">
      <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
      <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setConfig(savedConfig); setError(null); }}>Discard changes</Button>
      <Button loading={saving} loadingLabel="Saving web ad networks…" onClick={save}>Save web ad networks</Button>
    </div>
  </section>;
}
