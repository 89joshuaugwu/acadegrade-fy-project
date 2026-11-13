'use client';

import { useEffect, useState } from 'react';

export type ImageStatus = 'none' | 'pending' | 'loaded' | 'failed';

/** Probes an image URL so callers can wait for it, or react when it fails. */
export function useImageStatus(url: string): ImageStatus {
  const [settled, setSettled] = useState<{ url: string; loaded: boolean } | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    const probe = new Image();
    probe.onload = () => { if (active) setSettled({ url, loaded: true }); };
    probe.onerror = () => { if (active) setSettled({ url, loaded: false }); };
    probe.src = url;
    return () => {
      active = false;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [url]);

  if (!url) return 'none';
  if (settled?.url !== url) return 'pending';
  return settled.loaded ? 'loaded' : 'failed';
}
