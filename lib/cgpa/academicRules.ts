/**
 * AcadeGrade academic rules: the single source of truth for grading,
 * GPA/CGPA, degree classification, target planning and carry-overs.
 *
 * This file is byte-identical in acadegrade-web/lib/cgpa/academicRules.ts and
 * acadegrade-mobile/lib/cgpa/academicRules.ts. Both repos run the shared
 * fixture tests/fixtures/academic-rules.json against it. Keep it pure: no
 * imports, no platform APIs, erasable TypeScript only (Node strips the types
 * when the Android tests import it directly).
 *
 * Grading scales: every function that depends on bands, grade points, the
 * maximum point or degree classes takes an optional trailing `scale`
 * (a GradingScale from SCALES, validateCustomScale, validateNceClasses or
 * resolveGradingScale). Without one it uses today's Nigerian 5-point scale and
 * returns exactly what it always has, with the A-F types. With a scale, grades
 * are that scale's labels (plain strings) and degree classes are ScaleClass.
 */

export type AcademicGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Top of the 5-point scale. */
export const MAX_GRADE_POINT = 5;

export interface GradeBand {
  grade: AcademicGrade;
  minScore: number;
  /** Highest whole-number score in the band, for display only. */
  maxScore: number;
  gradePoint: number;
}

/** Nigerian 5-point scale, highest band first. Matching uses minScore only. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { grade: 'A', minScore: 70, maxScore: 100, gradePoint: 5 },
  { grade: 'B', minScore: 60, maxScore: 69, gradePoint: 4 },
  { grade: 'C', minScore: 50, maxScore: 59, gradePoint: 3 },
  { grade: 'D', minScore: 45, maxScore: 49, gradePoint: 2 },
  { grade: 'E', minScore: 40, maxScore: 44, gradePoint: 1 },
  { grade: 'F', minScore: 0, maxScore: 39, gradePoint: 0 },
];

export const GRADE_POINTS: Readonly<Record<AcademicGrade, number>> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Removes binary floating-point noise (e.g. 69.99999999999999 -> 70) without changing real decimals. */
function clean(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * Grade and grade point for a total score. Lower-bound bands, so there are no
 * gaps: 69.5 is a B, never an F. Non-finite or below-range scores are F (with a
 * scale: the scale's fail grade, the band that starts at 0).
 * The second argument is either a GradingScale or (legacy) a list of A-F bands.
 */
export function gradeFromScore(totalScore: number, scale: GradingScale): { grade: string; gradePoint: number };
export function gradeFromScore(
  totalScore: number,
  bands?: readonly Pick<GradeBand, 'grade' | 'minScore' | 'gradePoint'>[]
): { grade: AcademicGrade; gradePoint: number };
export function gradeFromScore(
  totalScore: number,
  bandsOrScale: unknown = GRADE_BANDS
): { grade: string; gradePoint: number } {
  const scale = isGradingScale(bandsOrScale) ? bandsOrScale : null;
  const bands: readonly ScaleBand[] = scale
    ? scale.bands
    : Array.isArray(bandsOrScale) ? bandsOrScale as readonly ScaleBand[] : GRADE_BANDS;
  if (isFiniteNumber(totalScore)) {
    const score = clean(totalScore);
    let best: ScaleBand | undefined;
    for (const band of bands) {
      if (score >= band.minScore && (!best || band.minScore > best.minScore)) best = band;
    }
    if (best) return { grade: best.grade, gradePoint: best.gradePoint };
  }
  return { grade: scale ? failGrade(scale) : 'F', gradePoint: 0 };
}

/** Rows that are not results yet and never count towards GPA, CGPA or carry-overs. */
export interface AcademicRowFlags {
  /** Awaiting result. */
  isAR?: boolean;
  /** Imported course definition (share code / partial OCR) awaiting the student's score or grade. */
  pending?: boolean;
}

/** G is the grade type: A-F on the default scale, any scale label (string) with a scale. */
export interface AcademicCourseInput<G extends string = AcademicGrade> extends AcademicRowFlags {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  grade?: G | null;
}

export interface AcademicCourseMetrics<G extends string = AcademicGrade> extends AcademicRowFlags {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: G;
  gradePoint: number;
  /** Continuous PI point: totalScore / 100 * max point, or the grade point when only a letter is known. */
  piPoint: number;
  estimated: boolean;
}

/** True when a row is awaiting a result or still pending and must not be counted. */
export function isNotYetGraded(row: AcademicRowFlags): boolean {
  return row.isAR === true || row.pending === true;
}

/**
 * Metrics for one course. Scores win over a letter grade; a letter grade alone
 * is "estimated" with PI equal to its grade point; nothing known is F/0.
 * With a scale, a letter that is not on the scale counts as nothing known
 * (the scale's fail grade, 0 points, not estimated); use gradePointFor to spot it.
 * isAR/pending are carried through only when provided (Firestore rejects undefined).
 */
export function computeCourseMetrics(course: AcademicCourseInput<string>, scale: GradingScale): AcademicCourseMetrics<string>;
export function computeCourseMetrics(course: AcademicCourseInput): AcademicCourseMetrics;
export function computeCourseMetrics(course: AcademicCourseInput<string>, scaleArg?: unknown): AcademicCourseMetrics<string> {
  const scale = isGradingScale(scaleArg) ? scaleArg : null;
  const totalScore = isFiniteNumber(course.caScore) && isFiniteNumber(course.examScore)
    ? course.caScore + course.examScore
    : null;

  let grade: string;
  let gradePoint: number;
  let piPoint: number;
  let estimated = false;
  const letterBand = scale && course.grade ? bandForGrade(course.grade, scale) : null;

  if (totalScore !== null) {
    ({ grade, gradePoint } = scale ? gradeFromScore(totalScore, scale) : gradeFromScore(totalScore));
    piPoint = (totalScore / 100) * (scale ? scale.maxPoint : MAX_GRADE_POINT);
  } else if (!scale && course.grade) {
    grade = course.grade;
    gradePoint = GRADE_POINTS[grade as AcademicGrade];
    piPoint = gradePoint;
    estimated = true;
  } else if (letterBand) {
    grade = letterBand.grade;
    gradePoint = letterBand.gradePoint;
    piPoint = gradePoint;
    estimated = true;
  } else {
    grade = scale ? failGrade(scale) : 'F';
    gradePoint = 0;
    piPoint = 0;
  }

  return {
    code: course.code,
    title: course.title,
    units: course.units,
    caScore: course.caScore,
    examScore: course.examScore,
    totalScore,
    grade,
    gradePoint,
    piPoint,
    estimated,
    ...(course.isAR !== undefined ? { isAR: course.isAR } : {}),
    ...(course.pending !== undefined ? { pending: course.pending } : {}),
  };
}

export interface GpaRow<G extends string = AcademicGrade> extends AcademicRowFlags {
  units: number;
  gradePoint: number;
  piPoint: number;
  grade: G;
}

export interface SemesterGpaResult<G extends string = AcademicGrade> {
  gpa: number;
  pi: number;
  creditLoaded: number;
  courseCount: number;
  gradeDistribution: Record<G, number>;
}

/**
 * Semester GPA and PI. GPA = sum(gradePoint x units) / sum(units) over graded
 * rows; awaiting-result and pending rows are skipped. courseCount is every row.
 * With a scale, gradeDistribution has a zero entry for every grade on the scale.
 */
export function computeSemesterGPA(courses: readonly GpaRow<string>[], scale: GradingScale): SemesterGpaResult<string>;
export function computeSemesterGPA(courses: readonly GpaRow[]): SemesterGpaResult;
export function computeSemesterGPA(courses: readonly GpaRow<string>[], scaleArg?: unknown): SemesterGpaResult<string> {
  const scale = isGradingScale(scaleArg) ? scaleArg : null;
  let totalWeightedGP = 0;
  let totalWeightedPI = 0;
  let totalUnits = 0;
  const gradeDistribution: Record<string, number> = {};
  for (const band of scale ? scale.bands : GRADE_BANDS) gradeDistribution[band.grade] = 0;

  for (const course of courses) {
    if (isNotYetGraded(course)) continue;
    totalWeightedGP += course.gradePoint * course.units;
    totalWeightedPI += course.piPoint * course.units;
    totalUnits += course.units;
    gradeDistribution[course.grade] = (gradeDistribution[course.grade] ?? 0) + 1;
  }

  return {
    gpa: totalUnits > 0 ? totalWeightedGP / totalUnits : 0,
    pi: totalUnits > 0 ? totalWeightedPI / totalUnits : 0,
    creditLoaded: totalUnits,
    courseCount: courses.length,
    gradeDistribution,
  };
}

export interface SemesterSummaryInput {
  gpa: number;
  pi: number;
  creditLoaded: number;
  /** Ignored for CGPA (see computeCumulativeCGPA). */
  isComplete?: boolean;
}

export interface CumulativeCgpaResult {
  cgpa: number;
  pi: number;
  totalCredits: number;
  totalCourses: number;
}

/**
 * CGPA and cumulative PI weighted by each semester's graded credit load.
 * creditLoaded already excludes awaiting-result and pending rows.
 * Scale-independent: the semester GPAs already carry the scale's points.
 *
 * Rule: every graded (non-AR, non-pending) course counts, whether or not its
 * semester is marked complete. Do not filter semesters by isComplete before
 * calling this; it ignores that flag on purpose so web and Android agree.
 */
export function computeCumulativeCGPA(semesters: readonly SemesterSummaryInput[]): CumulativeCgpaResult {
  let totalWeightedGPA = 0;
  let totalWeightedPI = 0;
  let totalCredits = 0;

  for (const sem of semesters) {
    const credits = Number(sem.creditLoaded) || 0;
    if (credits > 0) {
      totalWeightedGPA += (Number(sem.gpa) || 0) * credits;
      totalWeightedPI += (Number(sem.pi) || 0) * credits;
      totalCredits += credits;
    }
  }

  return {
    cgpa: totalCredits > 0 ? totalWeightedGPA / totalCredits : 0,
    pi: totalCredits > 0 ? totalWeightedPI / totalCredits : 0,
    totalCredits,
    totalCourses: 0,
  };
}

/**
 * CGPA/GPA rounded half-up to the 2 decimals the UI shows. Float-safe: 4.495,
 * 0.995 and 2.675 round up as written. Non-finite input gives 0.
 */
export function roundCgpa(value: number | null | undefined): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(clean(value * 100)) / 100;
}

/** The 2-decimal CGPA/GPA string to display. Always agrees with resolveDegreeClass. */
export function formatCgpa(value: number | null | undefined): string {
  return roundCgpa(value).toFixed(2);
}

export type DegreeClassShortLabel = '1st' | '2:1' | '2:2' | '3rd' | 'Pass' | 'Fail';

export interface DegreeClassBand {
  label: string;
  shortLabel: DegreeClassShortLabel;
  icon: string;
  /** Formal wording used on transcripts. */
  transcriptLabel: string;
  /** Lowest rounded CGPA in the class. Classification uses only this. */
  minCGPA: number;
  /** Highest rounded (2-decimal) CGPA in the class, for display. */
  maxCGPA: number;
}

/** Degree classes, highest first. Lower-bound thresholds on the rounded CGPA; no gaps. */
export const DEGREE_CLASS_BANDS: readonly DegreeClassBand[] = [
  { label: 'First Class', shortLabel: '1st', icon: '🏆', transcriptLabel: 'First Class Honours', minCGPA: 4.5, maxCGPA: 5.0 },
  { label: 'Second Class Upper (2:1)', shortLabel: '2:1', icon: '🎖', transcriptLabel: 'Second Class Honours (Upper Division)', minCGPA: 3.5, maxCGPA: 4.49 },
  { label: 'Second Class Lower (2:2)', shortLabel: '2:2', icon: '✅', transcriptLabel: 'Second Class Honours (Lower Division)', minCGPA: 2.4, maxCGPA: 3.49 },
  { label: 'Third Class', shortLabel: '3rd', icon: '⚠️', transcriptLabel: 'Third Class Honours', minCGPA: 1.5, maxCGPA: 2.39 },
  { label: 'Pass', shortLabel: 'Pass', icon: '🔴', transcriptLabel: 'Pass', minCGPA: 1.0, maxCGPA: 1.49 },
  { label: 'Fail', shortLabel: 'Fail', icon: '❌', transcriptLabel: 'Fail', minCGPA: 0, maxCGPA: 0.99 },
];

// ---------------------------------------------------------------------------
// Grading scales
// ---------------------------------------------------------------------------

export type GradingScaleId = 'ng5' | 'ng5-noE' | 'nbte4' | 'nce5' | 'custom';
export type ReadyGradingScaleId = Exclude<GradingScaleId, 'custom'>;

/** One grade band of a scale. Matching uses minScore only (lower bound, no gaps). */
export interface ScaleBand {
  /** Grade label: A-F on ng5, two letters such as AB on nbte4, 1-3 characters on a custom scale. */
  grade: string;
  minScore: number;
  gradePoint: number;
}

/** One degree class of a scale. Classification uses minCgpa on the rounded CGPA only. */
export interface ScaleClass {
  name: string;
  shortLabel: string;
  minCgpa: number;
  /** Formal wording for transcripts, when it differs from name. Ready-made scales only. */
  transcriptLabel?: string;
}

export interface GradingScale {
  id: GradingScaleId;
  name: string;
  /** Highest minScore first; the last band starts at 0 and is the fail grade (0 points). */
  bands: readonly ScaleBand[];
  maxPoint: number;
  /** Highest minCgpa first; the last class starts at 0 (the fail class). */
  classes: readonly ScaleClass[];
}

const NG5_CLASSES: readonly ScaleClass[] = DEGREE_CLASS_BANDS.map((band) => ({
  name: band.label,
  shortLabel: band.shortLabel,
  minCgpa: band.minCGPA,
  transcriptLabel: band.transcriptLabel,
}));

const NG5_BANDS: readonly ScaleBand[] = GRADE_BANDS.map(({ grade, minScore, gradePoint }) => ({ grade, minScore, gradePoint }));

const scaleBand = (grade: string, minScore: number, gradePoint: number): ScaleBand => ({ grade, minScore, gradePoint });
const scaleClass = (name: string, shortLabel: string, minCgpa: number): ScaleClass => ({ name, shortLabel, minCgpa, transcriptLabel: name });

/** The ready-made scales. ng5 is today's scale and the default everywhere. */
export const SCALES: Readonly<Record<ReadyGradingScaleId, GradingScale>> = {
  ng5: { id: 'ng5', name: '5-point (with E)', bands: NG5_BANDS, maxPoint: 5, classes: NG5_CLASSES },
  'ng5-noE': {
    id: 'ng5-noE',
    name: '5-point (no E)',
    bands: [scaleBand('A', 70, 5), scaleBand('B', 60, 4), scaleBand('C', 50, 3), scaleBand('D', 45, 2), scaleBand('F', 0, 0)],
    maxPoint: 5,
    classes: NG5_CLASSES,
  },
  nbte4: {
    id: 'nbte4',
    name: 'Polytechnic 4-point (NBTE)',
    bands: [
      scaleBand('A', 75, 4), scaleBand('AB', 70, 3.5), scaleBand('B', 65, 3.25), scaleBand('BC', 60, 3),
      scaleBand('C', 55, 2.75), scaleBand('CD', 50, 2.5), scaleBand('D', 45, 2.25), scaleBand('E', 40, 2), scaleBand('F', 0, 0),
    ],
    maxPoint: 4,
    classes: [
      scaleClass('Distinction', 'Dist', 3.5), scaleClass('Upper Credit', 'Upper', 3), scaleClass('Lower Credit', 'Lower', 2.5),
      scaleClass('Pass', 'Pass', 2), scaleClass('Fail', 'Fail', 0),
    ],
  },
  nce5: {
    id: 'nce5',
    name: 'NCE 5-point',
    bands: NG5_BANDS,
    maxPoint: 5,
    classes: [
      scaleClass('Distinction', 'Dist', 4.5), scaleClass('Credit', 'Credit', 3.5), scaleClass('Merit', 'Merit', 2.4),
      scaleClass('Pass', 'Pass', 1), scaleClass('Fail', 'Fail', 0),
    ],
  },
};

/** Ready-made scale ids in picker order. */
export const READY_SCALE_IDS: readonly ReadyGradingScaleId[] = ['ng5', 'ng5-noE', 'nbte4', 'nce5'];

/** The ready-made scale with this id, or null (including for 'custom', which has no fixed definition). */
export function scaleById(id: string | null | undefined): GradingScale | null {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SCALES, id) ? SCALES[id as ReadyGradingScaleId] : null;
}

