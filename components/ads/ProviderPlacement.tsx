'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { safeParseProviderConfig, type ProviderConfig } from '@/lib/ads/providers';
import { useCookieConsent } from '@/lib/consent/cookies';

declare global { interface Window { adsbygoogle?: Record<string, unknown>[] } }

const requestedUnits = new WeakSet<HTMLElement>();

/**
 * Third-party ads (AdSense, Adsterra partner link). Nothing loads, and no
 * AdSense script is requested, until the visitor allows ads in Cookie choices.
 */
export function ProviderPlacement({ config: supplied }: { config?: ProviderConfig }) {
  const consentGiven = useCookieConsent() === 'ads';
  const [fetched, setFetched] = useState<{ config: ProviderConfig; signal: AbortSignal } | null>(null);
  // Supplied settings are authoritative on every render, not just on mount.
  const config = supplied ?? (fetched && !fetched.signal.aborted ? fetched.config : null);
  const adsenseUnit = useRef<HTMLModElement | null>(null);
  // Unit key whose script failed or which AdSense reported as unfilled.
  const [hiddenUnit, setHiddenUnit] = useState<string | null>(null);
  useEffect(() => {
    if (supplied) return;
    const controller = new AbortController();
    fetch('/api/ads/providers', { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('Unavailable');
      return response.json();
    }).then((body) => {
      if (!controller.signal.aborted) setFetched({ config: safeParseProviderConfig(body.config), signal: controller.signal });
    }).catch(() => {
      if (!controller.signal.aborted) setFetched(null);
    });
    return () => controller.abort();
  }, [supplied]);
  const unitKey = consentGiven && config?.adsense.enabled && config.adsense.publisherId && config.adsense.slotId
    ? `${config.adsense.publisherId}:${config.adsense.slotId}`
    : null;
  useEffect(() => {
    const unit = adsenseUnit.current;
    if (!unit || !unitKey || requestedUnits.has(unit)) return;
    requestedUnits.add(unit);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* Ad blockers may prevent delivery. */ }
  }, [config, unitKey]);
  useEffect(() => {
    const unit = adsenseUnit.current;
    if (!unit || !unitKey || typeof MutationObserver !== 'function') return;
    // AdSense marks no-fill on the unit; hide the labelled box rather than leave it empty.
    const check = () => { if (unit.getAttribute('data-ad-status') === 'unfilled') setHiddenUnit(unitKey); };
    const observer = new MutationObserver(check);
    observer.observe(unit, { attributes: true, attributeFilter: ['data-ad-status'] });
    check();
    return () => observer.disconnect();
  }, [unitKey]);
  if (!config || !consentGiven) return null;
  const { adsense, adsterra } = config;
  const showAdsense = unitKey !== null && hiddenUnit !== unitKey;
  const showAdsterra = adsterra.enabled && !!adsterra.smartLinkUrl;
  if (!showAdsense && !showAdsterra) return null;
  return <section aria-label="Sponsored" className="space-y-4">
    {showAdsense && <aside aria-label="Advertisement" className="min-h-32 rounded-2xl border border-[var(--acade-border)] p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-[var(--acade-text-muted)]">Advertisement</p>
      <Script id="acadegrade-adsense-sdk" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.publisherId}`} strategy="afterInteractive" crossOrigin="anonymous" onError={() => setHiddenUnit(unitKey)} />
      <ins key={unitKey} ref={adsenseUnit} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={adsense.publisherId} data-ad-slot={adsense.slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>}
    {showAdsterra && <aside className="rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
      <p className="text-xs uppercase tracking-widest text-[var(--acade-text-muted)]">Sponsored link</p>
      <h2 className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Explore an optional offer</h2>
      <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Opens an external partner page. Your academic work stays here.</p>
      <a href={adsterra.smartLinkUrl} target="_blank" rel="sponsored noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--acade-primary)] px-4 font-semibold text-[var(--acade-on-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">View sponsored offer</a>
    </aside>}
  </section>;
}
