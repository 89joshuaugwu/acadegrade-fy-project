import type { SemesterWithId } from '@/types/semester';
import type { UserWithId } from '@/types/user';

export const COURSE_DURATION_OPTIONS = [3, 4, 5, 6, 8, 10] as const;
export const MIN_COURSE_DURATION = 1;
export const MAX_COURSE_DURATION = 10;

export interface AcademicSlot {
  key: string;
  yearNumber: number;
  level: number;
  semester: 1 | 2;
  session: string;
  label: string;
  /** A5: 1..4 for a spill-over semester after the final level. */
  spillOver?: number;
}

export interface AcademicPlan {
  entrySession: string;
  graduationSession: string;
  duration: number;
  slots: AcademicSlot[];
  createdKeys: Set<string>;
  completedKeys: Set<string>;
  remainingSlots: AcademicSlot[];
  remainingAcademicSemesters: number;
  createdCount: number;
  completedCount: number;
  isFullyCreated: boolean;
  isGraduated: boolean;
}

export function parseAcademicSession(session?: string | null): number | null {
  if (!session || !/^\d{4}\/\d{4}$/.test(session.trim())) return null;
  const [first, second] = session.trim().split('/').map(Number);
  if (!Number.isFinite(first) || second !== first + 1) return null;
  return first;
}

export function formatAcademicSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function graduationSession(entrySession: string, duration: number): string {
  const start = parseAcademicSession(entrySession);
  if (start == null) return '';
  return formatAcademicSession(start + normalizeDuration(duration) - 1);
}

export function normalizeDuration(duration?: number | null): number {
  const parsed = Math.round(Number(duration) || 4);
  return Math.max(MIN_COURSE_DURATION, Math.min(MAX_COURSE_DURATION, parsed));
}

export function slotKey(level: number, semester: number): string {
  return `${level}:${semester}`;
}

/** A5: direct-entry students start at 200 or 300 level; anything else is 100. */
export function normalizeEntryLevel(entryLevel?: number | null): 100 | 200 | 300 {
  const value = Number(entryLevel);
  return value === 200 || value === 300 ? value : 100;
}

/** A5: 0..4 extra semesters after the final level (extended stay). */
export function normalizeSpillover(spillover?: number | null): number {
  const value = Math.round(Number(spillover) || 0);
  return Math.max(0, Math.min(4, value));
}

/** Key of a stored semester document: spill-over semesters use `spill:n`. */
export function semesterSlotKey(semester: { level?: unknown; semester?: unknown; spillOver?: unknown }): string {
  const spill = Number(semester.spillOver) || 0;
  return spill > 0 ? `spill:${spill}` : slotKey(Number(semester.level), Number(semester.semester));
}

/** Document id for a slot's semester: `slot_<level>_<semester>`, or `spill_<n>`. */
export function slotDocumentId(slot: Pick<AcademicSlot, 'level' | 'semester' | 'spillOver'>): string {
  return slot.spillOver ? `spill_${slot.spillOver}` : `slot_${slot.level}_${slot.semester}`;
}

/**
 * Twin of acadegrade-mobile/lib/academic/timeline.ts. The first level is
 * `entryLevel` (default 100, which leaves every existing plan unchanged), so a
 * course of `duration` years has duration - (entryLevel / 100 - 1) years.
 * Spill-over semesters (key `spill:n`, document id `spill_n`) follow the final
 * level, alternating first and second semester.
 */
export function buildAcademicSlots(
  entrySession: string,
  duration: number,
  entryLevel: number = 100,
  spillover: number = 0
): AcademicSlot[] {
  const start = parseAcademicSession(entrySession);
  if (start == null) return [];

  const firstLevel = normalizeEntryLevel(entryLevel);
  const years = Math.max(1, normalizeDuration(duration) - (firstLevel / 100 - 1));
  const slots: AcademicSlot[] = Array.from({ length: years }, (_, yearIndex) => {
    const level = firstLevel + yearIndex * 100;
    const session = formatAcademicSession(start + yearIndex);
    return ([1, 2] as const).map((semester) => ({
      key: slotKey(level, semester),
      yearNumber: yearIndex + 1,
      level,
      semester,
      session,
      label: `${level}L ${semester === 1 ? 'First' : 'Second'} Semester`,
    }));
  }).flat();

  const finalLevel = firstLevel + (years - 1) * 100;
  for (let n = 1; n <= normalizeSpillover(spillover); n += 1) {
    slots.push({
      key: `spill:${n}`,
      yearNumber: years + Math.ceil(n / 2),
      level: finalLevel,
      semester: n % 2 === 1 ? 1 : 2,
      session: formatAcademicSession(start + years - 1 + Math.ceil(n / 2)),
      label: `${finalLevel}L Spill-over ${n}`,
      spillOver: n,
    });
  }
  return slots;
}

