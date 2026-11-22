import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AGGREGATE_FORMULAS,
  ESTIMATE_NOTE,
  OLEVEL_POINT_TABLES,
  UTME_MAX,
  computeAggregate,
  formulaById,
  pointsForGrade,
  postUtmeNeeded,
  validatePointTable,
  validatePostUtme,
  validateUtme,
  validateWeights,
  type AggregateInput,
} from '@/lib/records/admissionRules';

/**
 * The same fixture runs in acadegrade-mobile/tests/admission-rules.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = 'b42ec172b7d73e23e0241e0a78e0f977d8b2695fd85b1921ab7545437fe239da';

const raw = readFileSync(path.join(process.cwd(), 'tests/fixtures/admission-rules.json'), 'utf8');
type Case = Record<string, unknown> & { name?: string };
const fixture = JSON.parse(raw) as Record<string, Case[]>;
const decode = (value: unknown): unknown => (value === 'NaN' ? Number.NaN : value === 'undefined' ? undefined : value);
const lf = (text: string) => text.replace(/\r\n/g, '\n');

describe('admission-rules fixture', () => {
  it('is the byte-identical copy shared with Android', () => {
    expect(createHash('sha256').update(lf(raw)).digest('hex')).toBe(FIXTURE_SHA256);
  });

  it.each(['lib/records/admissionRules.ts', 'tests/fixtures/admission-rules.json'])('%s matches the Android copy when that repo is next to this one', (file) => {
    const sibling = path.join(process.cwd(), '..', 'acadegrade-mobile', file);
    if (!existsSync(sibling)) return;
    expect(lf(readFileSync(sibling, 'utf8'))).toBe(lf(readFileSync(path.join(process.cwd(), file), 'utf8')));
  });
});

describe('constants', () => {
  it('pins UTME, the formulas, the point tables and the estimate note', () => {
    expect(UTME_MAX).toBe(400);
    expect(AGGREGATE_FORMULAS.map((f) => [f.id, f.weights])).toEqual([
      ['utme-post', { utme: 50, olevel: 0, postUtme: 50 }],
      ['utme-olevel-post', { utme: 50, olevel: 20, postUtme: 30 }],
      ['custom', null],
    ]);
    expect(formulaById('utme-post')?.id).toBe('utme-post');
    expect(formulaById('nope')).toBeNull();
    expect(OLEVEL_POINT_TABLES.map((t) => t.id)).toEqual(['four-to-two', 'six-to-one', 'ten-to-five']);
    expect(OLEVEL_POINT_TABLES[0].points).toEqual({ A1: 4, B2: 3.6, B3: 3.2, C4: 2.8, C5: 2.4, C6: 2 });
    expect(ESTIMATE_NOTE).toBe("Estimate only. Check your school's formula.");
  });

  it('gives no points below a credit', () => {
    const table = OLEVEL_POINT_TABLES[1].points;
    expect(pointsForGrade('A1', table)).toBe(6);
    expect(pointsForGrade('D7', table)).toBe(0);
    expect(pointsForGrade('AR', table)).toBe(0);
    expect(pointsForGrade('junk', table)).toBe(0);
  });
});

describe('validation', () => {
  it.each(fixture.validateUtme)('UTME $score', (c) => {
    expect(validateUtme(decode(c.score))).toEqual(c.ok ? { ok: true } : { ok: false, code: c.code });
  });

  it.each(fixture.validatePostUtme)('post-UTME $score of $max', (c) => {
    expect(validatePostUtme(decode(c.score), decode(c.max))).toEqual(c.ok ? { ok: true } : { ok: false, code: c.code });
  });

  it.each(fixture.validateWeights)('weights %#', (c) => {
    expect(validateWeights(c.weights)).toEqual(c.ok ? { ok: true } : { ok: false, code: c.code });
  });

  it.each(fixture.validatePointTable)('point table %#', (c) => {
    expect(validatePointTable(c.points)).toEqual(c.ok ? { ok: true } : { ok: false, code: c.code });
  });
});

describe('computeAggregate', () => {
  it.each(fixture.aggregate)('$name', (c) => {
    expect(computeAggregate(c.input as AggregateInput)).toEqual(c.expected);
  });

  it('never throws on junk', () => {
    for (const junk of [undefined, null, 1, 'x', {}, { formula: 'utme-post', utme: 'x' }]) {
      expect(() => computeAggregate(junk as unknown as AggregateInput)).not.toThrow();
    }
  });
});

describe('postUtmeNeeded', () => {
  it.each(fixture.postUtmeNeeded)('$name', (c) => {
    expect(postUtmeNeeded(c.input as AggregateInput, c.target as number)).toEqual(c.expected);
  });
});
