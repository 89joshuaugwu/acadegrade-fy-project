import { Calculator, CheckCircle2, ShieldCheck } from 'lucide-react';

const exampleCourses = [
  { code: 'CSC 415', title: 'Computer Graphics', score: 54, grade: 'C', units: 2, gradeClass: 'bg-[var(--acade-gold-dim)] text-[var(--acade-gold)]' },
  { code: 'CSC 463', title: 'Software Engineering', score: 62, grade: 'B', units: 2, gradeClass: 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' },
  { code: 'MTH 321', title: 'Numerical Analysis', score: 71, grade: 'A', units: 3, gradeClass: 'bg-[var(--acade-success-dim)] text-[var(--acade-success)]' },
] as const;

export function AcademicProof() {
  return (
    <section id="features" aria-labelledby="academic-proof-title" className="scroll-mt-20 border-b border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold text-[var(--acade-primary)]">Calculation you can inspect</p>
          <h2
            id="academic-proof-title"
            className="mt-3 max-w-[15ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--acade-text)]"
          >
            From semester results to a clear degree outlook.
          </h2>
          <p className="mt-5 max-w-[48ch] text-base leading-7 text-[var(--acade-text-muted)]">
            AcadeGrade keeps the calculation basis close to the result. You can see the scores, credit units, grades, and academic signals behind each summary.
          </p>

          <div className="mt-8 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-[var(--acade-text)]">A clear trust boundary</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
                  AcadeGrade calculates from the records you enter. It does not replace an official university record.
                </p>
              </div>
            </div>
          </div>
        </div>

        <figure
          aria-labelledby="worked-record-title"
          aria-describedby="worked-record-caption"
          className="overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--acade-border-subtle)] p-5 sm:p-7">
            <div>
              <p className="text-xs font-semibold text-[var(--acade-gold)]">Illustrative example</p>
              <h3 id="worked-record-title" className="mt-1 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
                Worked academic record example
              </h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--acade-success-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--acade-success)]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Complete inputs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <caption className="sr-only">Three illustrative courses used for the semester calculation</caption>
              <thead>
                <tr className="border-b border-[var(--acade-border-subtle)] text-xs text-[var(--acade-text-faint)]">
                  <th scope="col" className="px-5 py-3 font-semibold sm:px-7">Course</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Score</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">Grade</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-7">Credits</th>
                </tr>
              </thead>
              <tbody>
                {exampleCourses.map((course) => (
                  <tr key={course.code} className="border-b border-[var(--acade-border-subtle)] last:border-b-0">
                    <td className="px-5 py-4 sm:px-7">
                      <span className="block font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-text)]">{course.code}</span>
                      <span className="mt-1 block text-sm text-[var(--acade-text-muted)]">{course.title}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-[family-name:var(--font-geist-mono)] text-sm text-[var(--acade-text)]">{course.score}/100</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 font-[family-name:var(--font-geist-mono)] text-sm font-bold ${course.gradeClass}`}>
                        {course.grade}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-[family-name:var(--font-geist-mono)] text-sm text-[var(--acade-text)] sm:px-7">{course.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-px border-t border-[var(--acade-border)] bg-[var(--acade-border)] sm:grid-cols-[1.2fr_1fr_1fr]">
            <div className="bg-[var(--acade-deep)] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--acade-text)]">
                <Calculator className="size-4 text-[var(--acade-primary)]" aria-hidden="true" />
                Semester summary
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--acade-text-muted)]">Weighted by 7 recorded credit units on a five-point scale.</p>
            </div>
            <div className="bg-[var(--acade-surface)] p-5 sm:p-6">
              <p className="text-xs font-semibold text-[var(--acade-text-faint)]">GPA</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[var(--acade-text)]">4.14</p>
            </div>
            <div className="bg-[var(--acade-surface)] p-5 sm:p-6">
              <p className="text-xs font-semibold text-[var(--acade-text-faint)]">PI</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[var(--acade-gold)]">3.18</p>
            </div>
          </div>

          <figcaption id="worked-record-caption" className="border-t border-[var(--acade-border-subtle)] px-5 py-4 text-xs leading-5 text-[var(--acade-text-muted)] sm:px-7">
            Scores and outcomes are deterministic sample data for explaining the product, not a student account or institutional result.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
