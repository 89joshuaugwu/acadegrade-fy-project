import type { Metadata } from 'next';
import { absoluteUrl, NO_INDEX_METADATA, SITE_NAME } from '@/lib/seo/site';

/** The root layout's template adds " | AcadeGrade" to the page title. */
export const SHARE_TITLE = 'Shared transcript';
const FULL_TITLE = `${SHARE_TITLE} | AcadeGrade`;
const DESCRIPTION = 'An academic record a student shared through AcadeGrade. Not issued or verified by any university. This link may have expired.';

/**
 * Link-preview metadata for a shared transcript. It is the same for every link (owner
 * decisions, 17 Nov 2026: "hide the student's name in link previews: yes, always"): no
 * name, no CGPA or class and no photograph, full or summary, with or without a PIN,
 * live or expired, because chat apps cache previews long after a link ends or a PIN
 * changes. It needs no Firestore read, so it also works when services are down.
 * The page stays out of search (noindex) but keeps a full rich preview; the image is
 * the generic card in ./opengraph-image.tsx.
 */
export function shareMetadataFor(shareId: string): Metadata {
  const url = absoluteUrl(`/share/${encodeURIComponent(shareId)}`);
  return {
    title: SHARE_TITLE,
    description: DESCRIPTION,
    robots: NO_INDEX_METADATA.robots,
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      siteName: SITE_NAME,
      title: FULL_TITLE,
      description: DESCRIPTION,
      url,
    },
    twitter: { card: 'summary_large_image', title: FULL_TITLE, description: DESCRIPTION },
  };
}
