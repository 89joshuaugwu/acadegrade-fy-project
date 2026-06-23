import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CGPA & Performance Index Calculator | AcadeGrade',
  description:
    'Instantly calculate your CGPA and Performance Index using the AcadeGrade Quick Calculator. Use grades or actual scores. No account required.',
  openGraph: {
    title: 'CGPA & Performance Index Calculator | AcadeGrade',
    description:
      'Instantly calculate your CGPA and Performance Index. Share your results with friends or save them to your profile.',
    url: 'https://acadegrade.com/calculator',
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
