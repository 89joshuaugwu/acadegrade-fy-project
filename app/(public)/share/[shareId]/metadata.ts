import type { Metadata } from 'next';
import { absoluteUrl, NO_INDEX_METADATA } from '@/lib/seo/site';

const GENERIC_TITLE = 'Shared transcript | AcadeGrade';
const GENERIC_DESCRIPTION = 'A transcript shared through AcadeGrade. This link may have expired. Not issued or verified by any university.';

function expiryMillis(value: unknown): number | null {
  if (!value) return null;
  const withToDate = value as { toDate?: () => Date };
  const date = typeof withToDate.toDate === 'function' ? withToDate.toDate() : new Date(value as string | number | Date);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Link-preview metadata for a shared transcript. A missing or expired link shows no
 * student name, so an old link cannot be used to learn whose record it was.
 */
export function shareMetadataFor(data: unknown, now: number, shareId: string): Metadata {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const expiresAt = record ? expiryMillis(record.expiresAt) : null;
  const live = record !== null && (expiresAt === null || expiresAt >= now);
  const rawName = live && typeof record?.studentName === 'string' ? record.studentName.trim() : '';
  const name = rawName || null;

  const title = live
    ? `${name ?? 'Student'}'s unofficial academic record | AcadeGrade`
    : GENERIC_TITLE;
  const description = live
    ? `${name ?? 'Student'}'s self-reported academic record, CGPA, and Performance Index, shared via AcadeGrade. Not issued or verified by any university.`
    : GENERIC_DESCRIPTION;

  return {
    title,
    description,
    robots: NO_INDEX_METADATA.robots,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/share/${shareId}`),
      images: [{ url: '/logo.png', width: 800, height: 600, alt: live ? `${name ?? 'Student'}'s transcript` : 'Shared transcript' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/logo.png'] },
  };
}
