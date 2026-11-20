import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const DEFAULT_ANDROID_DOWNLOAD_URL = 'https://github.com/89joshuaugwu/AcadeGrade-APK/releases/download/v1.0.0/acadegrade.apk';

/** `config/settings.mobileAppLinks`, set in Admin > Settings > Public site and Android release. */
export interface MobileAppLinks {
  androidUrl?: string;
  iosUrl?: string;
  /** APK size in MB (whole number, 1-500), entered per release; null when unknown. */
  androidSizeMb?: number | null;
  /** Google Play listing (https://play.google.com/...), '' until listed. */
  playUrl?: string;
}

export interface ResolvedMobileAppLinks {
  androidUrl: string;
  iosUrl: string;
  androidSizeMb: number | null;
  playUrl: string;
}

/** Normalises the stored value; anything malformed is treated as unset. */
export function resolveMobileAppLinks(configured: unknown): ResolvedMobileAppLinks {
  const links = configured && typeof configured === 'object' ? configured as Record<string, unknown> : {};
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const size = links.androidSizeMb;
  const playUrl = text(links.playUrl);
  let validPlayUrl = '';
  try {
    const url = new URL(playUrl);
    if (url.protocol === 'https:' && url.hostname === 'play.google.com') validPlayUrl = playUrl;
  } catch { /* unset or malformed */ }
  return {
    androidUrl: text(links.androidUrl) || DEFAULT_ANDROID_DOWNLOAD_URL,
    iosUrl: text(links.iosUrl),
    androidSizeMb: typeof size === 'number' && Number.isInteger(size) && size >= 1 && size <= 500 ? size : null,
    playUrl: validPlayUrl,
  };
}

/** Server-only resolution for stable branded download URLs. Throws if Firestore cannot be read. */
export async function getMobileAppLinks(): Promise<ResolvedMobileAppLinks> {
  const snapshot = await adminDb.collection('config').doc('settings').get();
  return resolveMobileAppLinks(snapshot.data()?.mobileAppLinks);
}

/** Like getMobileAppLinks, but never throws: a read failure gives the defaults. */
export async function getMobileAppLinksSafe(): Promise<ResolvedMobileAppLinks> {
  try {
    return await getMobileAppLinks();
  } catch {
    console.warn('[mobile app links] could not read settings; using the default APK link');
    return resolveMobileAppLinks(undefined);
  }
}

/** The APK destination for `/app/download/android`. Never throws; falls back to the default APK. */
export async function getAndroidDownloadUrl(): Promise<string> {
  return (await getMobileAppLinksSafe()).androidUrl;
}

/**
 * The whole `/app/download/android` response (android-app.md): a 307 to the admin-set
 * APK, or the default APK if Firestore cannot be read, with `Cache-Control: no-store`
 * so an admin change takes effect at once. The route can be just:
 *   export async function GET() { return androidDownloadResponse(); }
 */
export async function androidDownloadResponse(): Promise<NextResponse> {
  const response = NextResponse.redirect(await getAndroidDownloadUrl(), { status: 307 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
