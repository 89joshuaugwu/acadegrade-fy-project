import type { StoredGradingScale } from '@/lib/cgpa/scaleSetting';
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
  /** A5: level the student entered at (default 100). */
  entryLevel?: 100 | 200 | 300;
  /** A5: 0..4 extra semesters after the final level. */
  spilloverSemesters?: number;
  semestersCompleted?: number;
  matricNormalized?: string;
  setupComplete?: boolean;
  setupCompletedAt?: Timestamp;
  isAdmin: boolean;
  disabled: boolean;
  fcmToken: string | null;
  fcmTokens?: string[];
  /** Client-written device list keyed by sha256(token).slice(0, 16); see lib/firebase/fcm-devices.ts. */
  fcmDevices?: Record<string, { platform?: string; label?: string; appVersion?: string; addedAt?: number; lastSeenAt?: number }>;
  notificationPreferences?: {
    semesterSaved?: boolean;
    degreeClass?: boolean;
    aiInsights?: boolean;
    adminBroadcasts?: boolean;
  };
  tourCompleted?: boolean;
  resultsTourCompleted?: boolean;
  tourVersions?: Record<string, number>;
  /** A7: the student's usual units per semester (integers 1-60, min <= max). Warnings only. */
  creditLoadRange?: { min: number; max: number };
  /** C1: milestone id -> when it was first reached. Missing on older accounts (seeded silently). */
  milestones?: Record<string, unknown>;
  /** Grading scale choice (optional; absent means the 5-point scale). Resolve with useGradingScale / resolveGradingScale. */
  gradingScale?: StoredGradingScale;
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
  entryLevel?: 100 | 200 | 300;
  spilloverSemesters?: number;
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
