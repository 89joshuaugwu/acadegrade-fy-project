'use client';

import { MotionConfig, motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Scroll-linked drift for one or two visuals per page, so they feel a layer
 * deeper than the text. Transform only, softened with a light spring.
 *
 * - mode 'hero': at rest on load, then drifts up `distance` px as the visitor
 *   scrolls the hero away (no jump on load).
 * - mode 'band': drifts across the whole time the box crosses the viewport,
 *   for a background photo (pair with `scale` > 1 so its edges never show).
 *
 * Off under reduced motion and Data saver (only when the motion runtime put
 * html.ag-mo on), and the server renders it at rest.
 */
export function Parallax({
  children,
  distance = 40,
  mode = 'hero',
  scale,
  className,
}: {
  children: ReactNode;
  /** Total travel in px. Keep it small (24–80). */
  distance?: number;
  mode?: 'hero' | 'band';
  /** Constant scale for 'band' backgrounds, e.g. 1.12, so the drift never reveals an edge. */
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    // html.ag-mo means the runtime found matchMedia and IntersectionObserver and motion is allowed.
    if (typeof window.matchMedia !== 'function' || !document.documentElement.classList.contains('ag-mo')) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setOn(!query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: mode === 'hero' ? ['start start', 'end start'] : ['start end', 'end start'],
  });
  const raw = useTransform(scrollYProgress, [0, 1], mode === 'hero' ? [0, -distance] : [distance / 2, -distance / 2]);
  const y = useSpring(raw, { stiffness: 160, damping: 32, mass: 0.4 });

  return (
    <MotionConfig reducedMotion="user">
      <motion.div ref={ref} className={className} style={on ? { y, scale } : scale && mode === 'band' ? { scale } : undefined}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}
