import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade terms of use';

export default function Image() {
  return renderOgImage({ headline: 'Terms of use', line: 'The rules for using AcadeGrade, in plain words.', meta: 'Help and legal' });
}
