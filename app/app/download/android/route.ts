import { androidDownloadResponse } from '@/lib/mobile-app-links';

export const dynamic = 'force-dynamic';

/** Stable public Android URL: a 307 to the admin-set APK (default APK if Firestore is down), no-store. */
export async function GET() {
  return androidDownloadResponse();
}
