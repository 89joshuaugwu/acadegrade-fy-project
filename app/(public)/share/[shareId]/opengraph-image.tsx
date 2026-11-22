import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

/**
 * The same generic card for every shared record (owner decision: the student's
 * name is hidden in link previews, always): never a name, a figure or a
 * photograph, whatever the link's level, PIN or expiry. Chat apps cache previews
 * long after a link ends, so nothing here depends on the record.
 */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'An academic transcript shared on AcadeGrade';

export default function Image() {
  return renderOgImage({
    meta: 'Self-reported by the student, not issued by a university',
    headline: 'Academic transcript shared on AcadeGrade',
    line: 'Open the link to see the record. The student may have set a PIN or an end date.',
  });
}
