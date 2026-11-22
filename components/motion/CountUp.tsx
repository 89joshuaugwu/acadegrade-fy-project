'use client';

import { animate } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * True only when the motion runtime switched entrances on (html.ag-mo: it
 * found IntersectionObserver and matchMedia, and reduced motion and Data
 * saver are off) and this browser can observe the element. Anything else
 * (old browsers, crawlers, jsdom, reduced motion) gets the final value.
 */
export function countingAllowed(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (typeof window.IntersectionObserver !== 'function' || typeof window.matchMedia !== 'function') return false;
  if (!document.documentElement.classList.contains('ag-mo')) return false;
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * A number that counts up to its value the first time it scrolls into view.
 * The server renders the final value (crawlers, no JS, reduced motion and
 * Data saver all see it). An invisible copy of the final value holds the
 * width, so nothing around it moves while it counts. Screen readers get the
 * final value only.
 */
export function CountUp({
  value,
  decimals = 0,
  from = 0,
  duration = 1.4,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) =>
    `${prefix}${n.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  const finalText = format(value);
  const [shown, setShown] = useState(finalText);

  // Before the first paint after hydration: park the number at its start, then count when it enters view.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !countingAllowed()) {
      setShown(finalText);
      return;
    }
    setShown(format(from));
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        const controls = animate(from, value, {
          duration,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (latest) => setShown(format(latest)),
          onComplete: () => setShown(finalText),
        });
        stop = () => controls.stop();
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, from, decimals, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className} style={{ display: 'inline-grid' }}>
      <span aria-hidden="true" style={{ gridArea: '1 / 1', visibility: 'hidden' }}>
        {finalText}
      </span>
      <span aria-hidden="true" style={{ gridArea: '1 / 1', fontVariantNumeric: 'tabular-nums' }}>
        {shown}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}

/**
 * CountUp for a figure that arrives as text ("4.67", "18+", "6", "72%").
 * Anything that is not a single plain number ("1, 7, 30", "Mon 09:00") is
 * rendered as it is.
 */
export function CountUpText({ text, className }: { text: string; className?: string }) {
  const match = /^(\d+(?:\.(\d+))?)([+%]?)$/.exec(text.trim());
  if (!match) return <span className={className}>{text}</span>;
  const value = Number(match[1]);
  const decimals = match[2]?.length ?? 0;
  // Grade points start from a sensible floor so the count reads as a CGPA rising, not a timer.
  const from = decimals === 2 && value <= 5 ? Math.max(0, Math.floor(value) - 1) : 0;
  return <CountUp value={value} decimals={decimals} from={from} suffix={match[3]} className={className} />;
}
