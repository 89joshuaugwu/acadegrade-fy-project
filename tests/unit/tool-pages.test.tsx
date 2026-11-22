import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, uid: null, loading: false, error: null }) }));

import DegreeClassCheckerPage, { metadata as degreeMeta } from '@/app/(public)/tools/degree-class-checker/page';
import RequiredGpaPage from '@/app/(public)/tools/required-gpa/page';
import CarryOverImpactPage from '@/app/(public)/tools/carry-over-impact/page';
import WeightedAveragePage from '@/app/(public)/tools/weighted-average/page';
import ToolsHubPage, { metadata as hubMeta } from '@/app/(public)/tools/page';
import { HUB_FAQS, hubExample } from '@/app/(public)/tools/hub-content';
import { TOOL_CONFIGS, TOOL_PATHS, toolsByGroup } from '@/app/(public)/tools/tools-config';
import { PUBLIC_SITEMAP_ROUTES } from '@/lib/seo/site';
import {
  calculatorLinkFromRows,
  carryOverImpact,
  carryOverTable,
  checkDegreeClass,
  gpaAndPiFromRows,
  parseNumber,
  requiredGpa,
  suggestDecimal,
  weightedAverageFromRows,
  type ScoreRow,
} from '@/app/(public)/tools/tool-math';
import { degreeClassView } from '@/app/(public)/tools/DegreeClassCalculator';
import { aimFor } from '@/app/(public)/tools/RequiredGpaCalculator';
import { changeText, classChangeLine } from '@/app/(public)/tools/CarryOverCalculator';
import { MAX_ROWS, rowsFromCalculatorLink } from '@/app/(public)/tools/WeightedAverageCalculator';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { encodeRows } from '@/components/public/tools/calculator-url';

const pages = [
  ['degree class checker', DegreeClassCheckerPage],
  ['required GPA', RequiredGpaPage],
  ['carry-over impact', CarryOverImpactPage],
  ['weighted average', WeightedAveragePage],
] as const;

const jsonLd = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent!));
const status = () => screen.getByRole('status');

beforeEach(() => {
  window.history.replaceState(null, '', '/tools');
});

