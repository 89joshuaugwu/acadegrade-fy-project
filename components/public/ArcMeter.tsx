import type { CSSProperties, ReactNode } from 'react';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE, classTicks, publicClassFor, type PublicScale } from '@/lib/public/scales';
import { cn } from '@/lib/utils/cn';

/**
 * The logo's arc as a meter: a three-quarter arc from 0.00 (bottom) round
 * to the maximum (right), drawn as five flat segments in the stripe colours
 * (never a gradient), class ticks at 1.50, 2.40, 3.50 and 4.50, and a gold
 * dot at the value. The dot travels along the arc in 320ms when the value
 * changes (a CSS rotation, so it needs no JavaScript); under reduced motion
 * or data saver it jumps.
 */

const CENTRE = 50;
const RADIUS = 36;
const STROKE = 10;
const START = 90;
const SWEEP = 270;

function point(angle: number, radius = RADIUS): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [Number((CENTRE + radius * Math.cos(rad)).toFixed(3)), Number((CENTRE + radius * Math.sin(rad)).toFixed(3))];
}

function arcPath(fromAngle: number, toAngle: number, radius = RADIUS): string {
  const [x0, y0] = point(fromAngle, radius);
  const [x1, y1] = point(toAngle, radius);
  const large = toAngle - fromAngle > 180 ? 1 : 0;
  return `M${x0} ${y0}A${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
}

/** Angle (degrees, clockwise from 3 o'clock) for a value on the scale. */
export function arcAngle(value: number, max = DEFAULT_SCALE.maxPoint): number {
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), max);
  return Number((START + (clamped / max) * SWEEP).toFixed(3));
}

/** "CGPA 4.43 of 5.00, Second Class Upper" */
export function arcLabel(value: number, label = 'CGPA', scale: PublicScale = DEFAULT_SCALE): string {
  return `${label} ${formatCgpa(value)} of ${scale.maxPoint.toFixed(2)}, ${publicClassFor(value, scale).label}`;
}

interface ArcMeterProps {
  /** The value to mark; null draws the arc without a dot. */
  value: number | null;
  /** What the value is, for the accessible label ("CGPA", "Semester GPA"). */
  label?: string;
  /** Overrides the generated accessible label. */
  ariaLabel?: string;
  /** Draw class names beside the ticks (long names on wide meters, 1st/2:1 on narrow ones). */
  tickLabels?: boolean;
  /** Mark a band of the scale with an outer line, for example a class range. */
  highlight?: { from: number; to: number } | null;
  /** Maximum rendered width in px (the meter is square). */
  size?: number;
  /** Content centred inside the arc (a figure). */
  children?: ReactNode;
  scale?: PublicScale;
  className?: string;
}

export function ArcMeter({
  value,
  label = 'CGPA',
  ariaLabel,
  tickLabels = true,
  highlight = null,
  size = 520,
  children,
  scale = DEFAULT_SCALE,
  className,
}: ArcMeterProps) {
  const max = scale.maxPoint;
  const pad = tickLabels ? 30 : 8;
  const box = 100 + pad * 2;
  const segments = Array.from({ length: max }, (_, index) => arcPath(arcAngle(index, max), arcAngle(index + 1, max)));
  const ticks = classTicks(scale);
  const name = ariaLabel ?? (value === null ? `${label} meter, 0.00 to ${max.toFixed(2)}` : arcLabel(value, label, scale));

  return (
    <div
      className={cn('pg-arc', className)}
      style={{ '--pg-arc-size': `${size}px` } as CSSProperties}
      role="img"
      aria-label={name}
    >
      <svg className="pg-arc__svg" viewBox={`${-pad} ${-pad} ${box} ${box}`} aria-hidden="true" focusable="false">
        <g fill="none" strokeWidth={STROKE}>
          {segments.map((d, index) => (
            <path key={d} d={d} stroke={`var(--pg-step-${Math.min(index + 1, 5)})`} />
          ))}
        </g>
        {highlight ? (
          <path
            d={arcPath(arcAngle(Math.min(highlight.from, highlight.to), max), arcAngle(Math.max(highlight.from, highlight.to), max), RADIUS + STROKE / 2 + 3)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            data-testid="arc-highlight"
          />
        ) : null}
        <g stroke="currentColor" strokeWidth={1.2}>
          {ticks.map((tick) => {
            const angle = arcAngle(tick.value, max);
            const [x0, y0] = point(angle, RADIUS - STROKE / 2 - 2);
            const [x1, y1] = point(angle, RADIUS + STROKE / 2 + 2);
            return <line key={tick.value} x1={x0} y1={y0} x2={x1} y2={y1} data-tick={tick.value} />;
          })}
        </g>
        {value !== null ? (
          // Rotating about the arc centre: the outer group moves the origin there,
          // so the inner group's CSS rotation (origin 0 0) can transition.
          <g transform={`translate(${CENTRE} ${CENTRE})`}>
            <g className="pg-arc__dot" style={{ transform: `rotate(${arcAngle(value, max)}deg)` }} data-angle={arcAngle(value, max)}>
              <circle cx={RADIUS} cy={0} r={STROKE / 2 + 1.5} className="pg-arc__ring" fill="var(--pg-gold)" strokeWidth={2} />
            </g>
          </g>
        ) : null}
      </svg>
      {tickLabels
        ? ticks.map((tick) => {
            const angle = arcAngle(tick.value, max);
            const [x, y] = point(angle, RADIUS + STROKE / 2 + 5);
            const cos = Math.cos((angle * Math.PI) / 180);
            const sin = Math.sin((angle * Math.PI) / 180);
            let shift = 'translate(-50%, -100%)';
            if (cos < -0.35) shift = 'translate(-100%, -50%)';
            else if (cos > 0.35) shift = 'translate(0, -50%)';
            else if (sin > 0) shift = 'translate(-50%, 0)';
            return (
              <span
                key={tick.value}
                className="pg-arc__tick"
                aria-hidden="true"
                style={{ left: `${((x + pad) / box) * 100}%`, top: `${((y + pad) / box) * 100}%`, transform: shift }}
              >
                <span className="pg-arc__long">{tick.label}</span>
                <span className="pg-arc__short">{tick.short}</span>
              </span>
            );
          })
        : null}
      {children ? <div className="pg-arc__center">{children}</div> : null}
    </div>
  );
}
