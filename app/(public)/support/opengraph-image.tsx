import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade support';

export default function Image() {
  return renderOgImage({ headline: 'Tell us what went wrong.', line: 'Fix it in a minute with the quick fixes, or send us a request. No sign-in needed.', meta: 'Support' });
}
