import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';
import type { CourseInput, CourseMetrics, Grade } from '@/types/course';

const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_COURSES_PER_SEMESTER = 100;

export interface PreparedCourse {
  id?: string;
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: Grade | null;
  gradePoint: number;
  piPoint: number;
  estimated: boolean;
  isAR: boolean;
}

export interface PreparedSemesterSave {
  courses: PreparedCourse[];
  summary: {
    gpa: number;
    pi: number;
    creditLoaded: number;
    isComplete: true;
  };
}

export class SemesterSaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemesterSaveValidationError';
  }
}

function normalizedScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function prepareSemesterSave(inputs: CourseInput[]): PreparedSemesterSave {
  if (inputs.length === 0) {
    throw new SemesterSaveValidationError('Add at least one completed course before saving this semester.');
  }
  if (inputs.length > MAX_COURSES_PER_SEMESTER) {
    throw new SemesterSaveValidationError(`A semester can contain at most ${MAX_COURSES_PER_SEMESTER} courses.`);
  }

  const seenCodes = new Set<string>();
  const contributingMetrics: CourseMetrics[] = [];
  const courses = inputs.map((input, index): PreparedCourse => {
    const row = index + 1;
    const code = input.code.trim().toUpperCase();
    const title = input.title.trim();
    const units = Number(input.units);
    const caScore = normalizedScore(input.caScore);
    const examScore = normalizedScore(input.examScore);
    const isAR = input.isAR === true;

    if (!code) throw new SemesterSaveValidationError(`Course ${row}: enter a course code.`);
    if (!title) throw new SemesterSaveValidationError(`${code}: enter a course title.`);
    if (seenCodes.has(code)) throw new SemesterSaveValidationError(`${code} appears more than once.`);
    seenCodes.add(code);

    if (!Number.isInteger(units) || units < 1 || units > 6) {
      throw new SemesterSaveValidationError(`${code}: credit units must be a whole number from 1 to 6.`);
    }

    if (isAR) {
      return {
        ...(input.id ? { id: input.id } : {}),
        code,
        title,
        units,
        caScore: null,
        examScore: null,
        totalScore: null,
        grade: null,
        gradePoint: 0,
        piPoint: 0,
        estimated: true,
        isAR: true,
      };
    }

    const hasCA = caScore !== null;
    const hasExam = examScore !== null;
    if (hasCA !== hasExam) {
      throw new SemesterSaveValidationError(`${code}: enter both CA and exam scores, or use a letter grade.`);
    }
    if (hasCA && (caScore < 0 || caScore > 30)) {
      throw new SemesterSaveValidationError(`${code}: CA score must be between 0 and 30.`);
    }
    if (hasExam && (examScore < 0 || examScore > 70)) {
      throw new SemesterSaveValidationError(`${code}: exam score must be between 0 and 70.`);
    }

    const grade = GRADES.includes(input.grade as Grade) ? input.grade as Grade : undefined;
    if (!hasCA && !hasExam && !grade) {
      throw new SemesterSaveValidationError(`${code}: enter CA and exam scores, or select a letter grade.`);
    }

    const metrics = computeCourseMetrics({
      code,
      title,
      units,
      caScore,
      examScore,
      ...(grade ? { grade } : {}),
    });
    contributingMetrics.push(metrics);

    return {
      ...(input.id ? { id: input.id } : {}),
      ...metrics,
      isAR: false,
    };
  });

  if (contributingMetrics.length === 0) {
    throw new SemesterSaveValidationError('Add at least one graded course before completing this semester.');
  }

  const result = computeSemesterGPA(contributingMetrics);
  return {
    courses,
    summary: {
      gpa: result.gpa,
      pi: result.pi,
      creditLoaded: result.creditLoaded,
      isComplete: true,
    },
  };
}
