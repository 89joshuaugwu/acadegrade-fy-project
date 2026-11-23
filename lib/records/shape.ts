/**
 * Pure shaping for the Phase 2 record types (GRADING_AND_PROFILES_PLAN.md,
 * "Phase 2 design"): Firestore paths, write shaping and tolerant reads around
 * the byte-identical engine in lib/records/*Rules.ts. No Firebase imports, so
 * server routes (admin) can use it too; lib/records/store.ts adds the client I/O.
 *
 * users/{uid}/olevel/current and users/{uid}/admission/current are one document
 * each, replaced whole (merge: false) so removed rows really go. Writes never
 * carry `undefined` (Firestore rejects it) and stay inside the firestore.rules
 * shape (validOlevelRecord / validAdmissionRecord).
 */

import {
  combineSittings,
  isOlevelEntryGrade,
  SUBJECT_ID_MAX,
  SUBJECT_NAME_MAX,
  TARGET_COURSE_NAME_MAX,
  TARGET_COURSE_REQUIRED_MAX,
  validateOlevelRecord,
  type OlevelEntryGrade,
  type OlevelError,
  type OlevelRecord,
  type OlevelSitting,
} from '@/lib/records/olevelRules';
import {
  CREDIT_GRADES,
  formulaById,
  OLEVEL_AGGREGATE_SUBJECTS,
  validatePointTable,
  validatePostUtme,
  validateUtme,
  validateWeights,
  type AggregateInput,
  type OlevelPoints,
  type OlevelPointTableId,
} from '@/lib/records/admissionRules';
import { CORE_SUBJECT_IDS } from '@/lib/records/olevelRules';
import type { StoredAdmissionRecord } from '@/types/records';

export const RECORD_DOC_ID = 'current';
export const DEFAULT_TARGET_COURSE_NAME = 'My course';
const TEXT_MAX = 80;

export const olevelPath = (uid: string) => `users/${uid}/olevel/${RECORD_DOC_ID}`;
export const admissionPath = (uid: string) => `users/${uid}/admission/${RECORD_DOC_ID}`;

