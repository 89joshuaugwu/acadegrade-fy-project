import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade privacy notice';

export default function Image() {
  return renderOgImage({ headline: 'Privacy notice', line: 'What AcadeGrade collects, why, how long it is kept, and your rights.', meta: 'Help and legal' });
}
