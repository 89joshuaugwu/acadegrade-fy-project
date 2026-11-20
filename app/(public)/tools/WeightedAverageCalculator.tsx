'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Heading, TextLinkV2 } from '@/components/site/ui';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { ErrorLine, inputClass, textButtonClass, useFieldId } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows, type ReceiptLine } from '@/components/site/tools/Receipt';
import { GaugeFigure, MiniArc, NightCard, SummaryStrip } from '@/components/site/tools/result';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { EXAMPLE_COURSES } from '@/lib/public/example-student';
import { DEFAULT_SCALE } from '@/lib/public/scales';
import { decodeCalculation } from '@/components/public/tools/calculator-url';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import { calculatorLinkFromRows, gpaAndPiFromRows, parseNumber, usableScoreRow, weightedAverageFromRows, type ScoreRow } from './tool-math';

export const MAX_ROWS = 20;
const FOLD_AFTER = 8;

interface Row extends ScoreRow {
  id: string;
  code: string;
}

let idCounter = 0;
const nextId = () => `w-${idCounter++}`;
const emptyRows = (): Row[] => [
  { id: 'w-a', code: '', score: '', units: '' },
  { id: 'w-b', code: '', score: '', units: '' },
  { id: 'w-c', code: '', score: '', units: '' },
];

/** Rows brought over from the calculator's ?c= (score format only), with the note to show. */
export function rowsFromCalculatorLink(search: string): { rows: ScoreRow[]; notes: string[] } | null {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  if (!params.get('c')) return null;
  params.set('m', 'score');
  const decoded = decodeCalculation(params);
  if (!decoded.rows) return null;
  const scored = decoded.rows.filter((row) => row.scoreText !== '');
  if (!scored.length) {
    return decoded.rows.some((row) => row.grade) ? { rows: [], notes: ["Letter grades have no single score, so they weren't brought over."] } : null;
  }
  const valid = scored.filter((row) => usableScoreRow({ score: row.scoreText, units: String(row.units) }));
  if (!valid.length) return null;
  const notes = ['These scores came from the CGPA calculator.'];
  if (valid.length > MAX_ROWS) notes.push('Only the first 20 courses were brought over.');
  return { rows: valid.slice(0, MAX_ROWS).map((row) => ({ code: row.code.toUpperCase(), score: row.scoreText, units: String(row.units) })), notes };
}

const rowLabel = (row: Row, index: number) => row.code.trim().toUpperCase() || `Course ${index + 1}`;
const rowName = (row: Row, index: number) => row.code.trim().toUpperCase() || `course ${index + 1}`;

/* Phone: the code and remove on the first line; score, units and the product on the second. From 768px: one line. */
const GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] md:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem_2.5rem]';
const HEADS = 'md:grid-cols-[minmax(0,1fr)_7rem_6rem_4.5rem_2.5rem]';
const CELL = 'md:col-span-1 md:col-start-auto md:row-start-auto';

