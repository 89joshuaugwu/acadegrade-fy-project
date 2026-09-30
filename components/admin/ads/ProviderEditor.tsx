'use client';

import { useState } from 'react';
import { Button, Card, Switch } from '@/components/ui';
import { parseProviderConfig, providerStatus, type ProviderConfig } from '@/lib/ads/providers';

export function ProviderEditor({ initialConfig, onSave }: { initialConfig: ProviderConfig; onSave: (config: ProviderConfig) => Promise<void> }) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = providerStatus(config);
  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const valid = parseProviderConfig(config);
      await onSave(valid);
      setConfig(valid);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save providers.'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="provider-heading" className="space-y-4">
    <div><h2 id="provider-heading" className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-[var(--acade-text)]">Web ad providers</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Optional inventory on the student dashboard. Enabled here does not confirm provider approval or ad fill. House banners remain available while accounts are reviewed.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card padding="lg"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-[var(--acade-text)]">Google AdSense</h3><p className="text-sm text-[var(--acade-text-muted)]">Status: {status.adsense}</p></div><Switch aria-label="Enable AdSense" checked={config.adsense.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsense: { ...config.adsense, enabled } })} /></div>
        <p className="mt-3 text-sm text-[var(--acade-text-muted)]">Uses the official AdSense SDK and ad unit only when enabled with both IDs. Account and site approval are still required.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-publisher">Publisher ID</label><input id="adsense-publisher" value={config.adsense.publisherId} placeholder="ca-pub-0000000000000000" onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, publisherId: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsense-slot">Slot ID</label><input id="adsense-slot" value={config.adsense.slotId} placeholder="Numeric ad unit ID" onChange={(event) => setConfig({ ...config, adsense: { ...config.adsense, slotId: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
      </Card>
      <Card padding="lg"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-[var(--acade-text)]">Adsterra SmartLink</h3><p className="text-sm text-[var(--acade-text-muted)]">Status: {status.adsterra}</p></div><Switch aria-label="Enable Adsterra SmartLink" checked={config.adsterra.enabled} onCheckedChange={(enabled) => setConfig({ ...config, adsterra: { ...config.adsterra, enabled } })} /></div>
        <p className="mt-3 text-sm text-[var(--acade-text-muted)]">A first-party creative with an explicit outbound CTA. This is not a native banner script; no Adsterra JavaScript runs here.</p>
        <label className="mt-4 block text-sm font-medium text-[var(--acade-text)]" htmlFor="adsterra-link">Official SmartLink HTTPS URL</label><input id="adsterra-link" type="url" value={config.adsterra.smartLinkUrl} placeholder="https://…" onChange={(event) => setConfig({ ...config, adsterra: { ...config.adsterra, smartLinkUrl: event.target.value } })} className="mt-1 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 text-[var(--acade-text)]" />
      </Card>
    </div>
    {error && <p role="alert" className="text-sm text-[var(--acade-danger)]">{error}</p>}
    <Button loading={saving} loadingLabel="Saving providers…" onClick={save}>Save provider settings</Button>
  </section>;
}