describe('free tool pages', () => {
  it('lists the hub and all six tools in the public sitemap routes', () => {
    expect(TOOL_PATHS).toHaveLength(6);
    for (const path of [...TOOL_PATHS, '/tools', '/calculator']) expect(PUBLIC_SITEMAP_ROUTES).toContain(path);
  });

  it('gives each page a canonical path without parameters', () => {
    expect(String(degreeMeta.alternates?.canonical)).toMatch(/\/tools\/degree-class-checker$/);
    expect(String(hubMeta.alternates?.canonical)).toMatch(/\/tools$/);
  });

  it.each(pages)('%s renders one h1, the not-official note, WebApplication + FAQPage + BreadcrumbList JSON-LD and links back', (_name, Page) => {
    const { container } = render(<Page />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByText(/not an official result/i).length).toBeGreaterThan(0);
    const blocks = jsonLd(container);
    expect(blocks.map((block) => block['@type'])).toEqual(['WebApplication', 'FAQPage', 'BreadcrumbList']);
    expect(blocks[0]).toMatchObject({ applicationCategory: 'EducationalApplication', isAccessibleForFree: true, inLanguage: 'en-NG' });
    expect(blocks[1].mainEntity).toHaveLength(6);
    for (const entry of blocks[1].mainEntity) expect(container.textContent).toContain(entry.acceptedAnswer.text);
    expect(container.textContent).not.toMatch(/verified|certified|coming soon/i);
    expect(screen.getAllByRole('link', { name: 'All free tools' })[0]).toHaveAttribute('href', '/tools');
    expect(screen.getByRole('link', { name: 'CGPA calculator' })).toHaveAttribute('href', '/calculator');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'More free tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WAEC credit checker' })).toHaveAttribute('href', '/tools/waec-credit-checker');
    expect(screen.getByRole('link', { name: 'Admission aggregate' })).toHaveAttribute('href', '/tools/admission-aggregate');
  });

  it('keeps the 5-point hero facts on the CGPA tools', () => {
    render(<DegreeClassCheckerPage />);
    expect(screen.getByRole('heading', { level: 1 }).closest('section')).toHaveTextContent('Nigerian university 5-point scale, with PI');
  });

  it('classifies a typed CGPA', async () => {
    render(<DegreeClassCheckerPage />);
    await userEvent.type(screen.getByLabelText('Your CGPA'), '4.496');
    await waitFor(() => expect(status()).toHaveTextContent(/First Class/));
  });

  it('shows errors only on blur and offers the missed decimal point', async () => {
    const user = userEvent.setup();
    render(<DegreeClassCheckerPage />);
    const field = screen.getByLabelText('Your CGPA');
    await user.type(field, '443');
    expect(screen.queryByText(/Enter a CGPA from 0.00 to 5.00/)).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText(/Enter a CGPA from 0.00 to 5.00/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '4.43' }));
    expect(field).toHaveValue('4.43');
    expect(screen.getByText('0.07 to First Class, which starts at 4.50')).toBeInTheDocument();
  });

  it('reads ?cgpa= once and leaves a clean address bar', async () => {
    window.history.replaceState(null, '', '/tools/degree-class-checker?cgpa=4.42');
    render(<DegreeClassCheckerPage />);
    expect(screen.getByLabelText('Your CGPA')).toHaveValue('4.42');
    expect(window.location.search).toBe('');
    expect(screen.getByRole('link', { name: 'What do I need to get there?' })).toHaveAttribute('href', '/tools/required-gpa?current=4.42');
  });

  it('shows a required GPA and refuses unreachable targets', async () => {
    render(<RequiredGpaPage />);
    await userEvent.type(screen.getByLabelText('Current CGPA'), '3.40');
    await userEvent.type(screen.getByLabelText('Target CGPA'), '3.50');
    await userEvent.type(screen.getByLabelText('Units completed'), '90');
    await userEvent.type(screen.getByLabelText('Units remaining'), '60');
    await waitFor(() => expect(status()).toHaveTextContent('3.65'));
    expect(screen.getByRole('radio', { name: '2:1, 3.50' })).toBeChecked();
    await userEvent.clear(screen.getByLabelText('Target CGPA'));
    await userEvent.type(screen.getByLabelText('Target CGPA'), '5');
    await waitFor(() => expect(status()).toHaveTextContent(/out of reach/i));
  });

  it('fills the target from a class key and the example, with the receipt adding up', async () => {
    const user = userEvent.setup();
    render(<RequiredGpaPage />);
    await user.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(screen.getByText('220.80 ÷ 60 units = 3.68')).toBeInTheDocument();
    expect(screen.getByText('Highest you can still reach: 4.03')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'First Class, 4.50' }));
    expect(screen.getByLabelText('Target CGPA')).toHaveValue('4.50');
    expect(screen.getByText('370.80 needed ÷ 60 units = 6.18 (above 5.00)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aim for 3.50 instead' }));
    expect(screen.getByLabelText('Target CGPA')).toHaveValue('3.50');
  });

  it('prefills required GPA from the calculator, choosing the next class up', () => {
    window.history.replaceState(null, '', '/tools/required-gpa?current=4.43&done=87');
    render(<RequiredGpaPage />);
    expect(screen.getByLabelText('Current CGPA')).toHaveValue('4.43');
    expect(screen.getByLabelText('Units completed')).toHaveValue('87');
    expect(screen.getByLabelText('Target CGPA')).toHaveValue('4.50');
    expect(window.location.search).toBe('');
  });

  it('carries the calculator example into carry-over: 4.28 and 4.42', async () => {
    window.history.replaceState(null, '', '/tools/carry-over-impact?current=4.32&done=87&failed=3');
    render(<CarryOverImpactPage />);
    await waitFor(() => expect(status()).toHaveTextContent('extra units: 4.28, down 0.04. If it replaces the F: 4.42, up 0.10.'));
  });

  it('uses grade keys for the retake (keyboard included)', async () => {
    const user = userEvent.setup();
    render(<CarryOverImpactPage />);
    await user.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(screen.getByRole('radio', { name: 'A, 5 points' })).toBeChecked();
    expect(screen.getByText('195.00 ÷ 63 = 3.10')).toBeInTheDocument();
    expect(screen.getByText('195.00 ÷ 60 = 3.25')).toBeInTheDocument();
    screen.getByRole('radio', { name: 'A, 5 points' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'B, 4 points' })).toBeChecked();
  });

  it('weighted average: example, 20-row limit and no percentage wording', async () => {
    const user = userEvent.setup();
    const { container } = render(<WeightedAveragePage />);
    await user.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(screen.getByText('857 ÷ 13 = 65.9')).toBeInTheDocument();
    expect(screen.getByText('GPA 4.15 · PI 3.30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See these in the CGPA calculator' }).getAttribute('href')).toMatch(/^\/calculator\?m=score&c=/);
    while (!screen.queryByText('20 courses is the most this tool takes')) await user.click(screen.getByRole('button', { name: 'Add a course' }));
    expect(screen.getAllByRole('textbox', { name: /^Score for/ })).toHaveLength(MAX_ROWS);
    expect(container.textContent).not.toMatch(/percentage|\d%/i);
    // About 17 real clicks, each re-rendering up to 20 rows: slow machines need more than the 5 s default.
  }, 20_000);

  it('brings scores over from the calculator and refuses letter grades', () => {
    const scores = `c=${encodeURIComponent(encodeRows([{ c: 'CSC 301', u: 3, s: 76 }, { c: 'CSC 303', u: 3, s: 65 }]))}`;
    expect(rowsFromCalculatorLink(scores)).toEqual({
      rows: [
        { code: 'CSC 301', score: '76', units: '3' },
        { code: 'CSC 303', score: '65', units: '3' },
      ],
      notes: ['These scores came from the CGPA calculator.'],
    });
    const letters = `c=${encodeURIComponent(encodeRows([{ c: 'CSC 301', u: 3, g: 'A' }]))}`;
    expect(rowsFromCalculatorLink(letters)).toEqual({ rows: [], notes: ["Letter grades have no single score, so they weren't brought over."] });
  });
});