export function WeightedAverageCalculator() {
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [notes, setNotes] = useState<string[]>([]);
  const [blurred, setBlurred] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const [filled, setFilled] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const codeRefs = useRef(new Map<string, HTMLInputElement>());
  const addRef = useRef<HTMLButtonElement>(null);
  const reported = useRef(false);

  useQueryOnce((params) => {
    const brought = rowsFromCalculatorLink(params.toString());
    if (!brought) return;
    setNotes(brought.notes);
    if (brought.rows.length) setRows(brought.rows.map((row) => ({ id: nextId(), code: row.code ?? '', score: row.score, units: row.units })));
  });

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget === 'add') addRef.current?.focus();
    else codeRefs.current.get(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget, rows]);

  const result = weightedAverageFromRows(rows);
  const marks = gpaAndPiFromRows(rows);
  const link = calculatorLinkFromRows(rows);
  const average = result.average;
  const shown = useTween(average === null ? null : Math.round(average * 10) / 10);
  const courses = result.usedRows;

  useEffect(() => {
    if (average !== null && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'weighted-average' });
    }
  }, [average]);

  const update = (id: string, patch: Partial<Row>) => setRows((previous) => previous.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const blur = (key: string) =>
    setBlurred((previous) => {
      if (previous.has(key)) return previous;
      const next = new Set(previous);
      next.add(key);
      return next;
    });

  const atLimit = rows.length >= MAX_ROWS;
  const used = rows.flatMap((row, index) => {
    const usable = usableScoreRow(row);
    return usable ? [{ row, index, ...usable, product: Number((usable.score * usable.units).toPrecision(12)) }] : [];
  });
  const total = Number(used.reduce((sum, entry) => sum + entry.product, 0).toPrecision(12));
  const visible = open || used.length <= FOLD_AFTER ? used : used.slice(0, FOLD_AFTER);
  const folded = used.slice(visible.length);
  const receipt: ReceiptLine[] =
    average === null
      ? [
          { label: 'Units', value: NO_VALUE },
          { label: 'Scores × units', value: NO_VALUE },
        ]
      : [
          ...visible.map((entry) => ({ label: `${rowLabel(entry.row, entry.index)}, ${entry.score} × ${entry.units}`, value: String(entry.product) })),
          ...(folded.length
            ? [{ label: `and ${folded.length} more course${folded.length === 1 ? '' : 's'}`, value: String(Number(folded.reduce((sum, entry) => sum + entry.product, 0).toPrecision(12))) }]
            : []),
          { label: 'Units', value: String(result.includedUnits) },
          { label: 'Scores × units', value: String(total) },
          { label: `${total} ÷ ${result.includedUnits} = ${average.toFixed(1)}`, value: '', inverted: true },
        ];

  const leftOut = result.skippedRows > 0 ? `${result.skippedRows} row${result.skippedRows === 1 ? ' is' : 's are'} left out: use a score from 0 to 100 and units above 0.` : null;
  const units = result.includedUnits;
  const announce =
    average === null || !marks
      ? 'Enter a score and units to see your average.'
      : `Weighted average score ${average.toFixed(1)} out of 100, across ${units} unit${units === 1 ? '' : 's'}. The same scores give a GPA of ${formatCgpa(marks.gpa)} and a PI of ${formatCgpa(marks.pi)}.`;

  return (
    <>
      <ToolStage label="Weighted average score" after={<UnderNote>A personal estimate, not an official result. Nothing you type is saved.</UnderNote>}>
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-10`}>
          <div className="min-w-0">
            <SummaryStrip>
              <MiniArc value={marks ? marks.gpa : null} />
              <span className="flex min-w-0 flex-col">
                <span className="text-[0.8125rem] text-ag-mist-night">Average score</span>
                <span className="ag-display ag-num text-[1.5rem] font-bold leading-none">{average === null ? NO_VALUE : average.toFixed(1)}</span>
              </span>
              <span className="ml-auto text-right text-[0.875rem] font-semibold text-white/85">{marks ? `GPA ${formatCgpa(marks.gpa)}` : 'Add a score'}</span>
            </SummaryStrip>

            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Your scores</h2>
                <p className="mt-1 text-[0.9375rem] text-ag-mist">Each course&apos;s score out of 100 and its units. Up to {MAX_ROWS} courses.</p>
              </div>
              <button
                type="button"
                className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                onClick={() => {
                  setRows(EXAMPLE_COURSES.map((course) => ({ id: nextId(), code: course.code, score: String(course.ca + course.exam), units: String(course.units) })));
                  setNotes([]);
                  setFilled(true);
                }}
              >
                Try an example
              </button>
              <span className="sr-only" aria-live="polite">
                {filled ? 'Example filled in' : ''}
              </span>
            </div>

            <div className={`mt-6 hidden items-end gap-x-3 pb-2 pl-3 pr-2 text-[0.8125rem] font-medium text-ag-mist md:grid ${HEADS}`} aria-hidden="true">
              <span>Course code (optional)</span>
              <span className="text-center">Score, out of 100</span>
              <span className="text-center">Units</span>
              <span className="text-center">Score × units</span>
              <span />
            </div>
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] gap-x-2 px-3 pb-2 text-center text-[0.8125rem] font-medium leading-tight text-ag-mist md:hidden" aria-hidden="true">
              <span>Score, out of 100</span>
              <span>Units</span>
              <span>Score × units</span>
            </div>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <ScoreRowFields
                  key={row.id}
                  row={row}
                  index={index}
                  only={rows.length <= 1}
                  scoreBlurred={blurred.has(`s-${row.id}`)}
                  unitsBlurred={blurred.has(`u-${row.id}`)}
                  onBlur={(key) => blur(`${key}-${row.id}`)}
                  codeRef={(element) => {
                    if (element) codeRefs.current.set(row.id, element);
                    else codeRefs.current.delete(row.id);
                  }}
                  onChange={(patch) => update(row.id, patch)}
                  onRemove={() => {
                    if (rows.length <= 1) return;
                    const following = rows[index + 1];
                    setRows((previous) => previous.filter((entry) => entry.id !== row.id));
                    setFocusTarget(following ? following.id : 'add');
                  }}
                />
              ))}
            </div>
            <button
              ref={addRef}
              type="button"
              className={`ag-focus mt-3 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-[1rem] font-semibold transition ${
                atLimit ? 'cursor-not-allowed border-ag-ink/10 text-ag-mist' : 'border-ag-violet/25 text-ag-violet hover:border-ag-violet/50 hover:bg-ag-violet/[0.04]'
              }`}
              aria-disabled={atLimit ? true : undefined}
              onClick={() => {
                if (atLimit) return;
                const id = nextId();
                setRows((previous) => [...previous, { id, code: '', score: '', units: '' }]);
                setFocusTarget(id);
              }}
            >
              {atLimit ? null : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3.5v11M3.5 9h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {atLimit ? `${MAX_ROWS} courses is the most this tool takes` : 'Add a course'}
            </button>
            {leftOut || notes.length ? (
              <div className="mt-5 space-y-2 text-[0.9375rem] leading-relaxed">
                {leftOut ? <p className="rounded-xl bg-[#FFF1EE] px-4 py-3 text-[#8F2A16]">{leftOut}</p> : null}
                {notes.map((note) => (
                  <p key={note} className="rounded-xl bg-ag-haze px-4 py-3 text-ag-ink">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
            <noscript>
              <p className="mt-4 text-[0.9375rem] text-ag-mist">Turn on JavaScript to enter your own scores.</p>
            </noscript>
          </div>

          <aside aria-label="Your average" className="min-w-0 lg:sticky lg:top-[92px] lg:self-start">
            <NightCard>
              <p className="text-[0.8125rem] font-medium text-ag-mist-night">Weighted average score</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className={`ag-display ag-num text-[4rem] font-bold leading-none ${shown === null ? 'text-white/45' : 'text-white'}`}>
                  {shown === null ? NO_VALUE : shown.toFixed(1)}
                </span>
                <span className="text-[1rem] text-ag-mist-night">out of 100</span>
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ag-violet via-[#C77BB8] to-ag-gold transition-[width] duration-700 motion-reduce:transition-none"
                  style={{ width: `${average === null ? 0 : Math.max(0, Math.min(100, average))}%` }}
                />
              </div>
              <p className="mt-3 text-[0.9375rem] leading-snug text-ag-mist-night">
                {average === null ? 'Enter a score and units to see your average.' : `Across ${units} unit${units === 1 ? '' : 's'} from ${courses} course${courses === 1 ? '' : 's'}.`}
              </p>
              <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
                <GaugeFigure
                  value={marks ? Number(formatCgpa(marks.gpa)) : null}
                  figure={marks ? formatCgpa(marks.gpa) : NO_VALUE}
                  size="sm"
                  className="!mx-0 w-24 shrink-0"
                  label={marks ? `GPA from these scores ${formatCgpa(marks.gpa)} of ${DEFAULT_SCALE.maxPoint.toFixed(2)}` : 'GPA from these scores: none yet'}
                />
                <div className="min-w-0">
                  <p className="text-[0.8125rem] text-ag-mist-night">The same scores give</p>
                  <p className="ag-num mt-0.5 text-[1.0625rem] font-semibold text-white">{marks ? `GPA ${formatCgpa(marks.gpa)} · PI ${formatCgpa(marks.pi)}` : `GPA ${NO_VALUE} · PI ${NO_VALUE}`}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ag-mist-night">on the {DEFAULT_SCALE.name}</p>
                </div>
              </div>
              {average !== null ? (
                <div className="mt-5 border-t border-white/10 pt-5 text-[0.9375rem]">
                  {link ? (
                    <TextLinkV2 href={link} onDark>
                      See these in the CGPA calculator
                    </TextLinkV2>
                  ) : (
                    <p className="text-ag-mist-night">To open these in the CGPA calculator, use whole units from 1 to 6.</p>
                  )}
                </div>
              ) : null}
              <Announcer text={announce} />
            </NightCard>
          </aside>
        </div>
      </ToolStage>

      <section aria-labelledby="how-average" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading
              id="how-average"
              title="How it's worked out"
              lead="Multiply each course's score by its units, add the results, then divide by your total units. Empty rows are ignored; rows outside 0 to 100 are left out and counted."
            />
            <div className="mt-8 rounded-2xl bg-ag-night p-5 text-white">
              <p className="text-[1rem] font-semibold leading-snug">Weighted average = (score × units, added up) ÷ total units</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ag-mist-night">PI uses the same scores on the 5-point scale, so PI is always this average ÷ 20.</p>
            </div>
          </div>
          <ReceiptCard title="Your working" meta={average === null ? 'Enter a score and units above' : `${courses} course${courses === 1 ? '' : 's'} counted`} tone="haze" className="min-w-0">
            <ReceiptRows groups={[{ lines: receipt }]} />
            {used.length > FOLD_AFTER ? (
              <button type="button" className={`${textButtonClass()} mt-5 min-h-11 text-[0.9375rem]`} onClick={() => setOpen((value) => !value)}>
                {open ? 'Show fewer' : 'Show all'}
              </button>
            ) : null}
            {marks && average !== null ? <p className="mt-5 text-[0.9375rem] text-ag-ink">PI is this average ÷ 20: {formatCgpa(marks.pi)}.</p> : null}
          </ReceiptCard>
        </Container>
      </section>
    </>
  );
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ScoreRowFields({
  row,
  index,
  only,
  scoreBlurred,
  unitsBlurred,
  onBlur,
  codeRef,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  only: boolean;
  scoreBlurred: boolean;
  unitsBlurred: boolean;
  onBlur: (key: 's' | 'u') => void;
  codeRef: (element: HTMLInputElement | null) => void;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const name = rowName(row, index);
  const score = parseNumber(row.score);
  const unitsValue = parseNumber(row.units);
  const scoreError = scoreBlurred && row.score.trim() && (score === null || score < 0 || score > 100) ? 'Enter a score from 0 to 100.' : null;
  const unitsError = unitsBlurred && row.units.trim() && (unitsValue === null || unitsValue <= 0) ? 'Enter units above 0.' : null;
  const usable = usableScoreRow(row);
  const codeId = useFieldId();
  const scoreId = useFieldId();
  const unitsId = useFieldId();
  return (
    <fieldset className={`min-w-0 rounded-2xl p-3 md:py-2.5 md:pl-3 md:pr-2 ${scoreError || unitsError ? 'bg-[#FFF4F2] ring-1 ring-inset ring-[#C2361F]/25' : 'bg-ag-haze/70'}`}>
      <legend className="sr-only">{row.code.trim() ? row.code.trim().toUpperCase() : `Course ${index + 1}`}</legend>
      <div className={`grid items-center gap-x-2 gap-y-2.5 md:gap-x-3 ${GRID}`}>
        <div className={`col-span-2 col-start-1 row-start-1 min-w-0 ${CELL}`}>
          <label htmlFor={codeId} className="sr-only">
            Course code, course {index + 1}
          </label>
          <input
            ref={codeRef}
            id={codeId}
            placeholder="e.g. CSC 301"
            maxLength={24}
            autoComplete="off"
            value={row.code}
            onChange={(event) => onChange({ code: event.target.value })}
            onBlur={(event) => onChange({ code: event.target.value.toUpperCase() })}
            className={`${inputClass({ size: 'sm' })} h-11 font-semibold`}
          />
        </div>
        <div className={`col-start-1 row-start-2 min-w-0 ${CELL}`}>
          <label htmlFor={scoreId} className="sr-only">
            Score for {name}, out of 100
          </label>
          <input
            id={scoreId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Score"
            value={row.score}
            aria-invalid={scoreError ? true : undefined}
            aria-describedby={scoreError ? `${scoreId}-error` : undefined}
            onBlur={() => onBlur('s')}
            onChange={(event) => onChange({ score: event.target.value })}
            className={`${inputClass({ size: 'sm', invalid: Boolean(scoreError) })} ag-num h-11 text-center font-semibold`}
          />
        </div>
        <div className={`col-start-2 row-start-2 min-w-0 ${CELL}`}>
          <label htmlFor={unitsId} className="sr-only">
            Units for {name}
          </label>
          <input
            id={unitsId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Units"
            value={row.units}
            aria-invalid={unitsError ? true : undefined}
            aria-describedby={unitsError ? `${unitsId}-error` : undefined}
            onBlur={() => onBlur('u')}
            onChange={(event) => onChange({ units: event.target.value })}
            className={`${inputClass({ size: 'sm', invalid: Boolean(unitsError) })} ag-num h-11 text-center font-semibold`}
          />
        </div>
        <span className={`ag-num col-start-3 row-start-2 text-center text-[1rem] font-semibold ${usable ? 'text-ag-ink' : 'text-ag-mist'} ${CELL}`} aria-hidden="true">
          {usable ? Number((usable.score * usable.units).toPrecision(12)) : NO_VALUE}
        </span>
        <button
          type="button"
          className={`ag-focus col-start-3 row-start-1 grid h-10 w-10 place-items-center justify-self-end rounded-full transition ${
            only ? 'cursor-not-allowed text-ag-ink/25' : 'text-ag-mist hover:bg-white hover:text-[#C2361F]'
          } ${CELL}`}
          aria-label={`Remove ${name}`}
          aria-disabled={only ? true : undefined}
          title="Remove"
          onClick={onRemove}
        >
          <RemoveIcon />
        </button>
      </div>
      {scoreError ? <ErrorLine id={`${scoreId}-error`}>{scoreError}</ErrorLine> : null}
      {unitsError ? <ErrorLine id={`${unitsId}-error`}>{unitsError}</ErrorLine> : null}
    </fieldset>
  );
}

