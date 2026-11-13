'use client';

import { useEffect, useRef, useState } from 'react';
import { legacyBannersToAdsConfig, safeParseAdsConfig } from '@/lib/ads/config';
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
import { HousePromotionCard } from './HousePromotionCard';
import { useImageStatus } from './useImageStatus';

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
  const placementElement = useRef<HTMLElement | null>(null);
  const recordedCreatives = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function chooseCampaign() {
      setCampaign(null);

      let rawConfig = config;
      let legacyConfig: AdsConfig | null = null;
      if (rawConfig === undefined) {
        const { getDocument } = await import('@/lib/firebase/firestore');
        const settings = await getDocument<{
          adsConfig?: unknown;
          advertBanners?: unknown;
        }>('config/settings');
        rawConfig = safeParseAdsConfig(settings?.adsConfig);
        legacyConfig = legacyBannersToAdsConfig(settings?.advertBanners);
      }

      const currentTime = now ?? Date.now();
      const history = readHistory();
      const day = new Date(currentTime).toISOString().slice(0, 10);

      const candidates = [safeParseAdsConfig(rawConfig), legacyConfig].filter(
        (candidate): candidate is AdsConfig => candidate !== null
      );
      const selected = candidates.map((candidate) => selectWeightedCampaign(
        getEligibleCampaigns(candidate, placement, {
          now: currentTime,
          impressionHistory: history,
        }),
        `${seed ?? getViewerSeed()}:${placement}:${day}`
      )).find((candidate): candidate is AdCampaign => candidate !== null);

      if (!selected || cancelled) return;

      setCampaign(selected);
    }

    chooseCampaign().catch(() => {
      if (!cancelled) setCampaign(null);
    });
    return () => { cancelled = true; };
  }, [config, now, placement, seed]);

  // Image creatives render, and become countable, only after the image loads;
  // a failed image hides the creative (as Android does) instead of leaving an
  // empty block. Nothing is reserved while pending, so failure cannot shift layout.
  const imageStatus = useImageStatus(campaign?.creative.imageUrl ?? '');
  const ready = imageStatus === 'none' || imageStatus === 'loaded';

  useEffect(() => {
    const element = placementElement.current;
    // Explicit fail-closed fallback: keep optional content, but do not consume a
    // frequency allowance when the browser cannot establish its visibility.
    if (!campaign || !ready || !element || typeof IntersectionObserver !== 'function') return;
    const creativeKey = JSON.stringify([placement, campaign.id, campaign.creative, campaign.linkUrl]);
    if (recordedCreatives.current.has(creativeKey)) return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!active || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
      if (recordedCreatives.current.has(creativeKey)) return;
      const currentTime = now ?? Date.now();
      const history = readHistory();
      const recent = pruneImpressionHistory(history[campaign.id] ?? [], currentTime, campaign.frequencyCap.windowHours);
      // Another placement may have consumed the allowance since selection.
      if (recent.length < campaign.frequencyCap.maxImpressions) {
        recordImpression(history, campaign, currentTime);
      }
      recordedCreatives.current.add(creativeKey);
      active = false;
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [campaign, now, placement, ready]);

  if (!campaign || !ready) return null;

  return <HousePromotionCard ref={placementElement} campaign={campaign} className={className} />;
}

export type { AdPlacementProps };
