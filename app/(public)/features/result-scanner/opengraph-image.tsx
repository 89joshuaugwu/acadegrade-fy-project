import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade result scanner: snap the slip, check the rows';

export default function Image() {
  return renderOgImage({
    meta: 'The result scanner, free on web and Android',
    headline: 'Snap the slip. Check the rows.',
    line: 'A photo of your result slip becomes course rows you check before anything is saved.',
  });
}
