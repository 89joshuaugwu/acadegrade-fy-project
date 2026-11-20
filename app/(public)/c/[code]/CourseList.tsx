import { AcadeGradeMark } from '@/components/public/Logo';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { InlineLink } from '@/components/site/auth/controls';
import { ImportActions } from './ImportActions';
import type { SharedCourse } from './share-code';

/** Lists longer than this get a "Jump to import" link in the meta line. */
const LONG_LIST = 9;

function plural(count: number, one: string) {
  return `${count} ${one}${count === 1 ? '' : 's'}`;
}

function CourseTable({ courses, totalUnits }: { courses: SharedCourse[]; totalUnits: string }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Courses in this shared list</caption>
      <thead className="border-b border-ag-ink/10">
        <tr className="text-[0.8125rem] text-ag-mist">
          <th scope="col" className="w-[6.5rem] pb-2.5 pr-3 font-medium sm:w-32">Code</th>
          <th scope="col" className="pb-2.5 pr-3 font-medium">Course title</th>
          <th scope="col" className="pb-2.5 text-right font-medium">Units</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ag-ink/[0.07]">
        {courses.map((course, index) => (
          <tr key={`${course.code}-${index}`} className="align-top">
            <td data-col="code" className="whitespace-nowrap py-3.5 pr-3 text-[0.9375rem] font-semibold text-ag-ink">
              {course.code}
            </td>
            <td className="py-3.5 pr-3 text-[0.9375rem] text-ag-ink">{course.title || <span className="text-ag-mist">–</span>}</td>
            <td className="ag-num py-3.5 text-right text-[0.9375rem] font-medium text-ag-ink">{course.units}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="pt-3">
            <span className="flex items-center justify-between rounded-xl bg-ag-haze px-4 py-3 text-[0.9375rem]">
              <span className="font-semibold text-ag-ink">Total</span>
              <span className="ag-display ag-num text-[1.125rem] font-bold text-ag-ink">{totalUnits}</span>
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/**
 * A shared course list (brand v2): a night header band with the code, the
 * courses (code, title and units only) with their total, and the ways to
 * import it. Presentational: the page does the lookup.
 */
export function CourseListCard({ code, courses }: { code: string; courses: SharedCourse[] }) {
  const totalUnits = courses.reduce((sum, course) => sum + course.units, 0);
  const courseCount = plural(courses.length, 'course');
  const unitCount = plural(totalUnits, 'unit');

  return (
    <MinimalShell>
      <div className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-8 sm:py-14">
        <article className="overflow-hidden rounded-[28px] bg-white ring-1 ring-ag-ink/[0.06]" aria-labelledby="course-list-title">
          <header className="relative overflow-hidden bg-ag-night px-6 pb-8 pt-7 text-white sm:px-9 sm:pb-9 sm:pt-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(55%_90%_at_95%_100%,rgba(255,178,63,0.2),transparent_70%),radial-gradient(45%_80%_at_0%_0%,rgba(107,78,255,0.4),transparent_70%)]"
            />
            <div className="relative flex items-start justify-between gap-4">
              <AcadeGradeMark size={30} />
              <p className="ag-num rounded-full bg-white/10 px-3.5 py-1.5 text-[0.9375rem] font-semibold tracking-[0.18em] text-ag-gold ring-1 ring-white/15">
                <span className="sr-only">Code </span>
                {code}
              </p>
            </div>
            <h1 id="course-list-title" className="ag-display relative mt-6 text-[2.125rem] font-bold leading-[1.05] sm:text-[2.75rem]">
              Shared course list
            </h1>
            <p className="relative mt-3 text-[0.9375rem] text-ag-mist-night">
              {`Shared by a classmate. ${courseCount}, ${unitCount}.`}
              {courses.length > LONG_LIST ? (
                <>
                  {' '}
                  <InlineLink href="#import" tone="onDark">
                    Jump to import
                  </InlineLink>
                </>
              ) : null}
            </p>
          </header>

          <div className="px-6 py-6 sm:px-9 sm:py-8">
            <CourseTable courses={courses} totalUnits={unitCount} />
          </div>

          <div id="import" className="scroll-mt-6 border-t border-ag-ink/[0.08] px-6 py-7 sm:px-9 sm:py-8">
            <p className="mb-5 flex items-start gap-2.5 text-[0.9375rem] text-ag-ink">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mt-[3px] shrink-0 text-ag-violet">
                <rect x="3.5" y="8" width="11" height="7.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span>Only course codes, titles and units are shared. Scores stay private.</span>
            </p>
            <ImportActions code={code} />
          </div>
        </article>
      </div>
    </MinimalShell>
  );
}
