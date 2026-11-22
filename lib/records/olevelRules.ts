/**
 * AcadeGrade O-level rules (WAEC, NECO and NABTEB, school and GCE sittings):
 * grade letters, credits, combining two sittings, the "five credits including
 * English Language and Mathematics" check, and validation of stored records.
 *
 * This file is byte-identical in acadegrade-web/lib/records/olevelRules.ts and
 * acadegrade-mobile/lib/records/olevelRules.ts. Both repos run the shared
 * fixture tests/fixtures/olevel-rules.json against it. Keep it pure: no
 * imports, no platform APIs, erasable TypeScript only (Node strips the types
 * when the Android tests import it directly). Subject ids come from
 * lib/records/olevelSubjects.ts ('english', 'mathematics', ...).
 *
 * Schools set their own entry rules; every result here is a guide, and the
 * screens say so.
 */

export type OlevelGrade = 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
/** A stored grade: one of the nine letters, or AR (awaiting result). */
export type OlevelEntryGrade = OlevelGrade | 'AR';
export type OlevelGradeKind = 'credit' | 'pass' | 'fail';

export interface OlevelGradeBand {
  grade: OlevelGrade;
  minScore: number;
  /** Highest whole-number score in the band, for display only. */
  maxScore: number;
  kind: OlevelGradeKind;
  /** 1 (A1, best) to 9 (F9). */
  rank: number;
}

/** WAEC/NECO letters, best first. A1-C6 are credits, D7-E8 passes, F9 a fail. */
export const OLEVEL_GRADES: readonly OlevelGradeBand[] = [
  { grade: 'A1', minScore: 75, maxScore: 100, kind: 'credit', rank: 1 },
  { grade: 'B2', minScore: 70, maxScore: 74, kind: 'credit', rank: 2 },
  { grade: 'B3', minScore: 65, maxScore: 69, kind: 'credit', rank: 3 },
  { grade: 'C4', minScore: 60, maxScore: 64, kind: 'credit', rank: 4 },
  { grade: 'C5', minScore: 55, maxScore: 59, kind: 'credit', rank: 5 },
  { grade: 'C6', minScore: 50, maxScore: 54, kind: 'credit', rank: 6 },
  { grade: 'D7', minScore: 45, maxScore: 49, kind: 'pass', rank: 7 },
  { grade: 'E8', minScore: 40, maxScore: 44, kind: 'pass', rank: 8 },
  { grade: 'F9', minScore: 0, maxScore: 39, kind: 'fail', rank: 9 },
];

/** Ranked below F9 so any real grade beats it when sittings combine. */
export const AWAITING_GRADE = 'AR';
const AWAITING_RANK = 10;

export type OlevelExam = 'waec' | 'waec-gce' | 'neco' | 'neco-gce' | 'nabteb';

export const OLEVEL_EXAMS: readonly { id: OlevelExam; name: string; short: string }[] = [
  { id: 'waec', name: 'WAEC (WASSCE, school)', short: 'WAEC' },
  { id: 'waec-gce', name: 'WAEC GCE (private)', short: 'WAEC GCE' },
  { id: 'neco', name: 'NECO (SSCE, internal)', short: 'NECO' },
  { id: 'neco-gce', name: 'NECO GCE (external)', short: 'NECO GCE' },
  { id: 'nabteb', name: 'NABTEB', short: 'NABTEB' },
];

export const OLEVEL_MAX_SITTINGS = 2;
export const OLEVEL_MAX_SUBJECTS = 9;
/** WASSCE began in 1988. */
export const OLEVEL_MIN_YEAR = 1988;
/** Upper bound for stored years when the current year is not known (parsing). */
export const OLEVEL_STORED_MAX_YEAR = 2100;
export const DEFAULT_MIN_CREDITS = 5;
export const CORE_SUBJECT_IDS: readonly string[] = ['english', 'mathematics'];
export const SUBJECT_NAME_MAX = 60;
export const SUBJECT_ID_MAX = 80;
export const SITTING_ID_MAX = 40;
export const TARGET_COURSE_NAME_MAX = 80;
export const TARGET_COURSE_REQUIRED_MAX = 6;

export interface OlevelSubjectEntry {
  subjectId: string;
  name: string;
  grade: OlevelEntryGrade;
}

export interface OlevelSitting {
  id: string;
  exam: OlevelExam;
  year: number;
  subjects: OlevelSubjectEntry[];
}

/** A subject id, or a group where any one subject will do (['physics', 'chemistry']). */
export type RequiredSubject = string | string[];