/** Runtime check used for every optional scale argument; anything else (e.g. an array index from .map) means the default scale. */
export function isGradingScale(value: unknown): value is GradingScale {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const scale = value as Partial<GradingScale>;
  return Array.isArray(scale.bands) && Array.isArray(scale.classes) && isFiniteNumber(scale.maxPoint);
}

function normaliseGradeLabel(grade: unknown): string {
  return String(grade ?? '').trim().toUpperCase();
}

function bandForGrade(grade: unknown, scale: GradingScale): ScaleBand | null {
  const wanted = normaliseGradeLabel(grade);
  if (!wanted) return null;
  for (const band of scale.bands) if (normaliseGradeLabel(band.grade) === wanted) return band;
  return null;
}

/** Grade point of a letter on the scale (case and spaces ignored), or null when the letter is not on it. */
export function gradePointFor(grade: string | null | undefined, scale: GradingScale): number | null {
  const band = bandForGrade(grade, scale);
  return band ? band.gradePoint : null;
}

/** The scale's fail grade: the band with the lowest minScore ('F' on every ready-made scale). */
export function failGrade(scale: GradingScale): string {
  let lowest: ScaleBand | undefined;
  for (const band of scale.bands) if (!lowest || band.minScore < lowest.minScore) lowest = band;
  return lowest ? lowest.grade : 'F';
}

