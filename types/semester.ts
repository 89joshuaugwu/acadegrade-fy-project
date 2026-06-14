import { Timestamp } from 'firebase/firestore';

/** Semester number within an academic session */
export type SemesterNumber = 1 | 2;

/** Firestore users/{uid}/semesters/{semesterId} document */
export interface Semester {
  label: string;
  session: string;
  level: number;
  semester: SemesterNumber;
  gpa: number;
  pi: number;
  creditLoaded: number;
  isComplete: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Semester with its Firestore document ID */
export interface SemesterWithId extends Semester {
  id: string;
}

/** Semester with its courses loaded */
export interface SemesterWithCourses extends SemesterWithId {
  courses: import('./course').CourseWithId[];
}

/** Summary format used in analytics and charts */
export interface SemesterSummary {
  semesterId: string;
  label: string;
  gpa: number;
  pi: number;
  creditLoaded: number;
  session: string;
}
