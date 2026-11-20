'use client';

import { useEffect, useRef, useState } from 'react';
import { TextLinkV2 } from '@/components/site/ui';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { ClassPill, GaugeFigure, MiniArc, NightCard, Stat, SummaryStrip } from '@/components/site/tools/result';
import {
  ErrorLine,
  PillChoice,
  Segmented,
  TButton,
  TField,
  TStepper,
  inputClass,
  textButtonClass,
  useFieldId,
  type PillOption,
} from '@/components/site/tools/controls';
import { Announcer, useTween } from '@/components/site/tools/hooks';
import { formatCgpa, GRADE_POINTS, gradeFromScore, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE } from '@/lib/public/scales';
import {
  announcement,
  NO_VALUE,
  carryOverHref,
  gapLine,
  rowName,
  scoreInvalid,
  SCORE_ERROR,
  slipNotes,
  summaryLine,
  validScore,
  priorCgpaError,
  priorUnitsError,
  type CalcRow,
  type CalculationResult,
  type CalculatorMode,
} from '@/components/public/tools/calculator-model';
import { CALCULATOR_MAX_ROWS, CODE_MAX_LENGTH } from '@/components/public/tools/calculator-url';
import { trackToolEvent } from '@/components/public/tools/track';
import { CALCULATOR_COPY } from './calculator-content';
import { useCalculator } from './CalculatorProvider';

const MODE_OPTIONS: { value: CalculatorMode; label: string }[] = [
  { value: 'grade', label: 'Letter grades' },
  { value: 'score', label: 'Scores out of 100' },
];

const GRADE_OPTIONS: PillOption<AcademicGrade>[] = DEFAULT_SCALE.gradeBands.map((band) => ({
  value: band.grade,
  label: band.grade,
  tone: band.gradePoint === DEFAULT_SCALE.maxPoint ? 'gold' : band.gradePoint === 0 ? 'mark' : undefined,
}));

/* Row grids. Phone: code, units and remove on the first line; grades (or score, letter) and the point on the second.
   From 768px: one line in source order. */
const GRID = {
  grade: 'grid-cols-[minmax(0,1fr)_7.25rem_2.5rem] md:grid-cols-[minmax(0,1fr)_7.25rem_auto_2.75rem_2.5rem]',
  score: 'grid-cols-[minmax(0,1fr)_7.25rem_2.5rem] md:grid-cols-[minmax(0,1fr)_7.25rem_6.5rem_2.75rem_2.75rem_2.5rem]',
};
const HEADS = {
  grade: 'md:grid-cols-[minmax(0,1fr)_7.25rem_auto_2.75rem_2.5rem]',
  score: 'md:grid-cols-[minmax(0,1fr)_7.25rem_6.5rem_2.75rem_2.75rem_2.5rem]',
};
const CELL = 'md:col-span-1 md:col-start-auto md:row-start-auto';

/** "Second Class Upper" pill tone: gold at First Class, coral below a Pass. */
export function classTone(result: CalculationResult): 'gold' | 'mark' | 'plain' | 'empty' {
  if (!result.classBand) return 'empty';
  if (result.classBand.engineShort === '1st') return 'gold';
  if (result.classBand.engineShort === 'Fail') return 'mark';
  return 'plain';
}