export interface ScaleBandRange extends ScaleBand {
  /** Highest whole-number score in the band, for display only. */
  maxScore: number;
}

/** The scale's bands, highest first, with a display maxScore (ng5 gives the GRADE_BANDS values). */
export function scaleBandRanges(scale: GradingScale): ScaleBandRange[] {
  const sorted = [...scale.bands].sort((a, b) => b.minScore - a.minScore);
  return sorted.map((band, index) => ({
    grade: band.grade,
    minScore: band.minScore,
    maxScore: index === 0 ? 100 : Math.ceil(sorted[index - 1].minScore) - 1,
    gradePoint: band.gradePoint,
  }));
}

export interface ScaleClassRange extends ScaleClass {
  /** Highest rounded (2-decimal) CGPA in the class, for display. */
  maxCgpa: number;
}

/** The scale's classes, highest first, with a display maxCgpa (ng5 gives the DEGREE_CLASS_BANDS values). */
export function scaleClassRanges(scale: GradingScale): ScaleClassRange[] {
  const sorted = [...scale.classes].sort((a, b) => b.minCgpa - a.minCgpa);
  return sorted.map((cls, index) => ({
    ...cls,
    maxCgpa: index === 0 ? scale.maxPoint : roundCgpa(sorted[index - 1].minCgpa - 0.01),
  }));
}

