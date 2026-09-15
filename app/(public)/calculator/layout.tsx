import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Free CGPA & Performance Index Calculator',
  description:
    'Instantly calculate your CGPA and Performance Index using the AcadeGrade Quick Calculator. Use grades or actual scores. No account required.',
  path: '/calculator',
  keywords: ['CGPA calculator', 'GPA calculator Nigeria', 'Performance Index calculator'],
});

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
