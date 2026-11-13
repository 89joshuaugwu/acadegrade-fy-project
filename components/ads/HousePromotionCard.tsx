import type { Ref } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { AdCampaign } from '@/lib/ads/types';
import { cn } from '@/lib/utils/cn';

/**
 * `responsive` follows the viewport (student pages). Admin previews force
 * `stacked` (phone) or `row` (desktop) because a preview frame is narrower
 * than the admin viewport that drives the responsive breakpoints.
 */
export type HousePromotionLayout = 'responsive' | 'stacked' | 'row';

const LAYOUT = {
  responsive: {
    frame: 'flex min-h-32 flex-col sm:flex-row',
    image: 'min-h-32 bg-cover bg-center sm:min-h-full sm:w-44 sm:shrink-0',
    body: 'min-w-0 flex-1 p-5 sm:p-6',
  },
  stacked: {
    frame: 'flex min-h-32 flex-col',
    image: 'min-h-32 bg-cover bg-center',
    body: 'min-w-0 flex-1 p-5',
  },
  row: {
    frame: 'flex min-h-32 flex-row',
    image: 'min-h-full w-44 shrink-0 bg-cover bg-center',
    body: 'min-w-0 flex-1 p-6',
  },
} as const;

interface HousePromotionCardProps {
  campaign: AdCampaign;
  layout?: HousePromotionLayout;
  /** Static admin preview: no landmark, no navigation, no delivery side effects. */
  preview?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

export function HousePromotionCard({ campaign, layout = 'responsive', preview = false, className, ref }: HousePromotionCardProps) {
  const classes = LAYOUT[layout];
  const { creative } = campaign;
  const Headline = preview ? 'p' : 'h2';
  const content = (
    <>
      {creative.imageUrl && (
        <div
          role="img"
          aria-label={creative.altText || campaign.name}
          className={classes.image}
          style={{ backgroundImage: `url(${creative.imageUrl})` }}
        />
      )}
      <div className={classes.body}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--acade-primary)]">
          <Sparkles className="size-4" aria-hidden="true" />
          <span>House promotion</span>
        </div>
        {creative.headline && (
          // Previews sit inside admin sections, so they must not add to the page outline.
          <Headline className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
            {creative.headline}
          </Headline>
        )}
        {creative.body && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--acade-text-muted)]">
            {creative.body}
          </p>
        )}
        {creative.ctaLabel && campaign.linkUrl && (
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--acade-primary)]">
            {creative.ctaLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );

  const surface = 'overflow-hidden rounded-2xl border border-[var(--acade-primary)]/20 bg-[var(--acade-deep)] shadow-[var(--shadow-card)]';
  if (preview) {
    return (
      <div ref={ref as Ref<HTMLDivElement>} data-house-preview="" className={cn(surface, className)}>
        <div className={classes.frame}>{content}</div>
      </div>
    );
  }

  return (
    <aside ref={ref} aria-label="Featured from AcadeGrade" className={cn(surface, className)}>
      {campaign.linkUrl ? (
        <a
          href={campaign.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={creative.ctaLabel || creative.headline || campaign.name}
          className={cn(classes.frame, 'transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)]')}
        >
          {content}
        </a>
      ) : (
        <div className={classes.frame}>{content}</div>
      )}
    </aside>
  );
}
