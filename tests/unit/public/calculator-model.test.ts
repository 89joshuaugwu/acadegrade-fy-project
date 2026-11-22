import { describe, expect, it } from 'vitest';
import { formatCgpa, gradeFromScore } from '@/lib/cgpa/academicRules';
import {
  CALCULATOR_MAX_ROWS,
  decodeCalculation,
  encodeCalculation,
  encodeRows,
} from '@/components/public/tools/calculator-url';
import {
  announcement,
  carryOverHref,
  computeCalculation,
  defaultRows,
  exampleRows,
  gapLine,
  handoffCourses,
  nextQuestions,
  parseDecimal,
  priorCgpaError,
  priorUnitsError,
  slipNotes,
  summaryLine,
  switchMode,
  toEncodedRows,
  type CalcRow,
} from '@/components/public/tools/calculator-model';

// calculator.md §5.1 "Sample links (pinned in tests)"
const DEFAULT_LINK = 'm=grade&c=W3siYyI6IiIsInUiOjMsImciOiJBIn0seyJjIjoiIiwidSI6MywiZyI6IkIifSx7ImMiOiIiLCJ1IjoyLCJnIjoiQyJ9XQ%3D%3D';
const EXAMPLE_GRADE_C =
  'W3siYyI6IkNTQyAzMDEiLCJ1IjozLCJnIjoiQSJ9LHsiYyI6IkNTQyAzMDMiLCJ1IjozLCJnIjoiQiJ9LHsiYyI6Ik1USCAzMDEiLCJ1IjozLCJnIjoiQyJ9LHsiYyI6IkNTQyAzMDUiLCJ1IjoyLCJnIjoiQSJ9LHsiYyI6IkdTVCAzMTEiLCJ1IjoyLCJnIjoiQiJ9XQ==';
const EXAMPLE_SCORE_C =
  'W3siYyI6IkNTQyAzMDEiLCJ1IjozLCJzIjo3Nn0seyJjIjoiQ1NDIDMwMyIsInUiOjMsInMiOjY1fSx7ImMiOiJNVEggMzAxIiwidSI6MywicyI6NTZ9LHsiYyI6IkNTQyAzMDUiLCJ1IjoyLCJzIjo3Mn0seyJjIjoiR1NUIDMxMSIsInUiOjIsInMiOjYxfV0=';

let counter = 0;
const id = () => `t${counter++}`;
const example = () => exampleRows(id);
const withGrade = (rows: CalcRow[], code: string, grade: CalcRow['grade']) => rows.map((row) => (row.code === code ? { ...row, grade } : row));
const withScore = (rows: CalcRow[], code: string, scoreText: string) => rows.map((row) => (row.code === code ? { ...row, scoreText } : row));

describe('calculator URL codec', () => {
  it('writes the default rows byte-for-byte as the old calculator did, percent-encoded', () => {
    expect(encodeCalculation({ mode: 'grade', rows: toEncodedRows(defaultRows(), 'grade') })).toBe(DEFAULT_LINK);
  });

  it('writes the example in both modes exactly as the pinned links', () => {
    expect(encodeRows(toEncodedRows(example(), 'grade'))).toBe(EXAMPLE_GRADE_C);
    expect(encodeRows(toEncodedRows(example(), 'score'))).toBe(EXAMPLE_SCORE_C);
    expect(encodeCalculation({ mode: 'grade', rows: toEncodedRows(example(), 'grade') })).toBe(
      `m=grade&c=${encodeURIComponent(EXAMPLE_GRADE_C)}`
    );
  });

  it('opens the three sample links with the right rows (encoded and raw)', () => {
    const defaults = decodeCalculation(`?${DEFAULT_LINK}`);
    expect(defaults.mode).toBe('grade');
    expect(defaults.rows?.map((row) => [row.units, row.grade])).toEqual([[3, 'A'], [3, 'B'], [2, 'C']]);
    const grade = decodeCalculation(`m=grade&c=${EXAMPLE_GRADE_C}`);
    expect(grade.rows?.map((row) => row.code)).toEqual(['CSC 301', 'CSC 303', 'MTH 301', 'CSC 305', 'GST 311']);
    expect(grade.unreadable || grade.partlyReset).toBe(false);
    const score = decodeCalculation(`m=score&c=${EXAMPLE_SCORE_C}`);
    expect(score.mode).toBe('score');
    expect(score.rows?.map((row) => row.scoreText)).toEqual(['76', '65', '56', '72', '61']);
  });

  it('keeps non-ASCII codes working instead of breaking the link', () => {
    const rows = [{ c: 'CSC’301 é', u: 3, g: 'A' as const }];
    const query = encodeCalculation({ mode: 'grade', rows });
    expect(decodeCalculation(query).rows?.[0].code).toBe('CSC’301 é');
  });

  it('starts fresh on an unreadable link and marks out-of-range values', () => {
    expect(decodeCalculation('m=grade&c=not-base64!!')).toMatchObject({ rows: null, unreadable: true });
    expect(decodeCalculation(`m=grade&c=${btoa('{"a":1}')}`)).toMatchObject({ rows: null, unreadable: true });
    expect(decodeCalculation('m=wrong').mode).toBe('grade');
    const bad = decodeCalculation(
      `m=score&c=${encodeURIComponent(encodeRows([{ c: 'x'.repeat(30), u: 9, s: 120 }, { c: 'CSC 101', u: 2, s: 58 }]))}`
    );
    expect(bad.partlyReset).toBe(true);
    expect(bad.rows?.[0]).toMatchObject({ code: 'x'.repeat(24), units: 3, scoreText: '120', reset: true });
    expect(bad.rows?.[1].reset).toBe(false);
    const badGrade = decodeCalculation(`m=grade&c=${encodeURIComponent(btoa('[{"c":"A","u":3,"g":"Z"}]'))}`);
    expect(badGrade.rows?.[0]).toMatchObject({ grade: null, reset: true });
  });

  it('keeps only the first 40 rows', () => {
    const many = Array.from({ length: 45 }, () => ({ c: '', u: 3, g: 'A' as const }));
    const decoded = decodeCalculation(encodeCalculation({ mode: 'grade', rows: many }));
    expect(decoded.rows).toHaveLength(CALCULATOR_MAX_ROWS);
    expect(decoded.partlyReset).toBe(true);
  });

  it('carries the prior record as pc and pu', () => {
    const query = encodeCalculation({ mode: 'grade', rows: [], priorCgpa: '4.47', priorUnits: '74' });
    expect(query).toContain('pc=4.47&pu=74');
    expect(decodeCalculation(query)).toMatchObject({ priorCgpa: '4.47', priorUnits: '74' });
  });
});

