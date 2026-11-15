import type { Metadata } from 'next';
import { PublicHeader, PublicFooter } from '@/components/layout/PublicShell';
import { LinkButton } from '@/components/ui/LinkButton';
import { ImportActions } from './ImportActions';
import { loadSharedCourseList, type SharedCourse } from './share-code';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Shared course list',
  description: 'A course list shared by a classmate on AcadeGrade.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

function plural(count: number, one: string) {
  return `${count} ${one}${count === 1 ? '' : 's'}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <PublicHeader />
      <main className="mx-auto max-w-[44rem] px-4 pb-20 pt-[calc(var(--shell-header-height)+2.5rem)] sm:px-6">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-bold">{title}</h1>
      <p className="mt-3 text-[var(--acade-text-muted)] leading-7">{body}</p>
      <div className="mt-8">
        <LinkButton href="/" variant="outline" size="md">Back to AcadeGrade</LinkButton>
      </div>
    </Shell>
  );
}

function CourseList({ courses }: { courses: SharedCourse[] }) {
  return (
    <table className="mt-6 w-full text-left text-sm">
      <caption className="sr-only">Courses in this shared list</caption>
      <thead className="text-[0.8125rem] text-[var(--acade-text-muted)]">
        <tr>
          <th scope="col" className="pb-2 font-semibold">Course</th>
          <th scope="col" className="pb-2 font-semibold">Title</th>
          <th scope="col" className="pb-2 text-right font-semibold">Units</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--acade-border-subtle)]">
        {courses.map((course, index) => (
          <tr key={`${course.code}-${index}`}>
            <td className="py-2.5 pr-3 font-semibold font-[family-name:var(--font-geist-mono)]">{course.code}</td>
            <td className="py-2.5 pr-3">{course.title}</td>
            <td className="py-2.5 text-right tabular-nums">{course.units}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SharedCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await loadSharedCourseList(code);

  if (result.status === 'paused') {
    return <Notice title="Course code sharing is paused" body="Sharing and importing course lists is switched off for a short while. Please try this link again later." />;
  }
  if (result.status === 'unavailable') {
    return <Notice title="We could not load this list" body="Something went wrong while reading the course list. Check your connection and try the link again." />;
  }
  if (result.status !== 'ok') {
    return <Notice title="This code is not available" body="The code may have been typed wrongly, or the list may no longer be shared. Ask your classmate to send it again." />;
  }

  const totalUnits = result.courses.reduce((sum, course) => sum + course.units, 0);

  return (
    <Shell>
      <p className="text-sm font-semibold text-[var(--acade-text-muted)]">Shared by a classmate</p>
      <h1 className="mt-1 font-[family-name:var(--font-bricolage)] text-[length:var(--text-3xl)] font-bold">
        Course list <span className="font-[family-name:var(--font-geist-mono)]">{result.code}</span>
      </h1>
      <p className="mt-3 text-[var(--acade-text-muted)] leading-7">
        {plural(result.courses.length, 'course')}, {plural(totalUnits, 'unit')}. Only course codes, titles and units are shared. Scores stay private, and nothing is added to your record until you review it.
      </p>
      <CourseList courses={result.courses} />
      <ImportActions code={result.code} />
    </Shell>
  );
}
