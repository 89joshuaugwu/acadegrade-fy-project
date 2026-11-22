/**
 * Shareable addresses for the two record tools (GRADING_AND_PROFILES_PLAN.md
 * Phase 2, public tools): the WAEC credit checker and the admission aggregate.
 * Like calculator-url.ts the values go through URLSearchParams, so every
 * separator is percent-encoded and survives any messenger. Nothing here is
 * saved anywhere; the link is the only copy.
 *
 * Format version 1 (`v=1`; a link without `v` is read as version 1, a link
 * with a higher `v` is refused so an old page never misreads a newer link):
 *
 *   WAEC  ?v=1&s1=<exam>.<year>.<subject>:<grade>,…&s2=…&rq=<id>,<id>
 *         subject = a catalogue id ("english") or "~" + a custom name;
 *         grade A1-F9, or empty while the visitor has not picked one;
 *         year may be empty ("waec..english:B3").
 *   JAMB  ?v=1&f=<formula>&u=<utme>&p=<post>&pm=<post max>&pt=<point table>
 *         &g=<g1>.<g2>.<g3>.<g4>.<g5>&t=<target>&w=<utme>.<olevel>.<post>
 *         defaults (pm 100, pt four-to-two, empty grades, w unless custom)
 *         are left out. Typed numbers are kept as text so a half-typed value
 *         returns to its field with its own error.
 *
 * Decoding never throws: unknown values fall back to a default and the result
 * says `partlyReset` so the page can tell the visitor.
 */

import { CORE_SUBJECT_IDS, OLEVEL_EXAMS, OLEVEL_GRADES, OLEVEL_MAX_SUBJECTS, OLEVEL_MIN_YEAR, type OlevelExam, type OlevelGrade } from '@/lib/records/olevelRules';
import { OLEVEL_SUBJECTS, findOlevelSubject, subjectIdFor } from '@/lib/records/olevelSubjects';
import { AGGREGATE_FORMULAS, OLEVEL_POINT_TABLES, type AggregateFormulaId, type OlevelPointTableId } from '@/lib/records/admissionRules';

export const RECORDS_URL_VERSION = 1;
/** Course subjects a visitor can add on top of English and Mathematics. */
export const REQUIRED_SUBJECTS_MAX = 4;
export const ADMISSION_GRADE_SLOTS = 5;
const STORED_MAX_YEAR = 2100;
const CUSTOM_NAME_MAX = 60;
const NUMBER_TEXT_MAX = 6;

const GRADE_LETTERS: readonly string[] = OLEVEL_GRADES.map((band) => band.grade);
const EXAM_IDS: readonly string[] = OLEVEL_EXAMS.map((exam) => exam.id);

export interface OlevelLinkSubject {
  /** A catalogue id or `custom:<key>`; '' for a row with no subject yet. */
  subjectId: string;
  name: string;
  grade: OlevelGrade | null;
}

export interface OlevelLinkSitting {
  exam: OlevelExam;
  year: number | null;
  subjects: OlevelLinkSubject[];
}

export interface OlevelLink {
  sittings: OlevelLinkSitting[];
  /** Catalogue ids the course asks for, beyond English and Mathematics. */
  required: string[];
}

export interface Decoded<T> {
  /** Null when the link carries nothing to open (or cannot be read). */
  link: T | null;
  /** A newer or broken link: nothing was read. */
  unreadable: boolean;
  /** Some values were unknown or out of range and were reset. */
  partlyReset: boolean;
}

function toParams(search: string | URLSearchParams): URLSearchParams {
  return typeof search === 'string' ? new URLSearchParams(search.replace(/^\?/, '')) : search;
}

/** True when the link is from a newer format this page cannot read. */
function newerVersion(params: URLSearchParams): boolean {
  const version = params.get('v');
  return version !== null && version !== String(RECORDS_URL_VERSION);
}

/** A custom subject name without the link's separators. */
export function cleanCustomName(name: string): string {
  return name.replace(/[,:~]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_NAME_MAX);
}

function subjectToken(subject: OlevelLinkSubject): string | null {
  const name = subject.name.trim();
  if (!name && !subject.subjectId) return null;
  const catalogue = OLEVEL_SUBJECTS.some((entry) => entry.id === subject.subjectId) ? subject.subjectId : findOlevelSubject(name)?.id;
  const key = catalogue ?? (cleanCustomName(name) ? `~${cleanCustomName(name)}` : null);
  if (!key) return null;
  return `${key}:${subject.grade ?? ''}`;
}

