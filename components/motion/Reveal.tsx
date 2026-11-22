import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Scroll entrances, server-safe (no 'use client'): Reveal only writes
 * data-mo attributes. The runtime (boot.ts) marks the element with
 * data-mo-in when it enters the viewport and motion.css plays the entrance.
 * Without JavaScript, with reduced motion or Data saver the content is
 * simply there.
 *
 * Variants:
 * - rise (default): up 20px and in.
 * - fade: opacity only, for big blocks.
 * - left / right: in from the side, for split layouts.
 * - pop: up, in and from 96% scale, for panels and devices.
 * - photo: the frame opens from the bottom while the picture settles from a zoom.
 * - wipe: fills from the left, for bars and scales.
 * - stagger: each direct child rises in turn (use on the list element itself).
 * - words: used by <Words>, heading words rising into masks.
 */
export type RevealVariant = 'rise' | 'fade' | 'left' | 'right' | 'pop' | 'photo' | 'wipe' | 'stagger' | 'words';

/** The attributes a kit component spreads onto an element it already renders. */
export function reveal(variant: RevealVariant = 'rise', delay = 0) {
  return {
    'data-mo': variant,
    // The runtime adds data-mo-in before hydration; that is expected.
    suppressHydrationWarning: true,
    ...(delay ? { style: { '--mo-delay': `${delay}ms` } as CSSProperties } : {}),
  } as const;
}

export function Reveal({
  as: Tag = 'div',
  variant = 'rise',
  delay = 0,
  className,
  style,
  children,
  ...rest
}: {
  as?: ElementType;
  variant?: RevealVariant;
  /** Extra delay in ms, for a second item in the same row. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}) {
  const merged = delay ? ({ ...style, '--mo-delay': `${delay}ms` } as CSSProperties) : style;
  return (
    <Tag {...rest} data-mo={variant} suppressHydrationWarning className={className} style={merged}>
      {children}
    </Tag>
  );
}
