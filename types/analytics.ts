import { Timestamp } from 'firebase/firestore';
import { SemesterSummary } from './semester';

/** Firestore analytics/{uid} document */
export interface Analytics {
  cgpa: number;
  pi: number;
  degreeClass: string;
  totalCredits: number;
  semesterHistory: SemesterSummary[];
  regressionSlope: number;
  projectedCGPA: number;
  riskScore: number;
  lastUpdated: Timestamp;
}

/** Degree class classification */
export interface DegreeClass {
  label: string;
  shortLabel: string;
  colorToken: string;
  icon: string;
  minCGPA: number;
  maxCGPA: number;
}

/** Trend direction from regression analysis */
export type TrendDirection = 'improving' | 'stable' | 'declining';

/** Firestore config/settings document */
export interface PlatformSettings {
  announcementBanner: string | null;
  maintenanceMode: boolean;
  aiSystemPrompt: string;
  gradeScale: {
    minScore: number;
    grade: string;
    gradePoint: number;
  }[];
}

/** Firestore config/admins document */
export interface AdminConfig {
  emails: string[];
}

/** Firestore notifications/{uid}/items/{notifId} document */
export interface Notification {
  type: 'achievement' | 'warning' | 'tip' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

/** Notification with document ID */
export interface NotificationWithId extends Notification {
  id: string;
}

/** RTDB notif_counts/{uid} structure */
export interface NotificationCount {
  unread: number;
}

/** Admin dashboard stat overview */
export interface PlatformAnalytics {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  activeThisWeek: number;
  cgpaDistribution: { bucket: string; count: number }[];
  departmentBreakdown: { dept: string; count: number; avgCGPA: number }[];
  dailySignups: { date: string; count: number }[];
}