/** "v=1&s1=waec.2025.english%3AB3…" (no leading "?"). */
export function encodeOlevelLink(link: OlevelLink): string {
  const params = new URLSearchParams();
  params.set('v', String(RECORDS_URL_VERSION));
  let index = 0;
  for (const sitting of link.sittings.slice(0, 2)) {
    const tokens = sitting.subjects.map(subjectToken).filter((token): token is string => token !== null);
    if (tokens.length === 0) continue;
    index += 1;
    params.set(`s${index}`, `${sitting.exam}.${sitting.year ?? ''}.${tokens.join(',')}`);
  }
  const required = link.required.filter((id) => OLEVEL_SUBJECTS.some((entry) => entry.id === id)).slice(0, REQUIRED_SUBJECTS_MAX);
  if (required.length) params.set('rq', required.join(','));
  return params.toString();
}

function decodeSitting(value: string, reset: () => void): OlevelLinkSitting | null {
  const first = value.indexOf('.');
  const second = first === -1 ? -1 : value.indexOf('.', first + 1);
  if (second === -1) {
    reset();
    return null;
  }
  const examText = value.slice(0, first);
  const yearText = value.slice(first + 1, second);
  const exam = EXAM_IDS.includes(examText) ? (examText as OlevelExam) : 'waec';
  if (exam !== examText) reset();
  let year: number | null = null;
  if (yearText) {
    const parsed = Number(yearText);
    if (/^\d{4}$/.test(yearText) && parsed >= OLEVEL_MIN_YEAR && parsed <= STORED_MAX_YEAR) year = parsed;
    else reset();
  }
  const subjects: OlevelLinkSubject[] = [];
  for (const token of value.slice(second + 1).split(',')) {
    if (!token.trim()) continue;
    const colon = token.lastIndexOf(':');
    const key = (colon === -1 ? token : token.slice(0, colon)).trim();
    const gradeText = (colon === -1 ? '' : token.slice(colon + 1)).trim().toUpperCase();
    let subjectId: string;
    let name: string;
    if (key.startsWith('~')) {
      name = cleanCustomName(key.slice(1));
      subjectId = subjectIdFor(name);
      const catalogue = findOlevelSubject(name);
      if (catalogue) name = catalogue.name;
    } else {
      const catalogue = OLEVEL_SUBJECTS.find((entry) => entry.id === key) ?? findOlevelSubject(key);
      if (!catalogue) {
        reset();
        continue;
      }
      subjectId = catalogue.id;
      name = catalogue.name;
    }
    if (!subjectId) {
      reset();
      continue;
    }
    if (subjects.some((subject) => subject.subjectId === subjectId) || subjects.length >= OLEVEL_MAX_SUBJECTS) {
      reset();
      continue;
    }
    let grade: OlevelGrade | null = null;
    if (GRADE_LETTERS.includes(gradeText)) grade = gradeText as OlevelGrade;
    else if (gradeText) reset();
    subjects.push({ subjectId, name, grade });
  }
  return { exam, year, subjects };
}

/** Reads the checker's query string (with or without "?"). Never throws. */
export function decodeOlevelLink(search: string | URLSearchParams): Decoded<OlevelLink> {
  const params = toParams(search);
  if (newerVersion(params)) return { link: null, unreadable: true, partlyReset: false };
  let partlyReset = false;
  const reset = () => {
    partlyReset = true;
  };
  const sittings: OlevelLinkSitting[] = [];
  for (const key of ['s1', 's2']) {
    const value = params.get(key);
    if (!value) continue;
    const sitting = decodeSitting(value, reset);
    if (sitting && sitting.subjects.length) sittings.push(sitting);
  }
  const required: string[] = [];
  for (const id of (params.get('rq') ?? '').split(',').map((text) => text.trim()).filter(Boolean)) {
    const known = OLEVEL_SUBJECTS.some((entry) => entry.id === id) && !CORE_SUBJECT_IDS.includes(id) && !required.includes(id);
    if (known && required.length < REQUIRED_SUBJECTS_MAX) required.push(id);
    else reset();
  }
  if (sittings.length === 0 && required.length === 0) return { link: null, unreadable: false, partlyReset };
  return { link: { sittings, required }, unreadable: false, partlyReset };
}

