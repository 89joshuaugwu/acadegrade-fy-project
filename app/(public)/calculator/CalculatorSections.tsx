'use client';

import { useState } from 'react';
import { ButtonLink, Container, Heading, TextLinkV2 } from '@/components/site/ui';
import { TButton, textButtonClass } from '@/components/site/tools/controls';
import { useDebounced } from '@/components/site/tools/hooks';
import { ReceiptCard, ReceiptRows, type ReceiptGroup, type ReceiptLine } from '@/components/site/tools/Receipt';
import { ClassList, GradeList, ScaleBar } from '@/components/site/tools/ScaleStrip';
import { OpenCue, ToolCard } from '@/components/site/tools/ToolCards';
import { ToolClosing } from '@/components/site/tools/ToolClosing';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE } from '@/lib/public/scales';
import { clean, computeCalculation, exampleRows, nextQuestions, rowLabel, type CalculationResult } from '@/components/public/tools/calculator-model';
import { TOOL_CONFIGS } from '../tools/tools-config';
import { CALCULATOR_COPY } from './calculator-content';
import { useCalculator } from './CalculatorProvider';

const FOLD_AFTER = 8;
const EXAMPLE_RESULT = computeCalculation({ mode: 'grade', rows: exampleRows(() => 'example') });
const two = (value: number) => clean(value).toFixed(2);

function foldLines(lines: ReceiptLine[], values: number[], open: boolean, format: (value: number) => string): ReceiptLine[] {
  if (open || lines.length <= FOLD_AFTER) return lines;
  const rest = values.slice(FOLD_AFTER).reduce((sum, value) => sum + value, 0);
  const count = lines.length - FOLD_AFTER;
  return [...lines.slice(0, FOLD_AFTER), { label: `and ${count} more course${count === 1 ? '' : 's'}`, value: format(rest) }];
}

/** The receipt groups for a calculation (calculator.md §5.2), with the visitor's own numbers. */
export function receiptGroups(result: CalculationResult, open: boolean): ReceiptGroup[] {
  const semester = result.semester;
  if (!semester) return [];
  const rows = result.counted;
  const gradeValues = rows.map((entry) => entry.metrics.gradePoint * entry.metrics.units);
  const gradeLines = rows.map((entry, i) => ({
    label: `${rowLabel(entry.row, entry.index)}, ${entry.metrics.units} unit${entry.metrics.units === 1 ? '' : 's'} × ${entry.metrics.grade} (${entry.metrics.gradePoint})`,
    value: String(gradeValues[i]),
  }));
  const groups: ReceiptGroup[] = [
    { name: 'Grade points', lines: foldLines(gradeLines, gradeValues, open, String) },
    {
      name: 'Totals',
      lines: [
        { label: 'Units', value: String(semester.units) },
        { label: 'Points', value: String(semester.points) },
        { label: `${semester.points} ÷ ${semester.units}`, value: `GPA ${formatCgpa(semester.gpa)}`, inverted: true },
      ],
    },
  ];
  if (result.mode === 'score') {
    const piValues = rows.map((entry) => clean(entry.metrics.piPoint * entry.metrics.units));
    const piLines = rows.map((entry, i) => ({
      label: `${rowLabel(entry.row, entry.index)}, ${entry.score} ÷ 100 × 5 = ${two(entry.metrics.piPoint)}, × ${entry.metrics.units}`,
      value: two(piValues[i]),
    }));
    groups.push({
      name: 'PI from your scores',
      lines: [...foldLines(piLines, piValues, open, two), { label: `${two(semester.piSum)} ÷ ${semester.units}`, value: `PI ${formatCgpa(semester.pi)}`, inverted: true }],
    });
  }
  if (result.prior && result.cumulative) {
    groups.push({
      name: 'Your CGPA',
      lines: [
        { label: `Before: ${result.prior.cgpa.toFixed(2)} × ${result.prior.units} units`, value: two(result.prior.cgpa * result.prior.units) },
        { label: `This semester, over ${semester.units} units`, value: String(semester.points) },
        { label: `${two(result.cumulative.points)} ÷ ${result.cumulative.units}`, value: `CGPA ${formatCgpa(result.cumulative.cgpa)}`, inverted: true },
      ],
    });
  }
  return groups;
}

