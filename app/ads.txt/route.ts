import { adsTxtResponse, adsTxtUnavailable, buildAdsTxt } from '@/lib/platform/ads-txt';

export const dynamic = 'force-dynamic';

/** /ads.txt: the AdSense seller line from config/settings.adsProviderConfig; empty when unset. */
export async function GET() {
  try {
    return adsTxtResponse(await buildAdsTxt());
  } catch {
    console.error('ads.txt unavailable');
    return adsTxtUnavailable();
  }
}
