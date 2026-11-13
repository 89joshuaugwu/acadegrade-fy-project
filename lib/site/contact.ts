import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { resolveContactEmail } from './contact-email';

export { contactHref, normalizeContactEmail, SUPPORT_PAGE_PATH } from './contact-email';

/** Revalidation window for the admin-managed address. */
export const CONTACT_EMAIL_REVALIDATE_SECONDS = 300;
export const CONTACT_EMAIL_CACHE_TAG = 'site-contact-email';

const readConfiguredEmail = unstable_cache(
  async (): Promise<unknown> => {
    try {
      const snapshot = await adminDb.collection('config').doc('about').get();
      return snapshot.exists ? snapshot.data()?.contactEmail ?? null : null;
    } catch {
      // A storage outage must not take public pages down; fall through to the env value.
      return null;
    }
  },
  ['site-contact-email'],
  { revalidate: CONTACT_EMAIL_REVALIDATE_SECONDS, tags: [CONTACT_EMAIL_CACHE_TAG] }
);

/**
 * The public contact address: admin setting (`config/about.contactEmail`), then
 * `NEXT_PUBLIC_SUPPORT_EMAIL`, then null. Callers show a /support link for null.
 */
export async function getContactEmail(): Promise<string | null> {
  return resolveContactEmail({
    configEmail: await readConfiguredEmail(),
    envEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  });
}
