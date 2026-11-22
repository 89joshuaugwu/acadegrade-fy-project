'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Heading } from '@/components/site/ui';
import { PANEL_CLASS, ToolStage, UnderNote } from '@/components/site/tools/frame';
import { PillChoice, TButton, TField, textButtonClass, type PillOption } from '@/components/site/tools/controls';
import { Announcer, useQueryOnce, useTween } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows, type ReceiptLine } from '@/components/site/tools/Receipt';
import { GaugeFigure, NightCard } from '@/components/site/tools/result';
import { formatCgpa, roundCgpa } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE, publicClassFor, toolScaleById, type PublicScale } from '@/lib/public/scales';
import { ToolScaleSelect } from '@/components/site/tools/ToolScaleSelect';
import { NO_VALUE } from '@/components/public/tools/calculator-model';
import { trackToolEvent } from '@/components/public/tools/track';
import { parseNumber, requiredGpa, type RequiredGpaOutcome } from './tool-math';

const max = DEFAULT_SCALE.maxPoint;

/** Target keys: every class floor above "below a Pass", highest first. */
function classKeys(scale: PublicScale) {
  return scale.classBands
    .slice(0, -1)
    .map((band) => {
      const name = band.engineShort === '1st' ? 'First Class' : band.engineShort === '3rd' ? 'Third' : band.short;
      return { value: band.min.toFixed(2), label: `${name}\n${band.min.toFixed(2)}`, accessibleName: `${name}, ${band.min.toFixed(2)}`, min: band.min };
    });
}
const CLASS_KEYS = classKeys(DEFAULT_SCALE);
const targetOptions = (scale: PublicScale): PillOption<string>[] =>
  classKeys(scale).map((key) => ({ value: key.value, label: key.label, accessibleName: key.accessibleName }));

type FieldKey = 'current' | 'done' | 'left' | 'target';
function errorsFor(top: number): Record<FieldKey, (value: number | null) => string | null> {
  return {
    current: (value) => (value === null || value < 0 || value > top ? `Enter a CGPA from 0.00 to ${top.toFixed(2)}.` : null),
    done: (value) => (value === null || value < 0 ? 'Enter 0 or more units.' : null),
    left: (value) => (value === null || value <= 0 ? 'Enter more than 0 units.' : null),
    target: (value) => (value === null || value < 0 || value > top ? `Enter a target from 0.00 to ${top.toFixed(2)}.` : null),
  };
}

const money = (value: number) => (value < 0 ? `−${Math.abs(roundCgpa(value)).toFixed(2)}` : roundCgpa(value).toFixed(2));

/** The page's worked example, as four steps (tool-required-gpa.md §5.2). */
const STAGES = [
  { line: 'First, the points you need.', note: 'Multiply your target by all your units, done and left: 3.50 × 150 = 525.' },
  { line: 'Then, the points you have.', note: 'Your CGPA times the units behind it: 3.38 × 90 = 304.20. That leaves 220.80 to earn.' },
  { line: 'Share the rest by units.', note: '220.80 ÷ 60 = 3.68. That is the average you need, every semester from here.' },
  {
    line: `Above ${max.toFixed(2)} is out of reach.`,
    note: `Then aim for what you can reach: with straight As, (304.20 + ${max} × 60) ÷ 150 = 4.03.`,
  },
];

/** The highest class floor at or below a reachable CGPA (for "Aim for 3.50 instead"). */
export function aimFor(reachable: number, scale: PublicScale = DEFAULT_SCALE): number | null {
  const band = (scale === DEFAULT_SCALE ? CLASS_KEYS : classKeys(scale)).find((key) => key.min <= roundCgpa(reachable));
  return band ? band.min : null;
}

