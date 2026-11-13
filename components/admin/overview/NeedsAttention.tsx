'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { rewardedReadiness, type RewardedMobileAds } from '@/components/admin/rewarded/RewardedReadiness';

interface Sources {
  pendingSuggestions: number | null;
  aiManaged: boolean | null;
  release: { enabled?: boolean; minSupportedBuild?: number; allowIgnore?: boolean; latestBuild?: number } | null;
  maintenanceMode: boolean | null;
  coinsEnabled: boolean | null;
  mobileAds: RewardedMobileAds | null;
}

export interface AttentionItem { id: string; text: string; href: string }

/** Read-only checks across the admin; each item links to where it is fixed. */
export function attentionItems(sources: Sources): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (sources.pendingSuggestions) {
    const count = sources.pendingSuggestions;
    items.push({ id: 'suggestions', text: `${count} catalogue suggestion${count === 1 ? '' : 's'} waiting for review`, href: '/admin/academic-catalog' });
  }
  if (sources.aiManaged === false) {
    items.push({ id: 'ai', text: 'AI is off: no routing has been saved, so every AI request fails', href: '/admin/ai' });
  }
  const release = sources.release;
  if (release?.enabled) {
    if (release.allowIgnore === false) {
      items.push({ id: 'release', text: `The Android update is mandatory for every build below ${release.latestBuild ?? 'the latest'}`, href: '/admin/mobile-release' });
    } else if ((release.minSupportedBuild ?? 0) > 0) {
      items.push({ id: 'release', text: `The Android update is mandatory below build ${release.minSupportedBuild}`, href: '/admin/mobile-release' });
    }
  }
  if (sources.maintenanceMode) {
    items.push({ id: 'maintenance', text: 'Maintenance mode is on: students are blocked everywhere', href: '/admin/settings?tab=access' });
  }
  if (sources.coinsEnabled && sources.mobileAds) {
    const readiness = rewardedReadiness({ mobileAds: sources.mobileAds, coinsEnabled: true });
    if (readiness.failed) {
      items.push({ id: 'coins', text: `Coins are on, but students cannot earn: ${readiness.failed.failure}`, href: readiness.failed.href });
    }
  }
  return items;
}

async function getJson(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(url);
  return response.json() as Promise<unknown>;
}

const record = (value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;

async function loadSources(token: string): Promise<Sources> {
  const settle = <T,>(promise: Promise<T>) => promise.catch(() => null);
  const [suggestions, ai, release, settings, usage] = await Promise.all([
    settle(getJson('/api/admin/academic-catalog/suggestions', token)),
    settle(getJson('/api/admin/ai', token)),
    settle(getJson('/api/admin/mobile-release', token)),
    settle(getJson('/api/admin/settings', token)),
    settle(getJson('/api/admin/usage', token)),
  ]);
  const list = record(suggestions).suggestions;
  const coins = record(record(record(usage).policy).coins).enabled;
  const coinsEnabled = typeof coins === 'boolean' ? coins : null;
  // AdMob settings matter only when coins are on.
  const mobile = coinsEnabled ? record(await settle(getJson('/api/admin/ads/mobile', token))).config : null;
  const maintenance = record(record(settings).settings).maintenanceMode;
  return {
    pendingSuggestions: Array.isArray(list) ? list.filter((item) => (record(item).status ?? 'pending') === 'pending').length : null,
    aiManaged: ai ? record(record(ai).config).source === 'managed' : null,
    release: release ? record(release) as Sources['release'] : null,
    maintenanceMode: settings ? maintenance === true : null,
    coinsEnabled,
    mobileAds: mobile && typeof mobile === 'object' ? mobile as RewardedMobileAds : null,
  };
}

export function NeedsAttention({ getToken }: { getToken: () => Promise<string> }) {
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then(loadSources)
      .then((sources) => { if (!cancelled) setItems(attentionItems(sources)); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [getToken]);

  return (
    <section aria-labelledby="needs-attention-title" className="flex h-full flex-col rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
      <h2 id="needs-attention-title" className="text-base font-semibold text-[var(--acade-text)]">Needs attention</h2>
      {items === null ? (
        <p role="status" className="mt-3 text-sm text-[var(--acade-text-muted)]">Checking settings…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-[var(--acade-text-muted)]">
          <CircleCheck className="size-4 text-[var(--acade-success)]" aria-hidden="true" />
          Nothing needs attention.
        </p>
      ) : (
        <ul aria-label="Needs attention" className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex min-h-11 items-start gap-3 rounded-xl bg-[var(--acade-overlay)] px-3 py-2.5 text-sm text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--acade-warning)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.text}</span>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-[var(--acade-text-muted)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
