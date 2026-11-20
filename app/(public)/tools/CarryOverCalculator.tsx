'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Heading } from '@/components/site/ui';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { PillChoice, TField, textButtonClass, type PillOption } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows } from '@/components/site/tools/Receipt';
import { GaugeFigure, NightCard } from '@/components/site/tools/result';
import { GRADE_POINTS, roundCgpa, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE, publicClassFor } from '@/lib/public/scales';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import { carryOverCeiling, carryOverImpact, carryOverTable, parseNumber } from './tool-math';

const max = DEFAULT_SCALE.maxPoint;
const GRADES: PillOption<AcademicGrade>[] = DEFAULT_SCALE.gradeBands.map((band) => ({
  value: band.grade,
  label: band.grade,
  accessibleName: `${band.grade}, ${band.gradePoint} point${band.gradePoint === 1 ? '' : 's'}`,
  tone: band.gradePoint === max ? 'gold' : band.gradePoint === 0 ? 'mark' : undefined,
}));
const EXAMPLE = { current: 3, done: 60, failed: 3 };

/** "+0.10", "−0.14" (a true minus sign) or "no change". */
export function changeText(before: number, after: number): string {
  const delta = roundCgpa(after - before);
  if (delta === 0) return 'no change';
  return delta > 0 ? `+${delta.toFixed(2)}` : `−${Math.abs(delta).toFixed(2)}`;
}

function spoken(before: number, after: number): string {
  const delta = roundCgpa(after - before);
  if (delta === 0) return 'no change';
  return `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(2)}`;
}

/** "Moves you up to Second Class Upper", or null when the class stays the same. */
export function classChangeLine(before: number, after: number): string | null {
  const from = publicClassFor(before);
  const to = publicClassFor(after);
  if (from === to) return null;
  return `Moves you ${to.min > from.min ? 'up' : 'down'} to ${to.label}`;
}

type FieldKey = 'current' | 'done' | 'failed';

