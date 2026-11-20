'use client';

import { useEffect } from 'react';
import { useDataSaver } from '@/lib/dataSaver/useDataSaver';

export const MOTION_READY_CLASS = 'pg-motion-ready';

/**
 * Motion fail-safe. Public pages are fully visible without JavaScript; this
 * island adds `pg-motion-ready` to <html> once scripts run, and only then do
 * entrances start from a hidden state. It also keeps the data-saver flag on
 * <html> (html[data-data-saver="on"]), which public.css reads to drop travel.
 * Reduced motion is handled in CSS, so the class is harmless there.
 */
export function MotionReady() {
  const { enabled: dataSaver } = useDataSaver();

  useEffect(() => {
    const root = document.documentElement;
    if (dataSaver) root.classList.remove(MOTION_READY_CLASS);
    else root.classList.add(MOTION_READY_CLASS);
  }, [dataSaver]);

  // No removal on unmount: several shells mount this island, and the class
  // only affects elements that opt in ([data-reveal], .pg-stripe--fill).
  return null;
}
