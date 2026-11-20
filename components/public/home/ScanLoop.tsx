'use client';

import { useEffect, useRef } from 'react';
import { useStill } from './useStill';

/**
 * The owner's screen recording of a slip being scanned, as a small muted
 * loop in the first showcase slip. Rendered only when config/about.scanVideoUrl
 * is set. preload="none"; it plays only while visible and never under
 * reduced motion or data saver.
 */
export function ScanLoop({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useStill();

  useEffect(() => {
    const video = ref.current;
    if (!video || still || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [still]);

  return <video ref={ref} className="hm-show__video" src={src} muted loop playsInline preload="none" aria-label={label} />;
}
