import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildIcs,
  buildStudyPlan,
  expandOccurrences,
  expiryState,
  normaliseOffsets,
  reminderTimes,
  validityEnd,
} from '@/lib/timetable/engine';

/**
 * The same fixture runs in acadegrade-mobile/tests/timetable-engine.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = 'c3140d624ffc58d61e18096a9c7962662260bf8586a47367fa1116dfd47423cc';

const raw = readFileSync(path.join(process.cwd(), 'tests/fixtures/timetable-engine.json'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixture = JSON.parse(raw) as Record<string, any[]>;

const eq = (actual: unknown, expected: unknown) => expect(actual).toBe(expected);
const deep = (actual: unknown, expected: unknown) => expect(actual).toEqual(expected);
const ok = (value: unknown) => expect(Boolean(value)).toBe(true);

it('fixture matches the pinned hash', () => {
  eq(createHash('sha256').update(raw).digest('hex'), FIXTURE_SHA256);
});

const dateOf = (e: { recurrence: unknown }) => (e.recurrence as { date: string }).date;
const plan = (name: string) => fixture.buildStudyPlan.find((c: { name: string }) => c.name === name);
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const countBy = (events: { title: string }[]) => {
  const out: Record<string, number> = {};
  for (const e of events) out[e.title] = (out[e.title] || 0) + 1;
  return out;
};

describe('validityEnd', () => {
  for (const c of fixture.validityEnd) it(c.name, () => eq((validityEnd as (...a: unknown[]) => string)(...c.args), c.expected));
  it('hours end a few hours after midnight and months clamp to the month end', () => {
    eq(validityEnd('2026-11-16', 'hours', 5), '2026-11-16T05:00:00');
    eq(validityEnd('2027-01-31', 'months', 1), '2027-02-27T23:59:59');
  });
});

describe('expandOccurrences', () => {
  for (const c of fixture.expandOccurrences) it(c.name, () => deep(expandOccurrences(c.timetable, c.from, c.to), c.expected));
  it('never lists a weekly occurrence after the validity end', () => {
    const c = fixture.expandOccurrences[1];
    for (const o of expandOccurrences(c.timetable, c.from, c.to)) ok(o.start <= c.timetable.validity.endsAt);
  });
});

describe('reminderTimes', () => {
  for (const c of fixture.reminderTimes) it(c.name, () => deep(reminderTimes(c.occurrence, c.offsets, c.now), c.expected));
});

describe('normaliseOffsets', () => {
  for (const c of fixture.normaliseOffsets) it(c.name, () => deep(normaliseOffsets(c.input), c.expected));
});

describe('expiryState', () => {
  for (const c of fixture.expiryState) it(c.name, () => eq(expiryState(c.timetable, c.now), c.expected));
});

describe('buildIcs', () => {
  const c = fixture.buildIcs[0];
  const text = buildIcs(c.timetable, c.now);
  it('matches the fixture', () => eq(text, c.expected));
  it('uses CRLF only and ends with one', () => {
    ok(text.endsWith('\r\n'));
    eq(text.replace(/\r\n/g, '').includes('\n'), false);
  });
  it('folds every line to 75 octets', () => {
    for (const line of text.split('\r\n')) ok(new TextEncoder().encode(line).length <= 75);
  });
  it('escapes commas, semicolons and newlines', () => {
    ok(text.includes('X-WR-CALNAME:Year\\, 1\\; "Plan"'));
    ok(text.includes('\\n'));
  });
  it('writes one VALARM per offset and none for an empty override', () => {
    eq(text.split('BEGIN:VALARM').length - 1, 3);
    ok(text.includes('TRIGGER:-PT30M') && text.includes('TRIGGER:-PT10M'));
  });
});

describe('buildStudyPlan', () => {
  for (const c of fixture.buildStudyPlan) it(c.name + ' (fixture)', () => deep(buildStudyPlan(c.input), c.expected));

  it('is deterministic', () => {
    for (const c of fixture.buildStudyPlan) deep(buildStudyPlan(c.input), buildStudyPlan(JSON.parse(JSON.stringify(c.input))));
  });
  it('respects the per-day session counts', () => {
    const perDate: Record<string, number> = {};
    for (const e of buildStudyPlan(plan('per-day counts').input).events) perDate[dateOf(e)] = (perDate[dateOf(e)] || 0) + 1;
    deep(perDate, { '2026-11-16': 3, '2026-11-18': 1, '2026-11-19': 2 });
  });
  it('never overlaps blocked times', () => {
    const c = plan('blocked times respected');
    for (const e of buildStudyPlan(c.input).events) {
      const dow = new Date(dateOf(e) + 'T00:00:00Z').getUTCDay();
      for (const b of c.input.blocked) {
        if (!(b.date ? b.date === dateOf(e) : b.day === dow)) continue;
        ok(toMin(e.endTime) <= toMin(b.start) || toMin(e.startTime) >= toMin(b.end));
      }
    }
  });
  it('never repeats a subject back to back', () => {
    for (const c of fixture.buildStudyPlan) {
      const events = buildStudyPlan(c.input).events;
      for (let i = 1; i < events.length; i++) {
        if (dateOf(events[i]) !== dateOf(events[i - 1])) continue;
        ok(events[i].title !== events[i - 1].title);
      }
    }
  });
  it('makes the day before an exam lighter and never studies on or after the exam', () => {
    const events = buildStudyPlan(plan('lighter day before exam').input).events;
    const on = (d: string) => events.filter((e) => dateOf(e) === d).length;
    eq(on('2026-11-17'), 4);
    eq(on('2026-11-18'), 2);
    eq(events.some((e) => e.title === 'Study: Biology' && dateOf(e) >= '2026-11-19'), false);
  });
  it('raises the share of a subject whose exam is near', () => {
    const counts = countBy(buildStudyPlan(plan('urgency raises near-exam share').input).events);
    ok(counts['Study: Biology'] > counts['Study: Chemistry']);
    ok(counts['Study: Biology'] > counts['Study: Physics']);
  });
  it('gives a higher priority and difficulty more sessions', () => {
    const counts = countBy(buildStudyPlan(plan('priority and difficulty weigh in').input).events);
    ok(counts['Study: Biology'] > counts['Study: Chemistry']);
  });
  it('reports unscheduled subjects and warnings', () => {
    const a = buildStudyPlan(plan('unscheduled when exam is before the plan').input);
    deep(a.unscheduled, ['Biology']);
    ok(a.warnings.length > 0 && a.why.length > 0);
    const b = buildStudyPlan(plan('fully blocked week').input);
    deep(b.events, []);
    deep(b.unscheduled, ['Biology', 'Chemistry', 'Physics']);
  });
});
