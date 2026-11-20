import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Delete your AcadeGrade account';

export default function Image() {
  return renderOgImage({ headline: 'Delete your AcadeGrade account', line: 'The steps on Android and the web, what is deleted and what is kept.', meta: 'Help and legal' });
}
