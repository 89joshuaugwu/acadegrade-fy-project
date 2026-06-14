import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

/**
 * AcadeGrade Service Worker — Serwist 9.5.11
 *
 * Caching strategy:
 * - Precache: all static assets from Next.js build manifest
 * - Runtime: NetworkFirst for API calls, StaleWhileRevalidate for images
 * - Offline: serves cached pages when network is unavailable
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
