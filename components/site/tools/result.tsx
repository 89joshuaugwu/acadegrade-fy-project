import type { ReactNode } from 'react';
import { ArcGauge } from '@/components/site/ArcGauge';

/**
 * The night result card beside every tool (the same instrument as the home
 * hero's live card): the logo arc as a gauge with the figure in its middle,
 * the class as a pill, then the small print. Server-safe pieces.
 */

export function NightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`ag-hero-sky relative overflow-hidden rounded-[24px] p-5 text-white shadow-[0_30px_70px_-34px_rgba(14,11,43,0.85)] sm:rounded-[28px] sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The arc with its figure. `value` null draws the track only and prints a
 * dash. `figure` is what is printed (the tweened number, or a word such as
 * "Secured"); the gauge's accessible name is `label`.
 */
export function GaugeFigure({
  value,
  figure,
  caption,
  label,
  size = 'lg',
  intro = false,
  className = '',
}: {
  value: number | null;
  figure: ReactNode;
  caption?: ReactNode;
  label?: string;
  size?: 'lg' | 'md' | 'sm';
  intro?: boolean;
  className?: string;
}) {
  const width = { lg: 'max-w-[14rem]', md: 'max-w-[12rem]', sm: 'max-w-[8.5rem]' }[size];
  const type = { lg: 'text-[3.25rem] sm:text-[3.5rem]', md: 'text-[2.5rem]', sm: 'text-[1.625rem]' }[size];
  const isWord = typeof figure === 'string' && !/^[\d.—-]+$/.test(figure);
  return (
    <div className={`relative mx-auto w-full ${width} ${className}`}>
      <ArcGauge
        value={value ?? 0}
        className={`block h-auto w-full ${value === null ? 'ag-gauge-empty' : ''} ${intro ? 'ag-gauge-intro' : ''}`}
        label={label}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-[6%]" aria-hidden="true">
        {caption ? <span className={`${size === 'sm' ? 'text-[0.8125rem]' : 'text-[0.8125rem]'} font-medium text-ag-mist-night`}>{caption}</span> : null}
        <span
          className={`ag-display ag-num font-bold leading-none ${isWord ? (size === 'sm' ? 'text-[1.125rem]' : 'text-[1.75rem]') : type} ${
            figure === '—' ? 'text-white/45' : 'text-white'
          }`}
        >
          {figure}
        </span>
      </div>
    </div>
  );
}

/** The class as a pill: gold at First Class, coral below a Pass, quiet otherwise. */
export function ClassPill({ label, tone = 'plain' }: { label: ReactNode; tone?: 'gold' | 'mark' | 'plain' | 'empty' }) {
  const tones = {
    gold: 'bg-ag-gold text-ag-night',
    mark: 'bg-[#FF8B7E] text-ag-night',
    plain: 'bg-white/10 text-white',
    empty: 'bg-white/[0.06] text-white/60',
  };
  return <p className={`inline-block rounded-full px-3.5 py-1.5 text-[0.9375rem] font-semibold transition-colors duration-300 ${tones[tone]}`}>{label}</p>;
}

/** Small stat: label over a display-face figure. */
export function Stat({ label, value, accent = false }: { label: ReactNode; value: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] text-ag-mist-night">{label}</dt>
      <dd className={`ag-display ag-num mt-0.5 text-[1.625rem] font-bold leading-tight ${accent ? 'text-ag-gold' : 'text-white'}`}>{value}</dd>
    </div>
  );
}

/**
 * The phone summary strip: sticks under the header while the visitor works
 * through the rows. Visual only (aria-hidden); the live region speaks.
 * Hidden from 1024px, where the result card itself is sticky.
 */
export function SummaryStrip({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="sticky top-[76px] z-20 -mx-1 mb-4 lg:hidden">
      <div className="flex min-h-[3.5rem] items-center gap-3 rounded-2xl bg-ag-night px-4 py-2.5 text-white shadow-[0_16px_40px_-18px_rgba(14,11,43,0.8)]">{children}</div>
    </div>
  );
}

/**
 * A 40px version of the arc for the summary strip. Deliberately not ArcGauge:
 * ArcGauge's gradient has a fixed id, and the strip is display:none from
 * 1024px, so a hidden first copy of that id would blank every other gauge on
 * the page. This ring uses plain colours and no ids.
 */
export function MiniArc({ value }: { value: number | null }) {
  const progress = value === null ? 0 : Math.max(0, Math.min(5, value)) / 5;
  const track = 'M 20 35 A 15 15 0 1 1 35 20';
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
      <path d={track} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={4} strokeLinecap="round" />
      {value === null ? null : (
        <path
          d={track}
          fill="none"
          stroke="#FFB23F"
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          className="ag-gauge-progress"
          style={{ strokeDashoffset: 100 - progress * 100 }}
        />
      )}
    </svg>
  );
}
