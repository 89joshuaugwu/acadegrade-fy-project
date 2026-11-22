import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  creditLoadWarnings,
  DEGREE_CLASS_BANDS,
  failGrade,
  formatCgpa,
  GRADE_BANDS,
  gradeFromScore,
  gradePointFor,
  isCarryOver,
  isGradingScale,
  maxReachableCgpa,
  MAX_GRADE_POINT,
  outstandingCarryOvers,
  READY_SCALE_IDS,
  requiredAverageForTarget,
  resolveDegreeClass,
  resolveGradingScale,
  roundCgpa,
  scaleBandRanges,
  scaleById,
  scaleClassRanges,
  SCALES,
  validateCustomScale,
  validateNceClasses,
  weightedAverageScore,
  type GradingScale,
  type ReadyGradingScaleId,
} from '@/lib/cgpa/academicRules';

/**
 * The same fixture runs in acadegrade-mobile/tests/academic-rules.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = '7853527d7a1c4776711b49d26224e2f63ebf6cb3f25d4b1c372d101e9c212d3a';

const raw = readFileSync(path.join(process.cwd(), 'tests/fixtures/academic-rules.json'), 'utf8');
type Json = unknown;
type Case = Record<string, Json> & { name?: string };
const fixture = JSON.parse(raw) as Record<string, Case[]>;

/** Fixture encodes JS-only values as strings. */
const decode = (value: Json): Json => (value === 'NaN' ? Number.NaN : value === 'undefined' ? undefined : value);
const n = (value: Json) => decode(value) as number;

function expectNumbersClose(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  for (const [key, want] of Object.entries(expected)) {
    if (typeof want === 'number') expect(actual[key], key).toBeCloseTo(want, 9);
    else expect(actual[key], key).toEqual(want);
  }
}

describe('academic-rules fixture', () => {
  it('is the byte-identical copy shared with Android', () => {
    const hash = createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex');
    expect(hash).toBe(FIXTURE_SHA256);
  });
});

describe('gradeFromScore', () => {
  it.each(fixture.gradeFromScore)('$score -> $grade', (c) => {
    expect(gradeFromScore(n(c.score))).toEqual({ grade: c.grade, gradePoint: c.gradePoint });
  });
});

describe('computeCourseMetrics', () => {
  it.each(fixture.courseMetrics)('$name', (c) => {
    const result = computeCourseMetrics(c.input as Parameters<typeof computeCourseMetrics>[0]) as unknown as Record<string, unknown>;
    expectNumbersClose(result, c.expected as Record<string, unknown>);
    for (const key of (c.absentKeys as string[] | undefined) ?? []) expect(result, key).not.toHaveProperty(key);
  });
});

describe('computeSemesterGPA', () => {
  it.each(fixture.semesterGpa)('$name', (c) => {
    const courses = (c.courses as Parameters<typeof computeCourseMetrics>[0][]).map(computeCourseMetrics);
    expectNumbersClose(computeSemesterGPA(courses) as unknown as Record<string, unknown>, c.expected as Record<string, unknown>);
  });
});

describe('computeCumulativeCGPA', () => {
  it.each(fixture.cumulativeCgpa)('$name', (c) => {
    const result = computeCumulativeCGPA(c.semesters as Parameters<typeof computeCumulativeCGPA>[0]);
    expectNumbersClose(result as unknown as Record<string, unknown>, c.expected as Record<string, unknown>);
  });
});

describe('roundCgpa', () => {
  it.each(fixture.roundCgpa)('$input -> $expected', (c) => {
    expect(roundCgpa(n(c.input))).toBe(c.expected);
  });
});

describe('formatCgpa', () => {
  it.each(fixture.formatCgpa)('$input -> $expected', (c) => {
    expect(formatCgpa(n(c.input))).toBe(c.expected);
  });
});

