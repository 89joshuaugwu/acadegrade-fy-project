'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseProviderConfig, providerStatus, type ProviderConfig } from '@/lib/ads/providers';

export function ProviderEditor({ initialConfig, onSave }: { initialConfig: ProviderConfig; onSave: (config: ProviderConfig) => Promise<void> }) {
  const [config, setConfig] = useState(initialConfig);
  const [savedConfig, setSavedConfig] = useState(initialConfig);
  const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = providerStatus(config);
  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const valid = parseProviderConfig(config);
      await onSave(valid);
      setConfig(current => JSON.stringify(current) === JSON.stringify(config) ? valid : current);
      setSavedConfig(valid);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save providers.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="provider-heading" className="space-y-4">
    <div><h2 id="provider-heading" className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-[var(--acade-text)]">Web ad providers</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Dashboard-only web placement. Selected configuration is not proof of serving; save providers separately from house campaigns.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padding="lg"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-[var(--acade-text)]">Google AdSense</h3><p className="text-sm text-[var(--acade-text-muted)]">Status: {status.adsense}</p></div><Switch aria-label="Enable AdSense" checked={config.adsense.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsense: { ...config.adsense, enabled } })} /></div>
        <p className="mt-3 text-sm text-[var(--acade-text-muted)]">Requires both IDs plus account and site approval. If saved and enabled but blank, check approval, consent, browser blocking, and ad fill on the student dashboard.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-publisher">Publisher ID</label><input id="adsense-publisher" value={config.adsense.publisherId} placeholder="ca-pub-0000000000000000" onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, publisherId: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-slot">Slot ID</label><input id="adsense-slot" value={config.adsense.slotId} placeholder="Numeric ad unit ID" onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, slotId: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
      </Card>
      <Card padding="lg"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-[var(--acade-text)]">Adsterra SmartLink</h3><p className="text-sm text-[var(--acade-text-muted)]">Status: {status.adsterra}</p></div><Switch aria-label="Enable Adsterra SmartLink" checked={config.adsterra.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsterra: { ...config.adsterra, enabled } })} /></div>
        <p className="mt-3 text-sm text-[var(--acade-text-muted)]">An outbound SmartLink CTA, not a banner integration. No Adsterra script runs here. If absent after saving, check the enable switch and HTTPS URL.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsterra-link">Official SmartLink HTTPS URL</label><input id="adsterra-link" type="url" value={config.adsterra.smartLinkUrl} placeholder="https://…" onChange={(event) => setConfig({ ...config, adsterra: { ...config.adsterra, smartLinkUrl: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
      </Card>
    </div>
    {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--acade-border)] pt-4">
      <p role="status" className="mr-auto text-sm text-[var(--acade-text-muted)]">{dirty ? 'Unsaved changes — web providers only' : 'Saved configuration — serving not verified'}</p>
      <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setConfig(savedConfig); setError(null); }}>Discard changes</Button>
      <Button loading={saving} loadingLabel="Saving providers…" onClick={save}>Save provider settings</Button>
    </div>
  </section>;
}