export interface OlevelTargetCourse {
  name: string;
  required: RequiredSubject[];
}

export interface OlevelRecord {
  sittings: OlevelSitting[];
  targetCourse?: OlevelTargetCourse;
}

const GRADE_RANK: Record<string, number> = { A1: 1, B2: 2, B3: 3, C4: 4, C5: 5, C6: 6, D7: 7, E8: 8, F9: 9, AR: AWAITING_RANK };
const EXAM_IDS: readonly string[] = ['waec', 'waec-gce', 'neco', 'neco-gce', 'nabteb'];

/** The letter for a 0-100 score, or null outside that range. */
export function olevelGradeFromScore(score: number): OlevelGrade | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) return null;
  for (const band of OLEVEL_GRADES) {
    if (score >= band.minScore) return band.grade;
  }
  return 'F9';
}

export function isOlevelGrade(value: unknown): value is OlevelGrade {
  return typeof value === 'string' && value !== AWAITING_GRADE && Object.prototype.hasOwnProperty.call(GRADE_RANK, value);
}

export function isOlevelEntryGrade(value: unknown): value is OlevelEntryGrade {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GRADE_RANK, value);
}

export function isOlevelExam(value: unknown): value is OlevelExam {
  return typeof value === 'string' && EXAM_IDS.includes(value);
}

/** A1 to C6. */
export function isCredit(grade: string): boolean {
  return isOlevelGrade(grade) && GRADE_RANK[grade] <= 6;
}

/** A1 to E8 (credits and passes). */
export function isPass(grade: string): boolean {
  return isOlevelGrade(grade) && GRADE_RANK[grade] <= 8;
}

function rankOf(grade: string): number {
  return isOlevelEntryGrade(grade) ? GRADE_RANK[grade] : AWAITING_RANK + 1;
}

/** Negative when `a` is the better grade, 0 when equal, positive when worse. AR ranks below F9. */
export function compareGrades(a: string, b: string): number {
  return rankOf(a) - rankOf(b);
}

export interface CombinedSubject {
  subjectId: string;
  name: string;
  grade: OlevelEntryGrade;
  sittingId: string;
  sittingIndex: number;
  credit: boolean;
}

/**
 * Best grade per subject across the sittings (a tie keeps the earlier sitting).
 * English, then Mathematics, then best grade first, then name.
 */
