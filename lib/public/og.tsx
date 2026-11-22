import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Open Graph images in brand v2 "Gold hour" (docs/brand-v2/DESIGN.md): a Night
 * ground, the mark and wordmark, the page's headline in Bricolage Grotesque,
 * one Geist line under it and the logo arc as a gauge on the right. 1200 x 630
 * PNG, flat colour so it stays well under WhatsApp's ~300 KB limit. Page lanes
 * call this from their route's opengraph-image.tsx:
 *
 *   import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';
 *   export const size = OG_SIZE;
 *   export const contentType = OG_CONTENT_TYPE;
 *   export const alt = 'CGPA calculator for Nigerian universities';
 *   export default function Image() {
 *     return renderOgImage({ headline: 'CGPA calculator', line: 'For Nigerian universities. Free, no account.' });
 *   }
 *
 * Fonts are read from assets/og-fonts in the repo; nothing is fetched at render.
 * Shared links never show anyone's grades: `figure` is only ever an example.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

export const OG_COLOURS = {
  night: '#0E0B2B',
  violet: '#6B4EFF',
  gold: '#FFB23F',
  haze: '#F4F1FF',
  mistOnNight: '#B8B3D9',
  white: '#FFFFFF',
} as const;

export interface OgImageOptions {
  /** Two lines at most; about 32 characters reads best. */
  headline: string;
  /** One supporting line. */
  line?: string;
  /** A short plain line at the foot of the card ("Free tools for Nigerian universities"). */
  meta?: string;
  /** An example figure drawn inside the arc. Never a real student's. */
  figure?: { value: number; label: string };
}

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700 | 800; style: 'normal' };

const FONT_DIR = path.join(process.cwd(), 'assets', 'og-fonts');
const FONT_FILES: readonly { file: string; name: string; weight: OgFont['weight'] }[] = [
  { file: 'bricolage-grotesque-700.woff', name: 'Bricolage Grotesque', weight: 700 },
  { file: 'bricolage-grotesque-800.woff', name: 'Bricolage Grotesque', weight: 800 },
  { file: 'geist-400.ttf', name: 'Geist', weight: 400 },
  { file: 'geist-500.ttf', name: 'Geist', weight: 500 },
];

let fontsPromise: Promise<OgFont[]> | null = null;

/** The four local font files, read once per server instance. */
export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, name, weight }) => {
      const buffer = await readFile(path.join(FONT_DIR, file));
      const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      return { name, data, weight, style: 'normal' as const };
    })
  ).catch((error) => {
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}

/* ------------------------------------------------------------- the arc */

const ARC = { size: 420, radius: 168, stroke: 30, start: 90, sweep: 270 } as const;

function arcPoint(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const centre = ARC.size / 2;
  return { x: centre + ARC.radius * Math.cos(rad), y: centre + ARC.radius * Math.sin(rad) };
}

function arcPath(to: number) {
  const a = arcPoint(ARC.start);
  const b = arcPoint(to);
  const large = to - ARC.start > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${ARC.radius} ${ARC.radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function OgArc({ value }: { value: number }) {
  const end = ARC.start + (Math.max(0, Math.min(5, value)) / 5) * ARC.sweep;
  const dot = arcPoint(end);
  return (
    <svg width={ARC.size} height={ARC.size} viewBox={`0 0 ${ARC.size} ${ARC.size}`}>
      <defs>
        <linearGradient id="og-arc" x1="0.15" y1="1" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#5B4BFF" />
          <stop offset="45%" stopColor="#9C6BE8" />
          <stop offset="75%" stopColor="#F08C5A" />
          <stop offset="100%" stopColor={OG_COLOURS.gold} />
        </linearGradient>
      </defs>
      <path d={arcPath(ARC.start + ARC.sweep)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={ARC.stroke} strokeLinecap="round" />
      <path d={arcPath(end)} fill="none" stroke="url(#og-arc)" strokeWidth={ARC.stroke} strokeLinecap="round" />
      <circle cx={dot.x} cy={dot.y} r={ARC.stroke / 2 + 7} fill={OG_COLOURS.gold} />
      <circle cx={dot.x} cy={dot.y} r={7} fill="#FFE2A8" />
    </svg>
  );
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

/** The cap from the mark, drawn large in the arc when there is no example figure. */
function OgCap() {
  return (
    <svg width={150} height={120} viewBox="30 38 40 28">
      <path d="M40.9 52.9V58.7L50 63.3L59.8 58.7V52.9Z" fill="rgba(255,255,255,0.18)" stroke={OG_COLOURS.white} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M50 41.9L66.9 47.1L50 55.6L33.3 47.4Z" fill={OG_COLOURS.white} stroke={OG_COLOURS.white} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M62 49.3V55.2" stroke={OG_COLOURS.gold} strokeWidth="1.6" />
      <path d="M60.8 55.2H63.4V58.7H60.8Z" fill={OG_COLOURS.gold} />
    </svg>
  );
}

/** The element tree, exported for tests. */
export function OgCard({ headline, line, meta, figure }: OgImageOptions) {
  const headlineSize = headline.length > 34 ? 64 : 76;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: OG_COLOURS.night,
        backgroundImage:
          'radial-gradient(circle at 82% 30%, rgba(107,78,255,0.38) 0%, rgba(14,11,43,0) 46%), radial-gradient(circle at 96% 96%, rgba(255,178,63,0.22) 0%, rgba(14,11,43,0) 40%)',
        color: OG_COLOURS.white,
        fontFamily: 'Geist',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 700, height: '100%', padding: '64px 0 60px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <OgMark size={52} />
          <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 32, letterSpacing: -0.8 }}>AcadeGrade</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Bricolage Grotesque',
              fontWeight: 800,
              fontSize: headlineSize,
              lineHeight: 1.02,
              letterSpacing: -headlineSize * 0.035,
              maxWidth: 640,
            }}
          >
            {headline}
          </div>
          {line ? (
            <div style={{ display: 'flex', marginTop: 26, fontSize: 28, lineHeight: 1.35, color: OG_COLOURS.mistOnNight, maxWidth: 600 }}>{line}</div>
          ) : null}
        </div>
        {meta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, fontWeight: 500, color: OG_COLOURS.mistOnNight }}>
            <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: OG_COLOURS.gold }} />
            <span>{meta}</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', position: 'absolute', right: 70, top: 105, width: ARC.size, height: ARC.size }}>
        <OgArc value={figure ? figure.value : 4.6} />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            top: 0,
            width: ARC.size,
            height: ARC.size,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {figure ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 280 }}>
              <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 104, letterSpacing: -3.5, lineHeight: 1 }}>
                {figure.value.toFixed(2)}
              </span>
              <span style={{ display: 'flex', marginTop: 8, fontSize: 24, textAlign: 'center', justifyContent: 'center', maxWidth: 260, fontWeight: 500, color: OG_COLOURS.gold }}>{figure.label}</span>
            </div>
          ) : (
            <OgCap />
          )}
        </div>
      </div>
    </div>
  );
}

/** Kept for older imports. */
export const OgSlip = OgCard;

/** Renders the 1200 x 630 PNG. */
export async function renderOgImage(options: OgImageOptions): Promise<ImageResponse> {
  return new ImageResponse(<OgCard {...options} />, { ...OG_SIZE, fonts: await loadOgFonts() });
}
