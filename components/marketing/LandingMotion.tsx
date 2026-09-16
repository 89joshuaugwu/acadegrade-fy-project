'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import './LandingMotion.css';

/** Wrap the landing content once; descendants opt in with data-landing-motion. */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container || !window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-landing-motion]'));
    let observer: IntersectionObserver | undefined;

    const configure = () => {
      observer?.disconnect();
      if (preference.matches) {
        // Finish pending entrances too, so switching preferences never replays them.
        targets.forEach((target) => { target.dataset.landingEntered = 'done'; });
        return;
      }
      if (!('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.landingEntered = 'true';
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0.15 });
      targets.forEach((target) => {
        if (!target.dataset.landingEntered) observer?.observe(target);
      });
    };

    configure();
    preference.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', configure);
    };
  }, []);

  return <div ref={root} data-landing-motion-root="">{children}</div>;
}
