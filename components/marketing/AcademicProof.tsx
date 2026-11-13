'use client';

import { useId, useMemo, useState } from 'react';
import { NotebookPen, ShieldCheck } from 'lucide-react';
import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';
import { getGradeColor } from '@/lib/cgpa/gradeScale';
import { ProofDeck } from './ProofDeck';

/** Illustrative, internally consistent sample: GPA 4.14 and PI 3.18 at the default scores. */
const exampleCourses = [
  { code: 'CSC 415', title: 'Computer Graphics', score: 54, units: 2 },
  { code: 'CSC 463', title: 'Software Engineering', score: 62, units: 2 },
  { code: 'MTH 321', title: 'Numerical Analysis', score: 71, units: 3 },
] as const;

const ADJUSTABLE_INDEX = 2;

function useExampleSemester(adjustedScore: number) {
  return useMemo(() => {
    // The live example runs through the same engine the dashboard uses; nothing is re-implemented here.
    const metrics = exampleCourses.map((course, index) =>
      computeCourseMetrics({
        code: course.code,
        title: course.title,
        units: course.units,
        caScore: index === ADJUSTABLE_INDEX ? adjustedScore : course.score,
        examScore: 0,
      })
    );
    return { metrics, semester: computeSemesterGPA(metrics) };
  }, [adjustedScore]);
}