describe('resolveDegreeClass', () => {
  it.each(fixture.resolveDegreeClass)('$cgpa -> $shortLabel', (c) => {
    const band = resolveDegreeClass(n(c.cgpa));
    expect(band.shortLabel).toBe(c.shortLabel);
    if (c.label !== undefined) expect(band.label).toBe(c.label);
    if (c.transcriptLabel !== undefined) expect(band.transcriptLabel).toBe(c.transcriptLabel);
  });
});

describe('requiredAverageForTarget', () => {
  it.each(fixture.requiredAverageForTarget)('$input -> $expected', (c) => {
    const result = requiredAverageForTarget(c.input as Parameters<typeof requiredAverageForTarget>[0]);
    if (c.expected === null) expect(result).toBeNull();
    else expect(result).toBeCloseTo(c.expected as number, 9);
  });
});

describe('maxReachableCgpa', () => {
  it.each(fixture.maxReachableCgpa)('$input -> $expected', (c) => {
    expect(maxReachableCgpa(c.input as Parameters<typeof maxReachableCgpa>[0])).toBeCloseTo(c.expected as number, 9);
  });
});

describe('isCarryOver', () => {
  it.each(fixture.isCarryOver)('$name', (c) => {
    expect(isCarryOver(c.course as Parameters<typeof isCarryOver>[0])).toBe(c.expected);
  });
});

describe('outstandingCarryOvers', () => {
  it.each(fixture.outstandingCarryOvers)('$name', (c) => {
    expect(outstandingCarryOvers(c.semesters as Parameters<typeof outstandingCarryOvers>[0])).toEqual(c.expected);
  });
});

describe('weightedAverageScore', () => {
  it.each(fixture.weightedAverageScore)('$name', (c) => {
    const result = weightedAverageScore(c.courses as Parameters<typeof weightedAverageScore>[0]);
    expect(result.average === null ? null : result.average).toEqual(
      (c.expected as { average: number | null }).average === null ? null : expect.closeTo((c.expected as { average: number }).average, 9),
    );
    expect({ ...result, average: undefined }).toEqual({ ...(c.expected as object), average: undefined });
  });

  it('equals the continuous PI average x 20 when nothing is excluded', () => {
    const rows = fixture.weightedAverageScore[0].courses as { units: number; caScore: number; examScore: number }[];
    const metrics = rows.map((row, index) => computeCourseMetrics({ code: `X${index}`, title: 'x', ...row }));
    const { pi } = computeSemesterGPA(metrics);
    expect(weightedAverageScore(rows).average).toBeCloseTo(pi * 20, 9);
  });
});

describe('creditLoadWarnings', () => {
  it.each(fixture.creditLoadWarnings)('$name', (c) => {
    expect(creditLoadWarnings(c.courses as Parameters<typeof creditLoadWarnings>[0], c.range as Parameters<typeof creditLoadWarnings>[1])).toEqual(c.expected);
  });
});

describe('end to end', () => {
  it.each(fixture.endToEnd)('$name', (c) => {
    const expected = c.expected as { cgpa: number; display: string; shortLabel: string };
    const summaries = (c.summaries as Parameters<typeof computeCumulativeCGPA>[0] | undefined)
      ?? (c.courseSemesters as { courses: Parameters<typeof computeCourseMetrics>[0][] }[])
        .map((semester) => computeSemesterGPA(semester.courses.map(computeCourseMetrics)));
    const { cgpa } = computeCumulativeCGPA(summaries);
    expect(cgpa).toBeCloseTo(expected.cgpa, 9);
    expect(formatCgpa(cgpa)).toBe(expected.display);
    expect(resolveDegreeClass(cgpa).shortLabel).toBe(expected.shortLabel);
  });
});

// ---------------------------------------------------------------------------
// Grading scales
// ---------------------------------------------------------------------------

type CourseInput = Parameters<typeof computeCourseMetrics>[0];
const scaleOf = (id: Json): GradingScale => SCALES[id as ReadyGradingScaleId];
const classMins = (scale: GradingScale) => scale.classes.map((cls) => cls.minCgpa);