/** The calculator: course rows on the left, the night result card on the right (stacked on phones). */
export function CalculatorSlip() {
  const calc = useCalculator();
  const { state, result } = calc;
  const codeRefs = useRef(new Map<string, HTMLInputElement>());
  const addRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [blurred, setBlurred] = useState<Set<string>>(() => new Set());
  const reportedUse = useRef(false);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget === 'add') addRef.current?.focus();
    else if (focusTarget === 'undo') undoRef.current?.focus();
    else codeRefs.current.get(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget, state.rows]);

  useEffect(() => {
    if (state.pristine || reportedUse.current || !result.semester) return;
    reportedUse.current = true;
    trackToolEvent('tool_used', { tool: 'calculator' });
  }, [state.pristine, result.semester]);

  const notes = slipNotes(result, state.flags).slice(0, 2);
  const headline = result.headline;
  const atLimit = state.rows.length >= CALCULATOR_MAX_ROWS;
  const canSave = Boolean(result.semester);

  const removeRow = (row: CalcRow, index: number) => {
    const following = state.rows[index + 1];
    calc.removeRow(row.id);
    setFocusTarget(following ? following.id : 'add');
  };

  const markBlurred = (key: string) =>
    setBlurred((previous) => {
      if (previous.has(key)) return previous;
      const next = new Set(previous);
      next.add(key);
      return next;
    });

  return (
    <ToolStage label="CGPA calculator" after={<UnderNote>{CALCULATOR_COPY.honestNote}</UnderNote>}>
      <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-10`}>
        <div className="min-w-0">
          <SummaryStrip>
            <MiniArc value={headline ? headline.value : null} />
            <span className="flex min-w-0 flex-col">
              <span className="text-[0.8125rem] text-ag-mist-night">{headline?.label ?? 'Semester GPA'}</span>
              <span className="ag-display ag-num text-[1.5rem] font-bold leading-none">{headline ? formatCgpa(headline.value) : NO_VALUE}</span>
            </span>
            <span className="ml-auto min-w-0 truncate text-right text-[0.875rem] font-semibold text-white/85">{result.classBand?.label ?? 'Add a course'}</span>
          </SummaryStrip>

          <form onSubmit={(event) => event.preventDefault()} aria-labelledby="courses-title">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h2 id="courses-title" className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">
                  Your courses
                </h2>
                <p className="mt-1 text-[0.9375rem] text-ag-mist">{state.exampleLoaded ? CALCULATOR_COPY.exampleLine : DEFAULT_SCALE.line}</p>
              </div>
              <div className="min-w-0">
                <p id="mode-label" className="mb-2 text-[0.875rem] font-medium text-ag-ink">
                  What does your slip show?
                </p>
                <Segmented<CalculatorMode> name="calc-mode" labelledBy="mode-label" options={MODE_OPTIONS} value={state.mode} onChange={calc.setMode} className="w-full md:w-auto" />
              </div>
            </div>

            {state.pristine && state.rows.length === 3 ? (
              <p className="mt-6 text-[0.9375rem] text-ag-mist">Three courses to start with. Change them to match your slip.</p>
            ) : null}

            {state.rows.length ? (
              <>
                {state.mode === 'score' ? <p className="mt-4 text-[0.875rem] text-ag-mist md:hidden">Score is CA plus exam, out of 100.</p> : null}
                <div
                  className={`mt-6 hidden items-end gap-x-3 pb-2 pl-3 pr-2 text-[0.8125rem] font-medium text-ag-mist md:grid ${HEADS[state.mode]}`}
                  aria-hidden="true"
                >
                  <span>Course code</span>
                  <span>Units</span>
                  {state.mode === 'score' ? (
                    <span className="leading-tight">
                      Score <span className="block text-[0.8125rem] font-normal">CA plus exam, out of 100</span>
                    </span>
                  ) : null}
                  <span>Grade</span>
                  <span className="text-center">Point</span>
                  <span />
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_7.25rem_2.5rem] gap-x-2 px-3 pb-2 text-[0.8125rem] font-medium text-ag-mist md:hidden" aria-hidden="true">
                  <span>Course code</span>
                  <span className="text-center">Units</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {state.rows.map((row, index) => (
                    <CourseRow
                      key={row.id}
                      row={row}
                      index={index}
                      mode={state.mode}
                      fresh={row.id === justAdded}
                      scoreBlurred={blurred.has(`s-${row.id}`) || Boolean(row.reset)}
                      onScoreBlur={() => markBlurred(`s-${row.id}`)}
                      codeRef={(element) => {
                        if (element) codeRefs.current.set(row.id, element);
                        else codeRefs.current.delete(row.id);
                      }}
                      onChange={(patch) => calc.updateRow(row.id, patch)}
                      onRemove={() => removeRow(row, index)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl bg-ag-haze/70 px-5 py-8 text-center">
                <p className="text-[1rem] font-semibold text-ag-ink">No courses on this slip.</p>
                <p className="mt-1 text-[0.9375rem] text-ag-mist">Add one below, or load the example to see how it works.</p>
              </div>
            )}

            <button
              ref={addRef}
              type="button"
              className={`ag-focus mt-3 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-[1rem] font-semibold transition ${
                atLimit ? 'cursor-not-allowed border-ag-ink/10 text-ag-mist' : 'border-ag-violet/25 text-ag-violet hover:border-ag-violet/50 hover:bg-ag-violet/[0.04]'
              }`}
              aria-disabled={atLimit ? true : undefined}
              onClick={() => {
                if (atLimit) return;
                const id = calc.addRow();
                if (id) {
                  setJustAdded(id);
                  setFocusTarget(id);
                }
              }}
            >
              {atLimit ? null : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {atLimit ? `This slip holds up to ${CALCULATOR_MAX_ROWS} courses` : 'Add a course'}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div aria-live="polite" className="text-[0.9375rem] text-ag-ink">
                {state.cleared ? (
                  <p className="flex items-center gap-3 rounded-xl bg-ag-night px-4 py-2.5 text-white">
                    All courses cleared.{' '}
                    <button
                      ref={undoRef}
                      type="button"
                      className={textButtonClass(true)}
                      onClick={() => {
                        calc.undoClear();
                        setFocusTarget('add');
                      }}
                    >
                      Undo
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.9375rem]">
                <button type="button" className={`${textButtonClass()} min-h-11`} onClick={calc.loadExample}>
                  Load an example slip
                </button>
                {state.rows.length ? (
                  <button
                    type="button"
                    className="ag-focus min-h-11 rounded font-semibold text-ag-mist underline decoration-ag-mist/30 underline-offset-4 transition hover:text-ag-ink"
                    aria-label="Clear all courses"
                    onClick={() => {
                      calc.clearAll();
                      setFocusTarget('undo');
                    }}
                  >
                    Clear all courses
                  </button>
                ) : null}
              </div>
            </div>

            <PriorRecord blurred={blurred} markBlurred={markBlurred} />

            {notes.length ? (
              <div className="mt-5 space-y-2 text-[0.9375rem] leading-relaxed">
                {notes.map((note) => (
                  <p
                    key={note.kind + note.text}
                    className={`rounded-xl px-4 py-3 ${note.kind === 'carry' ? 'bg-[#FFF1EE] text-[#8F2A16]' : 'bg-ag-haze text-ag-ink'}`}
                  >
                    {note.text}
                    {note.kind === 'carry' ? (
                      <>
                        {' '}
                        <TextLinkV2 href={carryOverHref(result)}>See what a retake would do</TextLinkV2>
                      </>
                    ) : null}
                  </p>
                ))}
              </div>
            ) : null}
            <noscript>
              <p className="mt-4 text-[0.9375rem] text-ag-mist">Turn on JavaScript to change the courses.</p>
            </noscript>
          </form>
        </div>

        <CalculatorResult canSave={canSave} />
      </div>
    </ToolStage>
  );
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function CourseRow({
  row,
  index,
  mode,
  fresh,
  scoreBlurred,
  onScoreBlur,
  codeRef,
  onChange,
  onRemove,
}: {
  row: CalcRow;
  index: number;
  mode: CalculatorMode;
  fresh: boolean;
  scoreBlurred: boolean;
  onScoreBlur: () => void;
  codeRef: (element: HTMLInputElement | null) => void;
  onChange: (patch: Partial<CalcRow>) => void;
  onRemove: () => void;
}) {
  const name = rowName(row, index);
  const score = validScore(row.scoreText);
  const grade = mode === 'grade' ? row.grade : score === null ? null : gradeFromScore(score).grade;
  const point = grade ? GRADE_POINTS[grade] : null;
  const carry = point === 0;
  const scoreError = mode === 'score' && scoreBlurred && scoreInvalid(row.scoreText) ? SCORE_ERROR : null;
  const codeId = useFieldId();
  const scoreId = useFieldId();
  const errorId = `${scoreId}-error`;
  const tone = row.reset ? 'bg-[#FFF1EE] ring-1 ring-inset ring-[#C2361F]/40' : carry ? 'bg-[#FFF4F2] ring-1 ring-inset ring-[#C2361F]/20' : 'bg-ag-haze/70';

  return (
    <fieldset className={`min-w-0 rounded-2xl p-3 md:py-2.5 md:pl-3 md:pr-2 ${tone} ${fresh ? 'ag-row-in' : ''}`} data-mode={mode} data-reset={row.reset ? 'true' : undefined}>
      <legend className="sr-only">
        Course {index + 1}
        {row.code.trim() ? `: ${row.code.trim().toUpperCase()}` : ''}
      </legend>
      <div className={`grid items-center gap-x-2 gap-y-2.5 md:gap-x-3 ${GRID[mode]}`}>
        <div className={`col-start-1 row-start-1 min-w-0 ${CELL}`}>
          <label htmlFor={codeId} className="sr-only">
            Course code, course {index + 1}
          </label>
          <input
            ref={codeRef}
            id={codeId}
            placeholder="e.g. CSC 201"
            maxLength={CODE_MAX_LENGTH}
            autoComplete="off"
            value={row.code}
            onChange={(event) => onChange({ code: event.target.value })}
            onBlur={(event) => {
              const upper = event.target.value.toUpperCase();
              if (upper !== row.code) onChange({ code: upper });
            }}
            className={`${inputClass({ size: 'sm' })} h-11 font-semibold`}
          />
        </div>
        <TStepper
          className={`col-start-2 row-start-1 ${CELL}`}
          label={`Units for ${name}`}
          min={DEFAULT_SCALE.units.min}
          max={DEFAULT_SCALE.units.max}
          value={row.units}
          onChange={(units) => onChange({ units, reset: false })}
        />
        {mode === 'grade' ? (
          <PillChoice<AcademicGrade>
            name={`grade-${row.id}`}
            label={`Grade for ${name}`}
            options={GRADE_OPTIONS}
            value={row.grade}
            onChange={(value) => onChange({ grade: value, reset: false })}
            className={`col-span-2 col-start-1 row-start-2 flex gap-1 ${CELL}`}
            itemClassName="min-w-0 flex-1 md:flex-none [&>.ag-pill]:min-w-0 md:[&>.ag-pill]:min-w-[2.5rem]"
          />
        ) : (
          <>
            <div className={`col-start-1 row-start-2 min-w-0 ${CELL}`}>
              <label htmlFor={scoreId} className="sr-only">
                Score for {name}, out of 100
              </label>
              <input
                id={scoreId}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Score"
                value={row.scoreText}
                aria-invalid={scoreError ? true : undefined}
                aria-describedby={scoreError ? errorId : undefined}
                onBlur={onScoreBlur}
                onChange={(event) => onChange({ scoreText: event.target.value, reset: false })}
                className={`${inputClass({ size: 'sm', invalid: Boolean(scoreError) })} ag-num h-11 text-center font-semibold`}
              />
            </div>
            <span className={`col-start-2 row-start-2 flex items-center gap-2 text-[0.9375rem] md:justify-center ${CELL}`}>
              <span className="text-ag-mist md:sr-only">Grade</span>
              <span
                className={`ag-display grid h-10 w-10 place-items-center rounded-full text-[1.0625rem] font-bold ${
                  grade === 'A' ? 'bg-ag-gold text-ag-night' : grade === 'F' ? 'bg-[#C2361F] text-white' : grade ? 'bg-ag-night text-white' : 'bg-white text-ag-mist ring-1 ring-inset ring-ag-ink/10'
                }`}
              >
                {grade ?? NO_VALUE}
              </span>
            </span>
          </>
        )}
        <span className={`col-start-3 row-start-2 whitespace-nowrap text-center ${CELL}`}>
          <span className="sr-only">Point </span>
          <span className={`ag-display ag-num text-[1.25rem] font-bold ${carry ? 'text-[#C2361F]' : point === null ? 'text-ag-mist' : 'text-ag-ink'}`}>
            {point === null ? NO_VALUE : point}
          </span>
          {point === null ? null : (
            <span className={`ml-0.5 text-[0.8125rem] font-medium md:hidden ${carry ? 'text-[#C2361F]' : 'text-ag-mist'}`} aria-hidden="true">
              pts
            </span>
          )}
          {carry ? <span className="sr-only"> carry-over</span> : null}
        </span>
        <button
          type="button"
          className={`ag-focus col-start-3 row-start-1 grid h-10 w-10 place-items-center justify-self-end rounded-full text-ag-mist transition hover:bg-white hover:text-[#C2361F] ${CELL}`}
          aria-label={`Remove ${name}`}
          title="Remove"
          onClick={onRemove}
        >
          <RemoveIcon />
        </button>
      </div>
      {scoreError ? <ErrorLine id={errorId}>{scoreError}</ErrorLine> : null}
      {row.reset ? <p className="mt-2 text-[0.875rem] font-medium text-[#8F2A16]">A value from the link was reset. Check this row.</p> : null}
    </fieldset>
  );
}

