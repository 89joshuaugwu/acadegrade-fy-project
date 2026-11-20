import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Stationery edges: the only ornaments on the public site. Every edge is a
 * filled shape (clip-path or mask), never an outline, hairline or shadow.
 */

const round = (value: number) => Number(value.toFixed(3));

/**
 * Zigzag tear for the bottom of a receipt: a clip-path polygon with `teeth`
 * teeth of `depth` px. Teeth scale with the width; about one tooth per 20px
 * reads as a tear (24 teeth on a 460px slip).
 */
export function zigzag(teeth = 24, depth = 10): string {
  const count = Math.max(2, Math.round(teeth));
  const step = 100 / count;
  const points = ['0 0', '100% 0', `100% calc(100% - ${depth}px)`];
  for (let index = count; index > 0; index -= 1) {
    const right = round(step * index);
    const middle = round(step * index - step / 2);
    points.push(`${middle}% 100%`, `${round(right - step)}% calc(100% - ${depth}px)`);
  }
  return `polygon(${points.join(', ')})`;
}

/** Style for a zigzag bottom edge. Add bottom padding of at least `depth` to the element. */
export function zigzagStyle(teeth = 24, depth = 10): CSSProperties {
  const clip = zigzag(teeth, depth);
  return { clipPath: clip, WebkitClipPath: clip };
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const CIRCLE = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><circle cx='1' cy='1' r='1'/></svg>");
const FULL = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'><rect width='1' height='1'/></svg>");
const SCALLOP_TILE = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 1' preserveAspectRatio='none'><path d='M0 1A1 1 0 0 1 2 1Z'/></svg>");
const SCALLOP_CUT = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 1' preserveAspectRatio='none'><path d='M0 0H2V1A1 1 0 0 0 0 1Z'/></svg>");

export type NotchSide = 'left' | 'right' | 'both';

/**
 * Ticket notch: half-circle cut-outs of `radius` px on the left and/or right
 * edge, vertically centred. A mask, so whatever sits behind shows through.
 */
export function notchStyle(side: NotchSide = 'left', radius = 12): CSSProperties {
  const size = `${radius * 2}px ${radius * 2}px`;
  const holes: { position: string }[] = [];
  if (side === 'left' || side === 'both') holes.push({ position: `${-radius}px 50%` });
  if (side === 'right' || side === 'both') holes.push({ position: `calc(100% + ${radius}px) 50%` });
  const images = [...holes.map(() => CIRCLE), FULL].join(', ');
  const positions = [...holes.map((hole) => hole.position), '0 0'].join(', ');
  const sizes = [...holes.map(() => size), '100% 100%'].join(', ');
  const repeats = [...holes.map(() => 'no-repeat'), 'no-repeat'].join(', ');
  const composite = [...holes.map(() => 'exclude'), 'add'].join(', ');
  const webkitComposite = [...holes.map(() => 'xor'), 'source-over'].join(', ');
  return {
    maskImage: images,
    maskPosition: positions,
    maskSize: sizes,
    maskRepeat: repeats,
    maskComposite: composite,
    WebkitMaskImage: images,
    WebkitMaskPosition: positions,
    WebkitMaskSize: sizes,
    WebkitMaskRepeat: repeats,
    WebkitMaskComposite: webkitComposite,
  } as CSSProperties;
}

/**
 * Scallops for a separate edge strip (the footer top): `count` paper bumps
 * across the full width. Give the strip a height (the bump depth) and the
 * paper background.
 */
export function scallopStyle(count = 12): CSSProperties {
  const size = `calc(100% / ${Math.max(1, Math.round(count))}) 100%`;
  return {
    maskImage: SCALLOP_TILE,
    maskSize: size,
    maskRepeat: 'repeat-x',
    WebkitMaskImage: SCALLOP_TILE,
    WebkitMaskSize: size,
    WebkitMaskRepeat: 'repeat-x',
  } as CSSProperties;
}

/**
 * Scalloped bottom edge cut into the element itself (the letter): the last
 * `depth` px of the element become `count` downward bumps.
 */
export function scallopBottomStyle(count = 16, depth = 14): CSSProperties {
  const images = `${FULL}, ${SCALLOP_CUT}`;
  const positions = `0 0, 0 100%`;
  const sizes = `100% calc(100% - ${depth}px), calc(100% / ${Math.max(1, Math.round(count))}) ${depth}px`;
  const repeats = 'no-repeat, repeat-x';
  return {
    maskImage: images,
    maskPosition: positions,
    maskSize: sizes,
    maskRepeat: repeats,
    WebkitMaskImage: images,
    WebkitMaskPosition: positions,
    WebkitMaskSize: sizes,
    WebkitMaskRepeat: repeats,
  } as CSSProperties;
}

interface PerforationProps {
  className?: string;
  /** The colour showing through the holes; defaults to the surface behind the slip (--pg-perf-color). */
  color?: string;
}

/** A row of round 5px dots, as between a slip and its tear-off stub. Decorative. */
export function Perforation({ className, color }: PerforationProps) {
  return (
    <span
      className={cn('pg-perf', className)}
      style={color ? ({ '--pg-perf-color': color } as CSSProperties) : undefined}
      aria-hidden="true"
    />
  );
}