describe('ready-made scales', () => {
  it('lists every ready-made scale in picker order', () => {
    expect(READY_SCALE_IDS).toEqual(['ng5', 'ng5-noE', 'nbte4', 'nce5']);
    expect(Object.keys(SCALES).sort()).toEqual([...READY_SCALE_IDS].sort());
  });

  it.each(Object.entries(fixture.scaleDefinitions as unknown as Record<string, Record<string, Json>>))('%s matches the plan table', (id, want) => {
    const scale = scaleOf(id);
    expect(scale.id).toBe(id);
    expect(scale.name).toBe(want.name);
    expect(scale.maxPoint).toBe(want.maxPoint);
    expect(scale.bands.map((b) => [b.grade, b.minScore, b.gradePoint])).toEqual(want.bands);
    expect(scale.classes.map((c) => [c.name, c.shortLabel, c.minCgpa])).toEqual(want.classes);
    expect(failGrade(scale)).toBe('F');
    expect(isGradingScale(scale)).toBe(true);
  });

  it('ng5 is exactly the legacy constants', () => {
    const ng5 = SCALES.ng5;
    expect(ng5.maxPoint).toBe(MAX_GRADE_POINT);
    expect(scaleBandRanges(ng5)).toEqual(GRADE_BANDS.map((b) => ({ grade: b.grade, minScore: b.minScore, maxScore: b.maxScore, gradePoint: b.gradePoint })));
    expect(scaleClassRanges(ng5).map((c) => [c.name, c.shortLabel, c.transcriptLabel, c.minCgpa, c.maxCgpa]))
      .toEqual(DEGREE_CLASS_BANDS.map((b) => [b.label, b.shortLabel, b.transcriptLabel, b.minCGPA, b.maxCGPA]));
  });

  it('ng5 passed explicitly gives the same results as the default for every legacy case', () => {
    for (const c of fixture.gradeFromScore) expect(gradeFromScore(n(c.score), SCALES.ng5)).toEqual(gradeFromScore(n(c.score)));
    for (const c of fixture.courseMetrics) {
      expect(computeCourseMetrics(c.input as CourseInput, SCALES.ng5)).toEqual(computeCourseMetrics(c.input as CourseInput));
    }
    for (const c of fixture.semesterGpa) {
      const rows = (c.courses as CourseInput[]).map((row) => computeCourseMetrics(row, SCALES.ng5));
      expect(computeSemesterGPA(rows, SCALES.ng5)).toEqual(computeSemesterGPA((c.courses as CourseInput[]).map(computeCourseMetrics)));
    }
    for (const c of fixture.resolveDegreeClass) expect(resolveDegreeClass(n(c.cgpa), SCALES.ng5).shortLabel).toBe(c.shortLabel);
    for (const c of fixture.isCarryOver) {
      expect(isCarryOver(c.course as Parameters<typeof isCarryOver>[0], SCALES.ng5)).toBe(c.expected);
    }
    for (const c of fixture.outstandingCarryOvers) {
      expect(outstandingCarryOvers(c.semesters as Parameters<typeof outstandingCarryOvers>[0], SCALES.ng5)).toEqual(c.expected);
    }
    for (const c of fixture.maxReachableCgpa) {
      const input = c.input as Parameters<typeof maxReachableCgpa>[0];
      expect(maxReachableCgpa(input, SCALES.ng5)).toBe(maxReachableCgpa(input));
    }
  });

  it('ignores a non-scale second argument such as a .map index', () => {
    expect(gradeFromScore(44, 3 as never)).toEqual({ grade: 'E', gradePoint: 1 });
    expect(resolveDegreeClass(4.5, 0 as never)).toBe(DEGREE_CLASS_BANDS[0]);
    expect([{ code: 'X', caScore: 10, examScore: 20 }].some(isCarryOver)).toBe(true);
  });
});

