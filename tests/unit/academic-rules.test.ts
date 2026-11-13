import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  formatCgpa,
  gradeFromScore,
  isCarryOver,
  maxReachableCgpa,
  outstandingCarryOvers,
  requiredAverageForTarget,
  resolveDegreeClass,
  roundCgpa,
} from '@/lib/cgpa/academicRules';

/**
 * The same fixture runs in acadegrade-mobile/tests/academic-rules.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = '8807c9d110974d5c88144af201665ada86e437ab9d24b5ce77521780e1d20405';

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
