'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Telescope } from 'lucide-react';

import { formatCgpa } from '@/lib/cgpa/academicRules';
import { useGradingScale } from '@/hooks/useGradingScale';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';
import { previewSemester, type PreviewFigures } from '@/lib/planning/semesterPreview';
import { loadExpectedGrades, saveExpectedGrades } from '@/lib/planning/semesterPreviewStore';
import { Select } from '@/components/ui/Select';

export interface SemesterPreviewCourse {
  id?: string;
  code: string;
  title?: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  grade?: string | null;
  isAR?: boolean;
  pending?: boolean;
}

interface SemesterPreviewProps {
  uid: string;
  semesterId: string;
  /** The saved courses of this semester. */
  courses: readonly SemesterPreviewCourse[];
  /** Every semester summary (this one is replaced by the recomputed figures). */
  semesters: readonly { id: string; gpa: number; pi: number; creditLoaded: number }[];
}


/**
 * A3: "Preview expected grades". Lets the student guess grades for courses
 * still awaiting a result and compare official vs scenario GPA, CGPA and
 * class. Guesses stay on this device; nothing is written to the record.
 */
export function SemesterPreview({ uid, semesterId, courses, semesters }: SemesterPreviewProps) {
  const headingId = useId();
  const { scale } = useGradingScale();
  const grades = useMemo(() => [...scale.bands].sort((a, b) => b.minScore - a.minScore).map((band) => band.grade), [scale]);
  const gradeOptions = useMemo(() => [{ value: '', label: 'Not sure' }, ...grades.map((grade) => ({ value: grade, label: grade }))], [grades]);
  const awaiting = useMemo(
    () => courses.filter((course): course is SemesterPreviewCourse & { id: string } => Boolean(course.id) && (course.isAR === true || course.pending === true)),
    [courses],
  );
  const [expected, setExpected] = useState<Record<string, string>>(() => (
    typeof window === 'undefined' ? {} : loadExpectedGrades(uid, semesterId)
  ));

  // Reload when the semester or account changes.
  useEffect(() => {
    setExpected(loadExpectedGrades(uid, semesterId));
  }, [uid, semesterId]);

  const result = useMemo(() => previewSemester({
    courses: courses.flatMap((course) => (course.id ? [{ ...course, id: course.id }] : [])),
    // Guesses made on another scale are ignored until picked again.
    expected: Object.fromEntries(Object.entries(expected).filter(([, grade]) => grades.includes(grade))),
    semesters,
    semesterId,
    scale,
  }), [courses, expected, semesters, semesterId, scale, grades]);

  if (awaiting.length === 0) return null;

  const choose = (courseId: string, value: string) => {
    setExpected((previous) => {
      const next = { ...previous };
      if (grades.includes(value)) next[courseId] = value;
      else delete next[courseId];
      // Keep only rows that still exist and are still awaiting a result.
      const stillAwaiting = new Set(awaiting.map((course) => course.id));
      for (const id of Object.keys(next)) if (!stillAwaiting.has(id)) delete next[id];
      saveExpectedGrades(uid, semesterId, next);
      return next;
    });
  };

  return (
    <DiscreetScope>
      <section
        aria-labelledby={headingId}
        className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 sm:p-5 lg:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
              <Telescope className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id={headingId} className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">
                Preview expected grades
              </h2>
              <p className="mt-0.5 text-sm text-[var(--acade-text-muted)]">
                Preview only: never saved to your record
              </p>
            </div>
          </div>
          <DiscreetRevealButton label="Preview values" className="border border-[var(--acade-border)]" />
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <ul className="min-w-0 divide-y divide-[var(--acade-border-subtle)] rounded-2xl border border-[var(--acade-border-subtle)]">
            {awaiting.map((course) => {
              const name = course.code.trim() || course.title?.trim() || 'Untitled course';
              return (
                <li key={course.id} className="flex min-h-16 items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-semibold text-[var(--acade-text)]">{name}</p>
                    <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">
                      {course.units} {course.units === 1 ? 'unit' : 'units'}, {course.pending ? 'score not entered' : 'awaiting result'}
                    </p>
                  </div>
                  <Select
                    label={`Expected grade for ${name}`}
                    value={grades.includes(expected[course.id] ?? '') ? expected[course.id] : ''}
                    onChange={(value) => choose(course.id, value)}
                    options={gradeOptions}
                    className="w-[8.5rem] shrink-0 [&>label]:sr-only"
                  />
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 rounded-2xl bg-[var(--acade-void)] p-4">
            <table className="w-full text-left text-[length:var(--text-sm)]">
              <caption className="sr-only">Official figures compared with your expected grades</caption>
              <thead>
                <tr className="text-[0.8125rem] font-medium">
                  <th scope="col" className="pb-2 pr-4 text-[var(--acade-text-muted)]"><span className="sr-only">Figure</span></th>
                  <th scope="col" className="pb-2 pr-4 text-[var(--acade-text-muted)]">Official</th>
                  <th scope="col" className="pb-2 text-[var(--acade-primary)]">With your guesses</th>
                </tr>
              </thead>
              <tbody>
                <FigureRow label="GPA" testId="gpa" official={formatCgpa(result.official.gpa)} scenario={formatCgpa(result.scenario.gpa)} />
                <FigureRow label="CGPA" testId="cgpa" official={formatCgpa(result.official.cgpa)} scenario={formatCgpa(result.scenario.cgpa)} />
                <FigureRow label="Class" testId="class" official={classLabel(result.official)} scenario={classLabel(result.scenario)} />
              </tbody>
            </table>
            {result.previewedCount === 0 && (
              <p className="mt-3 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
                Pick a grade for a course above to see how it could change your figures.
              </p>
            )}
          </div>
        </div>
      </section>
    </DiscreetScope>
  );
}


const classLabel = (figures: PreviewFigures) => figures.band.shortLabel;

function FigureRow({ label, testId, official, scenario }: { label: string; testId: string; official: string; scenario: string }) {
  return (
    <tr className="border-t border-[var(--acade-border-subtle)]">
      <th scope="row" className="py-2.5 pr-4 font-medium text-[var(--acade-text-muted)]">{label}</th>
      <td data-testid={`preview-official-${testId}`} className="app-num py-2.5 pr-4 text-[1.0625rem] font-semibold text-[var(--acade-text)]">
        <DiscreetValue label={`Official ${label}`}>{official}</DiscreetValue>
      </td>
      <td data-testid={`preview-scenario-${testId}`} className="app-num py-2.5 text-[1.0625rem] font-bold text-[var(--acade-primary)]">
        <DiscreetValue label={`Preview ${label}`}>{scenario}</DiscreetValue>
      </td>
    </tr>
  );
}
