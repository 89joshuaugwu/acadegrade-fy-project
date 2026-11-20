import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_ABOUT_CONTENT, normalizeAboutContent, type AboutContent } from './content';

/** Revalidation window for the admin-managed About text (seconds). */
export const ABOUT_REVALIDATE_SECONDS = 300;
/** Tag to revalidate when an admin saves About (Admin > Settings > Public site). */
export const ABOUT_CACHE_TAG = 'site-about';

const readAboutDocument = unstable_cache(
  async (): Promise<Record<string, unknown> | null> => {
    const snapshot = await adminDb.collection('config').doc('about').get();
    return snapshot.exists ? (snapshot.data() ?? null) : null;
  },
  ['site-about'],
  { revalidate: ABOUT_REVALIDATE_SECONDS, tags: [ABOUT_CACHE_TAG] }
);

/**
 * The About text for the public page, read on the server so the h1 is in the
 * first HTML (no swap after load). A missing document or a read error gives
 * the built-in defaults silently: a visitor cannot fix a storage outage, and
 * the defaults are complete production copy. `/api/about` stays for the admin
 * screen and the Android app.
 */
export async function getAboutContent(): Promise<AboutContent> {
  try {
    const data = await readAboutDocument();
    return data ? normalizeAboutContent(data) : DEFAULT_ABOUT_CONTENT;
  } catch {
    console.warn('[about] could not read config/about; showing the default text');
    return DEFAULT_ABOUT_CONTENT;
  }
}
