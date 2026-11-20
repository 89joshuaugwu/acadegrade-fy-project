import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Caching. `Cache-Control: no-cache, no-store` used to be sent for every
 * path. It came in with the service-worker removal (ServiceWorkerKill), to
 * stop old cached pages and bundles being served after a deploy. That need
 * is real for HTML and API responses, so they keep it. It is not needed for
 * static files: hashed bundles under /_next/static are immutable (Next sets
 * that itself in production), and the files in /public get a short
 * shared-cache lifetime with revalidation, so the public pages stay fast on
 * mobile data (docs/public-redesign/02-design-system.md §7).
 *
 * The serwist service worker is no longer generated (owner decision,
 * 17 Nov 2026). /sw.js is now a small self-unregistering worker
 * (app/sw.js/route.ts), so browsers that installed the old one clean up on
 * their next update check, and ServiceWorkerKill still unregisters on load.
 */

const STATIC_FILE = '(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|pdf|txt|xml|json|webmanifest|css|js|map)';

/**
 * UI preview (dev only, opt-in): `AG_UI_PREVIEW=1 next dev --webpack` swaps the Firebase client
 * packages for preview/mocks/*, which behave exactly like the real SDK until a browser opts in with
 * `?ag-preview=student|admin`. Then sign-in, Firestore and /api calls are answered in memory from
 * preview/fixtures, so signed-in screens can be designed and screenshotted without touching the
 * backend. A git-ignored `.ag-ui-preview` file in the project root does the same as the variable.
 * Without either (and in every `next build`, since the hook checks `dev`) nothing changes.
 */
const UI_PREVIEW = process.env.AG_UI_PREVIEW === '1' || existsSync(path.join(process.cwd(), '.ag-ui-preview'));
const PREVIEW_MOCKED = /^firebase\/(auth|firestore|database|messaging)$/;
type WebpackHook = NonNullable<NextConfig['webpack']>;
const previewWebpack: WebpackHook = (config, { dev, webpack }) => {
  if (!dev) return config;
  const mocks = path.resolve(process.cwd(), 'preview', 'mocks');
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(PREVIEW_MOCKED, (resource: { request: string; contextInfo?: { issuer?: string } }) => {
      const issuer = (resource.contextInfo?.issuer ?? '').replaceAll('\\', '/').toLowerCase();
      if (issuer.includes('/preview/mocks/')) return; // the mocks themselves import the real package
      const name = PREVIEW_MOCKED.exec(resource.request)?.[1];
      if (name) resource.request = path.join(mocks, `firebase-${name}.ts`);
    }),
  );
  return config;
};

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.0.134'],
  serverExternalPackages: ['firebase-admin'],
  ...(UI_PREVIEW ? { webpack: previewWebpack } : {}),
  async headers() {
    return [
      {
        // Pages and API routes: everything except Next's own assets and files with a static extension.
        source: `/((?!_next/static|_next/image|.*\\.${STATIC_FILE}$).*)`,
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        // Brand marks and campus photographs: a day fresh, a week stale-while-revalidate.
        source: '/:dir(brand|images)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        // Icons and the manifest at the root of /public.
        source: `/:file((?:favicon|android-chrome|apple-touch-icon|logo|acadegradeailogo|site)[^/]*\\.${STATIC_FILE})`,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dgqukbs8n/**',
      },
    ],
  },
};

export default nextConfig;
