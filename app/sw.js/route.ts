/**
 * /sw.js: a self-unregistering service worker.
 *
 * The site used to ship a serwist worker that precached pages and bundles.
 * It is no longer generated. A browser that installed it checks /sw.js for
 * updates; it now receives this worker, which clears every cache, removes
 * its own registration and stops. ServiceWorkerKill (root layout) does the
 * same from the page, so either path cleans an old install.
 */

export const dynamic = 'force-static';

const KILL_SWITCH_WORKER = `self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));
    } finally {
      await self.registration.unregister();
    }
  })());
});
`;

export function GET() {
  return new Response(KILL_SWITCH_WORKER, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