describe('tools hub', () => {
  it('leads with the calculator slip and lists the six tools with worked values', () => {
    const { container } = render(<ToolsHubPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Free CGPA tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the CGPA calculator' })).toHaveAttribute('href', '/calculator');
    expect(screen.getByRole('link', { name: 'Open this example' }).getAttribute('href')).toMatch(/^\/calculator\?m=score&c=/);
    for (const tool of TOOL_CONFIGS) expect(screen.getByRole('link', { name: new RegExp(`^${tool.menuName}:`) })).toHaveAttribute('href', `/tools/${tool.slug}`);
    const slip = screen.getByRole('table', { name: /example result slip/i });
    expect(within(slip).getAllByRole('row')).toHaveLength(6);
    expect(container.textContent).toContain('Class at this GPA: Second Class Upper');
    const blocks = jsonLd(container);
    expect(blocks.map((block) => block['@type'])).toEqual(['CollectionPage', 'FAQPage', 'BreadcrumbList']);
    expect(blocks[0].mainEntity.itemListElement.map((item: { name: string }) => item.name)).toEqual([
      'CGPA calculator',
      'Degree class checker',
      'Weighted average score calculator',
      'Required GPA calculator',
      'Carry-over impact calculator',
      'WAEC credit checker',
      'JAMB admission aggregate calculator',
    ]);
    expect(blocks[1].mainEntity.map((entry: { name: string }) => entry.name)).toEqual(HUB_FAQS.map((faq) => faq.question));
    expect(container.querySelector('img')).toBeNull();
  });

  it('pins the sheet values to tool-math (4.43 → 2:1, 65.9, 3.68, 3.10 / 3.25)', () => {
    expect(hubExample('degree-class-checker').value).toBe('4.43 → 2:1');
    expect(checkDegreeClass(4.43)?.gap).toBe(0.07);
    expect(hubExample('weighted-average').value).toBe('65.9');
    expect(hubExample('required-gpa').value).toBe('3.68 needed');
    expect(hubExample('carry-over-impact').value).toBe('3.10 or 3.25');
    expect(hubExample('waec-credit-checker').value).toBe('6 credits');
    expect(hubExample('admission-aggregate').value).toBe('68.10');
    expect(toolsByGroup().map((group) => group.tools.map((tool) => tool.slug))).toEqual([
      ['degree-class-checker', 'weighted-average'],
      ['required-gpa', 'carry-over-impact'],
      ['waec-credit-checker', 'admission-aggregate'],
    ]);
  });
});

describe('tool maths', () => {
  it('checks the degree class on the rounded CGPA and reports the gap', () => {
    expect(checkDegreeClass(4.495)?.band.shortLabel).toBe('1st');
    expect(checkDegreeClass(3.49)).toMatchObject({ gap: 0.01 });
    expect(checkDegreeClass(3.49)?.next?.shortLabel).toBe('2:1');
    expect(checkDegreeClass(5)?.next).toBeNull();
    expect(checkDegreeClass(5.1)).toBeNull();
    expect(checkDegreeClass(null)).toBeNull();
  });

  // tool-degree-class-checker.md §5.1
  it.each([
    ['4.43', '4.43', 'Second Class Upper', 'First Class', 0.07],
    ['4.426', '4.43', 'Second Class Upper', 'First Class', 0.07],
    ['4.495', '4.50', 'First Class', null, null],
    ['4.494', '4.49', 'Second Class Upper', 'First Class', 0.01],
    ['4.496', '4.50', 'First Class', null, null],
    ['5.00', '5.00', 'First Class', null, null],
    ['3.50', '3.50', 'Second Class Upper', 'First Class', 1],
    ['3.49', '3.49', 'Second Class Lower', 'Second Class Upper', 0.01],
    ['2.40', '2.40', 'Second Class Lower', 'Second Class Upper', 1.1],
    ['2.39', '2.39', 'Third Class', 'Second Class Lower', 0.01],
    ['1.50', '1.50', 'Third Class', 'Second Class Lower', 0.9],
    ['1.00', '1.00', 'Pass', 'Third Class', 0.5],
    ['0.85', '0.85', 'Below a Pass', 'Pass', 0.15],
    ['0', '0.00', 'Below a Pass', 'Pass', 1],
    ['4,43', '4.43', 'Second Class Upper', 'First Class', 0.07],
  ])('degree class: %s shows as %s, %s', (typed, shown, label, next, gap) => {
    const view = degreeClassView(typed)!;
    expect(view.rounded.toFixed(2)).toBe(shown);
    expect(view.band.label).toBe(label);
    expect(view.next?.label ?? null).toBe(next);
    if (gap !== null) expect(view.gap).toBe(gap);
  });

  it('degree class: errors and the decimal suggestion', () => {
    for (const bad of ['5.01', '-1', 'abc', '443']) expect(degreeClassView(bad)).toBeNull();
    expect(suggestDecimal('443')).toBe(4.43);
    expect(suggestDecimal('4.43')).toBeNull();
    expect(suggestDecimal('99')).toBeNull();
    expect(degreeClassView('0.85')?.gapLine).toBe('0.15 to a Pass, which starts at 1.00');
    expect(degreeClassView('4.43')?.closing).toBe('Next class up: First Class at 4.50, 0.07 higher.');
    expect(parseNumber('4,43')).toBe(4.43);
  });

  // tool-required-gpa.md §5.1
  it.each([
    [3.38, 90, 60, 3.5, { status: 'needed', required: 3.68, maxReachable: 4.03 }],
    [3.4, 90, 60, 3.5, { status: 'needed', required: 3.65, maxReachable: 4.04 }],
    [3.38, 90, 60, 4.5, { status: 'unreachable', maxReachable: 4.03 }],
    [3.38, 90, 60, 2.4, { status: 'needed', required: 0.93, maxReachable: 4.03 }],
    [3.38, 90, 60, 1.5, { status: 'secured', lowestFinish: 2.03, maxReachable: 4.03 }],
    [4, 60, 60, 4.5, { status: 'needed', required: 5, maxReachable: 4.5 }],
    [4.2, 90, 60, 4.5, { status: 'needed', required: 4.95, maxReachable: 4.52 }],
    [3.3, 120, 40, 3.5, { status: 'needed', required: 4.1, maxReachable: 3.73 }],
    [4.43, 87, 40, 4.5, { status: 'needed', required: 4.66, maxReachable: 4.61 }],
    [3.38, 0, 60, 3.5, { status: 'needed', required: 3.5, maxReachable: 5 }],
    [4.8, 90, 10, 3, { status: 'secured', lowestFinish: 4.32, maxReachable: 4.82 }],
    [2, 100, 10, 4.5, { status: 'unreachable', maxReachable: 2.27 }],
  ])('required GPA: %s after %s units, %s left, target %s', (currentCgpa, completedUnits, remainingUnits, targetCgpa, expected) => {
    expect(requiredGpa({ currentCgpa, completedUnits, remainingUnits, targetCgpa })).toMatchObject(expected);
  });

  it('required GPA: invalid input and "aim for" the reachable class', () => {
    expect(requiredGpa({ currentCgpa: 2, completedUnits: 100, remainingUnits: 0, targetCgpa: 3 })).toEqual({ status: 'invalid' });
    expect(aimFor(4.03)).toBe(3.5);
    expect(aimFor(2.27)).toBe(1.5);
  });

  it('shows both carry-over rules', () => {
    const impact = carryOverImpact({ currentCgpa: 3, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' });
    expect(impact).toEqual({ before: 3, bothAttemptsCount: 3.1, replacesFailure: 3.25 });
    expect(carryOverImpact({ currentCgpa: 3, completedUnits: 2, failedUnits: 3, retakeGrade: 'A' })).toBeNull();
  });

  // tool-carry-over-impact.md §5.1
  it('carry-over: every retake grade, the class change, the calculator example and the impossible CGPA', () => {
    const table = carryOverTable({ currentCgpa: 3, completedUnits: 60, failedUnits: 3 })!;
    expect(table.map((row) => [row.grade, formatCgpa(row.impact.bothAttemptsCount), formatCgpa(row.impact.replacesFailure)])).toEqual([
      ['A', '3.10', '3.25'],
      ['B', '3.05', '3.20'],
      ['C', '3.00', '3.15'],
      ['D', '2.95', '3.10'],
      ['E', '2.90', '3.05'],
      ['F', '2.86', '3.00'],
    ]);
    expect(changeText(3, 3.1)).toBe('+0.10');
    expect(changeText(3, 2.86)).toBe('−0.14');
    expect(changeText(3, 3)).toBe('no change');
    const up = carryOverImpact({ currentCgpa: 3.45, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' })!;
    expect([up.bothAttemptsCount, up.replacesFailure]).toEqual([3.52, 3.7]);
    expect(classChangeLine(up.before, up.bothAttemptsCount)).toBe('Moves you up to Second Class Upper');
    expect(classChangeLine(3, 3.1)).toBeNull();
    const fromCalculator = carryOverImpact({ currentCgpa: 4.32, completedUnits: 87, failedUnits: 3, retakeGrade: 'C' })!;
    expect([fromCalculator.bothAttemptsCount, fromCalculator.replacesFailure]).toEqual([4.28, 4.42]);
    expect(carryOverImpact({ currentCgpa: 5, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' })).toBeNull();
    expect(carryOverImpact({ currentCgpa: 4.75, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' })).not.toBeNull();
  });

  it('averages scores by units and skips incomplete rows', () => {
    const result = weightedAverageFromRows([
      { score: '80', units: '3' },
      { score: '60', units: '1' },
      { score: '120', units: '2' },
      { score: '', units: '' },
    ]);
    expect(result.average).toBe(75);
    expect(result.includedUnits).toBe(4);
    expect(result.skippedRows).toBe(1);
  });

  // tool-weighted-average.md §5.1
  const row = (score: string, units: string): ScoreRow => ({ score, units });
  const example = [row('76', '3'), row('65', '3'), row('56', '3'), row('72', '2'), row('61', '2')];
  it.each([
    ['the example', example, '65.9', 13, '4.15', '3.30', 0],
    ['80/3, 60/1, 120/2, empty', [row('80', '3'), row('60', '1'), row('120', '2'), row('', '')], '75.0', 4, '4.75', '3.75', 1],
    ['the example plus two bad rows', [...example, row('120', '2'), row('58', '0')], '65.9', 13, '4.15', '3.30', 2],
    ['70/1.5, 50/1.5', [row('70', '1.5'), row('50', '1.5')], '60.0', 3, '4.00', '3.00', 0],
    ['58/3', [row('58', '3')], '58.0', 3, '3.00', '2.90', 0],
    ['69,5/2', [row('69,5', '2')], '69.5', 2, '4.00', '3.48', 0],
  ] as const)('weighted average: %s', (_name, rows, average, units, gpa, pi, skipped) => {
    const result = weightedAverageFromRows(rows);
    expect(result.average?.toFixed(1)).toBe(average);
    expect(result.includedUnits).toBe(units);
    expect(result.skippedRows).toBe(skipped);
    const marks = gpaAndPiFromRows(rows)!;
    expect(formatCgpa(marks.gpa)).toBe(gpa);
    expect(formatCgpa(marks.pi)).toBe(pi);
  });

  it('weighted average: a half-filled row is left out, and the calculator link needs whole units 1 to 6', () => {
    expect(weightedAverageFromRows([row('76', '')])).toMatchObject({ average: null, skippedRows: 1 });
    expect(gpaAndPiFromRows([row('76', '')])).toBeNull();
    expect(calculatorLinkFromRows([row('70', '1.5'), row('50', '1.5')])).toBeNull();
    expect(calculatorLinkFromRows([row('76', '8')])).toBeNull();
    expect(calculatorLinkFromRows([{ code: 'csc 301', score: '76', units: '3' }])).toBe(
      `/calculator?m=score&c=${encodeURIComponent(encodeRows([{ c: 'CSC 301', u: 3, s: 76 }]))}`
    );
  });
});