export function minimumDurationForSemesters(
  semesters: Pick<SemesterWithId, 'level'>[]
): number {
  const highestLevel = semesters.reduce(
    (highest, semester) => Math.max(highest, Number(semester.level) || 0),
    0
  );
  return Math.max(MIN_COURSE_DURATION, Math.ceil(highestLevel / 100));
}

export function resolveCourseDuration(
  profile: Pick<UserWithId, 'courseDuration' | 'currentLevel'> | null | undefined,
  semesters: Pick<SemesterWithId, 'level'>[] = []
): number {
  const minimumFromData = Math.max(
    minimumDurationForSemesters(semesters),
    Math.ceil((Number(profile?.currentLevel) || 100) / 100)
  );
  return Math.max(normalizeDuration(profile?.courseDuration), minimumFromData);
}

export function resolveEntrySession(
  profile: Pick<UserWithId, 'entrySession' | 'currentSession'> | null | undefined
): string {
  return profile?.entrySession || profile?.currentSession || '';
}

export function getAcademicPlan(
  profile: UserWithId | null | undefined,
  semesters: SemesterWithId[]
): AcademicPlan {
  const entrySession = resolveEntrySession(profile);
  const duration = resolveCourseDuration(profile, semesters);
  const slots = buildAcademicSlots(entrySession, duration, profile?.entryLevel, profile?.spilloverSemesters);
  const validKeys = new Set(slots.map((slot) => slot.key));
  const createdKeys = new Set(
    semesters
      .map((semester) => semesterSlotKey(semester))
      .filter((key) => validKeys.has(key))
  );
  const completedKeys = new Set(
    semesters
      .filter((semester) => semester.isComplete)
      .map((semester) => semesterSlotKey(semester))
      .filter((key) => validKeys.has(key))
  );
  const remainingSlots = slots.filter((slot) => !createdKeys.has(slot.key));
  const remainingAcademicSemesters = Math.max(0, slots.length - completedKeys.size);

  return {
    entrySession,
    graduationSession: graduationSession(entrySession, duration),
    duration,
    slots,
    createdKeys,
    completedKeys,
    remainingSlots,
    remainingAcademicSemesters,
    createdCount: createdKeys.size,
    completedCount: completedKeys.size,
    isFullyCreated: slots.length > 0 && remainingSlots.length === 0,
    isGraduated: slots.length > 0 && completedKeys.size === slots.length,
  };
}

export function withAcademicTimelineDerivations(
  profile: Pick<UserWithId, 'entrySession' | 'currentSession' | 'courseDuration'> | null | undefined,
  update: Partial<UserWithId>
): Partial<UserWithId> {
  if (update.courseDuration === undefined && update.entrySession === undefined) {
    return update;
  }

  const entrySession = update.entrySession
    ?? profile?.entrySession
    ?? profile?.currentSession
    ?? '';
  const duration = update.courseDuration ?? profile?.courseDuration;

  return {
    ...update,
    graduationSession: graduationSession(entrySession, normalizeDuration(duration)),
  };
}

/** Nigerian academic sessions roll over in September, not January. */
export function inferCurrentLevel(
  entrySession: string,
  duration: number,
  now = new Date()
): number {
  const start = parseAcademicSession(entrySession);
  if (start == null) return 100;
  const academicStartYear = now.getMonth() >= 8
    ? now.getFullYear()
    : now.getFullYear() - 1;
  const yearNumber = Math.max(
    1,
    Math.min(normalizeDuration(duration), academicStartYear - start + 1)
  );
  return yearNumber * 100;
}
