/**
 * The AcadeGrade arc as a CGPA gauge (docs/brand-v2/DESIGN.md).
 * Same sweep as the logo: starts at the bottom, runs clockwise through the
 * left and the top, and ends at the right, 270 degrees in all. 0.00 sits at
 * the start, 5.00 at the end. The progress stroke and its gold dot move with
 * a CSS transition when `value` changes.
 *
 * Gradient and filter ids are unique per gauge (useId): with a fixed id, a hidden first
 * gauge (display:none) took every other gauge's gradient with it.
 */
import { useId } from 'react';

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 160;
const SWEEP = 270;
const START = 90; // degrees, 0 = right, clockwise (SVG), 90 = bottom

function point(angle: number, radius = RADIUS) {
  const rad = (angle * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function arcPath(from: number, to: number, radius = RADIUS) {
  const a = point(from, radius);
  const b = point(to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function angleFor(value: number) {
  const clamped = Math.max(0, Math.min(5, value));
  return START + (clamped / 5) * SWEEP;
}

const TRACK = arcPath(START, START + SWEEP);
const TICKS = [1.5, 2.4, 3.5, 4.5];

interface ArcGaugeProps {
  value: number;
  /** Dark ground (hero) or light. */
  tone?: 'night' | 'light';
  className?: string;
  label?: string;
}

export function ArcGauge({ value, tone = 'night', className, label }: ArcGaugeProps) {
  const progress = Math.max(0, Math.min(5, value)) / 5;
  const dot = point(angleFor(value));
  const trackColour = tone === 'night' ? 'rgba(255,255,255,0.09)' : 'rgba(23,19,58,0.08)';
  const tickColour = tone === 'night' ? 'rgba(255,255,255,0.35)' : 'rgba(23,19,58,0.3)';
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const arcId = `ag-arc-${uid}`;
  const glowId = `ag-glow-${uid}`;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id={arcId} x1="0.15" y1="1" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#5B4BFF" />
          <stop offset="45%" stopColor="#9C6BE8" />
          <stop offset="75%" stopColor="#F08C5A" />
          <stop offset="100%" stopColor="#FFB23F" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <path d={TRACK} fill="none" stroke={trackColour} strokeWidth={26} strokeLinecap="round" />
      {TICKS.map((tick) => {
        const inner = point(angleFor(tick), RADIUS - 24);
        const outer = point(angleFor(tick), RADIUS - 34);
        return <line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={tickColour} strokeWidth={2} strokeLinecap="round" />;
      })}
      <path
        d={TRACK}
        fill="none"
        stroke={`url(#${arcId})`}
        strokeWidth={26}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100 100"
        className="ag-gauge-progress"
        style={{ strokeDashoffset: 100 - progress * 100 }}
      />
      <circle cx={dot.x} cy={dot.y} r={22} fill="#FFB23F" opacity={0.45} filter={`url(#${glowId})`} className="ag-gauge-dot" />
      <circle cx={dot.x} cy={dot.y} r={11} fill="#FFD27F" stroke="#FFB23F" strokeWidth={4} className="ag-gauge-dot" />
    </svg>
  );
}
