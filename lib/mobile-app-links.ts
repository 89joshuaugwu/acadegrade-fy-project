import { adminDb } from '@/lib/firebase/admin';

export const DEFAULT_ANDROID_DOWNLOAD_URL = 'https://github.com/89joshuaugwu/AcadeGrade-APK/releases/download/v1.0.0/acadegrade.apk';

export interface MobileAppLinks {
  androidUrl?: string;
  iosUrl?: string;
}

/** Server-only resolution for stable branded download URLs. */
export async function getMobileAppLinks(): Promise<Required<MobileAppLinks>> {
  const snapshot = await adminDb.collection('config').doc('settings').get();
  const configured = snapshot.data()?.mobileAppLinks as MobileAppLinks | undefined;
  return {
    androidUrl: configured?.androidUrl?.trim() || DEFAULT_ANDROID_DOWNLOAD_URL,
    iosUrl: configured?.iosUrl?.trim() || '',
  };
}
