import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { pickHomeMedia, type HomeMedia } from '@/lib/public/home';

/** Same window and tag family as the contact email (config/about). */
export const HOME_MEDIA_REVALIDATE_SECONDS = 300;
export const HOME_MEDIA_CACHE_TAG = 'site-about-media';

const readStored = unstable_cache(
  async (): Promise<HomeMedia> => {
    const snapshot = await adminDb.collection('config').doc('about').get();
    return pickHomeMedia(snapshot.exists ? snapshot.data() : undefined);
  },
  ['home-media'],
  { revalidate: HOME_MEDIA_REVALIDATE_SECONDS, tags: [HOME_MEDIA_CACHE_TAG] }
);

/**
 * config/about.founderPhotoUrl and config/about.scanVideoUrl (https only).
 * Never throws: an outage simply leaves out the portrait and the video.
 */
export async function readHomeMedia(): Promise<HomeMedia> {
  try {
    return await readStored();
  } catch {
    return { founderPhotoUrl: null, scanVideoUrl: null };
  }
}
