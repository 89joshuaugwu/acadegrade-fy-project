import { formatCgpa } from '@/lib/cgpa/academicRules';
import { computeExampleSlip } from '@/lib/public/example-student';
import { HOME_HERO } from '@/lib/public/home';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

/**
 * Home's Open Graph image: the hero slip with the headline and the example's
 * figures. Static: no one's grades ever appear in a link preview. Public
 * pages without their own image inherit this one, as they did the root one.
 */

export const alt = 'AcadeGrade: know your CGPA, know your class';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  const slip = computeExampleSlip();
  return renderOgImage({
    meta: 'For Nigerian universities · Free on web and Android',
    headline: HOME_HERO.title,
    line: `Example slip: GPA ${formatCgpa(slip.gpa)} · CGPA ${formatCgpa(slip.cgpa)} · ${slip.classBand.label}`,
  });
}
