import {
  DEGREE_CLASS_BANDS,
  MAX_GRADE_POINT,
  maxReachableCgpa,
  requiredAverageForTarget,
  resolveDegreeClass,
  type DegreeClassBand,
  type DegreeClassShortLabel,
} from '@/lib/cgpa/academicRules';

/** A degree class a student can aim for (saved as `users/{uid}.targetClass`). */
export type TargetClass = Exclude<DegreeClassShortLabel, 'Fail'>;

export const TARGET_CLASS_OPTIONS: readonly { value: TargetClass; label: string }[] = DEGREE_CLASS_BANDS
  .filter((band): band is DegreeClassBand & { shortLabel: TargetClass } => band.shortLabel !== 'Fail')
  .map(band => ({ value: band.shortLabel, label: band.label }));

export function parseTargetClass(value: unknown): TargetClass | null {
  return TARGET_CLASS_OPTIONS.find(option => option.value === value)?.value ?? null;
}

export function bandFor(shortLabel: DegreeClassShortLabel): DegreeClassBand {
  return DEGREE_CLASS_BANDS.find(band => band.shortLabel === shortLabel) ?? DEGREE_CLASS_BANDS[DEGREE_CLASS_BANDS.length - 1];
}

/** secured: any result keeps it; reachable: needs at most 5.00; unreachable: needs more than 5.00. */
export type GoalState = 'secured' | 'reachable' | 'unreachable';

export interface ClassRequirement {
  band: DegreeClassBand;
  /** Average GPA needed in every remaining semester (unclamped). */
  requiredGpa: number;
  state: GoalState;
}

export interface DegreeGoalInput {
  currentCgpa: number;
  /** Graded credit units so far. */
  completedUnits: number;
  remainingSemesters: number;
  unitsPerSemester: number;
  /**
   * Graded units in semesters not yet marked complete. They are already inside
   * `currentCgpa`/`completedUnits`, so they must not be counted as remaining again.
   */
  gradedInProgressUnits?: number;
  targetClass: TargetClass;
}

export type DegreeGoalPlan =
  | { kind: 'final'; current: DegreeClassBand }
  | {
      kind: 'plan';
      remainingUnits: number;
      target: ClassRequirement;
      keepCurrent: ClassRequirement;
      maxReachable: number;
      /** When the target is out of reach: the best class still reachable. */
      suggestion: DegreeClassBand | null;
    };

/**
 * A6 degree-class goal. Each class's target is its lowest CGPA (minCGPA), so
 * "reachable" means the maximum reachable CGPA is at least that value. The
 * suggestion compares unrounded values for the same reason, so it never
 * suggests the class that was just found to be out of reach.
 */
export function planDegreeGoal(input: DegreeGoalInput): DegreeGoalPlan {
  const completedUnits = Math.max(0, Number(input.completedUnits) || 0);
  const currentCgpa = completedUnits > 0 ? Number(input.currentCgpa) || 0 : 0;
  const gradedInProgress = Math.max(0, Number(input.gradedInProgressUnits) || 0);
  const remainingUnits = Math.max(
    0,
    Math.max(0, Math.floor(input.remainingSemesters)) * Math.max(0, Number(input.unitsPerSemester) || 0) - gradedInProgress,
  );
  const current = resolveDegreeClass(currentCgpa);
  if (!(remainingUnits > 0)) return { kind: 'final', current };

  const plan = { currentCgpa, completedUnits, remainingUnits };
  const requirementFor = (band: DegreeClassBand): ClassRequirement => {
    const requiredGpa = requiredAverageForTarget({ ...plan, targetCgpa: band.minCGPA }) ?? 0;
    const state: GoalState = requiredGpa <= 0 ? 'secured' : requiredGpa <= MAX_GRADE_POINT ? 'reachable' : 'unreachable';
    return { band, requiredGpa, state };
  };

  const maxReachable = maxReachableCgpa(plan);
  const target = requirementFor(bandFor(input.targetClass));
  const suggestion = target.state === 'unreachable'
    ? DEGREE_CLASS_BANDS.find(band => maxReachable >= band.minCGPA) ?? null
    : null;

  return {
    kind: 'plan',
    remainingUnits,
    target,
    keepCurrent: requirementFor(current),
    maxReachable,
    suggestion,
  };
}
