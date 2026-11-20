import { useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * The AcadeGrade mark, drawn inline (no image request) from the same geometry
 * as public/brand/acadegrade-mark.svg: a three-quarter arc from violet at the
 * bottom, round the left and over the top, to gold on the right, ending in a
 * gold dot, around a white mortarboard. The logo keeps its gradient: it is
 * the one brand asset allowed one.
 */

// Geometry on a 100 x 100 box. Arc centre (50, 50), radius 36, stroke 11.
// Angles are clockwise from 3 o'clock: 90 = bottom, 180 = left, 270 = top, 360 = right.
export const MARK_ARC = {
  /** Bottom to just past left, solid violet. */
  start: 'M50 86A36 36 0 0 1 14.005 49.372',
  /** Left to just past top, violet to mauve. */
  rise: 'M14 50A36 36 0 0 1 50.628 14.005',
  /** Top to right, mauve to gold. */
  finish: 'M50 14A36 36 0 0 1 86 50',
} as const;

export const MARK_COLOURS = {
  violet: '#5B52F2',
  mauve: '#C27BAA',
  gold: '#F2A922',
  dot: '#FFD25A',
} as const;

interface MarkProps {
  size?: number;
  className?: string;
  /** Accessible name. Without it the mark is decorative (aria-hidden). */
  title?: string;
}

export function AcadeGradeMark({ size = 32, className, title }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rise = `pg-mark-rise-${uid}`;
  const finish = `pg-mark-finish-${uid}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('pg-mark', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={rise} gradientUnits="userSpaceOnUse" x1="14" y1="50" x2="50" y2="14">
          <stop offset="0" stopColor={MARK_COLOURS.violet} />
          <stop offset="1" stopColor={MARK_COLOURS.mauve} />
        </linearGradient>
        <linearGradient id={finish} gradientUnits="userSpaceOnUse" x1="50" y1="14" x2="86" y2="50">
          <stop offset="0" stopColor={MARK_COLOURS.mauve} />
          <stop offset="1" stopColor={MARK_COLOURS.gold} />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="11">
        <path d={MARK_ARC.start} stroke={MARK_COLOURS.violet} />
        <path d={MARK_ARC.rise} stroke={`url(#${rise})`} />
        <path d={MARK_ARC.finish} stroke={`url(#${finish})`} />
      </g>
      <circle cx="86" cy="50" r="5.5" fill={MARK_COLOURS.gold} />
      <circle cx="86" cy="50" r="3.2" fill={MARK_COLOURS.dot} />
      <g fill="var(--pg-cap, #FFFFFF)" stroke="var(--pg-cap-line, #4B4868)" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M40.9 52.9V58.7L50 63.3L59.8 58.7V52.9Z" />
        <path d="M50 41.9L66.9 47.1L50 55.6L33.3 47.4Z" />
        <path d="M62 49.3V55.2" fill="none" />
        <path d="M60.8 55.2H63.4V58.7H60.8Z" />
      </g>
    </svg>
  );
}

interface AcadeMindMarkProps {
  size?: number;
  className?: string;
  /** Alt text. Empty (decorative) when the name "AcadeMind" sits beside it. */
  alt?: string;
}

/** The AcadeMind mark, served as an optimised WebP (public/brand/academind-mark.webp, 176 px wide). */
export function AcadeMindMark({ size = 24, className, alt = '' }: AcadeMindMarkProps) {
  return (
    <Image
      src="/brand/academind-mark.webp"
      width={size}
      height={Math.round(size * ACADEMIND_RATIO)}
      alt={alt}
      className={cn('pg-academind-mark', className)}
    />
  );
}

/** Height / width of the AcadeMind artwork (176 x 171). */
export const ACADEMIND_RATIO = 171 / 176;

interface LogoProps {
  /** Mark size in px (32 in the header, 24 on slips). */
  size?: number;
  /** Show the wordmark "AcadeGrade" beside the mark. */
  wordmark?: boolean;
  /** Link target; omit for a plain lock-up. */
  href?: string;
  /** Accessible name for the link. */
  label?: string;
  className?: string;
}

/** Mark plus wordmark in one ink, optionally linking home. */
export function Logo({ size = 32, wordmark = true, href, label = 'AcadeGrade home', className }: LogoProps) {
  const content = (
    <>
      <AcadeGradeMark size={size} />
      {wordmark ? <span>AcadeGrade</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn('pg-brand', className)} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <span className={cn('pg-brand', className)} role={wordmark ? undefined : 'img'} aria-label={wordmark ? undefined : 'AcadeGrade'}>
      {content}
    </span>
  );
}
