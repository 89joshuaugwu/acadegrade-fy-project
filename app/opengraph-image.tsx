import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const alt = 'AcadeGrade: know your CGPA, know your class';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderOgImage({
    meta: 'For Nigerian universities · Free on web and Android',
    headline: 'Know your CGPA. Know your class.',
    line: 'Your GPA, CGPA and degree class, worked out from your result slip.',
  });
}
