import type { Grade, GradeScaleEntry } from '@/types/course';
import type { DegreeClass } from '@/types/analytics';
import { DEGREE_CLASS_BANDS, GRADE_BANDS, type DegreeClassShortLabel } from '@/lib/cgpa/academicRules';

/** Application name constant */
export const APP_NAME = 'AcadeGrade';

/** Application tagline */
export const APP_TAGLINE = 'Know where you stand. Know where you\'re going.';

/** Default university */
export const DEFAULT_UNIVERSITY = 'ESUT Agbani';

/** Nigerian 5-point grade scale — from the shared academic rules (lower-bound bands) */
export const GRADE_SCALE: GradeScaleEntry[] = GRADE_BANDS.map((band) => ({ ...band }));

/** Theme color token per degree class */
const DEGREE_CLASS_COLOR_TOKENS: Record<DegreeClassShortLabel, string> = {
  '1st': '--class-first',
  '2:1': '--class-2upper',
  '2:2': '--class-2lower',
  '3rd': '--class-third',
  Pass: '--class-pass',
  Fail: '--class-fail',
};

/**
 * Degree classes, highest first. Labels, icons and thresholds come from the
 * shared academic rules. minCGPA/maxCGPA describe the rounded 2-decimal range;
 * classify with resolveDegreeClass (lib/cgpa/degreeClass), never by comparing
 * a raw CGPA against these ranges.
 */
export const DEGREE_CLASSES: DegreeClass[] = DEGREE_CLASS_BANDS.map(({ label, shortLabel, icon, minCGPA, maxCGPA }) => ({
  label,
  shortLabel,
  colorToken: DEGREE_CLASS_COLOR_TOKENS[shortLabel],
  icon,
  minCGPA,
  maxCGPA,
}));

/** Student levels in Nigerian universities */
export const STUDENT_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const;

/** Grade color tokens for UI rendering */
export const GRADE_COLORS: Record<Grade, string> = {
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
  E: 'var(--grade-e)',
  F: 'var(--grade-f)',
};

/** Maximum credit units per course */
export const MAX_CREDIT_UNITS = 6;

/** Minimum credit units per course */
export const MIN_CREDIT_UNITS = 1;

/** Maximum CA score */
export const MAX_CA_SCORE = 30;

/** Maximum Exam score */
export const MAX_EXAM_SCORE = 70;

/** Maximum total score */
export const MAX_TOTAL_SCORE = 100;

/** AI rate limit: 1 call per 24 hours */
export const AI_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

/** Cloudinary cloud name */
export const CLOUDINARY_CLOUD_NAME = 'dgqukbs8n';

/** Cloudinary upload preset */
export const CLOUDINARY_UPLOAD_PRESET = 'acadegrade';

/** Landing page feature list */
export const FEATURES = [
  {
    title: 'AI Academic Insights',
    description: 'Powered by Gemini 3.1 Flash-Lite for personalized analysis.',
    icon: 'BrainCircuit',
  },
  {
    title: 'Dual Metric System',
    description: 'Track both CGPA and Performance Index simultaneously.',
    icon: 'BarChart3',
  },
  {
    title: 'Semester Tracking',
    description: 'Organize results by level and semester with real-time GPA.',
    icon: 'BookOpen',
  },
  {
    title: 'PDF Transcript',
    description: 'Export a complete academic transcript as a downloadable PDF.',
    icon: 'FileText',
  },
  {
    title: 'What-If Calculator',
    description: 'Calculate the GPA you need to reach your target CGPA.',
    icon: 'Calculator',
  },
  {
    title: 'Degree Projection',
    description: 'See your projected degree class based on current trajectory.',
    icon: 'TrendingUp',
  },
  {
    title: 'Push Notifications',
    description: 'Get notified about GPA changes, risks, and achievements.',
    icon: 'Bell',
  },
  {
    title: 'Works Offline',
    description: 'Progressive Web App — access your data without internet.',
    icon: 'WifiOff',
  },
  {
    title: 'Course Catalog',
    description: 'Admin-managed courses with autocomplete for easy entry.',
    icon: 'Library',
  },
] as const;

/** University marquee list for landing page */
export const NIGERIAN_UNIVERSITIES = [
  'ESUT', 'UNILAG', 'OAU', 'ABU', 'UNIBEN', 'UNN',
  'LASU', 'UNIPORT', 'UI', 'FUTO', 'UNICAL', 'UNILORIN',
] as const;