/* ------------------------------------------------------------ admission */

export type PointTableChoice = Exclude<OlevelPointTableId, 'custom'>;

export interface AdmissionLink {
  formula: AggregateFormulaId;
  utme: string;
  postScore: string;
  postMax: string;
  pointTable: PointTableChoice;
  /** Five slots: English, Mathematics and three course subjects. */
  grades: (OlevelGrade | null)[];
  target: string;
  /** Only for the custom formula. */
  weights: { utme: string; olevel: string; postUtme: string } | null;
}

export const DEFAULT_FORMULA: AggregateFormulaId = 'utme-post';
export const DEFAULT_POINT_TABLE: PointTableChoice = 'four-to-two';
export const DEFAULT_POST_MAX = '100';

/** Digits, a decimal point or comma; nothing else from a link reaches a field. */
function numberText(value: string | null): string {
  return (value ?? '').replace(/[^0-9.,]/g, '').slice(0, NUMBER_TEXT_MAX);
}

export function encodeAdmissionLink(link: AdmissionLink): string {
  const params = new URLSearchParams();
  params.set('v', String(RECORDS_URL_VERSION));
  params.set('f', link.formula);
  const put = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };
  put('u', link.utme);
  put('p', link.postScore);
  if (link.postMax.trim() && link.postMax.trim() !== DEFAULT_POST_MAX) params.set('pm', link.postMax.trim());
  if (link.pointTable !== DEFAULT_POINT_TABLE) params.set('pt', link.pointTable);
  const grades = Array.from({ length: ADMISSION_GRADE_SLOTS }, (_, index) => link.grades[index] ?? '');
  if (grades.some(Boolean)) params.set('g', grades.join('.'));
  put('t', link.target);
  if (link.formula === 'custom' && link.weights) params.set('w', [link.weights.utme, link.weights.olevel, link.weights.postUtme].map((value) => value.trim()).join('.'));
  return params.toString();
}

export function decodeAdmissionLink(search: string | URLSearchParams): Decoded<AdmissionLink> {
  const params = toParams(search);
  if (newerVersion(params)) return { link: null, unreadable: true, partlyReset: false };
  const keys = ['f', 'u', 'p', 'pm', 'pt', 'g', 't', 'w'];
  if (!keys.some((key) => params.has(key))) return { link: null, unreadable: false, partlyReset: false };
  let partlyReset = false;

  const formulaText = params.get('f');
  const formula = AGGREGATE_FORMULAS.some((entry) => entry.id === formulaText) ? (formulaText as AggregateFormulaId) : DEFAULT_FORMULA;
  if (formulaText !== null && formula !== formulaText) partlyReset = true;

  const postMaxText = params.get('pm');
  let postMax = numberText(postMaxText);
  if (postMaxText !== null && !postMax) partlyReset = true;
  if (!postMax) postMax = DEFAULT_POST_MAX;

  const tableText = params.get('pt');
  const pointTable = OLEVEL_POINT_TABLES.some((entry) => entry.id === tableText) ? (tableText as PointTableChoice) : DEFAULT_POINT_TABLE;
  if (tableText !== null && pointTable !== tableText) partlyReset = true;

  const gradeTexts = (params.get('g') ?? '').split('.');
  const grades = Array.from({ length: ADMISSION_GRADE_SLOTS }, (_, index): OlevelGrade | null => {
    const text = (gradeTexts[index] ?? '').trim().toUpperCase();
    if (!text) return null;
    if (GRADE_LETTERS.includes(text)) return text as OlevelGrade;
    partlyReset = true;
    return null;
  });

  let weights: AdmissionLink['weights'] = null;
  if (formula === 'custom') {
    const [utme = '', olevel = '', postUtme = ''] = (params.get('w') ?? '').split('.');
    weights = { utme: numberText(utme), olevel: numberText(olevel), postUtme: numberText(postUtme) };
  }

  const link: AdmissionLink = {
    formula,
    utme: numberText(params.get('u')),
    postScore: numberText(params.get('p')),
    postMax,
    pointTable,
    grades,
    target: numberText(params.get('t')),
    weights,
  };
  return { link, unreadable: false, partlyReset };
}

/** Sign-up from a tool: the registration flow can open on the matching record type. */
export function registerHref(type: 'olevel' | 'admission'): string {
  return `/register?type=${type}`;
}
