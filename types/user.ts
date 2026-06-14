import { Timestamp } from 'firebase/firestore';

/** Student level in Nigerian university system */
export type StudentLevel = 100 | 200 | 300 | 400 | 500;

/** Record mode determines how students enter their results */
export type RecordMode = 'fromScratch' | 'complete';

/** Primary metric display preference */
export type GradeMode = 'cgpa' | 'pi';

/** Firestore users/{uid} document */
export interface User {
  name: string;
  email: string;
  matric: string;
  dept: string;
  level: StudentLevel;
  programme: string;
  university: string;
  avatarUrl: string | null;
  recordMode: RecordMode;
  gradeMode: GradeMode;
  currentSession: string;
  isAdmin: boolean;
  disabled: boolean;
  fcmToken: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** User with uid for client-side usage */
export interface UserWithId extends User {
  uid: string;
}

/** Registration form data (before Firebase Auth) */
export interface RegisterFormData {
  fullName: string;
  matric: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  department: string;
  programme: string;
  currentLevel: StudentLevel;
  currentSession: string;
  recordMode: RecordMode;
  semestersCompleted?: number;
}

/** Onboarding past semester confirmation */
export interface PastSemesterEntry {
  level: StudentLevel;
  semester: 1 | 2;
  session: string;
  label: string;
}
