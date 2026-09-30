'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { safeParseProviderConfig, type ProviderConfig } from '@/lib/ads/providers';

declare global { interface Window { adsbygoogle?: Record<string, unknown>[] } }

const requestedUnits = new WeakSet<HTMLElement>();

export function ProviderPlacement({ config: supplied }: { config?: ProviderConfig }) {
  const [config, setConfig] = useState<ProviderConfig | null>(supplied ?? null);
  const adsenseUnit = useRef<HTMLModElement | null>(null);
  useEffect(() => {
    if (supplied) return;
    const controller = new AbortController();
    fetch('/api/ads/providers', { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    }).then((body) => setConfig(safeParseProviderConfig(body.config))).catch(() => setConfig(null));
    return () => controller.abort();
  }, [supplied]);
  useEffect(() => {
    const unit = adsenseUnit.current;
    if (!unit || !config?.adsense.enabled || !config.adsense.publisherId || !config.adsense.slotId || requestedUnits.has(unit)) return;
    requestedUnits.add(unit);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Ad blockers may prevent delivery. */ }
  }, [config]);
  if (!config) return null;
  const { adsense, adsterra } = config;
  if (!adsense.enabled && !adsterra.enabled) return null;
  return <section aria-label="Sponsored" className="space-y-4">
    {adsense.enabled && adsense.publisherId && adsense.slotId && <aside aria-label="Advertisement" className="min-h-32 rounded-2xl border border-[var(--acade-border)] p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-[var(--acade-text-muted)]">Advertisement</p>
      <Script id="acadegrade-adsense-sdk" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.publisherId}`} strategy="afterInteractive" crossOrigin="anonymous" />
      <ins key={`${adsense.publisherId}:${adsense.slotId}`} ref={adsenseUnit} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={adsense.publisherId} data-ad-slot={adsense.slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>}
    {adsterra.enabled && adsterra.smartLinkUrl && <aside className="rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
      <p className="text-xs uppercase tracking-widest text-[var(--acade-text-muted)]">Sponsored link</p>
      <h2 className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Explore an optional offer</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Opens an external partner page. Your academic work stays here.</p>
      <a href={adsterra.smartLinkUrl} target="_blank" rel="sponsored noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--acade-primary)] px-4 font-semibold text-[var(--acade-on-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">View sponsored offer</a>
    </aside>}
  </section>;
}