/** The planner's words for an outcome (tool-required-gpa.md §5.1 states). */
export function requiredView(
  outcome: RequiredGpaOutcome,
  input: { current: number; done: number; left: number; target: number } | null,
  scale: PublicScale = DEFAULT_SCALE
) {
  if (outcome.status === 'invalid' || !input) return null;
  const max = scale.maxPoint;
  const reach = outcome.maxReachable;
  const reachClass = publicClassFor(reach, scale).label;
  const top = scale.gradeBands[0]?.grade ?? 'A';
  if (outcome.status === 'needed') {
    const straightAs = outcome.required >= max;
    return {
      status: 'needed' as const,
      figure: outcome.required.toFixed(2),
      dot: outcome.required,
      arcLabel: `Average needed ${outcome.required.toFixed(2)} of ${max.toFixed(2)}`,
      lead: straightAs ? `${/^[AEFHILMNORSX]/.test(top) ? 'an' : 'a'} ${top} in every remaining course` : `over your remaining ${input.left} units`,
      lines: straightAs
        ? [`There is no room for a lower grade. Highest you can still reach: ${reach.toFixed(2)}.`]
        : [`to finish on ${input.target.toFixed(2)}, ${publicClassFor(input.target, scale).label}`, `Highest you can still reach: ${reach.toFixed(2)}`],
      announce: `You need an average of ${outcome.required.toFixed(2)} over ${input.left} units. Highest you can still reach: ${reach.toFixed(2)}.`,
      strip: `You need ${outcome.required.toFixed(2)}`,
    };
  }
  if (outcome.status === 'unreachable') {
    return {
      status: 'unreachable' as const,
      figure: 'Out of reach',
      dot: reach,
      arcLabel: `Highest reachable CGPA ${reach.toFixed(2)} of ${max.toFixed(2)}`,
      lead: `With ${input.left} units left, the highest CGPA you can reach is ${reach.toFixed(2)}, ${reachClass}.`,
      lines: [],
      announce: `Out of reach. Highest you can still reach: ${reach.toFixed(2)}.`,
      strip: 'Out of reach',
    };
  }
  return {
    status: 'secured' as const,
    figure: 'Secured',
    dot: outcome.lowestFinish,
    arcLabel: `Lowest possible finish ${outcome.lowestFinish.toFixed(2)} of ${max.toFixed(2)}`,
    lead: `Even with an F in every remaining unit you would finish on ${outcome.lowestFinish.toFixed(2)}, above your target of ${input.target.toFixed(2)}.`,
    lines: [],
    announce: `Already secured. Lowest possible finish: ${outcome.lowestFinish.toFixed(2)}.`,
    strip: 'Already secured',
  };
}

