import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABOUT_FACTS, COMMITMENTS, aboutWorkingSheet, coverLists, posterLines } from '@/lib/public/about';
import { DELETED_ITEMS, DELETION_UI_LABELS, KEPT_ITEMS } from '@/lib/public/account-deletion';
import { SUPPORT_RETENTION_DAYS, answerText, includeRows, quickFixGroups } from '@/lib/public/support';
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from '@/lib/support/tickets';
import { LIVE_SCALES } from '@/lib/public/scales';

const root = path.resolve(import.meta.dirname, '../../..');
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('About content', () => {
  it('pins the working sheet to the engine', () => {
    const sheet = aboutWorkingSheet();
    const value = (group: number, name: string | RegExp) =>
      sheet.groups[group].items.find((item) => (typeof name === 'string' ? item.name === name : name.test(item.name)));
    expect(value(0, 'Total')?.value).toBe('76');
    expect(value(0, 'Grade')?.value).toBe('A = 5 points');
    expect(value(0, 'Units × points')?.value).toBe('3 × 5 = 15');
    expect(value(1, /Units × points/)?.value).toBe('54');
    expect(value(1, /Units × points/)?.description).toBe('15 + 12 + 9 + 10 + 8');
    expect(value(1, 'Units taken')?.value).toBe('13');
    expect(value(1, 'Semester GPA')?.value).toBe('4.15');
    expect(value(1, 'Performance Index')?.value).toBe('3.30');
    expect(value(1, 'Performance Index')?.description).toContain('42.85 ÷ 13');
    expect(value(2, 'Before this semester')?.value).toBe('331 points, 74 units');
    expect(value(2, 'CGPA')).toMatchObject({ value: '4.43', highlight: true, description: '(331 + 54) ÷ (74 + 13) = 385 ÷ 87' });
    expect(value(2, 'Class')?.value).toBe('Second Class Upper');
    expect(value(2, /To First Class/)?.value).toBe('0.07 to go');
  });

  it('builds the grading list from the live scales and keeps eleven commitments', () => {
    const grading = coverLists(LIVE_SCALES)[0].items.map((item) => `${item.name} · ${item.value}`);
    expect(grading).toContain('5-point scale · A = 5 to F = 0');
    expect(grading).toContain('Degree classes · First Class to Pass');
    expect(COMMITMENTS.flatMap((group) => group.rows)).toHaveLength(11);
    expect(ABOUT_FACTS).toHaveLength(4);
    expect(posterLines({ coinsEnabled: false }).map((line) => line.fact).join(' ')).not.toMatch(/coin/i);
  });
});

describe('Support content', () => {
  it('answers fourteen problems and hides coins while they are off', () => {
    const off = quickFixGroups({ coinsEnabled: false }).flatMap((group) => group.items);
    expect(off).toHaveLength(14);
    expect(off.map((item) => answerText(item.answer)).join(' ')).not.toMatch(/coin/i);
    const on = quickFixGroups({ coinsEnabled: true }).flatMap((group) => group.items);
    expect(on.map((item) => answerText(item.answer)).join(' ')).toMatch(/coins/);
  });

  it('keys the include table to the real categories and the retention period', () => {
    const rows = includeRows({ coinsEnabled: false });
    expect(rows.map((row) => row.category)).toEqual([...SUPPORT_CATEGORIES]);
    expect(rows.map((row) => row.label)).toEqual(SUPPORT_CATEGORIES.map((category) => SUPPORT_CATEGORY_LABELS[category]));
    expect(SUPPORT_RETENTION_DAYS).toBe(180);
  });
});

describe('Account deletion content', () => {
  it('lists every collection the deletion code removes', () => {
    const code = source('lib/user/account-deletion.ts');
    const fn = code.slice(code.indexOf('export async function deleteUserData'), code.indexOf('Follow-up queue'));
    const deleted = new Set([...fn.matchAll(/delete(?:Query|Doc|Refs)\('([^']+)'/g)].map((match) => match[1]));
    const covered = new Set(DELETED_ITEMS.flatMap((item) => item.covers));
    expect(deleted.size).toBeGreaterThan(10);
    for (const collection of deleted) expect(covered, `"${collection}" is deleted but not listed on the page`).toContain(collection);
  });

  it('quotes the UI labels the apps show and keeps every retention period', () => {
    const settings = source('app/(student)/settings/page.tsx');
    for (const label of DELETION_UI_LABELS) expect(settings).toContain(label);
    expect(KEPT_ITEMS.map((item) => item.period)).toEqual(expect.arrayContaining(['up to 30 days', 'up to 55 days']));
  });
});
