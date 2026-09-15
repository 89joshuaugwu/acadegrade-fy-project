'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { safeParseAdsConfig } from '@/lib/ads/config';
import {
  getEligibleCampaigns,
  pruneImpressionHistory,
  selectWeightedCampaign,
} from '@/lib/ads/delivery';
import type {
  AdCampaign,
  AdImpressionHistory,
  AdPlacementId,
  AdsConfig,
} from '@/lib/ads/types';
import { cn } from '@/lib/utils/cn';

const HISTORY_KEY = 'acadegrade:ads:impressions:v1';
const VIEWER_KEY = 'acadegrade:ads:viewer:v1';

interface AdPlacementProps {
  placement: AdPlacementId;
  config?: AdsConfig | unknown;
  seed?: string;
  now?: number;
  className?: string;
}

function readHistory(): AdImpressionHistory {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, timestamps]) => (
        Array.isArray(timestamps) && timestamps.every((timestamp) => typeof timestamp === 'number')
      ))
    ) as AdImpressionHistory;
  } catch {
    return {};
  }
}

function getViewerSeed() {
  const current = localStorage.getItem(VIEWER_KEY);
  if (current) return current;
  const generated = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(VIEWER_KEY, generated);
  return generated;
}

function recordImpression(history: AdImpressionHistory, campaign: AdCampaign, now: number) {
  const next = {
    ...history,
    [campaign.id]: [
      ...pruneImpressionHistory(
        history[campaign.id] ?? [],
        now,
        campaign.frequencyCap.windowHours
      ),
      now,
    ],
  };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private contexts; ad delivery remains optional.
  }
}

export function AdPlacement({ placement, config, seed, now, className }: AdPlacementProps) {
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const recordedCampaign = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function chooseCampaign() {
      let rawConfig = config;
      if (rawConfig === undefined) {
        const { getDocument } = await import('@/lib/firebase/firestore');
        rawConfig = (await getDocument<{ adsConfig?: unknown }>('config/settings'))?.adsConfig;
      }
      const parsed = safeParseAdsConfig(rawConfig);
      if (!parsed || cancelled) return;

      const currentTime = now ?? Date.now();
      const history = readHistory();
      const eligible = getEligibleCampaigns(parsed, placement, {
        now: currentTime,
        impressionHistory: history,
      });
      const day = new Date(currentTime).toISOString().slice(0, 10);
      const selected = selectWeightedCampaign(
        eligible,
        `${seed ?? getViewerSeed()}:${placement}:${day}`
      );
      if (!selected || cancelled) return;

      if (recordedCampaign.current !== selected.id) {
        recordImpression(history, selected, currentTime);
        recordedCampaign.current = selected.id;
      }
      setCampaign(selected);
    }

    chooseCampaign().catch(() => {
      if (!cancelled) setCampaign(null);
    });
    return () => { cancelled = true; };
  }, [config, now, placement, seed]);

  if (!campaign) return null;

  const content = (
    <>
      {campaign.creative.imageUrl && (
        <div
          role="img"
          aria-label={campaign.creative.altText || campaign.name}
          className="min-h-32 bg-cover bg-center sm:min-h-full sm:w-44 sm:shrink-0"
          style={{ backgroundImage: `url(${campaign.creative.imageUrl})` }}
        />
      )}
      <div className="min-w-0 flex-1 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--acade-primary)]">
          <Sparkles className="size-4" aria-hidden="true" />
          <span>House promotion</span>
        </div>
        {campaign.creative.headline && (
          <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
            {campaign.creative.headline}
          </h2>
        )}
        {campaign.creative.body && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--acade-text-muted)]">
            {campaign.creative.body}
          </p>
        )}
        {campaign.creative.ctaLabel && campaign.linkUrl && (
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--acade-primary)]">
            {campaign.creative.ctaLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );

  return (
    <aside
      aria-label="Featured from AcadeGrade"
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--acade-primary)]/20 bg-[var(--acade-deep)] shadow-[var(--shadow-card)]',
        className
      )}
    >
      {campaign.linkUrl ? (
        <a
          href={campaign.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={campaign.creative.ctaLabel || campaign.creative.headline || campaign.name}
          className="flex min-h-32 flex-col transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)] sm:flex-row"
        >
          {content}
        </a>
      ) : (
        <div className="flex min-h-32 flex-col sm:flex-row">{content}</div>
      )}
    </aside>
  );
}

export type { AdPlacementProps };