/** Thrown by the save helpers when the record would not pass the checks (nothing is written). */
export class RecordSaveError extends Error {
  constructor(readonly errors: readonly (OlevelError | string)[]) {
    super('Check the highlighted details before saving.');
    this.name = 'RecordSaveError';
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const cleanText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
/** A target aggregate: 0-100 with at most two decimals. */
export const isValidTarget = (value: unknown): value is number =>
  isNumber(value) && value >= 0 && value <= 100 && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
/** A post-UTME "out of" total on its own: a whole number 1-400 (same check the engine makes on max). */
const isValidPostMax = (value: unknown): value is number => validatePostUtme(0, value).ok;

/* ------------------------------------------------------------------ O-level */

export interface OlevelWrite {
  schemaVersion: 1;
  sittings: OlevelSitting[];
  targetCourse?: { name: string; required: string[] };
}

export type WriteResult<T, E> = { ok: true; data: T } | { ok: false; errors: E[] };

/** A new sitting id, unique enough for two sittings and at most 40 characters. */
export function newSittingId(now: number = Date.now()): string {
  return `sitting-${now.toString(36)}`;
}

/**
 * The document to store for an O-level record, or the engine's errors.
 * Course subjects are stored as plain ids: Firestore cannot hold a list inside
 * a list, so an any-of group is flattened to its subjects.
 */
export function toOlevelWrite(record: OlevelRecord, currentYear: number): WriteResult<OlevelWrite, OlevelError> {
  const sittings = (Array.isArray(record?.sittings) ? record.sittings : []).map((sitting) => ({
    id: sitting.id,
    exam: sitting.exam,
    year: sitting.year,
    subjects: (Array.isArray(sitting.subjects) ? sitting.subjects : []).map((row) => ({
      subjectId: typeof row.subjectId === 'string' ? row.subjectId.slice(0, SUBJECT_ID_MAX) : row.subjectId,
      name: typeof row.name === 'string' ? row.name.trim() : row.name,
      grade: row.grade,
    })),
  }));
  const data: OlevelWrite = { schemaVersion: 1, sittings };
  const target = record?.targetCourse;
  if (target) {
    const required: string[] = [];
    for (const item of Array.isArray(target.required) ? target.required : []) {
      for (const id of Array.isArray(item) ? item : [item]) {
        if (typeof id === 'string' && id && !required.includes(id) && required.length < TARGET_COURSE_REQUIRED_MAX) required.push(id);
      }
    }
    const name = cleanText(target.name, TARGET_COURSE_NAME_MAX);
    if (name || required.length > 0) data.targetCourse = { name: name || DEFAULT_TARGET_COURSE_NAME, required };
  }
  const check = validateOlevelRecord({ sittings: data.sittings, ...(data.targetCourse ? { targetCourse: data.targetCourse } : {}) }, { currentYear });
  if (!check.ok) return { ok: false, errors: check.errors };
  for (const sitting of sittings) {
    for (const row of sitting.subjects) {
      if (typeof row.name === 'string' && row.name.length > SUBJECT_NAME_MAX) return { ok: false, errors: [{ code: 'subject-name' }] };
    }
  }
  return { ok: true, data };
}



/* ---------------------------------------------------------------- admission */

/** The admission document without its server timestamp and version. */
export type AdmissionRecord = Omit<StoredAdmissionRecord, 'updatedAt' | 'schemaVersion'>;
export type AdmissionWrite = AdmissionRecord & { schemaVersion: 1 };

export function defaultAdmissionRecord(): AdmissionRecord {
  return { formula: 'utme-post', olevelSource: 'record', pointTable: 'four-to-two' };
}

const POINT_TABLE_IDS: readonly OlevelPointTableId[] = ['four-to-two', 'six-to-one', 'ten-to-five', 'custom'];

function readPoints(value: unknown): OlevelPoints | null {
  if (!isObject(value) || !CREDIT_GRADES.every((grade) => isNumber(value[grade]))) return null;
  return Object.fromEntries(CREDIT_GRADES.map((grade) => [grade, value[grade] as number])) as OlevelPoints;
}

/** Tolerant read of admission/current: unknown or broken parts are dropped, never thrown. */
export function parseStoredAdmissionRecord(raw: unknown): AdmissionRecord {
  const record = defaultAdmissionRecord();
  if (!isObject(raw)) return record;
  const formula = formulaById(raw.formula);
  if (formula) record.formula = formula.id;
  if (raw.olevelSource === 'manual') record.olevelSource = 'manual';
  if (typeof raw.pointTable === 'string' && (POINT_TABLE_IDS as readonly string[]).includes(raw.pointTable)) record.pointTable = raw.pointTable as OlevelPointTableId;
  if (isObject(raw.utme) && validateUtme(raw.utme.score).ok) {
    record.utme = { score: raw.utme.score as number };
    if (isNumber(raw.utme.year) && Number.isInteger(raw.utme.year)) record.utme.year = raw.utme.year;
  }
  if (isObject(raw.postUtme) && validatePostUtme(raw.postUtme.score, raw.postUtme.max).ok) {
    record.postUtme = { score: raw.postUtme.score as number, max: raw.postUtme.max as number };
  } else if (isObject(raw.postUtme) && raw.postUtme.score === undefined && isValidPostMax(raw.postUtme.max)) {
    record.postUtme = { max: raw.postUtme.max };
  }
  if (isObject(raw.weights) && isNumber(raw.weights.utme) && isNumber(raw.weights.olevel) && isNumber(raw.weights.postUtme)) {
    record.weights = { utme: raw.weights.utme, olevel: raw.weights.olevel, postUtme: raw.weights.postUtme };
  }
  const points = readPoints(raw.customPoints);
  if (points) record.customPoints = points;
  if (Array.isArray(raw.olevelGrades)) {
    const grades = raw.olevelGrades
      .filter((row): row is { subjectId: string; grade: OlevelEntryGrade } => isObject(row) && typeof row.subjectId === 'string' && row.subjectId.length > 0 && isOlevelEntryGrade(row.grade))
      .slice(0, OLEVEL_AGGREGATE_SUBJECTS)
      .map((row) => ({ subjectId: row.subjectId, grade: row.grade }));
    if (grades.length > 0) record.olevelGrades = grades;
  }
  const school = cleanText(raw.school, TEXT_MAX);
  if (school) record.school = school;
  const course = cleanText(raw.course, TEXT_MAX);
  if (course) record.course = course;
  if (isValidTarget(raw.target)) record.target = raw.target;
  return record;
}

/** The document to store, or error codes. Weights and custom points are kept only when the choice uses them. */
export function toAdmissionWrite(record: AdmissionRecord): WriteResult<AdmissionWrite, string> {
  const errors: string[] = [];
  const formula = formulaById(record.formula);
  if (!formula) errors.push('formula');
  const data: AdmissionWrite = {
    schemaVersion: 1,
    formula: formula ? formula.id : 'utme-post',
    olevelSource: record.olevelSource === 'manual' ? 'manual' : 'record',
    pointTable: record.pointTable && POINT_TABLE_IDS.includes(record.pointTable) ? record.pointTable : 'four-to-two',
  };
  if (record.utme) {
    const check = validateUtme(record.utme.score);
    if (!check.ok) errors.push(`utme-${check.code}`);
    else {
      data.utme = { score: record.utme.score };
      if (isNumber(record.utme.year) && Number.isInteger(record.utme.year)) data.utme.year = record.utme.year;
    }
  }
  if (record.postUtme && record.postUtme.score === undefined) {
    if (!isValidPostMax(record.postUtme.max)) errors.push('post-utme-max-range');
    else data.postUtme = { max: record.postUtme.max };
  } else if (record.postUtme) {
    const check = validatePostUtme(record.postUtme.score, record.postUtme.max);
    if (!check.ok) errors.push(`post-utme-${check.code}`);
    else data.postUtme = { score: record.postUtme.score, max: record.postUtme.max };
  }
  if (data.formula === 'custom') {
    const check = validateWeights(record.weights);
    if (!check.ok) errors.push(check.code);
    else data.weights = { ...record.weights! };
  }
  if (data.pointTable === 'custom') {
    const check = validatePointTable(record.customPoints);
    if (!check.ok) errors.push(check.code);
    else data.customPoints = readPoints(record.customPoints)!;
  }
  if (data.olevelSource === 'manual' && record.olevelGrades?.length) {
    if (record.olevelGrades.length > OLEVEL_AGGREGATE_SUBJECTS) errors.push('olevel-too-many');
    else if (!record.olevelGrades.every((row) => typeof row.subjectId === 'string' && row.subjectId && isOlevelEntryGrade(row.grade))) errors.push('olevel-grade');
    else data.olevelGrades = record.olevelGrades.map((row) => ({ subjectId: row.subjectId.slice(0, SUBJECT_ID_MAX), grade: row.grade }));
  }
  const school = cleanText(record.school, TEXT_MAX);
  if (school) data.school = school;
  const course = cleanText(record.course, TEXT_MAX);
  if (course) data.course = course;
  if (record.target !== undefined) {
    if (!isValidTarget(record.target)) errors.push('target');
    else data.target = record.target;
  }
  return errors.length ? { ok: false, errors } : { ok: true, data };
}



/* --------------------------------------------------------- aggregate wiring */

export interface PickedGrade {
  subjectId: string;
  name: string;
  grade: OlevelEntryGrade;
}

/**
 * Five grades for the aggregate from the best of both sittings: English and
 * Mathematics, then the course's subjects, then the best of the rest.
 */
export function pickAggregateGrades(record: OlevelRecord | null): PickedGrade[] {
  if (!record) return [];
  const combined = combineSittings(record.sittings);
  const picked: PickedGrade[] = [];
  const take = (subjectId: string) => {
    if (picked.length >= OLEVEL_AGGREGATE_SUBJECTS || picked.some((row) => row.subjectId === subjectId)) return;
    const found = combined.find((row) => row.subjectId === subjectId);
    if (found) picked.push({ subjectId: found.subjectId, name: found.name, grade: found.grade });
  };
  CORE_SUBJECT_IDS.forEach(take);
  for (const item of record.targetCourse?.required ?? []) {
    (Array.isArray(item) ? item : [item]).forEach(take);
  }
  // combineSittings already sorts core first, then best grade first.
  combined.forEach((row) => take(row.subjectId));
  return picked;
}

/** The engine input for an admission record and the student's O-level record. */
export function aggregateInputFrom(record: AdmissionRecord, olevel: OlevelRecord | null): AggregateInput {
  const grades = record.olevelSource === 'manual'
    ? (record.olevelGrades ?? []).map((row) => row.grade)
    : pickAggregateGrades(olevel).map((row) => row.grade);
  return {
    formula: record.formula,
    utme: record.utme ? record.utme.score : null,
    postUtme: record.postUtme ? { score: record.postUtme.score ?? null, max: record.postUtme.max } : null,
    olevelGrades: grades,
    weights: record.weights ?? null,
    pointTable: record.pointTable ?? 'four-to-two',
    customPoints: record.customPoints ?? null,
  };
}
