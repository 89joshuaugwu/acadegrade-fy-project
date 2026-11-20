import type { Metadata } from 'next';
import { absoluteUrl, NO_INDEX_METADATA } from '@/lib/seo/site';

/** The root layout's template adds " | AcadeGrade" to the page title. */
export const SHARE_TITLE = 'Shared transcript';
const FULL_TITLE = `${SHARE_TITLE} | AcadeGrade`;
const DESCRIPTION = 'An academic record shared through AcadeGrade. Not issued or verified by any university. This link may have expired.';

/**
 * Link-preview metadata for a shared transcript. It is the same for every link (owner
 * decision, 17 Nov 2026): no student name, no figures and no photograph, live or not,
 * with or without a PIN, because chat apps cache previews long after a link ends.
 * The Open Graph image is the generic slip in ./opengraph-image.tsx.
 */
export function shareMetadataFor(shareId: string): Metadata {
  return {
    title: SHARE_TITLE,
    description: DESCRIPTION,
    robots: NO_INDEX_METADATA.robots,
    openGraph: {
      title: FULL_TITLE,
      description: DESCRIPTION,
      url: absoluteUrl(`/share/${encodeURIComponent(shareId)}`),
    },
    twitter: { card: 'summary_large_image', title: FULL_TITLE, description: DESCRIPTION },
  };
}
