import { ImageResponse } from 'next/og';

/**
 * Open Graph images in the public style: a paper slip on the ground, the
 * five-step stripe across its top, the mark and wordmark, the page's
 * headline and one line under it. 1200 x 630. Page lanes call this from
 * their route's opengraph-image.tsx:
 *
 *   import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';
 *   export const size = OG_SIZE;
 *   export const contentType = OG_CONTENT_TYPE;
 *   export const alt = 'CGPA calculator for Nigerian universities';
 *   export default function Image() {
 *     return renderOgImage({ headline: 'CGPA calculator', line: 'For Nigerian universities. Free, no account.' });
 *   }
 *
 * Shared links never show anyone's grades: these images are static.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

export const OG_COLOURS = {
  ground: '#E7E5EE',
  paper: '#FBFAF7',
  paperRow: '#F1EFE9',
  ink: '#18153D',
  inkSoft: '#4B4868',
  steps: ['#5B52F2', '#8B67DD', '#C27BAA', '#E58F68', '#F2A922'],
} as const;

export interface OgImageOptions {
  /** Two lines at most; about 32 characters reads best. */
  headline: string;
  /** One supporting line. */
  line?: string;
  /** Small meta line above the headline, like a slip's ("Free tools · Nigerian universities"). */
  meta?: string;
}

/** The AcadeGrade mark for satori (same geometry as public/brand/acadegrade-mark.svg). */
function OgMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="r" gradientUnits="userSpaceOnUse" x1="14" y1="50" x2="50" y2="14">
          <stop offset="0" stopColor="#5B52F2" />
          <stop offset="1" stopColor="#C27BAA" />
        </linearGradient>
        <linearGradient id="f" gradientUnits="userSpaceOnUse" x1="50" y1="14" x2="86" y2="50">
          <stop offset="0" stopColor="#C27BAA" />
          <stop offset="1" stopColor="#F2A922" />
        </linearGradient>
      </defs>
      <path d="M50 86A36 36 0 0 1 14.005 49.372" stroke="#5B52F2" strokeWidth="11" fill="none" />
      <path d="M14 50A36 36 0 0 1 50.628 14.005" stroke="url(#r)" strokeWidth="11" fill="none" />
      <path d="M50 14A36 36 0 0 1 86 50" stroke="url(#f)" strokeWidth="11" fill="none" />
      <circle cx="86" cy="50" r="5.5" fill="#F2A922" />
      <circle cx="86" cy="50" r="3.2" fill="#FFD25A" />
      <path d="M40.9 52.9V58.7L50 63.3L59.8 58.7V52.9Z" fill="#FFFFFF" stroke="#4B4868" strokeWidth="1.4" />
      <path d="M50 41.9L66.9 47.1L50 55.6L33.3 47.4Z" fill="#FFFFFF" stroke="#4B4868" strokeWidth="1.4" />
      <path d="M62 49.3V55.2" stroke="#4B4868" strokeWidth="1.4" />
      <path d="M60.8 55.2H63.4V58.7H60.8Z" fill="#FFFFFF" stroke="#4B4868" strokeWidth="1.4" />
    </svg>
  );
}

/** The element tree, exported for tests. */
export function OgSlip({ headline, line, meta }: OgImageOptions) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: OG_COLOURS.ground, padding: '56px 0 0 72px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 820, background: OG_COLOURS.paper, color: OG_COLOURS.ink }}>
        <div style={{ display: 'flex', height: 48 }}>
          {OG_COLOURS.steps.map((colour) => (
            <div key={colour} style={{ display: 'flex', flex: 1, background: colour }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 56px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30 }}>
            <OgMark size={52} />
            <span>AcadeGrade</span>
          </div>
          {meta ? <div style={{ display: 'flex', marginTop: 40, fontSize: 24, color: OG_COLOURS.inkSoft }}>{meta}</div> : null}
          <div style={{ display: 'flex', marginTop: meta ? 12 : 44, fontSize: 72, lineHeight: 1, letterSpacing: -2.5, maxWidth: 700 }}>{headline}</div>
          {line ? <div style={{ display: 'flex', marginTop: 28, fontSize: 28, lineHeight: 1.3, color: OG_COLOURS.inkSoft, maxWidth: 680 }}>{line}</div> : null}
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 72 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OG_COLOURS.steps
            .slice()
            .reverse()
            .map((colour, index) => (
              <div key={colour} style={{ display: 'flex', width: 120 - index * 16, height: 18, background: colour }} />
            ))}
        </div>
      </div>
    </div>
  );
}

/** Renders the 1200 x 630 PNG. */
export function renderOgImage(options: OgImageOptions): ImageResponse {
  return new ImageResponse(<OgSlip {...options} />, OG_SIZE);
}
