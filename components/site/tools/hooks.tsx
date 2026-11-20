'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Client helpers for the calculator and the four tools: the debounced live
 * announcement, the number tween, the read-once prefill and the in-view
 * check. Logic carried over unchanged from the first tools build.
 */

/** The value, held back until it has stopped changing for `delay` ms. The first value is immediate. */
export function useDebounced<T>(value: T, delay = 500): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function motionAllowed(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  if (!root.classList.contains('pg-motion-ready') || root.getAttribute('data-data-saver') === 'on') return false;
  try {
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/**
 * The number on screen eases to its new value (tabular figures, so the width
 * holds). Jumps under reduced motion, data saver or before MotionReady ran.
 */
export function useTween(target: number | null, duration = 420): number | null {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (target === null || from.current === null || !motionAllowed()) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = from.current;
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = start + (target - start) * eased;
      from.current = value;
      setShown(t < 1 ? value : target);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return shown;
}

/**
 * Reads the page's query once on load and then removes it from the address
 * bar, so the bar never disagrees with the fields (prefill links).
 */
export function useQueryOnce(apply: (params: URLSearchParams) => void, strip = true) {
  const done = useRef(false);
  const latest = useRef(apply);
  latest.current = apply;
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const search = window.location.search;
    if (!search) return;
    latest.current(new URLSearchParams(search));
    if (strip) {
      try {
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
      } catch {
        // The fields are filled either way.
      }
    }
  }, [strip]);
}

/** True while the element is on screen (IntersectionObserver; true without one). */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setInView(entries.some((entry) => entry.isIntersecting)), { threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/** A visually hidden polite live region with the settled sentence. The page's only role="status". */
export function Announcer({ text }: { text: string }) {
  const settled = useDebounced(text);
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {settled}
    </p>
  );
}