export function AcademicProof() {
  const [score, setScore] = useState<number>(exampleCourses[ADJUSTABLE_INDEX].score);
  const { metrics, semester } = useExampleSemester(score);
  const sliderId = useId();
  const hintId = useId();
  const adjusted = metrics[ADJUSTABLE_INDEX];

  return (
    <section
      id="features"
      aria-labelledby="academic-proof-title"
      className="academic-proof-scene public-atmosphere-section scroll-mt-20"
    >
      <div className="academic-proof-grid mx-auto grid max-w-[1200px] items-start gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-32">
        <div className="academic-proof-copy lg:sticky lg:top-28 lg:col-span-5">
          <h2
            id="academic-proof-title"
            data-landing-motion="heading"
            className="max-w-[14ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--acade-text)]"
          >
            Calculation you can follow.
          </h2>
          <p data-landing-motion="" style={{ '--landing-delay': '90ms' } as React.CSSProperties} className="mt-6 max-w-[46ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
            <strong className="font-semibold text-[var(--acade-text)]">A result becomes useful when its basis stays visible.</strong>{' '}
            AcadeGrade keeps course inputs, credit weighting, GPA, PI and degree outlook connected, so a headline metric never floats free of the record behind it.
          </p>
          <div data-landing-motion="" style={{ '--landing-delay': '180ms' } as React.CSSProperties} className="mt-8 flex max-w-[46ch] gap-3 rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Honest by design</p>
              <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
                AcadeGrade calculates from the records you enter. It does not replace an official university record.
              </p>
            </div>
          </div>
        </div>

        <ProofDeck>
          <div data-ui="" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-[-0.02em]">Record the semester evidence</h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--acade-text-muted)]">2025/2026 · First semester · Illustrative</p>
              </div>
              <NotebookPen className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
            </div>
            <ol aria-label="Illustrative courses on small screens" className="mt-6 divide-y divide-[var(--acade-border-subtle)] sm:hidden">
              {metrics.map((course) => (
                <li key={course.code} className="grid min-w-0 grid-cols-[1fr_auto] gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">{course.code}</p><p className="mt-1 truncate text-sm text-[var(--acade-text-muted)]">{course.title}</p></div>
                  <div className="flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    <span>{course.totalScore}/100</span>
                    <span className="font-semibold" style={{ color: getGradeColor(course.grade) }}>{course.grade}</span>
                    <span>{course.units}u</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 hidden min-w-0 overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Illustrative semester result inputs</caption>
                <thead className="text-[0.8125rem] text-[var(--acade-text-muted)]">
                  <tr className="border-b border-[var(--acade-border-subtle)]"><th scope="col" className="pb-3 font-semibold">Course</th><th scope="col" className="pb-3 text-right font-semibold">Score</th><th scope="col" className="pb-3 text-right font-semibold">Grade</th><th scope="col" className="pb-3 text-right font-semibold">Credits</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--acade-border-subtle)]">
                  {metrics.map((course) => (
                    <tr key={course.code}>
                      <td className="py-4"><span className="font-[family-name:var(--font-geist-mono)] font-semibold">{course.code}</span><span className="ml-2 text-[var(--acade-text-muted)]">{course.title}</span></td>
                      <td className="py-4 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{course.totalScore}</td>
                      <td className="py-4 text-right font-[family-name:var(--font-geist-mono)] font-semibold" style={{ color: getGradeColor(course.grade) }}>{course.grade}</td>
                      <td className="py-4 text-right font-[family-name:var(--font-geist-mono)] tabular-nums">{course.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-right text-[0.8125rem] text-[var(--acade-text-muted)]">u = credit units</p>
          </div>

          <div data-ui="" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-[-0.02em]">Weight the result by its academic load</h3>
                <p className="mt-3 max-w-[45ch] text-sm leading-6 text-[var(--acade-text-muted)]">Every course keeps its contribution visible, so the total can always be traced back to the record.</p>
              </div>
              <div className="rounded-[var(--radius-surface)] bg-[var(--acade-overlay)] px-6 py-5 text-center">
                <p className="text-[0.8125rem] font-semibold text-[var(--acade-text-muted)]">Recorded credits</p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-semibold tabular-nums">{semester.creditLoaded}</p>
              </div>
            </div>
            <div className="mt-5 grid min-w-0 gap-3 rounded-[var(--radius-control)] bg-[var(--acade-overlay)] p-4 text-sm leading-6 text-[var(--acade-text-muted)] sm:grid-cols-2">
              <p className="min-w-0">Quality points = grade point × credits</p>
              <p className="min-w-0">Semester GPA = total quality points ÷ total credits</p>
            </div>
          </div>

          <div data-ui="" className="academic-proof-card min-w-0 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-[-0.02em]">GPA and PI, side by side</h3>
            <p id={hintId} className="mt-2 max-w-[52ch] text-sm leading-6 text-[var(--acade-text-muted)]">
              Move the MTH 321 score. Anything from 70 to 100 prints as an A, so GPA holds still while PI keeps tracking the real score.
            </p>

            <div className="score-explorer mt-5 rounded-[var(--radius-surface)] bg-[var(--acade-overlay)] p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor={sliderId} className="text-sm font-semibold">MTH 321 total score</label>
                <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums" aria-hidden="true">
                  <span className="text-lg font-semibold text-[var(--acade-text)]">{score}</span>
                  <span className="text-[var(--acade-text-muted)]">/100 · </span>
                  <span className="font-semibold" style={{ color: getGradeColor(adjusted.grade) }}>{adjusted.grade}</span>
                </p>
              </div>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={score}
                aria-describedby={hintId}
                aria-valuetext={`${score} out of 100, grade ${adjusted.grade}`}
                onChange={(event) => setScore(Number(event.target.value))}
                className="score-explorer-range mt-3 w-full"
                style={{ '--score-fill': `${score}%` } as React.CSSProperties}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-surface)] bg-[var(--acade-primary-dim)] p-5 sm:p-6">
                <p className="text-sm font-semibold text-[var(--acade-text)]">Semester GPA</p>
                <output htmlFor={sliderId} className="mt-2 block font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tabular-nums tracking-tight">{semester.gpa.toFixed(2)}</output>
                <p className="mt-3 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Letter-grade points, credit weighted</p>
              </div>
              <div className="rounded-[var(--radius-surface)] bg-[var(--acade-gold-dim)] p-5 sm:p-6">
                <p className="text-sm font-semibold text-[var(--acade-gold)]">Performance Index</p>
                <output htmlFor={sliderId} className="mt-2 block font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tabular-nums tracking-tight text-[var(--acade-gold)]">{semester.pi.toFixed(2)}</output>
                <p className="mt-3 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Continuous raw-score signal when available</p>
              </div>
            </div>
            <p className="mt-4 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Calculated with the default Nigerian 5-point scale. Your institution’s configured scale may differ.</p>
          </div>

          <div data-ui="" className="academic-proof-card academic-proof-card--outlook min-w-0 rounded-[var(--radius-dialog)] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <h3 className="max-w-[16ch] font-[family-name:var(--font-bricolage)] text-2xl font-semibold leading-tight tracking-[-0.02em]">A trajectory, not just a total</h3>
              <div className="text-right">
                <p className="font-[family-name:var(--font-geist-mono)] text-3xl font-semibold tabular-nums">3.71</p>
                <p className="text-[0.8125rem] text-[#C3C8DA]">CGPA · after 117 credits</p>
              </div>
            </div>
            <svg viewBox="0 0 600 180" role="img" aria-label="Illustrative CGPA trajectory rising over four semesters" className="mt-6 h-auto w-full">
              <path d="M42 145 C120 140 152 132 210 116 S330 93 386 69 S480 48 558 30" fill="none" stroke="#8B84FF" strokeWidth="4" strokeLinecap="round" />
              <path d="M42 157 C135 150 161 150 210 142 S321 132 386 115 S493 105 558 96" fill="none" stroke="#F4B544" strokeWidth="2.5" strokeDasharray="7 7" />
              <g fill="#17172E" stroke="#8B84FF" strokeWidth="3"><circle cx="42" cy="145" r="5" /><circle cx="210" cy="116" r="5" /><circle cx="386" cy="69" r="5" /><circle cx="558" cy="30" r="7" /></g>
            </svg>
            <div className="mt-4 flex flex-wrap gap-5 text-[0.8125rem] text-[#C3C8DA]"><span>Solid · CGPA</span><span>Dashed · PI</span><span className="ml-auto">Illustrative example</span></div>
          </div>
        </ProofDeck>
      </div>
    </section>
  );
}
