import { Timestamp } from 'firebase/firestore';

/** Student level in Nigerian university system */
export const STUDENT_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const;
export type StudentLevel = typeof STUDENT_LEVELS[number];

/** Record mode determines how students enter their results */
export type RecordMode = 'fromScratch' | 'complete';

/** Primary metric display preference */
export type GradeMode = 'cgpa' | 'pi';

/** Firestore users/{uid} document */
export interface User {
  fullName: string;
  email: string;
  matric: string;
  department: string;
  currentLevel: StudentLevel;
  programme: string;
  university: string;
  avatarUrl: string | null;
  recordMode: RecordMode;
  gradeMode: GradeMode;
  currentSession: string;
  entrySession?: string;
  graduationSession?: string;
  courseDuration?: number;
  semestersCompleted?: number;
  matricNormalized?: string;
  setupComplete?: boolean;
  setupCompletedAt?: Timestamp;
  isAdmin: boolean;
  disabled: boolean;
  fcmToken: string | null;
  fcmTokens?: string[];
  notificationPreferences?: {
    semesterSaved?: boolean;
    degreeClass?: boolean;
    aiInsights?: boolean;
    adminBroadcasts?: boolean;
  };
  tourCompleted?: boolean;
  resultsTourCompleted?: boolean;
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
  entrySession?: string;
  graduationSession?: string;
  courseDuration: number;
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