describe('calculator sample data (calculator.md §5.1)', () => {
  it('default: 33 ÷ 8 = GPA 4.13, class at this GPA Second Class Upper', () => {
    const result = computeCalculation({ mode: 'grade', rows: defaultRows() });
    expect(result.semester?.points).toBe(33);
    expect(formatCgpa(result.semester?.gpa)).toBe('4.13');
    expect(formatCgpa(result.semester?.pi)).toBe('4.13');
    expect(result.semester).toMatchObject({ units: 8, courses: 3 });
    expect(result.headline?.label).toBe('Semester GPA');
    expect(result.classBand?.label).toBe('Second Class Upper');
    expect(gapLine(result)).toBe('Add your CGPA so far to see your class.');
  });

  it('example letters: 54 ÷ 13 = 4.15', () => {
    const result = computeCalculation({ mode: 'grade', rows: example() });
    expect(result.semester).toMatchObject({ points: 54, units: 13, courses: 5 });
    expect(formatCgpa(result.semester?.gpa)).toBe('4.15');
    expect(summaryLine(result)).toBe('Semester GPA 4.15 · PI 4.15 · 13 units · 5 courses · With letter grades, PI equals your GPA.');
  });

  it('with CGPA so far 4.47 over 74 units: 384.78 ÷ 87 = CGPA 4.42, 0.08 to First Class', () => {
    const result = computeCalculation({ mode: 'grade', rows: example(), priorCgpa: '4.47', priorUnits: '74' });
    expect(result.cumulative?.points).toBe(384.78);
    expect(result.cumulative?.units).toBe(87);
    expect(formatCgpa(result.cumulative?.cgpa)).toBe('4.42');
    expect(result.headline?.label).toBe('CGPA');
    expect(result.classBand?.label).toBe('Second Class Upper');
    expect(gapLine(result)).toBe('0.08 to First Class');
    expect(summaryLine(result)).toContain('· CGPA 4.42 over 87 units');
    expect(announcement(result)).toBe('Semester GPA 4.15. PI 4.15. CGPA 4.42, Second Class Upper.');
  });

  it('MTH 301 C → A: GPA 4.62, CGPA 4.49, 0.01 to First Class; then CSC 303 → A: CGPA 4.53 First Class', () => {
    const up = withGrade(example(), 'MTH 301', 'A');
    const first = computeCalculation({ mode: 'grade', rows: up, priorCgpa: '4.47', priorUnits: '74' });
    expect(formatCgpa(first.semester?.gpa)).toBe('4.62');
    expect(formatCgpa(first.cumulative?.cgpa)).toBe('4.49');
    expect(gapLine(first)).toBe('0.01 to First Class');
    const both = computeCalculation({ mode: 'grade', rows: withGrade(up, 'CSC 303', 'A'), priorCgpa: '4.47', priorUnits: '74' });
    expect(formatCgpa(both.semester?.gpa)).toBe('4.85');
    expect(formatCgpa(both.cumulative?.cgpa)).toBe('4.53');
    expect(both.classBand?.label).toBe('First Class');
    expect(gapLine(both)).toBe('The top class on this scale');
  });

  it('MTH 301 F: GPA 3.46, CGPA 4.32 and the carry-over note with its prefilled link', () => {
    const rows = withGrade(example(), 'MTH 301', 'F');
    const result = computeCalculation({ mode: 'grade', rows, priorCgpa: '4.47', priorUnits: '74' });
    expect(formatCgpa(result.semester?.gpa)).toBe('3.46');
    expect(formatCgpa(result.cumulative?.cgpa)).toBe('4.32');
    expect(slipNotes(result)[0]).toEqual({ kind: 'carry', text: '1 carry-over on this slip: MTH 301.' });
    expect(carryOverHref(result)).toBe('/tools/carry-over-impact?current=4.32&done=87&failed=3');
  });

  it('example scores: GPA 4.15, PI 42.85 ÷ 13 = 3.30, weighted average 857 ÷ 13 = 65.9', () => {
    const result = computeCalculation({ mode: 'score', rows: example() });
    expect(formatCgpa(result.semester?.gpa)).toBe('4.15');
    expect(result.semester?.piSum).toBe(42.85);
    expect(formatCgpa(result.semester?.pi)).toBe('3.30');
    expect(result.average?.toFixed(1)).toBe('65.9');
  });

  it('MTH 301 scored 38: F, GPA 3.46, PI 40.15 ÷ 13 = 3.09, carry-over note', () => {
    const result = computeCalculation({ mode: 'score', rows: withScore(example(), 'MTH 301', '38') });
    expect(formatCgpa(result.semester?.gpa)).toBe('3.46');
    expect(result.semester?.piSum).toBe(40.15);
    expect(formatCgpa(result.semester?.pi)).toBe('3.09');
    expect(slipNotes(result).map((note) => note.kind)).toContain('carry');
  });

  it('reads the band edges with lower bounds and no gaps', () => {
    expect(gradeFromScore(69.5)).toEqual({ grade: 'B', gradePoint: 4 });
    expect(gradeFromScore(39.9)).toEqual({ grade: 'F', gradePoint: 0 });
    expect(gradeFromScore(44.5)).toEqual({ grade: 'E', gradePoint: 1 });
    expect(parseDecimal('69,5')).toBe(69.5);
  });

  it('notes a duplicate code once and still counts both rows', () => {
    const rows: CalcRow[] = [
      { id: 'a', code: 'CSC 301', units: 3, grade: 'A', scoreText: '' },
      { id: 'b', code: 'csc301', units: 3, grade: 'B', scoreText: '' },
    ];
    const result = computeCalculation({ mode: 'grade', rows });
    expect(result.semester?.courses).toBe(2);
    expect(slipNotes(result)).toEqual([{ kind: 'duplicate', text: 'CSC 301 is on this slip twice. Remove one if it was a mistake.' }]);
  });

  it('counts only valid scores and says how many were left out', () => {
    const rows = withScore(withScore(example(), 'CSC 303', '105'), 'MTH 301', '7o');
    const result = computeCalculation({ mode: 'score', rows });
    expect(result.counted).toHaveLength(3);
    expect(slipNotes(result).find((note) => note.kind === 'left-out')?.text).toBe(
      'Counted: 3 of 5 courses. Enter a score from 0 to 100 for the rest.'
    );
  });

  it('prints a real 0.00 when every row is F, Below a Pass, three carry-overs', () => {
    const rows = defaultRows().map((row) => ({ ...row, grade: 'F' as const }));
    const result = computeCalculation({ mode: 'grade', rows });
    expect(formatCgpa(result.semester?.gpa)).toBe('0.00');
    expect(result.classBand?.label).toBe('Below a Pass');
    expect(result.carryOvers).toHaveLength(3);
  });

  it('shows nothing counted on an empty slip', () => {
    const result = computeCalculation({ mode: 'grade', rows: [] });
    expect(result.headline).toBeNull();
    expect(summaryLine(result)).toBe('No courses counted yet');
  });

  it('validates the prior record', () => {
    expect(priorCgpaError('5.4')).toBe('Enter a CGPA from 0.00 to 5.00.');
    expect(priorCgpaError('4,47')).toBeNull();
    expect(priorUnitsError('0')).toBe('Enter whole units of 1 or more.');
    expect(priorUnitsError('12.5')).toBe('Enter whole units of 1 or more.');
    expect(computeCalculation({ mode: 'grade', rows: example(), priorCgpa: '5.4', priorUnits: '74' }).cumulative).toBeNull();
  });
});