describe('scaleById', () => {
  it.each(fixture.scaleById)('$id -> $expected', (c) => {
    const scale = scaleById(c.id as string | null);
    expect(scale ? scale.id : null).toBe(c.expected);
  });
});

describe('gradeFromScore with a scale', () => {
  it.each(fixture.scaledGradeFromScore)('$scale $score -> $grade', (c) => {
    expect(gradeFromScore(n(c.score), scaleOf(c.scale))).toEqual({ grade: c.grade, gradePoint: c.gradePoint });
  });
});

describe('gradePointFor', () => {
  it('finds letters on the scale, ignoring case and spaces', () => {
    expect(gradePointFor('ab', SCALES.nbte4)).toBe(3.5);
    expect(gradePointFor(' F ', SCALES.nbte4)).toBe(0);
    expect(gradePointFor('E', SCALES['ng5-noE'])).toBeNull();
    expect(gradePointFor('', SCALES.ng5)).toBeNull();
    expect(gradePointFor(null, SCALES.ng5)).toBeNull();
  });
});

describe('computeCourseMetrics with a scale', () => {
  it.each(fixture.scaledCourseMetrics)('$name', (c) => {
    const result = computeCourseMetrics(c.input as CourseInput, scaleOf(c.scale)) as unknown as Record<string, unknown>;
    expectNumbersClose(result, c.expected as Record<string, unknown>);
    for (const key of (c.absentKeys as string[] | undefined) ?? []) expect(result, key).not.toHaveProperty(key);
  });
});

describe('computeSemesterGPA with a scale', () => {
  it.each(fixture.scaledSemesterGpa)('$name', (c) => {
    const scale = scaleOf(c.scale);
    const rows = (c.courses as CourseInput[]).map((row) => computeCourseMetrics(row, scale));
    expectNumbersClose(computeSemesterGPA(rows, scale) as unknown as Record<string, unknown>, c.expected as Record<string, unknown>);
  });

  it('weighted average equals PI x 100 / max point on any scale', () => {
    const rows = fixture.weightedAverageScore[0].courses as { units: number; caScore: number; examScore: number }[];
    for (const scale of Object.values(SCALES)) {
      const metrics = rows.map((row, index) => computeCourseMetrics({ code: `X${index}`, title: 'x', ...row }, scale));
      expect(weightedAverageScore(rows).average).toBeCloseTo((computeSemesterGPA(metrics, scale).pi * 100) / scale.maxPoint, 9);
    }
  });
});

describe('CGPA and class with a scale (end to end)', () => {
  it.each(fixture.scaledEndToEnd)('$name', (c) => {
    const scale = scaleOf(c.scale);
    const expected = c.expected as { cgpa: number; display: string; className: string; shortLabel: string };
    const summaries = (c.summaries as Parameters<typeof computeCumulativeCGPA>[0] | undefined)
      ?? (c.courseSemesters as { courses: CourseInput[] }[])
        .map((semester) => computeSemesterGPA(semester.courses.map((row) => computeCourseMetrics(row, scale)), scale));
    const { cgpa } = computeCumulativeCGPA(summaries);
    expect(cgpa).toBeCloseTo(expected.cgpa, 9);
    expect(formatCgpa(cgpa)).toBe(expected.display);
    const cls = resolveDegreeClass(cgpa, scale);
    expect(cls.name).toBe(expected.className);
    expect(cls.shortLabel).toBe(expected.shortLabel);
  });
});

describe('resolveDegreeClass with a scale', () => {
  it.each(fixture.scaledDegreeClass)('$scale $cgpa -> $name', (c) => {
    const scale = scaleOf(c.scale);
    const cls = resolveDegreeClass(n(c.cgpa), scale);
    expect(cls.name).toBe(c.name);
    expect(cls.shortLabel).toBe(c.shortLabel);
    expect(scale.classes.indexOf(cls)).toBeGreaterThanOrEqual(0);
  });
});

