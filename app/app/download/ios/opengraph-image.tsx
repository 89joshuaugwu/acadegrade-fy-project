import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade works on your iPhone';

export default function Image() {
  return renderOgImage({
    meta: 'iPhone, through Safari',
    headline: 'AcadeGrade works on your iPhone.',
    line: 'Add it to your Home Screen and it opens like an app, with your whole record.',
  });
}