describe('calculator behaviour helpers', () => {
  it('derives letters from scores and never invents scores', () => {
    const scored = withScore(defaultRows(), '', '');
    const toScores = switchMode(scored, 'score');
    expect(toScores.map((row) => row.scoreText)).toEqual(['', '', '']);
    expect(computeCalculation({ mode: 'score', rows: toScores }).headline).toBeNull();
    const back = switchMode([{ id: 'x', code: '', units: 3, grade: 'C', scoreText: '76' }], 'grade');
    expect(back[0].grade).toBe('A');
  });

  it('gives the next questions live hints and prefill', () => {
    const rows = example();
    const result = computeCalculation({ mode: 'grade', rows, priorCgpa: '4.47', priorUnits: '74' });
    const questions = nextQuestions(result, rows);
    expect(questions.map((q) => [q.hint, q.href])).toEqual([
      ['4.42 is Second Class Upper', '/tools/degree-class-checker?cgpa=4.42'],
      ['What you need for First Class', '/tools/required-gpa?current=4.42&done=87'],
      ['If you retake a failed course', '/tools/carry-over-impact?current=4.42&done=87'],
      ['Needs scores out of 100', '/tools/weighted-average'],
    ]);
    const scores = computeCalculation({ mode: 'score', rows });
    const weighted = nextQuestions(scores, rows)[3];
    expect(weighted.hint).toBe('65.9 from these scores');
    expect(weighted.href).toBe(`/tools/weighted-average?c=${encodeURIComponent(EXAMPLE_SCORE_C)}`);
    const empty = nextQuestions(computeCalculation({ mode: 'grade', rows: [] }), []);
    expect(empty.map((q) => q.hint)).toEqual([
      'Which class is my CGPA?',
      'What do I need for my target?',
      'What will a retake do?',
      'My average score out of 100',
    ]);
  });

  it('hands off the active value of each row', () => {
    expect(handoffCourses(defaultRows(), 'grade')).toEqual([
      { code: '', units: 3, grade: 'A', score: undefined },
      { code: '', units: 3, grade: 'B', score: undefined },
      { code: '', units: 2, grade: 'C', score: undefined },
    ]);
    expect(handoffCourses(example(), 'score')[0]).toMatchObject({ code: 'CSC 301', units: 3, score: 76, grade: undefined });
  });
});

