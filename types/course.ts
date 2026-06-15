import { Timestamp } from 'firebase/firestore';

/** Letter grade in Nigerian 5-point scale */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Firestore users/{uid}/semesters/{semesterId}/courses/{courseId} document */
export interface Course {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Course with its Firestore document ID */
export interface CourseWithId extends Course {
  id: string;
}

/** Input data for creating/editing a course (before computation) */
export interface CourseInput {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  grade?: Grade;
  estimated?: boolean;
  isAR?: boolean;
}

/** Computed metrics for a single course */
export interface CourseMetrics {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: Grade;
  gradePoint: number;
  piPoint: number;
  estimated: boolean;
}

/** Admin-managed course catalog entry */
export interface CatalogCourse {
  code: string;
  title: string;
  units: number;
  dept: string;
  level: number;
  semester: 1 | 2;
  createdAt: Timestamp;
}

/** Catalog course with document ID */
export interface CatalogCourseWithId extends CatalogCourse {
  id: string;
}

/** Grade scale entry — used for lookups and admin overrides */
export interface GradeScaleEntry {
  minScore: number;
  maxScore: number;
  grade: Grade;
  gradePoint: number;
}

/** Semester computation result */
export interface SemesterResult {
  gpa: number;
  pi: number;
  creditLoaded: number;
  courseCount: number;
  gradeDistribution: Record<Grade, number>;
}

/** Cumulative computation result */
export interface CumulativeResult {
  cgpa: number;
  pi: number;
  totalCredits: number;
  totalCourses: number;
}
