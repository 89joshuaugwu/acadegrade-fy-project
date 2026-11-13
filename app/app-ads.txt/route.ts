import { adsTxtResponse, adsTxtUnavailable, buildAppAdsTxt } from '@/lib/platform/ads-txt';

export const dynamic = 'force-dynamic';

/**
 * /app-ads.txt: the AdMob seller line. Publisher from config/settings.admobAndroidAppId,
 * then ADMOB_ANDROID_APP_ID, then live config/mobileAds unit IDs; empty when unset.
 */
export async function GET() {
  try {
    return adsTxtResponse(await buildAppAdsTxt());
  } catch {
    console.error('app-ads.txt unavailable');
    return adsTxtUnavailable();
  }
}
