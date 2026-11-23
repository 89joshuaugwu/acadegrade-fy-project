import type { Timestamp } from 'firebase/firestore';
import type { AggregateFormulaId, AggregateWeights, OlevelPointTableId, OlevelPoints } from '@/lib/records/admissionRules';
import type { OlevelEntryGrade, OlevelExam, OlevelRecord, OlevelSitting, OlevelSubjectEntry, OlevelTargetCourse, RequiredSubject } from '@/lib/records/olevelRules';

/**
 * Phase 2 record types (GRADING_AND_PROFILES_PLAN.md, "Phase 2 design").
 * Android keeps the same shapes in acadegrade-mobile/types/records.ts.
 * Engine shapes come from the byte-identical lib/records modules.
 */
export type { AggregateFormulaId, AggregateWeights, OlevelEntryGrade, OlevelExam, OlevelPointTableId, OlevelPoints, OlevelRecord, OlevelSitting, OlevelSubjectEntry, OlevelTargetCourse, RequiredSubject };

/** users/{uid}.recordType (and, in Phase 3, profiles/{profileId}.recordType). Absent means tertiary. */
export type RecordType = 'tertiary' | 'olevel' | 'admission';

export const RECORD_TYPES: readonly RecordType[] = ['tertiary', 'olevel', 'admission'];

/** Fail-open read: anything missing or unknown is a tertiary account, so older accounts never change. */
export function resolveRecordType(value: unknown): RecordType {
  return value === 'olevel' || value === 'admission' ? value : 'tertiary';
}

/** users/{uid}/olevel/current (Phase 3: users/{uid}/profiles/{profileId}/olevel/current). Read with parseStoredOlevelRecord. */
export interface StoredOlevelRecord extends OlevelRecord {
  schemaVersion: 1;
  updatedAt: Timestamp;
}

/** users/{uid}/admission/current (Phase 3: users/{uid}/profiles/{profileId}/admission/current). */
export interface StoredAdmissionRecord {
  schemaVersion: 1;
  /** Whole number 0-400; absent until the student has it. */
  utme?: { score: number; year?: number };
  /**
   * Score 0..max (2 dp), max a whole number 1-400. The score is optional so the
   * school's "out of" total can be saved before the result is out.
   */
  postUtme?: { score?: number; max: number };
  formula: AggregateFormulaId;
  /** Only for formula 'custom'. */
  weights?: AggregateWeights;
  /** Default 'four-to-two'. */
  pointTable?: OlevelPointTableId;
  /** Only for pointTable 'custom'. */
  customPoints?: OlevelPoints;
  /** 'record': the five grades come from olevel/current (best of both sittings); 'manual': olevelGrades below. */
  olevelSource: 'record' | 'manual';
  /** Up to five subjects, used when olevelSource is 'manual'. */
  olevelGrades?: { subjectId: string; grade: OlevelEntryGrade }[];
  /** Free text, at most 80 characters each; never looked up. */
  school?: string;
  course?: string;
  /** The aggregate the student is aiming for, 0-100 (2 dp). */
  target?: number;
  updatedAt: Timestamp;
}
