import type { CSSProperties, ReactNode } from 'react';
import { AcadeGradeMark } from '@/components/public/Logo';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { EXAMPLE_STUDENT, computeExampleSlip } from '@/lib/public/example-student';
import type { PagePhoto } from '@/lib/public/page-photos';

/**
 * The right half of the auth shell at 1024px and up: the page's photo
 * (photoFor('auth.*')) under a night gradient, a small app card with the
 * example student's real figures, and one reassurance line as the caption.
 * Phones and tablets never see it, and the art-directed <source media>
 * plus a 1x1 fallback means they download nothing for it either.
 */

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const ARC = 'linear-gradient(90deg, #6B4EFF 0%, #9C6BE8 45%, #F08C5A 75%, #FFB23F 100%)';
const WIDE = '(min-width: 1024px)';
/** The panel is the right column of a 1.05fr / 1fr grid, less 12px padding: about 48vw. */
const SIZES = '48vw';

function ExampleCard() {
  const slip = computeExampleSlip();
  const share = Math.max(0, Math.min(1, slip.cgpa / 5));
  return (
    <div aria-hidden="true" className="w-[17.5rem] rounded-[20px] bg-white p-5 text-ag-ink shadow-[0_32px_80px_-24px_rgba(14,11,43,0.7)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold">
          <AcadeGradeMark size={20} />
          Example record
        </span>
        <span className="rounded-full bg-ag-haze px-2.5 py-1 text-[0.8125rem] font-semibold text-ag-ink">{EXAMPLE_STUDENT.levelLabel}</span>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="ag-display ag-num text-[2.75rem] font-bold leading-none">{formatCgpa(slip.cgpa)}</span>
        <span className="pb-1 text-[0.8125rem] font-medium text-ag-mist">CGPA of 5.00</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ag-ink/10">
        <div className="h-full rounded-full" style={{ width: `${share * 100}%`, backgroundImage: ARC, backgroundSize: `${100 / share}% 100%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-[0.8125rem]">
        <span className="rounded-full bg-ag-violet/10 px-2.5 py-1 font-semibold text-ag-violet">{slip.classBand.label}</span>
        <span className="ag-num text-ag-mist">{slip.totalUnits} units</span>
      </div>
    </div>
  );
}

export function AuthAside({ photo, reassurance }: { photo: PagePhoto | null; reassurance?: ReactNode }) {
  return (
    <div className="hidden p-3 lg:block">
      <figure className="ag-hero-sky sticky top-3 h-[calc(100dvh-1.5rem)] min-h-[36rem] overflow-hidden rounded-[28px]">
        {photo ? (
          <picture className="mo-load-visual absolute inset-0 block">
            {photo.avifSrcSet ? <source media={WIDE} type="image/avif" srcSet={photo.avifSrcSet} sizes={SIZES} /> : null}
            {photo.webpSrcSet ? <source media={WIDE} type="image/webp" srcSet={photo.webpSrcSet} sizes={SIZES} /> : null}
            {/* A 1x1 fallback: phones and tablets match no source and request nothing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TRANSPARENT_PIXEL}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
              style={{ objectPosition: photo.objectPosition }}
            />
          </picture>
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,11,43,0.35)_0%,rgba(14,11,43,0)_28%,rgba(14,11,43,0.25)_55%,rgba(14,11,43,0.93)_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_50%_at_10%_0%,rgba(107,78,255,0.35),transparent_70%)]" />
        <div className="mo-load absolute right-8 top-8 xl:right-10 xl:top-10" style={{ '--mo-at': '450ms' } as CSSProperties}>
          <ExampleCard />
        </div>
        {reassurance ? (
          <figcaption className="absolute inset-x-0 bottom-0 p-8 xl:p-12">
            <span className="ag-display block max-w-[19ch] text-[2rem] font-bold leading-[1.08] text-white xl:text-[2.375rem]">{reassurance}</span>
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
