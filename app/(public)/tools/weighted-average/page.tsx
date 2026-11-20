import { formatCgpa } from '@/lib/cgpa/academicRules';
import { EXAMPLE_COURSES } from '@/lib/public/example-student';
import { DEFAULT_SCALE } from '@/lib/public/scales';
import { Container, Heading } from '@/components/site/ui';
import { ToolPage, toolMetadata } from '../ToolPage';
import { WeightedAverageCalculator } from '../WeightedAverageCalculator';
import { gpaAndPiFromRows, weightedAverageFromRows } from '../tool-math';

export const metadata = toolMetadata('weighted-average');

const scale = DEFAULT_SCALE;
const max = scale.maxPoint.toFixed(2);
const exampleRows = EXAMPLE_COURSES.map((course) => ({
  score: String(course.ca + course.exam),
  units: String(course.units),
}));
const average = weightedAverageFromRows(exampleRows).average ?? 0;
const marks = gpaAndPiFromRows(exampleRows)!;
const pointsLine = `Each grade's point: A = ${scale.gradeBands[0].gradePoint} down to F = 0`;

/** The comparison set as text (weighted-average §5.2): the example's figures, fixed as a reference. */
const COMPARISON: readonly { name: string; cells: [string, string, string] }[] = [
  {
    name: 'What it answers',
    cells: ['How high are my scores, out of 100?', 'Which grade bands did I reach?', 'How strong are my scores, on the 5-point scale?'],
  },
  {
    name: 'What it uses',
    cells: ['Your scores out of 100', pointsLine, `Each score ÷ 100 × ${scale.maxPoint}`],
  },
  { name: 'Weighted by units', cells: ['Yes', 'Yes', 'Yes'] },
  { name: 'Range', cells: ['0 to 100', `0.00 to ${max}`, `0.00 to ${max}`] },
  {
    name: 'A 69 and a 60 count as',
    cells: ['69 and 60', '4 and 4, both a B', '3.45 and 3.00'],
  },
  {
    name: 'Decides your degree class',
    cells: ['No', 'Yes, as your CGPA', 'No'],
  },
  {
    name: 'These five courses',
    cells: [average.toFixed(1), formatCgpa(marks.gpa), formatCgpa(marks.pi)],
  },
  {
    name: 'Where you meet it',
    cells: ['Forms that ask for an average score', 'Your result, your class, most forms', "Some schools' results, beside GPA"],
  },
];

const COLUMNS = ['Weighted average score', 'GPA', 'PI'] as const;

/** Average, GPA and PI side by side. A table on wide screens; on phones each row stacks with the column names. */
function Comparison() {
  return (
    <section aria-labelledby="average-gpa-pi" className="bg-ag-haze py-20 sm:py-28">
      <Container>
        <Heading
          id="average-gpa-pi"
          title="Average, GPA and PI"
          lead="Three ways to read the same scores. PI is always the weighted average score ÷ 20, because both use the scores themselves. GPA can differ from both, because a 69 and a 60 earn the same B."
        />
        <div role="table" aria-labelledby="average-gpa-pi" className="mt-12 overflow-hidden rounded-[24px] bg-white">
          <div role="row" className="hidden grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-6 border-b border-ag-ink/10 px-7 py-5 md:grid">
            <span role="columnheader">
              <span className="sr-only">Question</span>
            </span>
            {COLUMNS.map((column, index) => (
              <span key={column} role="columnheader" className={`ag-display text-[1.125rem] font-bold ${index === 0 ? 'text-ag-violet' : 'text-ag-ink'}`}>
                {column}
              </span>
            ))}
          </div>
          {COMPARISON.map((row) => (
            <div
              key={row.name}
              role="row"
              className="grid grid-cols-[minmax(0,1fr)] gap-2 border-b border-ag-ink/[0.06] px-5 py-5 last:border-0 sm:px-7 md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] md:gap-6"
            >
              <span role="rowheader" className="text-[1rem] font-semibold text-ag-ink">
                {row.name}
              </span>
              {row.cells.map((cell, index) => (
                <span key={COLUMNS[index]} role="cell" className={`text-[0.9375rem] leading-relaxed ${index === 0 ? 'font-medium text-ag-ink' : 'text-ag-mist'}`}>
                  <span className="font-semibold text-ag-ink md:hidden" aria-hidden="true">
                    {COLUMNS[index]}:{' '}
                  </span>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default function WeightedAveragePage() {
  return (
    <ToolPage slug="weighted-average" extra={<Comparison />} lastTone="haze">
      <WeightedAverageCalculator />
    </ToolPage>
  );
}