export interface ScaleValidationError {
  /** Which input failed: 'scale', 'name', 'maxPoint', 'bands', 'bands[2].grade', 'classes[0].minCgpa', 'credit', ... */
  field: string;
  message: string;
}

export type ScaleValidationResult =
  | { ok: true; scale: GradingScale }
  | { ok: false; errors: ScaleValidationError[] };

export const CUSTOM_SCALE_LIMITS = {
  minBands: 2,
  maxBands: 12,
  maxGradeLength: 3,
  minMaxPoint: 1,
  maxMaxPoint: 10,
  minClasses: 1,
  maxClasses: 8,
  maxClassNameLength: 30,
  maxShortLabelLength: 12,
  maxScaleNameLength: 40,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks a student-defined scale and returns it normalised (labels trimmed,
 * grades upper-cased, bands and classes sorted highest first, id 'custom').
 * Limits: top grade point 1-10; 2-12 bands with a 1-3 character label, a unique
 * minimum score 0-100 and 0 to top points; one band starts at 0 and is worth 0;
 * a higher band is never worth fewer points; 1-8 classes with a unique name of
 * up to 30 characters, optional short label up to 12, a unique minimum CGPA from
 * 0 to the top point, and one class starting at 0.
 */
export function validateCustomScale(input: unknown): ScaleValidationResult {
  const L = CUSTOM_SCALE_LIMITS;
  const errors: ScaleValidationError[] = [];
  const add = (field: string, message: string) => { errors.push({ field, message }); };
  if (!isRecord(input)) return { ok: false, errors: [{ field: 'scale', message: 'Add the grade bands and classes for your scale.' }] };

  let name = 'Custom';
  if (input.name !== undefined && input.name !== null) {
    if (typeof input.name !== 'string') add('name', 'The scale name must be text.');
    else if (input.name.trim().length > L.maxScaleNameLength) add('name', `Keep the scale name to ${L.maxScaleNameLength} characters or fewer.`);
    else if (input.name.trim()) name = input.name.trim();
  }

  const maxPoint = input.maxPoint;
  const maxOk = isFiniteNumber(maxPoint) && maxPoint >= L.minMaxPoint && maxPoint <= L.maxMaxPoint;
  if (!maxOk) add('maxPoint', `The top grade point must be between ${L.minMaxPoint} and ${L.maxMaxPoint}.`);
  const topPoint = maxOk ? maxPoint : L.maxMaxPoint;

  const bands: ScaleBand[] = [];
  if (!Array.isArray(input.bands)) {
    add('bands', 'Add the grade bands for your scale.');
  } else {
    const before = errors.length;
    if (input.bands.length < L.minBands || input.bands.length > L.maxBands) add('bands', `Use between ${L.minBands} and ${L.maxBands} grade bands.`);
    const grades = new Set<string>();
    const mins = new Set<number>();
    input.bands.forEach((raw: unknown, index: number) => {
      const field = `bands[${index}]`;
      if (!isRecord(raw)) { add(field, 'Each band needs a grade, a minimum score and grade points.'); return; }
      const itemBefore = errors.length;
      const grade = typeof raw.grade === 'string' ? raw.grade.trim().toUpperCase() : '';
      if (grade.length < 1 || grade.length > L.maxGradeLength) add(`${field}.grade`, `Grade labels are 1 to ${L.maxGradeLength} characters, like A or AB.`);
      else if (grades.has(grade)) add(`${field}.grade`, `Grade ${grade} is used more than once.`);
      else grades.add(grade);
      const minScore = raw.minScore;
      if (!isFiniteNumber(minScore) || minScore < 0 || minScore > 100) add(`${field}.minScore`, 'Minimum scores must be between 0 and 100.');
      else if (mins.has(minScore)) add(`${field}.minScore`, `Two bands start at ${minScore}.`);
      else mins.add(minScore);
      const gradePoint = raw.gradePoint;
      if (!isFiniteNumber(gradePoint) || gradePoint < 0 || gradePoint > topPoint) add(`${field}.gradePoint`, `Grade points must be between 0 and ${topPoint}.`);
      if (errors.length === itemBefore) bands.push({ grade, minScore: minScore as number, gradePoint: gradePoint as number });
    });
    if (errors.length === before) {
      bands.sort((a, b) => b.minScore - a.minScore);
      const lowest = bands[bands.length - 1];
      if (lowest.minScore !== 0) add('bands', 'One band must start at 0 so every score gets a grade.');
      else if (lowest.gradePoint !== 0) add('bands', `The band that starts at 0 (${lowest.grade}) is the fail grade and must be worth 0 points.`);
      for (let index = 1; index < bands.length; index++) {
        if (bands[index].gradePoint > bands[index - 1].gradePoint) {
          add('bands', `${bands[index].grade} is worth more points than ${bands[index - 1].grade}, which needs a higher score.`);
          break;
        }
      }
    }
  }

  const classes: ScaleClass[] = [];
  if (!Array.isArray(input.classes)) {
    add('classes', 'Add the degree classes for your scale.');
  } else {
    const before = errors.length;
    if (input.classes.length < L.minClasses || input.classes.length > L.maxClasses) add('classes', `Use between ${L.minClasses} and ${L.maxClasses} classes.`);
    const names = new Set<string>();
    const mins = new Set<number>();
    input.classes.forEach((raw: unknown, index: number) => {
      const field = `classes[${index}]`;
      if (!isRecord(raw)) { add(field, 'Each class needs a name and a minimum CGPA.'); return; }
      const itemBefore = errors.length;
      const className = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (className.length < 1 || className.length > L.maxClassNameLength) add(`${field}.name`, `Class names are 1 to ${L.maxClassNameLength} characters.`);
      else if (names.has(className.toLowerCase())) add(`${field}.name`, `${className} is used more than once.`);
      else names.add(className.toLowerCase());
      let shortLabel = className;
      if (raw.shortLabel !== undefined && raw.shortLabel !== null && raw.shortLabel !== '') {
        const short = typeof raw.shortLabel === 'string' ? raw.shortLabel.trim() : '';
        if (short.length < 1 || short.length > L.maxShortLabelLength) add(`${field}.shortLabel`, `Short labels are 1 to ${L.maxShortLabelLength} characters.`);
        else shortLabel = short;
      }
      const minCgpa = raw.minCgpa;
      if (!isFiniteNumber(minCgpa) || minCgpa < 0 || minCgpa > topPoint) add(`${field}.minCgpa`, `Minimum CGPAs must be between 0 and ${topPoint}.`);
      else if (mins.has(minCgpa)) add(`${field}.minCgpa`, `Two classes start at ${minCgpa}.`);
      else mins.add(minCgpa);
      if (errors.length === itemBefore) classes.push({ name: className, shortLabel, minCgpa: minCgpa as number });
    });
    if (errors.length === before) {
      classes.sort((a, b) => b.minCgpa - a.minCgpa);
      if (classes[classes.length - 1].minCgpa !== 0) add('classes', 'One class must start at 0 (usually Fail) so every CGPA gets a class.');
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, scale: { id: 'custom', name, bands, maxPoint: maxPoint as number, classes } };
}

/** Stored NCE class boundaries (users/{uid}.gradingScale.nceClasses). Missing keys keep the defaults. */
export interface NceClassBoundaries {
  distinction?: number;
  credit?: number;
  merit?: number;
  pass?: number;
}

const NCE_CLASS_KEYS = ['distinction', 'credit', 'merit', 'pass'] as const;

/**
 * The NCE scale with the college's own class boundaries. Each given value must be
 * above 0 and at most 5, and Distinction > Credit > Merit > Pass after merging
 * with the defaults (4.50, 3.50, 2.40, 1.00). Fail always starts at 0.
 */
export function validateNceClasses(input: unknown): ScaleValidationResult {
  const base = SCALES.nce5;
  if (input === undefined || input === null) return { ok: true, scale: base };
  if (!isRecord(input)) return { ok: false, errors: [{ field: 'nceClasses', message: 'Class boundaries must be numbers.' }] };
  const errors: ScaleValidationError[] = [];
  const mins: number[] = NCE_CLASS_KEYS.map((key, index) => {
    const value = input[key];
    if (value === undefined || value === null) return base.classes[index].minCgpa;
    if (!isFiniteNumber(value) || value <= 0 || value > base.maxPoint) {
      errors.push({ field: key, message: `${base.classes[index].name} must start above 0 and at most ${base.maxPoint}.` });
      return base.classes[index].minCgpa;
    }
    return value;
  });
  if (!errors.length) {
    for (let index = 1; index < mins.length; index++) {
      if (mins[index] >= mins[index - 1]) {
        errors.push({ field: NCE_CLASS_KEYS[index], message: `${base.classes[index].name} must start below ${base.classes[index - 1].name}.` });
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    scale: { ...base, classes: base.classes.map((cls, index) => (index < mins.length ? { ...cls, minCgpa: mins[index] } : { ...cls })) },
  };
}

/** Stored users/{uid}.gradingScale (optional; absent means ng5). */
export interface GradingScaleSetting {
  id: GradingScaleId;
  custom?: unknown;
  nceClasses?: NceClassBoundaries;
}

/**
 * The scale to use for a stored setting. Fail-open: a missing, unknown or invalid
 * setting gives ng5; an invalid NCE boundary set gives the default NCE classes.
 */
export function resolveGradingScale(setting: unknown): GradingScale {
  if (!isRecord(setting)) return SCALES.ng5;
  if (setting.id === 'custom') {
    const result = validateCustomScale(setting.custom);
    return result.ok ? result.scale : SCALES.ng5;
  }
  if (setting.id === 'nce5') {
    const result = validateNceClasses(setting.nceClasses);
    return result.ok ? result.scale : SCALES.nce5;
  }
  return scaleById(typeof setting.id === 'string' ? setting.id : null) ?? SCALES.ng5;
}

/**
 * Degree class of the displayed (rounded) CGPA. Missing or invalid values are Fail.
 * With a scale, returns the scale's class (the one with the highest minCgpa not
 * above the rounded CGPA); its rank is scale.classes.indexOf(result).
 */
export function resolveDegreeClass(cgpa: number | null | undefined, scale: GradingScale): ScaleClass;
export function resolveDegreeClass(cgpa: number | null | undefined): DegreeClassBand;
export function resolveDegreeClass(cgpa: number | null | undefined, scaleArg?: unknown): DegreeClassBand | ScaleClass {
  const rounded = roundCgpa(cgpa);
  if (isGradingScale(scaleArg)) {
    let best: ScaleClass | undefined;
    let lowest: ScaleClass | undefined;
    for (const cls of scaleArg.classes) {
      if (rounded >= cls.minCgpa && (!best || cls.minCgpa > best.minCgpa)) best = cls;
      if (!lowest || cls.minCgpa < lowest.minCgpa) lowest = cls;
    }
    return best ?? lowest ?? { name: 'Fail', shortLabel: 'Fail', minCgpa: 0 };
  }
  for (const band of DEGREE_CLASS_BANDS) {
    if (rounded >= band.minCGPA) return band;
  }
  return DEGREE_CLASS_BANDS[DEGREE_CLASS_BANDS.length - 1];
}

export interface TargetPlanInput {
  currentCgpa: number;
  completedUnits: number;
  remainingUnits: number;
}

/**
 * Average GPA needed over the remaining units to finish on targetCgpa:
 * (target x (completed + remaining) - current x completed) / remaining.
 * Returned unclamped (above the scale's max point = out of reach, below 0 =
 * already secured); null when there are no remaining units. Scale-independent:
 * compare the result with scale.maxPoint (MAX_GRADE_POINT by default).
 */
export function requiredAverageForTarget(input: TargetPlanInput & { targetCgpa: number }): number | null {
  const { currentCgpa, completedUnits, targetCgpa, remainingUnits } = input;
  if (!(remainingUnits > 0)) return null;
  const requiredTotalGP = (targetCgpa * (completedUnits + remainingUnits)) - (currentCgpa * completedUnits);
  return requiredTotalGP / remainingUnits;
}

/** Highest CGPA reachable if every remaining unit earns the maximum grade point (the scale's maxPoint). */
export function maxReachableCgpa(input: TargetPlanInput, scale?: GradingScale): number {
  const maxPoint = isGradingScale(scale) ? scale.maxPoint : MAX_GRADE_POINT;
  const completed = isFiniteNumber(input.completedUnits) && input.completedUnits > 0 ? input.completedUnits : 0;
  const remaining = isFiniteNumber(input.remainingUnits) && input.remainingUnits > 0 ? input.remainingUnits : 0;
  const current = isFiniteNumber(input.currentCgpa) ? input.currentCgpa : 0;
  const total = completed + remaining;
  if (total <= 0) return 0;
  return (current * completed + maxPoint * remaining) / total;
}

export interface CarryOverCourse<G extends string = AcademicGrade> extends AcademicRowFlags {
  code: string;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  grade?: G | null;
}

/** Uppercase with all whitespace removed, so "csc 201" and "CSC201" match. */
export function normaliseCourseCode(code: string): string {
  return String(code ?? '').toUpperCase().replace(/\s+/g, '');
}

/**
 * Grade under the scale, or null when the row is not a result yet or nothing is
 * known. With a scale, a letter that is not on the scale is unknown.
 */
function knownGrade(course: CarryOverCourse<string>, scale: GradingScale | null): string | null {
  if (isNotYetGraded(course)) return null;
  if (isFiniteNumber(course.caScore) && isFiniteNumber(course.examScore)) {
    const total = course.caScore + course.examScore;
    return scale ? gradeFromScore(total, scale).grade : gradeFromScore(total).grade;
  }
  if (isFiniteNumber(course.totalScore)) {
    return scale ? gradeFromScore(course.totalScore, scale).grade : gradeFromScore(course.totalScore).grade;
  }
  if (scale) return course.grade ? bandForGrade(course.grade, scale)?.grade ?? null : null;
  return course.grade ?? null;
}

/** A failed (F, or the scale's fail grade) course. Awaiting-result, pending and unknown rows are never carry-overs. */
export function isCarryOver(course: CarryOverCourse<string>, scale: GradingScale): boolean;
export function isCarryOver(course: CarryOverCourse): boolean;
export function isCarryOver(course: CarryOverCourse<string>, scaleArg?: unknown): boolean {
  const scale = isGradingScale(scaleArg) ? scaleArg : null;
  return knownGrade(course, scale) === (scale ? failGrade(scale) : 'F');
}

/**
 * Normalised codes of failed courses not passed in a later semester.
 * Semesters must be in chronological order. A later awaiting-result, pending or
 * unknown row does not clear a failure. Order follows each course's first
 * failure in its current outstanding run.
 */
export function outstandingCarryOvers(
  semesters: readonly { courses: readonly CarryOverCourse<string>[] }[],
  scale?: GradingScale
): string[] {
  const active = isGradingScale(scale) ? scale : null;
  const fail = active ? failGrade(active) : 'F';
  const outstanding = new Set<string>();
  for (const semester of semesters) {
    for (const course of semester.courses) {
      const code = normaliseCourseCode(course.code);
      if (!code) continue;
      const grade = knownGrade(course, active);
      if (grade === fail) outstanding.add(code);
      else if (grade !== null) outstanding.delete(code);
    }
  }
  return [...outstanding];
}

export interface WeightedAverageRow extends AcademicRowFlags {
  units: number;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  /** Grade-only row: a letter was entered but no score, so it has no percentage. */
  estimated?: boolean;
}

export interface WeightedAverageResult {
  /** Credit-weighted mean score (0-100), or null when no row has a score. */
  average: number | null;
  includedUnits: number;
  /** Rows left out because only a letter grade is known. */
  excludedEstimated: number;
  /** Rows left out because they are awaiting a result, pending, or have no score. */
  excludedNotGraded: number;
}

/**
 * Credit-weighted average score across graded rows: sum(score x units) / sum(units).
 * Score is CA + exam when both are known, else the total score. It is not a CGPA,
 * not a 4.0-scale grade and never official. Scale-independent: with nothing
 * excluded it equals the continuous PI average x 100 / max point (x 20 on ng5).
 */
export function weightedAverageScore(courses: readonly WeightedAverageRow[]): WeightedAverageResult {
  let weighted = 0;
  let includedUnits = 0;
  let excludedEstimated = 0;
  let excludedNotGraded = 0;
  for (const course of courses) {
    if (isNotYetGraded(course) || !isFiniteNumber(course.units) || course.units <= 0) {
      excludedNotGraded += 1;
      continue;
    }
    const score = isFiniteNumber(course.caScore) && isFiniteNumber(course.examScore)
      ? course.caScore + course.examScore
      : isFiniteNumber(course.totalScore) ? course.totalScore : null;
    if (score === null) {
      if (course.estimated === true) excludedEstimated += 1;
      else excludedNotGraded += 1;
      continue;
    }
    weighted += score * course.units;
    includedUnits += course.units;
  }
  return { average: includedUnits > 0 ? weighted / includedUnits : null, includedUnits, excludedEstimated, excludedNotGraded };
}

export type CreditLoadWarning =
  | { kind: 'duplicate_codes'; codes: string[] }
  | { kind: 'below_min'; units: number; min: number }
  | { kind: 'above_max'; units: number; max: number };

/**
 * Gentle warnings about a semester's registered load; they never block saving.
 * Units count every row (awaiting-result rows included). Duplicates are matched
 * with normaliseCourseCode and listed once, in order of first repeat. There is no
 * default range: without one only duplicates can warn. Scale-independent.
 */
export function creditLoadWarnings(
  courses: readonly { code: string; units: number }[],
  range?: { min: number; max: number } | null
): CreditLoadWarning[] {
  const warnings: CreditLoadWarning[] = [];
  const seen = new Set<string>();
  const repeated: string[] = [];
  let units = 0;
  for (const course of courses) {
    if (isFiniteNumber(course.units) && course.units > 0) units += course.units;
    const code = normaliseCourseCode(course.code);
    if (!code) continue;
    if (seen.has(code)) {
      if (!repeated.includes(code)) repeated.push(code);
    } else {
      seen.add(code);
    }
  }
  if (repeated.length) warnings.push({ kind: 'duplicate_codes', codes: repeated });
  if (range && isFiniteNumber(range.min) && isFiniteNumber(range.max) && courses.length > 0) {
    if (units < range.min) warnings.push({ kind: 'below_min', units, min: range.min });
    else if (units > range.max) warnings.push({ kind: 'above_max', units, max: range.max });
  }
  return warnings;
}