export function CarryOverCalculator() {
  const [values, setValues] = useState<Record<FieldKey, string>>({ current: '', done: '', failed: '' });
  const [grade, setGrade] = useState<AcademicGrade>('C');
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const reported = useRef(false);

  useQueryOnce((params) => {
    const next: Partial<Record<FieldKey, string>> = {};
    for (const key of ['current', 'done', 'failed'] as FieldKey[]) {
      const raw = params.get(key);
      const value = raw === null ? null : parseNumber(raw);
      if (raw !== null && value !== null && value >= 0 && (key !== 'current' || value <= max)) next[key] = raw.trim();
    }
    const g = params.get('grade');
    if (g && GRADES.some((option) => option.value === g)) setGrade(g as AcademicGrade);
    setValues((previous) => ({ ...previous, ...next }));
  });

  const current = parseNumber(values.current);
  const done = parseNumber(values.done);
  const failed = parseNumber(values.failed);
  const impact = carryOverImpact({ currentCgpa: current, completedUnits: done, failedUnits: failed, retakeGrade: grade });
  const ceiling = carryOverCeiling(done, failed);
  const impossible = current !== null && current >= 0 && current <= max && ceiling !== null && roundCgpa(current) > ceiling;
  const one = useTween(impact ? impact.bothAttemptsCount : null);
  const two = useTween(impact ? impact.replacesFailure : null);

  useEffect(() => {
    if (impact && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'carry-over-impact' });
    }
  }, [impact]);

  const errors: Record<FieldKey, string | null> = {
    current:
      current === null || current < 0 || current > max
        ? `Enter a CGPA from 0.00 to ${max.toFixed(2)}.`
        : impossible
          ? `With a ${failed}-unit F inside ${done} units, your CGPA can't be above ${ceiling!.toFixed(2)}. Check the numbers.`
          : null,
    done: done === null || done <= 0 ? 'Enter more than 0 units.' : null,
    failed:
      failed === null || failed < 1
        ? "Enter the failed course's units, 1 or more."
        : done !== null && done > 0 && failed > done
          ? "The failed course's units can't be more than your units completed."
          : null,
  };
  const errorFor = (key: FieldKey) => (blurred[key] && values[key].trim() ? errors[key] : null);
  const set = (key: FieldKey, value: string) => setValues((previous) => ({ ...previous, [key]: value }));

  // The grade table uses the visitor's numbers when they work, otherwise the example.
  const tableInput = impact ? { currentCgpa: current, completedUnits: done, failedUnits: failed } : { currentCgpa: EXAMPLE.current, completedUnits: EXAMPLE.done, failedUnits: EXAMPLE.failed };
  const table = carryOverTable(tableInput)!;
  const chosen = impact ? grade : 'A';
  const tableNumbers = { current: tableInput.currentCgpa!, done: tableInput.completedUnits!, failed: tableInput.failedUnits! };

  const outcome = (label: string, value: number | null, after: number | null) => (
    <div className="min-w-0 text-center">
      <GaugeFigure
        value={after}
        figure={value === null ? NO_VALUE : value.toFixed(2)}
        size="sm"
        label={after === null ? `${label}: no result yet` : `${label}: ${after.toFixed(2)} of ${max.toFixed(2)}, ${publicClassFor(after).label}`}
      />
      <p className="mt-1 text-[0.8125rem] leading-snug text-ag-mist-night">{label}</p>
      {impact && after !== null ? (
        <>
          <p className={`ag-num mt-2 text-[1.0625rem] font-semibold ${roundCgpa(after - impact.before) < 0 ? 'text-[#FF8B7E]' : 'text-ag-gold'}`}>{changeText(impact.before, after)}</p>
          <p className="text-[0.8125rem] text-white/85">{publicClassFor(after).label}</p>
          {classChangeLine(impact.before, after) ? <p className="mt-1 text-[0.8125rem] font-semibold text-ag-gold">{classChangeLine(impact.before, after)}</p> : null}
        </>
      ) : null}
    </div>
  );

  const sentence = impact
    ? `Now ${impact.before.toFixed(2)}. If the retake is added as extra units: ${impact.bothAttemptsCount.toFixed(2)}, ${spoken(impact.before, impact.bothAttemptsCount)}. If it replaces the F: ${impact.replacesFailure.toFixed(2)}, ${spoken(impact.before, impact.replacesFailure)}.`
    : 'Fill in the three lines to see both answers.';

  return (
    <>
      <ToolStage
        label="Carry-over impact"
        after={
          <UnderNote>
            Schools differ. Your handbook or exams officer can tell you which rule yours uses. A personal estimate, not an official result; nothing you type is saved.
          </UnderNote>
        }
      >
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-10`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Your result and the retake</h2>
                <p className="mt-1 text-[0.9375rem] text-ag-mist">Enter your CGPA as it is now, with the F inside it.</p>
              </div>
              <button
                type="button"
                className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                onClick={() => {
                  setValues({ current: '3.00', done: '60', failed: '3' });
                  setGrade('A');
                }}
              >
                Try an example
              </button>
            </div>
            <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-3">
              {(
                [
                  ['current', 'Current CGPA', 'As your result shows it, with the F', 'decimal'],
                  ['done', 'Units completed', 'Including the failed course', 'numeric'],
                  ['failed', 'Units of the failed course', 'For example 3', 'numeric'],
                ] as const
              ).map(([key, label, hint, mode]) => (
                <TField
                  key={key}
                  label={label}
                  hint={hint}
                  inputMode={mode}
                  autoComplete="off"
                  inputClassName="ag-num font-semibold"
                  value={values[key]}
                  error={errorFor(key)}
                  onBlur={() => setBlurred((previous) => ({ ...previous, [key]: true }))}
                  onChange={(event) => set(key, event.target.value)}
                />
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-ag-haze/70 p-4 sm:p-5">
              <p id="retake-label" className="text-[0.875rem] font-medium text-ag-ink">
                Grade you expect on the retake
              </p>
              <PillChoice<AcademicGrade>
                name="retake-grade"
                labelledBy="retake-label"
                options={GRADES}
                value={grade}
                onChange={setGrade}
                className="mt-3 flex gap-1.5 sm:gap-2"
                itemClassName="min-w-0 flex-1 sm:flex-none [&>.ag-pill]:h-11 [&>.ag-pill]:min-w-0 sm:[&>.ag-pill]:min-w-[2.75rem]"
              />
            </div>
            <noscript>
              <p className="mt-4 text-[0.9375rem] text-ag-mist">Turn on JavaScript to use the tool.</p>
            </noscript>
          </div>

          <aside aria-label="Both answers" className="min-w-0 lg:self-start">
            <NightCard>
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[0.8125rem] text-ag-mist-night">Now</p>
                  <p className="ag-display ag-num text-[2rem] font-bold leading-none">{impact ? impact.before.toFixed(2) : NO_VALUE}</p>
                </div>
                {impact ? <p className="text-right text-[0.875rem] font-semibold text-white/85">{publicClassFor(impact.before).label}</p> : null}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {outcome('If the retake is added as extra units', one, impact ? impact.bothAttemptsCount : null)}
                {outcome('If the retake replaces the F', two, impact ? impact.replacesFailure : null)}
              </div>
              {impact ? null : <p className="mt-5 text-center text-[0.9375rem] text-ag-mist-night">Fill in the three lines to see both answers.</p>}
              <Announcer text={sentence} />
            </NightCard>
          </aside>
        </div>
      </ToolStage>

      <section aria-labelledby="two-rules" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading
              id="two-rules"
              title="Two rules, two answers"
              lead="Schools differ. Some keep the failed attempt on your record and add the retake as new units, so the F keeps weighing on your CGPA. Others replace the F with the retake grade."
            />
            <ul className="mt-10 space-y-4">
              <li className="rounded-2xl bg-ag-haze p-5">
                <p className="text-[1rem] font-semibold text-ag-ink">Retake added as extra units</p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ag-mist">
                  The F&apos;s {tableNumbers.failed} units stay in your total with 0 points, and the retake adds {tableNumbers.failed} more.
                </p>
              </li>
              <li className="rounded-2xl bg-ag-haze p-5">
                <p className="text-[1rem] font-semibold text-ag-ink">Retake replaces the F</p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ag-mist">
                  The F&apos;s {tableNumbers.failed} units now carry the retake&apos;s points; your total units stay at {tableNumbers.done}. It can never lower your CGPA.
                </p>
              </li>
            </ul>
            <p className="mt-6 text-[0.9375rem] text-ag-mist">Your handbook or exams officer can tell you which rule yours uses.</p>
          </div>
          <ReceiptCard title="How both are worked out" meta={impact ? `Retake graded ${grade}` : 'Fill in the three lines above'} tone="haze" className="min-w-0">
            {impact && current !== null && done !== null && failed !== null ? (
              <ReceiptRows
                groups={[
                  {
                    name: 'Added as extra units',
                    lines: [
                      { label: `Points now, ${current.toFixed(2)} × ${done}`, value: (current * done).toFixed(2) },
                      { label: `Retake, ${grade} (${GRADE_POINTS[grade]}) × ${failed} units`, value: (GRADE_POINTS[grade] * failed).toFixed(2) },
                      { label: `Units, ${done} + ${failed}`, value: String(done + failed) },
                      { label: `${(current * done + GRADE_POINTS[grade] * failed).toFixed(2)} ÷ ${done + failed} = ${impact.bothAttemptsCount.toFixed(2)}`, value: '', inverted: true },
                    ],
                  },
                  {
                    name: 'Replaces the F',
                    lines: [
                      { label: 'Points now', value: (current * done).toFixed(2) },
                      { label: "The F's 0 points become", value: (GRADE_POINTS[grade] * failed).toFixed(2) },
                      { label: 'Units stay', value: String(done) },
                      { label: `${(current * done + GRADE_POINTS[grade] * failed).toFixed(2)} ÷ ${done} = ${impact.replacesFailure.toFixed(2)}`, value: '', inverted: true },
                    ],
                  },
                ]}
              />
            ) : (
              <ReceiptRows
                groups={[
                  { name: 'Added as extra units', lines: ['Points now', 'Retake', 'Units'].map((label) => ({ label, value: NO_VALUE })) },
                  { name: 'Replaces the F', lines: ['Points now', "The F's 0 points become", 'Units stay'].map((label) => ({ label, value: NO_VALUE })) },
                ]}
              />
            )}
          </ReceiptCard>
        </Container>
      </section>

      <section aria-labelledby="every-grade" className="bg-ag-haze py-20 sm:py-28">
        <Container>
          <Heading
            id="every-grade"
            title="Every retake grade, both rules"
            lead={`For a CGPA of ${tableNumbers.current.toFixed(2)} over ${tableNumbers.done} units with a ${tableNumbers.failed}-unit F${impact ? ', from your numbers' : ', the example'}.`}
          />
          <div className="mt-12 overflow-hidden rounded-[24px] bg-white">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="sr-only">
                For a CGPA of {tableNumbers.current.toFixed(2)} over {tableNumbers.done} units with a {tableNumbers.failed}-unit F
              </caption>
              <thead>
                <tr className="border-b border-ag-ink/10 text-[0.8125rem] text-ag-mist">
                  <th scope="col" className="px-4 py-4 font-medium sm:px-7">
                    Retake grade
                  </th>
                  <th scope="col" className="px-3 py-4 text-right font-medium sm:px-7">
                    Added as extra units
                  </th>
                  <th scope="col" className="px-4 py-4 text-right font-medium sm:px-7">
                    Replaces the F
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.map((row) => {
                  const on = row.grade === chosen;
                  return (
                    <tr key={row.grade} className={on ? 'bg-ag-night text-white' : 'border-b border-ag-ink/[0.06] text-ag-ink last:border-0'}>
                      <th scope="row" className="px-4 py-3.5 font-semibold sm:px-7">
                        <span className="flex items-center gap-3">
                          <span
                            className={`ag-display grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.9375rem] font-bold ${
                              row.grade === 'A' ? 'bg-ag-gold text-ag-night' : row.grade === 'F' ? 'bg-[#C2361F] text-white' : on ? 'bg-white text-ag-night' : 'bg-ag-haze text-ag-ink'
                            }`}
                            aria-hidden="true"
                          >
                            {row.grade}
                          </span>
                          <span>
                            <span className="sr-only">{row.grade} </span>({row.points})
                            {on ? <span className="block text-[0.8125rem] font-normal text-ag-gold sm:ml-2 sm:inline">Your choice</span> : null}
                          </span>
                        </span>
                      </th>
                      <td className="ag-num px-3 py-3.5 text-right font-semibold sm:px-7">{row.impact.bothAttemptsCount.toFixed(2)}</td>
                      <td className="ag-num px-4 py-3.5 text-right font-semibold sm:px-7">{row.impact.replacesFailure.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Container>
      </section>
    </>
  );
}
