import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { safeParseProviderConfig } from '@/lib/ads/providers';

/**
 * Builds /ads.txt (web, AdSense) and /app-ads.txt (Android, AdMob) from stored
 * config. Only publisher IDs are emitted: they are public by design.
 */
const GOOGLE_CERTIFICATION_ID = 'f08c47fec0942fa0';
/** Google's public sample-ads publisher. Never declare it as ours. */
const GOOGLE_TEST_PUBLISHER = 'pub-3940256099942544';

export function sellerLine(publisherId: string) {
  return `google.com, ${publisherId}, DIRECT, ${GOOGLE_CERTIFICATION_ID}`;
}

const asPublisher = (digits: string | undefined) => {
  const publisherId = digits ? `pub-${digits}` : null;
  return publisherId && publisherId !== GOOGLE_TEST_PUBLISHER ? publisherId : null;
};

/** `ca-app-pub-XXXXXXXXXXXXXXXX~…` (App ID) or `…/…` (ad unit) -> `pub-XXXXXXXXXXXXXXXX`. */
function fromAdmobId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return asPublisher(/^ca-app-pub-(\d{16})[~/]\d{10}$/.exec(value.trim())?.[1]);
}

export function admobPublisherId(sources: { settings?: Record<string, unknown>; mobileAds?: Record<string, unknown>; envAppId?: string }): string | null {
  const unitIds = ['rewardedUnitId', 'bannerUnitId', 'dashboardBannerUnitId', 'resultsBannerUnitId'].map((key) => sources.mobileAds?.[key]);
  for (const candidate of [sources.settings?.admobAndroidAppId, sources.envAppId, ...unitIds]) {
    const publisherId = fromAdmobId(candidate);
    if (publisherId) return publisherId;
  }
  return null;
}

export function adsensePublisherId(settings: Record<string, unknown> | undefined): string | null {
  const publisherId = safeParseProviderConfig(settings?.adsProviderConfig).adsense.publisherId;
  return asPublisher(/^ca-pub-(\d{16})$/.exec(publisherId)?.[1]);
}

const toFile = (publisherId: string | null) => (publisherId ? `${sellerLine(publisherId)}\n` : '');

export async function buildAdsTxt(): Promise<string> {
  const settings = (await adminDb.collection('config').doc('settings').get()).data();
  return toFile(adsensePublisherId(settings));
}

export async function buildAppAdsTxt(): Promise<string> {
  const [settings, mobileAds] = await Promise.all([
    adminDb.collection('config').doc('settings').get(),
    adminDb.collection('config').doc('mobileAds').get(),
  ]);
  return toFile(admobPublisherId({ settings: settings.data(), mobileAds: mobileAds.data(), envAppId: process.env.ADMOB_ANDROID_APP_ID }));
}

export function adsTxtResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}

export function adsTxtUnavailable() {
  return new Response('', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
