'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Telescope } from 'lucide-react';

import { formatCgpa, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';
import { previewSemester, type PreviewFigures } from '@/lib/planning/semesterPreview';
import { loadExpectedGrades, saveExpectedGrades } from '@/lib/planning/semesterPreviewStore';

export interface SemesterPreviewCourse {
  id?: string;
  code: string;
  title?: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  grade?: AcademicGrade | null;
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

const GRADES: AcademicGrade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * A3: "Preview expected grades". Lets the student guess grades for courses
 * still awaiting a result and compare official vs scenario GPA, CGPA and
 * class. Guesses stay on this device; nothing is written to the record.
 */
export function SemesterPreview({ uid, semesterId, courses, semesters }: SemesterPreviewProps) {
  const headingId = useId();
  const awaiting = useMemo(
    () => courses.filter((course): course is SemesterPreviewCourse & { id: string } => Boolean(course.id) && (course.isAR === true || course.pending === true)),
    [courses],
  );
  const [expected, setExpected] = useState<Record<string, AcademicGrade>>(() => (
    typeof window === 'undefined' ? {} : loadExpectedGrades(uid, semesterId)
  ));

  // Reload when the semester or account changes.
  useEffect(() => {
    setExpected(loadExpectedGrades(uid, semesterId));
  }, [uid, semesterId]);

  const result = useMemo(() => previewSemester({
    courses: courses.flatMap((course) => (course.id ? [{ ...course, id: course.id }] : [])),
    expected,
    semesters,
    semesterId,
  }), [courses, expected, semesters, semesterId]);

  if (awaiting.length === 0) return null;

  const choose = (courseId: string, value: string) => {
    setExpected((previous) => {
      const next = { ...previous };
      if (GRADES.includes(value as AcademicGrade)) next[courseId] = value as AcademicGrade;
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
        className="rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={headingId} className="flex items-center gap-2 font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
              <Telescope className="size-5 text-[var(--acade-primary)]" aria-hidden="true" />
              Preview expected grades
            </h2>
            <p className="mt-1 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
              Preview only: never saved to your record
            </p>
          </div>
          <DiscreetRevealButton label="Preview values" className="border border-[var(--acade-border)]" />
        </div>

        <ul className="mt-4 divide-y divide-[var(--acade-border-subtle)] rounded-xl border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
          {awaiting.map((course) => {
            const name = course.code.trim() || course.title?.trim() || 'Untitled course';
            return (
              <li key={course.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">{name}</p>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                    {course.units} {course.units === 1 ? 'unit' : 'units'} · {course.pending ? 'Score not entered' : 'Awaiting result'}
                  </p>
                </div>
                <select
                  aria-label={`Expected grade for ${name}`}
                  value={expected[course.id] ?? ''}
                  onChange={(event) => choose(course.id, event.target.value)}
                  className="min-h-11 shrink-0 rounded-lg border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)]/30"
                >
                  <option value="">Not sure</option>
                  {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </li>
            );
          })}
        </ul>

        <table className="mt-4 w-full text-left text-[length:var(--text-sm)]">
          <caption className="sr-only">Official figures compared with your expected grades</caption>
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide">
              <th scope="col" className="py-1 pr-4 text-[var(--acade-text-muted)]"><span className="sr-only">Figure</span></th>
              <th scope="col" className="py-1 pr-4 text-[var(--acade-text-muted)]">Official</th>
              <th scope="col" className="py-1 text-[var(--acade-primary)]">With your guesses</th>
            </tr>
          </thead>
          <tbody>
            <FigureRow label="GPA" testId="gpa" official={formatCgpa(result.official.gpa)} scenario={formatCgpa(result.scenario.gpa)} />
            <FigureRow label="CGPA" testId="cgpa" official={formatCgpa(result.official.cgpa)} scenario={formatCgpa(result.scenario.cgpa)} />
            <FigureRow label="Class" testId="class" official={classLabel(result.official)} scenario={classLabel(result.scenario)} />
          </tbody>
        </table>
        {result.previewedCount === 0 && (
          <p className="mt-3 text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
            Pick a grade for a course above to see how it could change your figures.
          </p>
        )}
      </section>
    </DiscreetScope>
  );
}

const classLabel = (figures: PreviewFigures) => figures.band.shortLabel;

function FigureRow({ label, testId, official, scenario }: { label: string; testId: string; official: string; scenario: string }) {
  return (
    <tr className="border-t border-[var(--acade-border-subtle)]">
      <th scope="row" className="py-2 pr-4 font-medium text-[var(--acade-text-muted)]">{label}</th>
      <td data-testid={`preview-official-${testId}`} className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--acade-text)]">
        <DiscreetValue label={`Official ${label}`}>{official}</DiscreetValue>
      </td>
      <td data-testid={`preview-scenario-${testId}`} className="py-2 font-[family-name:var(--font-geist-mono)] font-bold tabular-nums text-[var(--acade-primary)]">
        <DiscreetValue label={`Preview ${label}`}>{scenario}</DiscreetValue>
      </td>
    </tr>
  );
}
