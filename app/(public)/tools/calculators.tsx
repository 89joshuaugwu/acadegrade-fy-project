'use client';

import { useState } from 'react';
import { GRADE_POINTS, formatCgpa, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { NumberField, ResultBox, selectClass } from './fields';
import {
  carryOverImpact,
  checkDegreeClass,
  parseNumber,
  requiredGpa,
  weightedAverageFromRows,
  type ScoreRow,
} from './tool-math';

export function DegreeClassCalculator() {
  const [cgpa, setCgpa] = useState('');
  const raw = parseNumber(cgpa);
  const result = checkDegreeClass(raw);
  return (
    <div>
      <NumberField label="Your CGPA" value={cgpa} onChange={setCgpa} placeholder="3.85" hint="Between 0 and 5.00." />
      {cgpa.trim() && !result ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-[var(--acade-danger)]">Enter a CGPA between 0 and 5.00.</p>
      ) : null}
      {result ? (
        <ResultBox>
          <p>
            A CGPA of <strong>{formatCgpa(result.rounded)}</strong> falls in <strong>{result.band.label}</strong>.
          </p>
          {result.next && result.gap !== null ? (
            <p className="mt-1">
              {result.next.label} starts at {result.next.minCGPA.toFixed(2)}, which is {result.gap.toFixed(2)} higher.
            </p>
          ) : (
            <p className="mt-1">This is the highest class on this scale.</p>
          )}
        </ResultBox>
      ) : null}
    </div>
  );
}

export function RequiredGpaCalculator() {
  const [current, setCurrent] = useState('');
  const [completed, setCompleted] = useState('');
  const [remaining, setRemaining] = useState('');
  const [target, setTarget] = useState('');
  const touched = [current, completed, remaining, target].every((value) => value.trim());
  const outcome = requiredGpa({
    currentCgpa: parseNumber(current),
    completedUnits: parseNumber(completed),
    remainingUnits: parseNumber(remaining),
    targetCgpa: parseNumber(target),
  });
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Current CGPA" value={current} onChange={setCurrent} placeholder="3.40" />
        <NumberField label="Target CGPA" value={target} onChange={setTarget} placeholder="3.50" />
        <NumberField label="Units completed" value={completed} onChange={setCompleted} placeholder="90" />
        <NumberField label="Units remaining" value={remaining} onChange={setRemaining} placeholder="60" />
      </div>
      {touched && outcome.status === 'invalid' ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-[var(--acade-danger)]">
          Check the numbers: CGPA values run from 0 to 5.00 and remaining units must be above zero.
        </p>
      ) : null}
      {touched && outcome.status === 'needed' ? (
        <ResultBox>
          <p>You need an average GPA of <strong>{outcome.required.toFixed(2)}</strong> over your remaining units.</p>
          <p className="mt-1">The highest CGPA you can still reach is {outcome.maxReachable.toFixed(2)}.</p>
        </ResultBox>
      ) : null}
      {touched && outcome.status === 'secured' ? (
        <ResultBox>
          <p>Your target is already secured. Even a GPA of 0.00 over the remaining units would not bring you below it.</p>
        </ResultBox>
      ) : null}
      {touched && outcome.status === 'unreachable' ? (
        <ResultBox>
          <p>This target is out of reach with the units you have left.</p>
          <p className="mt-1">The highest CGPA you can still reach is {outcome.maxReachable.toFixed(2)}.</p>
        </ResultBox>
      ) : null}
    </div>
  );
}

const RETAKE_GRADES: readonly AcademicGrade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export function CarryOverCalculator() {
  const [current, setCurrent] = useState('');
  const [completed, setCompleted] = useState('');
  const [failed, setFailed] = useState('');
  const [grade, setGrade] = useState<AcademicGrade>('C');
  const touched = [current, completed, failed].every((value) => value.trim());
  const impact = carryOverImpact({
    currentCgpa: parseNumber(current),
    completedUnits: parseNumber(completed),
    failedUnits: parseNumber(failed),
    retakeGrade: grade,
  });
  const change = (value: number) => {
    const delta = Math.round((value - (impact?.before ?? 0)) * 100) / 100;
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
  };
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Current CGPA" value={current} onChange={setCurrent} placeholder="3.10" />
        <NumberField label="Units completed (including the failed course)" value={completed} onChange={setCompleted} placeholder="60" />
        <NumberField label="Units of the failed course" value={failed} onChange={setFailed} placeholder="3" />
        <div>
          <label htmlFor="retake-grade" className="text-sm font-semibold">Grade you expect on the retake</label>
          <select id="retake-grade" value={grade} onChange={(event) => setGrade(event.target.value as AcademicGrade)} className={selectClass}>
            {RETAKE_GRADES.map((letter) => (
              <option key={letter} value={letter}>{letter} ({GRADE_POINTS[letter]} points)</option>
            ))}
          </select>
        </div>
      </div>
      {touched && !impact ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-[var(--acade-danger)]">
          Check the numbers: the failed units cannot be more than the units completed, and the CGPA must be between 0 and 5.00.
        </p>
      ) : null}
      {impact ? (
        <ResultBox>
          <p>Now: <strong>{impact.before.toFixed(2)}</strong></p>
          <p className="mt-1">If your school adds the retake as extra units: <strong>{impact.bothAttemptsCount.toFixed(2)}</strong> ({change(impact.bothAttemptsCount)})</p>
          <p className="mt-1">If the retake replaces the failed attempt: <strong>{impact.replacesFailure.toFixed(2)}</strong> ({change(impact.replacesFailure)})</p>
        </ResultBox>
      ) : null}
    </div>
  );
}

const MAX_ROWS = 20;

export function WeightedAverageCalculator() {
  const [rows, setRows] = useState<ScoreRow[]>([
    { score: '', units: '' },
    { score: '', units: '' },
    { score: '', units: '' },
  ]);
  const update = (index: number, field: keyof ScoreRow, value: string) =>
    setRows((previous) => previous.map((row, position) => (position === index ? { ...row, [field]: value } : row)));
  const result = weightedAverageFromRows(rows);
  return (
    <div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <NumberField label={`Score ${index + 1} (0 to 100)`} value={row.score} onChange={(value) => update(index, 'score', value)} />
            <NumberField label={`Units ${index + 1}`} value={row.units} onChange={(value) => update(index, 'units', value)} />
            <button
              type="button"
              onClick={() => setRows((previous) => (previous.length > 1 ? previous.filter((_, position) => position !== index) : previous))}
              disabled={rows.length <= 1}
              aria-label={`Remove course ${index + 1}`}
              className="mb-0 min-h-12 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((previous) => (previous.length < MAX_ROWS ? [...previous, { score: '', units: '' }] : previous))}
        disabled={rows.length >= MAX_ROWS}
        className="mt-4 min-h-12 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold hover:border-[var(--acade-primary)] disabled:opacity-40"
      >
        Add a course
      </button>
      {result.skippedRows > 0 ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-[var(--acade-danger)]">
          {result.skippedRows} row{result.skippedRows === 1 ? ' is' : 's are'} left out: use a score from 0 to 100 and units of 1 or more.
        </p>
      ) : null}
      {result.average !== null ? (
        <ResultBox>
          <p>Weighted average score: <strong>{result.average.toFixed(1)}%</strong></p>
          <p className="mt-1">Across {result.includedUnits} unit{result.includedUnits === 1 ? '' : 's'}. This is a percentage, not a CGPA.</p>
        </ResultBox>
      ) : null}
    </div>
  );
}