export function combineSittings(sittings: readonly OlevelSitting[]): CombinedSubject[] {
  const best = new Map<string, CombinedSubject>();
  (Array.isArray(sittings) ? sittings : []).forEach((sitting, sittingIndex) => {
    const subjects = sitting && Array.isArray(sitting.subjects) ? sitting.subjects : [];
    for (const entry of subjects) {
      if (!entry || typeof entry.subjectId !== 'string' || !entry.subjectId || !isOlevelEntryGrade(entry.grade)) continue;
      const current = best.get(entry.subjectId);
      if (current && compareGrades(entry.grade, current.grade) >= 0) continue;
      best.set(entry.subjectId, {
        subjectId: entry.subjectId,
        name: typeof entry.name === 'string' ? entry.name : '',
        grade: entry.grade,
        sittingId: typeof sitting.id === 'string' ? sitting.id : '',
        sittingIndex,
        credit: isCredit(entry.grade),
      });
    }
  });
  const coreOrder = (id: string) => {
    const index = CORE_SUBJECT_IDS.indexOf(id);
    return index === -1 ? CORE_SUBJECT_IDS.length : index;
  };
  return Array.from(best.values()).sort(
    (a, b) =>
      coreOrder(a.subjectId) - coreOrder(b.subjectId) ||
      compareGrades(a.grade, b.grade) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}

export function countCredits(combined: readonly CombinedSubject[]): number {
  return combined.filter((subject) => subject.credit).length;
}

export interface RequirementOptions {
  /** Course subjects on top of English and Mathematics. */
  required?: readonly RequiredSubject[];
  minCredits?: number;
  maxSittings?: number;
}

export interface RequiredGroupResult {
  ids: string[];
  met: boolean;
  /** The best-graded subject of the group the student has, or null. */
  bestSubjectId: string | null;
  bestGrade: OlevelEntryGrade | null;
}

export interface RequirementResult {
  meets: boolean;
  creditCount: number;
  minCredits: number;
  creditsShort: number;
  sittingsUsed: number;
  tooManySittings: boolean;
  required: RequiredGroupResult[];
  /** Unmet required groups, as id lists. */
  missing: string[][];
  /** Subjects whose combined grade is still AR. */
  awaiting: number;
  combined: CombinedSubject[];
}

function requiredGroups(extra: readonly RequiredSubject[] | undefined): string[][] {
  const groups: string[][] = CORE_SUBJECT_IDS.map((id) => [id]);
  const seen = new Set(groups.map((group) => group.join('|')));
  for (const item of Array.isArray(extra) ? extra : []) {
    const ids = (Array.isArray(item) ? item : [item]).filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (ids.length === 0) continue;
    const key = ids.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(ids);
  }
  return groups;
}

/**
 * The common entry rule: at least `minCredits` (5) credits including English
 * Language and Mathematics plus any course subjects, from at most
 * `maxSittings` (2) sittings, using the best grade per subject.
 */
export function checkOlevelRequirements(sittings: readonly OlevelSitting[], options: RequirementOptions = {}): RequirementResult {
  const list = Array.isArray(sittings) ? sittings : [];
  const minCredits = typeof options.minCredits === 'number' && Number.isInteger(options.minCredits) && options.minCredits > 0 ? options.minCredits : DEFAULT_MIN_CREDITS;
  const maxSittings = typeof options.maxSittings === 'number' && Number.isInteger(options.maxSittings) && options.maxSittings > 0 ? options.maxSittings : OLEVEL_MAX_SITTINGS;
  const combined = combineSittings(list);
  const byId = new Map(combined.map((subject) => [subject.subjectId, subject]));
  const required = requiredGroups(options.required).map((ids): RequiredGroupResult => {
    let best: CombinedSubject | null = null;
    for (const id of ids) {
      const subject = byId.get(id);
      if (subject && (!best || compareGrades(subject.grade, best.grade) < 0)) best = subject;
    }
    return { ids, met: Boolean(best && best.credit), bestSubjectId: best ? best.subjectId : null, bestGrade: best ? best.grade : null };
  });
  const creditCount = countCredits(combined);
  const sittingsUsed = list.filter((sitting) => sitting && Array.isArray(sitting.subjects) && sitting.subjects.length > 0).length;
  const tooManySittings = sittingsUsed > maxSittings;
  const missing = required.filter((group) => !group.met).map((group) => group.ids);
  return {
    meets: !tooManySittings && missing.length === 0 && creditCount >= minCredits,
    creditCount,
    minCredits,
    creditsShort: Math.max(0, minCredits - creditCount),
    sittingsUsed,
    tooManySittings,
    required,
    missing,
    awaiting: combined.filter((subject) => subject.grade === AWAITING_GRADE).length,
    combined,
  };
}

export type OlevelErrorCode =
  | 'record'
  | 'sittings-too-many'
  | 'sitting-id-duplicate'
  | 'sitting'
  | 'id'
  | 'exam'
  | 'year'
  | 'subjects-empty'
  | 'subjects-too-many'
  | 'subject-name'
  | 'subject-duplicate'
  | 'grade'
  | 'target-course';

export interface OlevelError {
  code: OlevelErrorCode;
  sitting?: number;
  subject?: number;
}

export interface OlevelValidation {
  ok: boolean;
  errors: OlevelError[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const shortText = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

/**
 * Checks one sitting for saving: an id, a known exam, a whole year from 1988
 * to `currentYear`, 1-9 subjects, each with a name, a catalogue or custom id
 * used once, and a known grade (AR allowed).
 */
export function validateSitting(sitting: unknown, options: { currentYear: number }): OlevelValidation {
  const errors: OlevelError[] = [];
  if (!isObject(sitting)) return { ok: false, errors: [{ code: 'sitting' }] };
  if (!shortText(sitting.id, SITTING_ID_MAX)) errors.push({ code: 'id' });
  if (!isOlevelExam(sitting.exam)) errors.push({ code: 'exam' });
  const year = sitting.year;
  if (typeof year !== 'number' || !Number.isInteger(year) || year < OLEVEL_MIN_YEAR || year > options.currentYear) errors.push({ code: 'year' });
  const subjects = Array.isArray(sitting.subjects) ? sitting.subjects : [];
  if (subjects.length === 0) errors.push({ code: 'subjects-empty' });
  if (subjects.length > OLEVEL_MAX_SUBJECTS) errors.push({ code: 'subjects-too-many' });
  const seen = new Set<string>();
  subjects.forEach((entry: unknown, subject: number) => {
    const row = isObject(entry) ? entry : {};
    if (!shortText(row.name, SUBJECT_NAME_MAX) || !shortText(row.subjectId, SUBJECT_ID_MAX)) errors.push({ code: 'subject-name', subject });
    else if (seen.has(row.subjectId as string)) errors.push({ code: 'subject-duplicate', subject });
    if (typeof row.subjectId === 'string') seen.add(row.subjectId);
    if (!isOlevelEntryGrade(row.grade)) errors.push({ code: 'grade', subject });
  });
  return { ok: errors.length === 0, errors };
}

function validTargetCourse(value: unknown): boolean {
  if (!isObject(value) || !shortText(value.name, TARGET_COURSE_NAME_MAX) || !Array.isArray(value.required)) return false;
  if (value.required.length > TARGET_COURSE_REQUIRED_MAX) return false;
  return value.required.every((item: unknown) =>
    Array.isArray(item)
      ? item.length > 0 && item.length <= 4 && item.every((id: unknown) => shortText(id, SUBJECT_ID_MAX))
      : shortText(item, SUBJECT_ID_MAX),
  );
}

/** Checks a whole record for saving: at most two sittings with distinct ids, each valid, and an optional course target. */
export function validateOlevelRecord(record: unknown, options: { currentYear: number }): OlevelValidation {
  if (!isObject(record) || !Array.isArray(record.sittings)) return { ok: false, errors: [{ code: 'record' }] };
  const errors: OlevelError[] = [];
  if (record.sittings.length > OLEVEL_MAX_SITTINGS) errors.push({ code: 'sittings-too-many' });
  else {
    const ids = new Set<unknown>();
    record.sittings.forEach((sitting: unknown, index: number) => {
      const id = isObject(sitting) ? sitting.id : undefined;
      if (ids.has(id)) errors.push({ code: 'sitting-id-duplicate', sitting: index });
      ids.add(id);
      for (const error of validateSitting(sitting, options).errors) errors.push({ ...error, sitting: index });
    });
  }
  if (record.targetCourse !== undefined && !validTargetCourse(record.targetCourse)) errors.push({ code: 'target-course' });
  return { ok: errors.length === 0, errors };
}

/**
 * Tolerant read of users/{uid}/olevel/current (or a sub-profile's copy):
 * keeps the first two well-formed sittings and the first nine well-formed
 * rows of each, drops everything else, and never throws. A sitting with no
 * rows yet is kept so an unfinished edit survives.
 */
export function parseStoredOlevelRecord(raw: unknown): OlevelRecord {
  const record: OlevelRecord = { sittings: [] };
  if (!isObject(raw)) return record;
  const sittings = Array.isArray(raw.sittings) ? raw.sittings : [];
  for (const candidate of sittings) {
    if (record.sittings.length >= OLEVEL_MAX_SITTINGS) break;
    if (!isObject(candidate) || !shortText(candidate.id, SITTING_ID_MAX) || !isOlevelExam(candidate.exam)) continue;
    const year = candidate.year;
    if (typeof year !== 'number' || !Number.isInteger(year) || year < OLEVEL_MIN_YEAR || year > OLEVEL_STORED_MAX_YEAR) continue;
    const subjects: OlevelSubjectEntry[] = [];
    for (const row of Array.isArray(candidate.subjects) ? candidate.subjects : []) {
      if (subjects.length >= OLEVEL_MAX_SUBJECTS) break;
      if (!isObject(row) || !shortText(row.subjectId, SUBJECT_ID_MAX) || !shortText(row.name, SUBJECT_NAME_MAX) || !isOlevelEntryGrade(row.grade)) continue;
      subjects.push({ subjectId: row.subjectId, name: row.name, grade: row.grade });
    }
    record.sittings.push({ id: candidate.id, exam: candidate.exam, year, subjects });
  }
  const target = raw.targetCourse;
  if (isObject(target) && shortText(target.name, TARGET_COURSE_NAME_MAX) && Array.isArray(target.required)) {
    const required: RequiredSubject[] = [];
    for (const item of target.required) {
      if (required.length >= TARGET_COURSE_REQUIRED_MAX) break;
      if (Array.isArray(item)) {
        const ids = item.filter((id: unknown): id is string => shortText(id, SUBJECT_ID_MAX)).slice(0, 4);
        if (ids.length > 0) required.push(ids);
      } else if (shortText(item, SUBJECT_ID_MAX)) required.push(item);
    }
    record.targetCourse = { name: target.name, required };
  }
  return record;
}
