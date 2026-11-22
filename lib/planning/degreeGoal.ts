import {
  DEGREE_CLASS_BANDS,
  MAX_GRADE_POINT,
  maxReachableCgpa,
  requiredAverageForTarget,
  resolveDegreeClass,
  type DegreeClassBand,
  type DegreeClassShortLabel,
  type GradingScale,
} from '@/lib/cgpa/academicRules';

/**
 * A degree class a student can aim for (saved as `users/{uid}.targetClass`):
 * a class short label on the active scale ('1st', '2:1', ... on the 5-point scale).
 */
export type TargetClass = Exclude<DegreeClassShortLabel, 'Fail'> | (string & {});

/** A class as the goal planner uses it: the ng5 band, or a class on the active scale. */
export interface GoalBand {
  label: string;
  shortLabel: string;
  minCGPA: number;
}

function scaleBands(scale: GradingScale): GoalBand[] {
  return [...scale.classes]
    .sort((a, b) => b.minCgpa - a.minCgpa)
    .map((cls) => ({ label: cls.name, shortLabel: cls.shortLabel, minCGPA: cls.minCgpa }));
}

/** Classes worth aiming for on a scale (every class but the lowest). */
export function targetClassOptions(scale?: GradingScale): { value: TargetClass; label: string }[] {
  if (!scale) return [...TARGET_CLASS_OPTIONS];
  const bands = scaleBands(scale);
  return bands.slice(0, Math.max(1, bands.length - 1)).map((band) => ({ value: band.shortLabel, label: band.label }));
}

/** The default goal: the second class on the scale (2:1 on the 5-point scale). */
export function defaultTargetClass(scale?: GradingScale): TargetClass {
  const options = targetClassOptions(scale);
  return options[Math.min(1, options.length - 1)]?.value ?? '2:1';
}

export const TARGET_CLASS_OPTIONS: readonly { value: TargetClass; label: string }[] = DEGREE_CLASS_BANDS
  .filter((band): band is DegreeClassBand & { shortLabel: TargetClass } => band.shortLabel !== 'Fail')
  .map(band => ({ value: band.shortLabel, label: band.label }));

export function parseTargetClass(value: unknown, scale?: GradingScale): TargetClass | null {
  return targetClassOptions(scale).find(option => option.value === value)?.value ?? null;
}

export function bandFor(shortLabel: DegreeClassShortLabel): DegreeClassBand;
export function bandFor(shortLabel: string, scale?: GradingScale): GoalBand;
export function bandFor(shortLabel: string, scale?: GradingScale): GoalBand {
  if (scale) {
    const bands = scaleBands(scale);
    return bands.find(band => band.shortLabel === shortLabel) ?? bands[bands.length - 1];
  }
  return DEGREE_CLASS_BANDS.find(band => band.shortLabel === shortLabel) ?? DEGREE_CLASS_BANDS[DEGREE_CLASS_BANDS.length - 1];
}

/** secured: any result keeps it; reachable: needs at most the top point (5.00); unreachable: needs more. */
export type GoalState = 'secured' | 'reachable' | 'unreachable';

export interface ClassRequirement {
  band: GoalBand;
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
  /** The student's scale; the 5-point scale when left out. */
  scale?: GradingScale;
}

export type DegreeGoalPlan =
  | { kind: 'final'; current: GoalBand }
  | {
      kind: 'plan';
      remainingUnits: number;
      target: ClassRequirement;
      keepCurrent: ClassRequirement;
      maxReachable: number;
      /** When the target is out of reach: the best class still reachable. */
      suggestion: GoalBand | null;
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
  const scale = input.scale;
  const bands: readonly GoalBand[] = scale ? scaleBands(scale) : DEGREE_CLASS_BANDS;
  const topPoint = scale ? scale.maxPoint : MAX_GRADE_POINT;
  const current: GoalBand = scale
    ? bandFor(resolveDegreeClass(currentCgpa, scale).shortLabel, scale)
    : resolveDegreeClass(currentCgpa);
  if (!(remainingUnits > 0)) return { kind: 'final', current };

  const plan = { currentCgpa, completedUnits, remainingUnits };
  const requirementFor = (band: GoalBand): ClassRequirement => {
    const requiredGpa = requiredAverageForTarget({ ...plan, targetCgpa: band.minCGPA }) ?? 0;
    const state: GoalState = requiredGpa <= 0 ? 'secured' : requiredGpa <= topPoint ? 'reachable' : 'unreachable';
    return { band, requiredGpa, state };
  };

  const maxReachable = maxReachableCgpa(plan, scale);
  const target = requirementFor(scale ? bandFor(input.targetClass, scale) : bandFor(input.targetClass as DegreeClassShortLabel));
  const suggestion = target.state === 'unreachable'
    ? bands.find(band => maxReachable >= band.minCGPA) ?? null
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
