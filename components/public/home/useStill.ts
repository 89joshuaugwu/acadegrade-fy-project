'use client';

import { useEffect, useState } from 'react';
import { useDataSaver } from '@/lib/dataSaver/useDataSaver';

const REDUCE = '(prefers-reduced-motion: reduce)';

/**
 * True when motion should stay still: reduced motion, the app's data-saver
 * choice or the browser's Save-Data request. Starts true on the server and
 * the first client render, so nothing moves before we know.
 */
export function useStill(): boolean {
  const { enabled: dataSaver } = useDataSaver();
  const [reduce, setReduce] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setReduce(false);
      return;
    }
    const query = window.matchMedia(REDUCE);
    const update = () => setReduce(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduce || dataSaver;
}
