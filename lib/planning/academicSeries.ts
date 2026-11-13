import { computeCumulativeCGPA } from '@/lib/cgpa/academicRules';

export interface SeriesSemester {
  level: number;
  semester: number;
  gpa?: number | null;
  pi?: number | null;
  creditLoaded?: number | null;
}

export interface AcademicSeries {
  /** Semester PI, oldest first, for every semester with graded credits. */
  piHistory: number[];
  /** Running CGPA after each of those semesters. */
  cgpaHistory: number[];
  /** "100L S1" style labels matching the two histories. */
  labels: string[];
  currentCgpa: number;
  /** Graded credit units (creditLoaded already excludes awaiting-result and pending rows). */
  gradedCredits: number;
}

const credits = (s: SeriesSemester) => Number(s.creditLoaded) || 0;

/**
 * GPA/PI history and current CGPA under the owner rule: every graded course
 * counts whether or not its semester is marked complete. Semesters with no
 * graded credits (only awaiting-result or pending rows) are left out.
 * Expects semesters in chronological order.
 */
export function buildAcademicSeries(semesters: readonly SeriesSemester[]): AcademicSeries {
  const graded = semesters.filter(s => credits(s) > 0);
  const piHistory: number[] = [];
  const cgpaHistory: number[] = [];
  const labels: string[] = [];
  graded.forEach((s, index) => {
    piHistory.push(Number(s.pi) || 0);
    cgpaHistory.push(computeCumulativeCGPA(graded.slice(0, index + 1).map(toSummary)).cgpa);
    labels.push(`${s.level}L S${s.semester}`);
  });
  const total = computeCumulativeCGPA(graded.map(toSummary));
  return { piHistory, cgpaHistory, labels, currentCgpa: total.cgpa, gradedCredits: total.totalCredits };
}

function toSummary(s: SeriesSemester) {
  return { gpa: Number(s.gpa) || 0, pi: Number(s.pi) || 0, creditLoaded: credits(s) };
}
