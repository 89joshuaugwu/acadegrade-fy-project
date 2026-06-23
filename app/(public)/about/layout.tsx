import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About AcadeGrade | The Builder & Technology',
  description:
    'Learn about the academic context behind AcadeGrade, the technology stack (Next.js, Firebase, Tailwind CSS), and the builder behind the project.',
  openGraph: {
    title: 'About AcadeGrade | The Builder & Technology',
    description:
      'Learn about the academic context behind AcadeGrade, the technology stack, and the builder behind the project.',
    url: 'https://acadegrade.com/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
