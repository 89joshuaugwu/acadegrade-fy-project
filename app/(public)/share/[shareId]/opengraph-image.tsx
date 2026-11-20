import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

/** The same generic slip for every shared record: never a name, a figure or a photograph. */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Shared academic record on AcadeGrade';

export default function Image() {
  return renderOgImage({
    meta: 'Shared through AcadeGrade',
    headline: 'Shared academic record',
    line: 'Self-reported by the student. Not issued or verified by any university.',
  });
}
