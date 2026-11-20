'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCgpa, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { saveCalculatorHandoff } from '@/lib/handoff/calculator';
import { EXAMPLE_GRADES, computeExampleSlip } from '@/lib/public/example-student';
import { homeHandoffCourses, liveSlipAnnouncement } from '@/lib/public/home';
import { ArcGauge } from '@/components/site/ArcGauge';

const GRADES: AcademicGrade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

function useTween(target: number) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = current.current;
    if (reduce || from === target) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = t >= 1 ? target : next;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

/**
 * The hero's live demo: an example 300L Computer Science semester on the real
 * engine. Changing a grade moves the arc, the CGPA and the class. The first
 * change offers "Save this semester", which writes the existing calculator
 * handoff and opens sign-up.
 */
export function HeroLive() {
  const [grades, setGrades] = useState<Record<string, AcademicGrade>>(() => ({ ...EXAMPLE_GRADES }));
  const [touched, setTouched] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const slip = useMemo(() => computeExampleSlip(grades), [grades]);
  const cgpa = useTween(slip.cgpa);
  const { user } = useAuth();
  const first = slip.classBand.short === '1st';

  useEffect(() => {
    if (!touched) return;
    const timer = setTimeout(() => setAnnouncement(liveSlipAnnouncement(slip)), 500);
    return () => clearTimeout(timer);
  }, [slip, touched]);

  const choose = (code: string, grade: AcademicGrade) => {
    setGrades((previous) => (previous[code] === grade ? previous : { ...previous, [code]: grade }));
    setTouched(true);
  };

  let status = '';
  if (first) status = 'First Class reached';
  else if (slip.toFirstClass > 0) status = `${slip.toFirstClass.toFixed(2)} to First Class`;

  const save = touched && !user;

  return (
    <div className="relative rounded-[28px] bg-white/[0.045] p-4 ring-1 ring-white/10 backdrop-blur-sm sm:rounded-[32px] sm:p-7">
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-8">
        <div className="relative mx-auto w-full max-w-[15rem]">
          <ArcGauge
            value={slip.cgpa}
            className="ag-gauge-intro block h-auto w-full"
            label={`CGPA ${formatCgpa(slip.cgpa)} of 5.00, ${slip.classBand.label}`}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3">
            <span className="text-[0.75rem] font-medium text-ag-mist-night">CGPA</span>
            <span className="ag-display ag-num text-[3.5rem] font-bold leading-none text-white">{formatCgpa(cgpa)}</span>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <p
            className={`inline-block rounded-full px-3.5 py-1.5 text-[0.9375rem] font-semibold transition-colors duration-300 ${
              first ? 'bg-ag-gold text-ag-night' : 'bg-white/10 text-white'
            }`}
          >
            {slip.classBand.label}
          </p>
          <p className="mt-3 text-[0.9375rem] text-ag-mist-night" aria-hidden="true">
            {status}
          </p>
          <dl className="mt-5 flex justify-center gap-8 sm:justify-start">
            <div>
              <dt className="text-[0.75rem] text-ag-mist-night">Semester GPA</dt>
              <dd className="ag-display ag-num text-[1.75rem] font-bold text-white">{formatCgpa(slip.gpa)}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] text-ag-mist-night">Units</dt>
              <dd className="ag-display ag-num text-[1.75rem] font-bold text-white">{slip.units}</dd>
            </div>
            {slip.carryOvers > 0 ? (
              <div>
                <dt className="text-[0.75rem] text-ag-mist-night">Carry-overs</dt>
                <dd className="ag-display ag-num text-[1.75rem] font-bold text-[#FF8B7E]">{slip.carryOvers}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="mt-6 min-w-0">
        <table className="w-full border-separate border-spacing-y-1 text-left">
          <caption className="sr-only">Example semester: 300L Computer Science, 2025/2026 first semester</caption>
          <thead>
            <tr className="text-[0.75rem] text-ag-mist-night">
              <th scope="col" className="pb-1 font-medium">
                <span className="sm:hidden">Example 300L semester</span>
                <span className="hidden sm:inline">Example semester, 300L Computer Science</span>
              </th>
              <th scope="col" className="hidden w-14 pb-1 font-medium sm:table-cell">Units</th>
              <th scope="col" className="pb-1 text-right font-medium">Grade</th>
            </tr>
          </thead>
            <tbody>
              {slip.rows.map((row) => (
                <tr key={row.code} className="align-middle">
                  <th scope="row" className="max-w-0 pr-2 text-left font-normal">
                    <span className="block whitespace-nowrap text-[0.9375rem] font-semibold text-white">{row.code}</span>
                    <span className="block truncate text-[0.75rem] text-ag-mist-night">{row.title}</span>
                  </th>
                  <td className="ag-num hidden text-[0.9375rem] text-white/80 sm:table-cell">{row.units}</td>
                  <td className="text-right">
                    <fieldset className="inline-flex gap-[3px] sm:gap-1">
                      <legend className="sr-only">{`Grade for ${row.code} ${row.title}`}</legend>
                      {GRADES.map((grade) => (
                        <label key={grade} className="relative">
                          <input
                            type="radio"
                            name={`ag-grade-${row.code}`}
                            value={grade}
                            checked={grades[row.code] === grade}
                            onChange={() => choose(row.code, grade)}
                            className="peer sr-only"
                          />
                          <span className="ag-key" data-grade={grade} aria-hidden="true">
                            {grade}
                          </span>
                          <span className="sr-only">{grade}</span>
                        </label>
                      ))}
                    </fieldset>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>

        <div className="mt-4 flex min-h-[3.25rem] flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-2.5">
          <p className="text-[0.875rem] text-ag-mist-night">
            {save ? 'Like what you see? Keep this semester.' : 'Tap a grade to see your class move.'}
          </p>
          {save ? (
            <Link
              href="/register"
              onClick={() => saveCalculatorHandoff({ mode: 'grade', courses: homeHandoffCourses(slip) })}
              className="ag-focus rounded-xl bg-ag-gold px-3.5 py-2 text-[0.875rem] font-semibold text-ag-night transition hover:brightness-105"
            >
              Save this semester
            </Link>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