describe('calculator on another grading scale', () => {
  it('adds an optional scale to the link only for scales other than 5-point', async () => {
    const { toolScaleById } = await import('@/lib/public/scales');
    const rows = [{ c: 'COM 111', u: 3, g: 'AB' }];
    expect(encodeCalculation({ mode: 'grade', rows, scale: 'nbte4' })).toMatch(/&sc=nbte4$/);
    expect(encodeCalculation({ mode: 'grade', rows: toEncodedRows(defaultRows(), 'grade') })).toBe(DEFAULT_LINK);
    const decoded = decodeCalculation(`?${encodeCalculation({ mode: 'grade', rows, scale: 'nbte4' })}`);
    expect(decoded.scale).toBe('nbte4');
    expect(decoded.rows?.[0]).toMatchObject({ grade: 'AB', reset: false });
    // Old links have no scale: 5-point letters only, AB is reset.
    const old = decodeCalculation(`?m=grade&c=${encodeURIComponent(encodeRows(rows))}`);
    expect(old.scale).toBeNull();
    expect(old.rows?.[0]).toMatchObject({ grade: null, reset: true });
    void toolScaleById;
  });

  it('works out GPA, class and carry-overs with the scale', async () => {
    const { toolScaleById } = await import('@/lib/public/scales');
    const scale = toolScaleById('nbte4');
    const rows: CalcRow[] = [
      { id: 'a', code: 'COM 111', units: 3, grade: 'AB', scoreText: '72' },
      { id: 'b', code: 'COM 112', units: 3, grade: 'F', scoreText: '30' },
    ];
    const byGrade = computeCalculation({ mode: 'grade', rows, priorCgpa: '3.5', priorUnits: '30', scale });
    expect(byGrade.semester?.gpa).toBe(1.75);
    expect(byGrade.carryOvers.map((item) => item.label)).toEqual(['COM 112']);
    expect(byGrade.classBand?.label).toBe('Upper Credit'); // (3.5*30 + 10.5) / 36 = 3.21
    expect(byGrade.next?.band.label).toBe('Distinction');
    const byScore = computeCalculation({ mode: 'score', rows, scale });
    expect(byScore.semester?.gpa).toBe(1.75);
    expect(priorCgpaError('4.5', scale)).toBe('Enter a CGPA from 0.00 to 4.00.');
    expect(switchMode([{ id: 'x', code: '', units: 3, grade: null, scoreText: '66' }], 'grade', scale)[0].grade).toBe('B');
  });
});
