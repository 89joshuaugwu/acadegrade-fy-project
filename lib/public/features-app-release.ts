import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { getMobileAppLinksSafe } from '@/lib/mobile-app-links';
import { parseMobileRelease } from '@/lib/mobile-release/config';
import { appRelease, type AppRelease } from './features-android';
import { readPublicUsage } from './usage-public';

/**
 * Server read for the Android page: APK size and Play link
 * (config/settings.mobileAppLinks), the released version
 * (config/mobileRelease.latestVersion, only while the notice is enabled)
 * and the coin switch (config/usage). Cached for five minutes. Never
 * throws: a failed read leaves the version, size and badge out.
 */

const readVersion = unstable_cache(
  async (): Promise<string | null> => {
    const document = await adminDb.collection('config').doc('mobileRelease').get();
    if (!document.exists) return null;
    const release = parseMobileRelease(document.data());
    return release.enabled && release.latestVersion ? release.latestVersion : null;
  },
  ['public-android-version'],
  { revalidate: 300 }
);

export async function readLatestAndroidVersion(): Promise<string | null> {
  try {
    return await readVersion();
  } catch {
    return null;
  }
}

export async function readAppRelease(): Promise<AppRelease> {
  const [links, version, usage] = await Promise.all([getMobileAppLinksSafe(), readLatestAndroidVersion(), readPublicUsage()]);
  return appRelease(links, version, usage);
}
