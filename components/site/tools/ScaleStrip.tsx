import type { ReactNode } from 'react';
import { roundCgpa } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE } from '@/lib/public/scales';

/**
 * The 5-point scale as one bar of class zones (the home page's scale strip),
 * with an optional marker for the visitor's figure, plus the class and grade
 * lists. Every value comes from lib/public/scales.ts. Server-safe.
 */

const ZONE_TONE: Record<string, string> = {
  Fail: 'bg-[#E4E0F5] text-ag-ink',
  Pass: 'bg-[#CFC6FF] text-ag-ink',
  '3rd': 'bg-[#B3A4FF] text-ag-ink',
  '2:2': 'bg-[#8E74FF] text-ag-ink',
  '2:1': 'bg-ag-violet text-white',
  '1st': 'bg-ag-gold text-ag-night',
};

const DOT_TONE: Record<string, string> = {
  Fail: 'bg-[#C2361F]',
  Pass: 'bg-[#CFC6FF]',
  '3rd': 'bg-[#B3A4FF]',
  '2:2': 'bg-[#8E74FF]',
  '2:1': 'bg-ag-violet',
  '1st': 'bg-ag-gold',
};

const max = DEFAULT_SCALE.maxPoint;

/** Zones low to high, with their widths on the 0 to 5 bar. */
function zones() {
  const bands = [...DEFAULT_SCALE.classBands].reverse();
  return bands.map((band, index) => {
    const from = index === 0 ? 0 : band.min;
    const to = index === bands.length - 1 ? max : bands[index + 1].min;
    return { band, from, to };
  });
}

export function ScaleBar({
  marker,
  compact = false,
  caption,
}: {
  /** The visitor's figure on the bar, with a line under it. */
  marker?: { value: number; title: ReactNode; sub?: ReactNode } | null;
  compact?: boolean;
  caption: string;
}) {
  const at = marker ? (Math.max(0, Math.min(max, roundCgpa(marker.value))) / max) * 100 : null;
  const alignRight = at !== null && at > 55;
  return (
    <figure className="m-0">
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="relative">
        <div className={`flex overflow-hidden rounded-2xl ${compact ? 'h-12' : 'h-14 sm:h-20'}`}>
          {zones().map(({ band, from, to }) => (
            <div
              key={band.short}
              className={`flex min-w-0 flex-col justify-center px-1 sm:px-3 ${ZONE_TONE[band.engineShort]}`}
              style={{ width: `${((to - from) / max) * 100}%` }}
            >
              <span className={`${compact ? 'hidden' : 'hidden xl:block'} truncate text-[0.8125rem] font-semibold leading-tight`}>{band.label}</span>
              <span
                className={`${compact ? '' : 'xl:hidden'} ${band.engineShort === 'Pass' ? 'hidden sm:block' : ''} overflow-hidden whitespace-nowrap text-center text-[0.8125rem] font-semibold leading-tight sm:text-left`}
              >
                {band.engineShort === 'Fail' ? '' : band.short}
              </span>
            </div>
          ))}
        </div>
        {at !== null ? (
          <div
            className="absolute -bottom-2 -top-2 w-1 -translate-x-1/2 rounded-full bg-ag-night ring-2 ring-white transition-[left] duration-500 motion-reduce:transition-none"
            style={{ left: `${at}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="ag-num mt-3 flex justify-between text-[0.8125rem] text-ag-mist" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((tick) => (
          <span key={tick}>{tick.toFixed(2)}</span>
        ))}
      </div>
      {marker && at !== null ? (
        <div
          className="mt-3 flex"
          style={alignRight ? { justifyContent: 'flex-end', paddingRight: `calc(${100 - at}% - 0.125rem)` } : { paddingLeft: `calc(${at}% - 0.125rem)` }}
        >
          <p
            className={`max-w-[16rem] border-ag-night text-[0.875rem] leading-snug text-ag-ink ${alignRight ? 'border-r-4 pr-3 text-right' : 'border-l-4 pl-3'}`}
          >
            <span className="font-semibold">{marker.title}</span>
            {marker.sub ? <span className="block text-ag-mist">{marker.sub}</span> : null}
          </p>
        </div>
      ) : null}
    </figure>
  );
}

/** The class floors as two-ended rows; `active` (a class short label) is highlighted. */
export function ClassList({ active, activeNote }: { active?: string | null; activeNote?: string }) {
  const bands = DEFAULT_SCALE.classBands.filter((band) => band.engineShort !== 'Fail');
  return (
    <ul className="space-y-1.5">
      {bands.map((band) => {
        const on = active === band.short;
        return (
          <li
            key={band.short}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[0.9375rem] transition-colors ${on ? 'bg-ag-night text-white' : 'text-ag-ink'}`}
          >
            <span className={`h-3 w-3 shrink-0 rounded-full ${DOT_TONE[band.engineShort]}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 font-semibold">
              {band.label}
              {on && activeNote ? <span className="block text-[0.8125rem] font-normal text-ag-gold">{activeNote}</span> : null}
            </span>
            <span className={`ag-num shrink-0 ${on ? 'text-white/80' : 'text-ag-mist'}`}>
              {band.min.toFixed(2)} to {band.max.toFixed(2)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The grade bands as two-ended rows ("A, 70 to 100 ... 5 points"). */
export function GradeList() {
  return (
    <ul className="space-y-1.5">
      {DEFAULT_SCALE.gradeBands.map((band) => (
        <li key={band.grade} className="flex items-center gap-3 rounded-xl px-4 py-3 text-[0.9375rem] text-ag-ink">
          <span
            className={`ag-display grid h-8 w-8 shrink-0 place-items-center rounded-full text-[1rem] font-bold ${
              band.gradePoint === 5 ? 'bg-ag-gold text-ag-night' : band.gradePoint === 0 ? 'bg-[#C2361F] text-white' : 'bg-ag-haze text-ag-ink'
            }`}
            aria-hidden="true"
          >
            {band.grade}
          </span>
          <span className="min-w-0 flex-1">
            <span className="sr-only">{band.grade}, </span>
            <span className="ag-num">
              {band.minScore} to {band.maxScore}
            </span>
          </span>
          <span className="ag-num shrink-0 font-semibold">
            {band.gradePoint} point{band.gradePoint === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  );
}