/** How your GPA is worked out: the live total beside its receipt. */
export function CalculatorReceipt() {
  const { result: live } = useCalculator();
  const settled = useDebounced(live, 150);
  const [open, setOpen] = useState(false);
  const isExample = !settled.semester;
  const result = isExample ? EXAMPLE_RESULT : settled;
  const semester = result.semester!;
  const groups = receiptGroups(result, open);
  return (
    <section aria-labelledby="how-worked-out" className="bg-white py-20 sm:py-28">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
        <div className="min-w-0">
          <Heading
            id="how-worked-out"
            title="How your GPA is worked out"
            lead="Multiply each course's grade point by its units, add them up, then divide by your total units. Your CGPA does the same across every semester."
          />
          <div className="mt-10 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className="ag-display ag-num text-[4.5rem] font-bold leading-[0.9] text-ag-ink sm:text-[5.5rem]">{formatCgpa(semester.gpa)}</p>
            <p className="pb-1 text-[1rem] leading-snug text-ag-mist">
              {isExample ? 'Example semester GPA' : 'Your semester GPA'}
              <span className="ag-num block font-semibold text-ag-ink">
                {semester.points} points ÷ {semester.units} units
              </span>
            </p>
          </div>
          <dl className="mt-10 space-y-5 border-t border-ag-ink/10 pt-8">
            {[
              ['GPA', 'One semester. Grade points times units, divided by the units.'],
              ['PI', `Uses your actual scores: each total ÷ 100 × ${DEFAULT_SCALE.maxPoint}, averaged by units. Not every school uses PI.`],
              [
                'CGPA',
                result.cumulative
                  ? `Every semester so far, weighted by units. Yours: ${formatCgpa(result.cumulative.cgpa)} over ${result.cumulative.units} units.`
                  : 'Every semester so far, weighted by units. Add your CGPA so far above to see it.',
              ],
            ].map(([term, text]) => (
              <div key={term} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4">
                <dt className="ag-display text-[1.25rem] font-bold text-ag-violet">{term}</dt>
                <dd className="text-[1rem] leading-relaxed text-ag-mist">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ReceiptCard
          title={isExample ? 'The working, on an example' : 'Your working'}
          meta={isExample ? CALCULATOR_COPY.exampleLine : `${semester.courses} course${semester.courses === 1 ? '' : 's'} from above`}
          tone="haze"
          className="min-w-0"
        >
          <ReceiptRows groups={groups} />
          {!isExample && result.counted.length > FOLD_AFTER ? (
            <button type="button" className={`${textButtonClass()} mt-5 min-h-11 text-[0.9375rem]`} onClick={() => setOpen((value) => !value)}>
              {open ? 'Show fewer' : 'Show all'}
            </button>
          ) : null}
        </ReceiptCard>
      </Container>
    </section>
  );
}

/** Points, bands and classes, with the visitor's figure on the bar and their class highlighted. */
export function CalculatorScale() {
  const { result } = useCalculator();
  const headline = result.headline;
  const active = result.classBand && result.classBand.engineShort !== 'Fail' ? result.classBand.short : null;
  return (
    <section aria-labelledby="points-bands" className="bg-ag-haze py-20 sm:py-28">
      <Container>
        <Heading id="points-bands" title="Points, bands and classes" lead={`Most Nigerian universities use these bands. ${DEFAULT_SCALE.handbookNote}`} />
        <div className="mt-12 rounded-[28px] bg-white p-5 sm:p-8">
          <ScaleBar
            caption="Degree classes on the 5-point scale, with your figure marked"
            marker={
              headline && result.classBand
                ? { value: headline.value, title: `Your ${headline.label === 'CGPA' ? 'CGPA' : 'GPA'}: ${formatCgpa(headline.value)}`, sub: result.classBand.label }
                : null
            }
          />
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <div className="min-w-0 rounded-[24px] bg-white p-4 sm:p-7">
            <h3 className="ag-display px-4 pb-3 text-[1.375rem] font-bold text-ag-ink">Classes</h3>
            <ClassList active={active} activeNote="Your result is here" />
            <p className="px-4 pt-4 text-[0.875rem] leading-relaxed text-ag-mist">
              Your class is read from your CGPA rounded to two decimals, so 4.495 shows as 4.50.
            </p>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white p-4 sm:p-7">
            <h3 className="ag-display px-4 pb-3 text-[1.375rem] font-bold text-ag-ink">Grades</h3>
            <GradeList />
            <p className="px-4 pt-4 text-[0.875rem] leading-relaxed text-ag-mist">
              CA out of {DEFAULT_SCALE.scoreSplit.ca} plus exam out of {DEFAULT_SCALE.scoreSplit.exam} is your score out of 100.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

const QUESTION_BY_NAME = new Map(TOOL_CONFIGS.map((tool) => [tool.menuName, tool.question]));

/** The four tools as cards, with live hints and prefilled links from this calculation. */
export function CalculatorTools() {
  const { result, state } = useCalculator();
  const questions = nextQuestions(result, state.rows);
  return (
    <section aria-labelledby="next-questions" className="bg-white py-20 sm:py-28">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Heading id="next-questions" title="Next questions" lead="Four quick tools on the same scale. Each one opens with your numbers already in." />
          <TextLinkV2 href="/tools" className="shrink-0 text-[1rem]">
            All free tools
          </TextLinkV2>
        </div>
        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {questions.map((question) => (
            <ToolCard key={question.name} name={question.name} href={question.href} tone="haze" footer={<OpenCue />}>
              <p className="mt-4 text-[1.0625rem] font-semibold leading-snug text-ag-ink">{question.hint}</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ag-mist">{QUESTION_BY_NAME.get(question.name)}</p>
            </ToolCard>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** The gold close: the same save as the result card, or Start your free record with nothing to save. */
export function CalculatorClose() {
  const calc = useCalculator();
  return (
    <ToolClosing
      title={CALCULATOR_COPY.close}
      secondary={{ href: '/tools', label: 'See all free tools' }}
      action={
        calc.result.semester ? (
          <TButton variant="night" size="lg" onClick={calc.save} busy={calc.saving}>
            Save to your record
          </TButton>
        ) : (
          <ButtonLink href="/register" variant="night" size="lg">
            Start your free record
          </ButtonLink>
        )
      }
    />
  );
}