describe('targets with a scale', () => {
  it.each(fixture.scaledTargets)('$scale $input', (c) => {
    const input = c.input as Parameters<typeof requiredAverageForTarget>[0];
    const required = requiredAverageForTarget(input);
    if (c.required === null) expect(required).toBeNull();
    else expect(required).toBeCloseTo(c.required as number, 9);
    expect(maxReachableCgpa(input, scaleOf(c.scale))).toBeCloseTo(c.maxReachable as number, 9);
  });
});

describe('carry-overs with a scale', () => {
  it.each(fixture.scaledCarryOver)('$name', (c) => {
    expect(isCarryOver(c.course as Parameters<typeof isCarryOver>[0], scaleOf(c.scale))).toBe(c.expected);
  });

  it.each(fixture.scaledOutstandingCarryOvers)('$name', (c) => {
    const semesters = c.semesters as Parameters<typeof outstandingCarryOvers>[0];
    expect(outstandingCarryOvers(semesters, scaleOf(c.scale))).toEqual(c.expected);
    expect(outstandingCarryOvers(semesters)).toEqual(c.defaultScaleExpected);
  });
});

describe('validateCustomScale', () => {
  it.each(fixture.customScaleValid)('accepts: $name', (c) => {
    const result = validateCustomScale(c.input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scale).toEqual(c.expected);
    for (const check of c.gradeChecks as { score: Json; grade: string; gradePoint: number }[]) {
      expect(gradeFromScore(n(check.score), result.scale)).toEqual({ grade: check.grade, gradePoint: check.gradePoint });
    }
    for (const check of c.classChecks as { cgpa: number; name: string }[]) {
      expect(resolveDegreeClass(check.cgpa, result.scale).name).toBe(check.name);
    }
    const reach = c.maxReachable as { input: Parameters<typeof maxReachableCgpa>[0]; expected: number } | undefined;
    if (reach) expect(maxReachableCgpa(reach.input, result.scale)).toBeCloseTo(reach.expected, 9);
  });

  it.each(fixture.customScaleInvalid)('rejects: $name', (c) => {
    const result = validateCustomScale(c.input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.field)).toEqual(c.fields);
    for (const error of result.errors) expect(error.message.length).toBeGreaterThan(0);
  });
});

describe('validateNceClasses', () => {
  it.each(fixture.nceClasses)('$name', (c) => {
    const result = validateNceClasses(c.input);
    expect(result.ok).toBe(c.ok);
    if (result.ok) {
      expect(result.scale.id).toBe('nce5');
      expect(classMins(result.scale)).toEqual(c.classMins);
    } else {
      expect(result.errors.map((error) => error.field)).toEqual(c.fields);
    }
  });

  it('does not change the shared NCE scale', () => {
    validateNceClasses({ distinction: 4 });
    expect(classMins(SCALES.nce5)).toEqual([4.5, 3.5, 2.4, 1, 0]);
  });
});

describe('resolveGradingScale', () => {
  it.each(fixture.resolveGradingScale)('$name', (c) => {
    const scale = resolveGradingScale(decode(c.setting));
    expect(scale.id).toBe(c.id);
    expect(scale.maxPoint).toBe(c.maxPoint);
    expect(classMins(scale)).toEqual(c.classMins);
  });
});

describe('scale ranges for display', () => {
  it.each(fixture.scaleBandRanges)('bands of $scale', (c) => {
    expect(scaleBandRanges(scaleOf(c.scale)).map((b) => [b.grade, b.minScore, b.maxScore, b.gradePoint])).toEqual(c.expected);
  });

  it.each(fixture.scaleClassRanges)('classes of $scale', (c) => {
    expect(scaleClassRanges(scaleOf(c.scale)).map((b) => [b.name, b.minCgpa, b.maxCgpa])).toEqual(c.expected);
  });
});