/** "Add your CGPA so far": the optional prior record that turns the semester GPA into a CGPA and a class. */
function PriorRecord({ blurred, markBlurred }: { blurred: Set<string>; markBlurred: (key: string) => void }) {
  const calc = useCalculator();
  const { state } = calc;
  return (
    <details
      className="ag-disclose mt-6 rounded-2xl bg-ag-haze/70"
      open={state.priorOpen}
      onToggle={(event) => calc.setPriorOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="ag-focus flex min-h-[3.5rem] items-center justify-between gap-4 rounded-2xl px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[1rem] font-semibold text-ag-ink">Add your CGPA so far</span>
          <span className="block text-[0.875rem] text-ag-mist">See your CGPA and class, not just this semester</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="ag-disclose-icon shrink-0 text-ag-violet">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="grid gap-4 px-4 pb-5 pt-1 sm:grid-cols-2">
        <TField
          label="CGPA before this semester"
          hint={`From your last result, 0.00 to ${DEFAULT_SCALE.maxPoint.toFixed(2)}`}
          inputMode="decimal"
          autoComplete="off"
          value={state.priorCgpa}
          error={blurred.has('pc') ? priorCgpaError(state.priorCgpa) : null}
          onBlur={() => markBlurred('pc')}
          onChange={(event) => calc.setPrior({ priorCgpa: event.target.value })}
        />
        <TField
          label="Units before this semester"
          hint="All the units behind that CGPA"
          inputMode="numeric"
          autoComplete="off"
          value={state.priorUnits}
          error={blurred.has('pu') ? priorUnitsError(state.priorUnits) : null}
          onBlur={() => markBlurred('pu')}
          onChange={(event) => calc.setPrior({ priorUnits: event.target.value })}
        />
        {state.priorCgpa || state.priorUnits ? (
          <div className="sm:col-span-2">
            <button type="button" className={`${textButtonClass()} min-h-11 text-[0.9375rem]`} onClick={() => calc.setPrior({ priorCgpa: '', priorUnits: '' })}>
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

/** The night result card: the arc, the class, the figures, then Save and Share. Sticky beside the rows from 1024px. */
function CalculatorResult({ canSave }: { canSave: boolean }) {
  const calc = useCalculator();
  const { result, signedIn } = calc;
  const headline = result.headline;
  const shown = useTween(headline ? Number(formatCgpa(headline.value)) : null);
  const [share, setShare] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [href, setHref] = useState('');

  const copy = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const area = document.createElement('textarea');
    area.value = url;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (!ok) throw new Error('copy failed');
  };

  const handleShare = async () => {
    const url = window.location.href;
    setHref(url);
    trackToolEvent('tool_used', { tool: 'calculator', action: 'share' });
    const phone = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My courses on AcadeGrade', url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await copy(url);
      setShare('copied');
      window.setTimeout(() => setShare('idle'), 2000);
    } catch {
      setShare('failed');
    }
  };

  const semester = result.semester;
  const stats: { label: string; value: string }[] = result.cumulative
    ? [
        { label: 'Semester GPA', value: semester ? formatCgpa(semester.gpa) : NO_VALUE },
        { label: 'PI', value: semester ? formatCgpa(semester.pi) : NO_VALUE },
        { label: 'All units', value: String(result.cumulative.units) },
      ]
    : [
        { label: 'PI', value: semester ? formatCgpa(semester.pi) : NO_VALUE },
        { label: 'Units', value: semester ? String(semester.units) : NO_VALUE },
        { label: 'Courses', value: semester ? String(semester.courses) : NO_VALUE },
      ];

  return (
    <aside aria-label="Your result" className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
      <NightCard>
        <GaugeFigure
          value={headline ? Number(formatCgpa(headline.value)) : null}
          figure={shown === null ? NO_VALUE : shown.toFixed(2)}
          caption={headline?.label ?? 'Semester GPA'}
          label={headline ? `${headline.label} ${formatCgpa(headline.value)} of ${DEFAULT_SCALE.maxPoint.toFixed(2)}, ${result.classBand?.label ?? ''}` : 'No result yet'}
          intro
        />
        <div className="mt-1 text-center">
          <p className="text-[0.8125rem] text-ag-mist-night">{result.cumulative ? 'Class' : 'Class at this GPA'}</p>
          <div className="mt-1.5" key={result.classBand?.label ?? 'none'}>
            <ClassPill label={result.classBand?.label ?? NO_VALUE} tone={classTone(result)} />
          </div>
          <p className="mx-auto mt-2.5 max-w-[17rem] text-[0.9375rem] leading-snug text-ag-mist-night">{gapLine(result) ?? 'Your class appears here'}</p>
        </div>
        <dl aria-hidden="true" className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          {stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>
        {result.mode === 'grade' && semester ? (
          <p className="mt-3 text-center text-[0.8125rem] text-ag-mist-night" aria-hidden="true">
            With letter grades, PI equals your GPA.
          </p>
        ) : null}
        <p className="sr-only">{summaryLine(result)}</p>
        <Announcer text={announcement(result)} />

        <div className="mt-5 border-t border-white/10 pt-5">
          <TButton variant="gold" size="lg" block busy={calc.saving} disabled={!canSave} onClick={calc.save}>
            Save to your record
          </TButton>
          <p className="mt-2.5 text-[0.8125rem] leading-snug text-ag-mist-night">
            {!canSave
              ? 'Add at least one complete course to save.'
              : signedIn
                ? 'Adds these courses to Results, where you check them before saving.'
                : 'Keeps these courses on this device for 24 hours while you sign up, then adds them to your record.'}
          </p>
          <TButton variant="ghostOnDark" block onClick={handleShare} className="mt-4">
            {share === 'copied' ? 'Link copied' : 'Share this calculation'}
          </TButton>
          <span className="sr-only" aria-live="polite">
            {share === 'copied' ? 'Link copied' : ''}
          </span>
          <p className="mt-2.5 text-[0.8125rem] leading-snug text-ag-mist-night">Anyone with the link can see these courses and grades. Nothing is stored on our side.</p>
          {signedIn ? (
            <p className="mt-2 text-[0.8125rem] leading-snug text-ag-mist-night">
              For a link that expires or needs a PIN, save this semester and{' '}
              <TextLinkV2 href="/transcript" onDark>
                share your transcript
              </TextLinkV2>
              .
            </p>
          ) : null}
          {share === 'failed' ? (
            <div className="mt-4 flex items-end gap-3">
              <TField label="Copy this link to share it." dark readOnly value={href} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1" />
              <button
                type="button"
                className={`${textButtonClass(true)} min-h-11 text-[0.9375rem]`}
                onClick={() =>
                  copy(href)
                    .then(() => setShare('copied'))
                    .catch(() => undefined)
                }
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      </NightCard>
    </aside>
  );
}