export function RequiredGpaCalculator() {
  const [values, setValues] = useState<Record<FieldKey, string>>({ current: '', done: '', left: '', target: '' });
  const [blurred, setBlurred] = useState<Partial<Record<FieldKey, boolean>>>({});
  const reported = useRef(false);
  const [scaleId, setScaleId] = useState('ng5');
  const scale = toolScaleById(scaleId);
  const max = scale.maxPoint;
  const keys = classKeys(scale);
  const ERRORS = errorsFor(max);

  useQueryOnce((params) => {
    const linked = toolScaleById(params.get('scale'));
    setScaleId(linked.engine.id);
    const linkedErrors = errorsFor(linked.maxPoint);
    const linkedKeys = classKeys(linked);
    const next: Partial<Record<FieldKey, string>> = {};
    for (const key of ['current', 'done', 'left', 'target'] as FieldKey[]) {
      const raw = params.get(key);
      if (raw !== null && linkedErrors[key](parseNumber(raw)) === null) next[key] = raw.trim();
    }
    if (next.current && !next.target) {
      const current = roundCgpa(parseNumber(next.current) ?? 0);
      const above = [...linkedKeys].reverse().find((key) => key.min > current);
      next.target = (above ?? linkedKeys[0]).value;
    }
    setValues((previous) => ({ ...previous, ...next }));
  });

  const numbers = {
    current: parseNumber(values.current),
    done: parseNumber(values.done),
    left: parseNumber(values.left),
    target: parseNumber(values.target),
  };
  const allFilled = (Object.keys(values) as FieldKey[]).every((key) => values[key].trim());
  const outcome = requiredGpa({ currentCgpa: numbers.current, completedUnits: numbers.done, remainingUnits: numbers.left, targetCgpa: numbers.target }, scale.engine);
  const input =
    allFilled && numbers.current !== null && numbers.done !== null && numbers.left !== null && numbers.target !== null
      ? { current: numbers.current, done: numbers.done, left: numbers.left, target: numbers.target }
      : null;
  const view = allFilled ? requiredView(outcome, input, scale) : null;
  const shown = useTween(view?.status === 'needed' ? Number(view.figure) : null);

  useEffect(() => {
    if (view && !reported.current) {
      reported.current = true;
      trackToolEvent('tool_used', { tool: 'required-gpa' });
    }
  }, [view]);

  const set = (key: FieldKey, value: string) => setValues((previous) => ({ ...previous, [key]: value }));
  const errorFor = (key: FieldKey) => (blurred[key] && values[key].trim() ? ERRORS[key](numbers[key]) : null);
  const selectedKey = keys.find((key) => numbers.target !== null && roundCgpa(numbers.target) === key.min)?.value ?? null;
  const aim = view?.status === 'unreachable' && outcome.status === 'unreachable' ? aimFor(outcome.maxReachable, scale) : null;

  const receipt: ReceiptLine[] = (() => {
    if (!view || !input) {
      return ['Target', 'All units', 'Points the target needs', 'Points so far', 'Points still needed'].map((label) => ({ label, value: NO_VALUE }));
    }
    const all = input.done + input.left;
    const needs = input.target * all;
    const have = input.current * input.done;
    const still = needs - have;
    const exact = still / input.left;
    let finalLine = `${money(still)} ÷ ${input.left} units = ${money(exact)}`;
    if (view.status === 'needed') finalLine = `${money(still)} ÷ ${input.left} units = ${view.figure}`;
    if (view.status === 'unreachable') finalLine = `${money(still)} needed ÷ ${input.left} units = ${money(exact)} (above ${max.toFixed(2)})`;
    if (view.status === 'secured') finalLine = `${money(still)} needed: nothing more to earn`;
    return [
      { label: 'Target', value: input.target.toFixed(2) },
      { label: `All units, ${input.done} + ${input.left}`, value: String(all) },
      { label: `Points the target needs, ${input.target.toFixed(2)} × ${all}`, value: money(needs) },
      { label: `Points so far, ${input.current.toFixed(2)} × ${input.done}`, value: money(have) },
      { label: 'Points still needed', value: money(still) },
      { label: finalLine, value: '', inverted: true },
    ];
  })();

  const field = (key: FieldKey, label: string, hint: string, mode: 'decimal' | 'numeric', enter: 'next' | 'done', className = '') => (
    <TField
      label={label}
      hint={hint}
      inputMode={mode}
      enterKeyHint={enter}
      autoComplete="off"
      className={className}
      inputClassName="ag-num font-semibold"
      value={values[key]}
      error={errorFor(key)}
      onBlur={() => setBlurred((previous) => ({ ...previous, [key]: true }))}
      onChange={(event) => set(key, event.target.value)}
    />
  );

  let figure = NO_VALUE;
  if (view) figure = view.status === 'needed' && shown !== null ? shown.toFixed(2) : view.figure;

  return (
    <>
      <ToolStage label="Required GPA" after={<UnderNote>A personal estimate, not an official result. Nothing you type is saved.</UnderNote>}>
        <div className={`${PANEL_CLASS} grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23.5rem)] lg:gap-10`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <h2 className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">Where you are</h2>
                <p className="mt-1 text-[0.9375rem] text-ag-mist">Four numbers from your last result and your course plan.</p>
                <ToolScaleSelect scale={scale} onChange={setScaleId} className="mt-4 w-full max-w-[20rem]" />
              </div>
              <button
                type="button"
                className={`${textButtonClass()} min-h-11 text-[0.9375rem]`}
                onClick={() => setValues({ current: '3.38', done: '90', left: '60', target: '3.50' })}
              >
                Try an example
              </button>
            </div>
            <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-3">
              {field('current', 'Current CGPA', `0.00 to ${max.toFixed(2)}`, 'decimal', 'next')}
              {field('done', 'Units completed', 'All the units behind that CGPA', 'numeric', 'next')}
              {field('left', 'Units remaining', 'Units you still expect to take', 'numeric', 'next')}
            </div>
            <div className="mt-8 rounded-2xl bg-ag-haze/70 p-4 sm:p-5">
              <p id="target-label" className="text-[0.875rem] font-medium text-ag-ink">
                Target
              </p>
              <p className="mt-1 text-[0.8125rem] text-ag-mist">Choose a class, or type any CGPA.</p>
              <PillChoice
                name="target-class"
                labelledBy="target-label"
                shape="wide"
                options={targetOptions(scale)}
                value={selectedKey}
                onChange={(value) => set('target', value)}
                className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5"
                itemClassName="min-w-0 [&>.ag-pill]:px-2"
              />
              {field('target', 'Target CGPA', '', 'decimal', 'done', 'mt-5 max-w-[12rem]')}
            </div>
            <noscript>
              <p className="mt-4 text-[0.9375rem] text-ag-mist">Turn on JavaScript to use the planner.</p>
            </noscript>
          </div>

          <aside aria-label="The average you need" className="min-w-0 lg:self-start">
            <NightCard>
              <GaugeFigure value={view ? view.dot : null} figure={figure} caption="Average you need" label={view?.arcLabel ?? 'No result yet'} max={max} ticks={scale.classBands.slice(0, -2).map((band) => band.min)} intro />
              <div className="mt-1 text-center">
                <p className="mx-auto max-w-[18rem] text-[1rem] font-semibold leading-snug text-white">
                  {view ? view.lead : 'Fill in all four lines to see the average you need.'}
                </p>
                {view?.lines.map((line) => (
                  <p key={line} className="mx-auto mt-2 max-w-[18rem] text-[0.9375rem] leading-snug text-ag-mist-night">
                    {line}
                  </p>
                ))}
                {aim !== null ? (
                  <TButton variant="ghostOnDark" className="mt-5" onClick={() => set('target', aim.toFixed(2))}>
                    Aim for {aim.toFixed(2)} instead
                  </TButton>
                ) : null}
              </div>
              <Announcer text={view ? view.announce : 'Fill in all four lines to see the average you need.'} />
            </NightCard>
          </aside>
        </div>
      </ToolStage>

      <section aria-labelledby="how-worked-out" className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <Heading id="how-worked-out" title="How it's worked out" lead="The page's example: a CGPA of 3.38 after 90 units, 60 units left, aiming for 3.50." />
            <ol className="mt-10 space-y-6">
              {STAGES.map((stage, index) => (
                <li key={stage.line} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                  <span className="ag-display grid h-10 w-10 place-items-center rounded-full bg-ag-gold text-[1.125rem] font-bold text-ag-night" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[1.0625rem] font-semibold text-ag-ink">{stage.line}</p>
                    <p className="ag-num mt-1 text-[0.9375rem] leading-relaxed text-ag-mist">{stage.note}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-2xl bg-ag-night p-5 text-white">
              <p className="text-[1rem] font-semibold leading-snug">Needed average = (target × all units − CGPA × units done) ÷ units left</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-ag-mist-night">
                Carry-over courses you will retake count in your units left if your school counts them again. The answer is rounded up, so you never aim too
                low.
              </p>
            </div>
          </div>
          <ReceiptCard title="Your working" meta={view ? 'From your four numbers' : 'Fill in the four lines above'} tone="haze" className="min-w-0">
            <ReceiptRows groups={[{ lines: receipt }]} />
            {view && input ? (
              <p className="ag-num mt-5 text-[0.9375rem] leading-relaxed text-ag-ink">
                With an A in every remaining course: ({money(input.current * input.done)} + {max} × {input.left}) ÷ {input.done + input.left} ={' '}
                {formatCgpa((input.current * input.done + max * input.left) / (input.done + input.left))}.
              </p>
            ) : null}
          </ReceiptCard>
        </Container>
      </section>
    </>
  );
}
