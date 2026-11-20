'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A seconds countdown (the 60-second wait between codes). `start(n)` sets
 * it; it ticks down once a second to 0.
 */
export function useCooldown(): [number, (seconds: number) => void] {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setInterval(() => setSeconds((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useCallback((next: number) => setSeconds(Math.max(0, Math.ceil(next))), []);
  return [seconds, start];
}

/**
 * The error shake (a short sideways nudge, transform only; auth.css skips it
 * under reduced motion and data saver). `shake()` replays it.
 */
export function useShake() {
  const [shaking, setShaking] = useState(false);
  const frame = useRef<number | null>(null);
  const shake = useCallback(() => {
    setShaking(false);
    if (frame.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame.current);
    if (typeof requestAnimationFrame === 'function') {
      frame.current = requestAnimationFrame(() => setShaking(true));
    } else {
      setShaking(true);
    }
  }, []);
  const props = {
    className: 'ag-shake',
    'data-shake': shaking ? 'true' : undefined,
    onAnimationEnd: () => setShaking(false),
  } as const;
  return { shake, props };
}

/** True on screens wide enough that focusing a field will not hide the heading behind a keyboard. */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}
