import { Timestamp } from 'firebase/firestore';
import { SemesterSummary } from './semester';
import type { AdsConfig } from '@/lib/ads/types';

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
  disableSignups?: boolean;
  aiSystemPrompt: string;
  gradeScale: {
    minScore: number;
    grade: string;
    gradePoint: number;
  }[];
  /** Additive typed ads foundation. Legacy advertBanners remains supported separately. */
  adsConfig?: AdsConfig;
}

/** Firestore config/admins document */
export interface AdminConfig {
  emails: string[];
}

/** Firestore notifications/{uid}/items/{notifId} document */
export interface Notification {
  type: 'achievement' | 'warning' | 'tip' | 'system' | 'info' | 'success' | 'error' | 'ai';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
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
