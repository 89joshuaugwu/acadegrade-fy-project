import { computeExampleSlip } from '@/lib/public/example-student';
import { HOME_HERO } from '@/lib/public/home';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

/**
 * Home's Open Graph image: the hero headline with the example student's CGPA
 * in the arc. Static: no one's grades ever appear in a link preview. Public
 * pages without their own image inherit this one.
 */

export const alt = 'AcadeGrade: know your CGPA, know your class';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  const slip = computeExampleSlip();
  return renderOgImage({
    meta: 'Free on web and Android, for Nigerian universities',
    headline: HOME_HERO.title,
    line: 'Your GPA, CGPA and degree class, worked out from your result slip.',
    figure: { value: slip.cgpa, label: slip.classBand.label },
  });
}
