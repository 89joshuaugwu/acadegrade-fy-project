import { describe, expect, it } from 'vitest';
import {
  ADMISSION_GRADE_SLOTS,
  RECORDS_URL_VERSION,
  decodeAdmissionLink,
  decodeOlevelLink,
  encodeAdmissionLink,
  encodeOlevelLink,
  registerHref,
  type AdmissionLink,
  type OlevelLink,
} from '@/components/public/tools/records-url';

const sample: OlevelLink = {
  sittings: [
    {
      exam: 'waec',
      year: 2025,
      subjects: [
        { subjectId: 'english', name: 'English Language', grade: 'B3' },
        { subjectId: 'mathematics', name: 'Mathematics', grade: 'C4' },
        { subjectId: 'custom:kente weaving', name: 'Kente Weaving', grade: 'A1' },
        { subjectId: 'biology', name: 'Biology', grade: null },
      ],
    },
    { exam: 'neco', year: 2024, subjects: [{ subjectId: 'physics', name: 'Physics', grade: 'C5' }] },
  ],
  required: ['physics', 'chemistry'],
};

describe('O-level link', () => {
  it('writes a compact, versioned query', () => {
    expect(encodeOlevelLink(sample)).toBe(
      'v=1&s1=waec.2025.english%3AB3%2Cmathematics%3AC4%2C%7EKente+Weaving%3AA1%2Cbiology%3A&s2=neco.2024.physics%3AC5&rq=physics%2Cchemistry',
    );
    expect(RECORDS_URL_VERSION).toBe(1);
  });

  it('round-trips sittings, custom subjects, missing grades and course subjects', () => {
    const decoded = decodeOlevelLink(`?${encodeOlevelLink(sample)}`);
    expect(decoded.unreadable).toBe(false);
    expect(decoded.partlyReset).toBe(false);
    expect(decoded.link).toEqual(sample);
  });

  it('leaves out empty rows, an empty second sitting and a blank year', () => {
    const query = encodeOlevelLink({
      sittings: [
        { exam: 'nabteb', year: null, subjects: [{ subjectId: '', name: '', grade: null }, { subjectId: 'english', name: 'English Language', grade: 'A1' }] },
        { exam: 'waec', year: null, subjects: [] },
      ],
      required: [],
    });
    expect(query).toBe('v=1&s1=nabteb..english%3AA1');
    expect(decodeOlevelLink(query).link?.sittings).toEqual([
      { exam: 'nabteb', year: null, subjects: [{ subjectId: 'english', name: 'English Language', grade: 'A1' }] },
    ]);
  });

  it('opens nothing without sittings, and refuses a newer link format', () => {
    expect(decodeOlevelLink('')).toEqual({ link: null, unreadable: false, partlyReset: false });
    expect(decodeOlevelLink('v=9&s1=waec.2025.english:A1')).toEqual({ link: null, unreadable: true, partlyReset: false });
  });

  it('reads a hand-written link without v, with aliases and lower-case grades', () => {
    const decoded = decodeOlevelLink('s1=waec.2025.english:b3,maths:C4,mathematics:A1');
    expect(decoded.link?.sittings[0].subjects).toEqual([
      { subjectId: 'english', name: 'English Language', grade: 'B3' },
      { subjectId: 'mathematics', name: 'Mathematics', grade: 'C4' },
    ]);
    expect(decoded.partlyReset).toBe(true);
  });

  it('resets bad values instead of failing: exam, year, grade, extra rows, unknown course subjects', () => {
    const rows = Array.from({ length: 11 }, (_, index) => `~Subject ${index}:A1`).join(',');
    const decoded = decodeOlevelLink(`s1=jamb.1950.english:Z9&s2=neco.2024.${encodeURIComponent(rows)}&rq=english,unknown,biology`);
    expect(decoded.partlyReset).toBe(true);
    expect(decoded.link?.sittings[0]).toEqual({ exam: 'waec', year: null, subjects: [{ subjectId: 'english', name: 'English Language', grade: null }] });
    expect(decoded.link?.sittings[1].subjects).toHaveLength(9);
    expect(decoded.link?.required).toEqual(['biology']);
  });

  it('strips separators from custom names so the link still splits', () => {
    const query = encodeOlevelLink({
      sittings: [{ exam: 'waec', year: 2025, subjects: [{ subjectId: 'custom:x', name: 'Arts, Crafts: ~Design', grade: 'B2' }] }],
      required: [],
    });
    expect(decodeOlevelLink(query).link?.sittings[0].subjects).toEqual([{ subjectId: 'custom:arts crafts design', name: 'Arts Crafts Design', grade: 'B2' }]);
  });
});

const admission: AdmissionLink = {
  formula: 'utme-olevel-post',
  utme: '268',
  postScore: '62',
  postMax: '100',
  pointTable: 'four-to-two',
  grades: ['A1', 'B2', null, 'C4', 'C5'],
  target: '70',
  weights: null,
};

describe('admission link', () => {
  it('writes only what differs from the defaults', () => {
    expect(encodeAdmissionLink(admission)).toBe('v=1&f=utme-olevel-post&u=268&p=62&g=A1.B2..C4.C5&t=70');
    expect(
      encodeAdmissionLink({ ...admission, formula: 'custom', postMax: '60', pointTable: 'six-to-one', grades: [null, null, null, null, null], target: '', weights: { utme: '40', olevel: '20', postUtme: '40' } }),
    ).toBe('v=1&f=custom&u=268&p=62&pm=60&pt=six-to-one&w=40.20.40');
  });

  it('round-trips', () => {
    expect(decodeAdmissionLink(encodeAdmissionLink(admission))).toEqual({ link: admission, unreadable: false, partlyReset: false });
    const custom: AdmissionLink = { ...admission, formula: 'custom', weights: { utme: '50', olevel: '10', postUtme: '40' } };
    expect(decodeAdmissionLink(encodeAdmissionLink(custom)).link).toEqual(custom);
  });

  it('opens nothing for an empty query and refuses a newer format', () => {
    expect(decodeAdmissionLink('?')).toEqual({ link: null, unreadable: false, partlyReset: false });
    expect(decodeAdmissionLink('v=2&u=200')).toEqual({ link: null, unreadable: true, partlyReset: false });
  });

  it('falls back to defaults for unknown values and keeps typed numbers as text', () => {
    const decoded = decodeAdmissionLink('f=other&u=4000&p=62.5&pm=abc&pt=nine&g=A1.Q7.c6&t=70<script>');
    expect(decoded.partlyReset).toBe(true);
    expect(decoded.link).toEqual({
      formula: 'utme-post',
      utme: '4000',
      postScore: '62.5',
      postMax: '100',
      pointTable: 'four-to-two',
      grades: ['A1', null, 'C6', null, null],
      target: '70',
      weights: null,
    });
    expect(ADMISSION_GRADE_SLOTS).toBe(5);
  });
});

describe('sign-up links', () => {
  it('names the record type the visitor was checking', () => {
    expect(registerHref('olevel')).toBe('/register?type=olevel');
    expect(registerHref('admission')).toBe('/register?type=admission');
  });
});
