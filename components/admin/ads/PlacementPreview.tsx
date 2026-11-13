'use client';

import { useState } from 'react';
import { HousePromotionCard } from '@/components/ads/HousePromotionCard';
import { useImageStatus } from '@/components/ads/useImageStatus';
import { describeCampaignUrlProblem } from '@/lib/ads/config';
import type { AdCampaign } from '@/lib/ads/types';

/**
 * Static picture of a house creative inside the student page slot. It renders
 * the same card the site uses, but with no link, no visibility observer, no
 * stored views and no ad-network request; only the creative's own image loads.
 */
export function PlacementPreview({ campaign, placements }: { campaign: AdCampaign; placements: string[] }) {
  const imageProblem = describeCampaignUrlProblem(campaign.creative.imageUrl);
  const previewCampaign = imageProblem ? { ...campaign, creative: { ...campaign.creative, imageUrl: '' } } : campaign;
  const imageStatus = useImageStatus(previewCampaign.creative.imageUrl);

  if (!previewCampaign.creative.imageUrl && !campaign.creative.headline.trim()) {
    return <p className="rounded-xl border border-dashed border-[var(--acade-border)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">Add an image or a headline to preview this creative.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--acade-text-muted)]">
        {placements.length ? `Shown in ${placements.join(' and ')}, after the page’s main content.` : 'Not targeting a placement yet.'}
        {campaign.linkUrl ? <> Opens <span className="break-all text-[var(--acade-text)]">{campaign.linkUrl}</span> in a new tab.</> : ' Not clickable: no destination URL.'}
      </p>
      {imageProblem && <p className="text-sm text-[var(--acade-warning)]">Image URL problem: {imageProblem} The preview shows text only.</p>}
      {imageStatus === 'failed' && (
        <p className="text-sm text-[var(--acade-warning)]">The image did not load here. On the site this creative stays hidden until its image loads.</p>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <figure aria-label="Desktop preview" className="min-w-0 space-y-2">
          <figcaption className="text-xs font-medium text-[var(--acade-text-muted)]">Desktop</figcaption>
          {/* Scrolls inside its own frame on narrow admin screens rather than squeezing the row layout. */}
          <div className="overflow-x-auto rounded-xl bg-[var(--acade-void)] p-4">
            <div className="min-w-[36rem]">
              <HousePromotionCard campaign={previewCampaign} layout="row" preview />
            </div>
          </div>
        </figure>
        <figure aria-label="Phone preview (375 px)" className="min-w-0 space-y-2">
          <figcaption className="text-xs font-medium text-[var(--acade-text-muted)]">Phone, 375 px</figcaption>
          <div className="w-full max-w-[375px] rounded-xl bg-[var(--acade-void)] p-4">
            <HousePromotionCard campaign={previewCampaign} layout="stacked" preview />
          </div>
        </figure>
      </div>
    </div>
  );
}

/**
 * Collapsed by default; the preview (and its image request) mounts only when
 * opened, so long campaign lists stay light.
 */
export function PreviewDisclosure({ label, campaign, placements, className, unavailable }: {
  label: string;
  campaign: AdCampaign | null;
  placements: string[];
  className?: string;
  /** Shown instead of a preview when the creative cannot be served at all. */
  unavailable?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details className={className} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer rounded-lg py-1 text-sm font-semibold text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">
        {label}
      </summary>
      {open && (
        <div className="mt-3">
          {campaign
            ? <PlacementPreview campaign={campaign} placements={placements} />
            : <p className="text-sm text-[var(--acade-warning)]">{unavailable}</p>}
        </div>
      )}
    </details>
  );
}
