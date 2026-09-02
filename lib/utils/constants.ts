import type { Grade, GradeScaleEntry } from '@/types/course';
import type { DegreeClass } from '@/types/analytics';

/** Application name constant */
export const APP_NAME = 'AcadeGrade';

/** Application tagline */
export const APP_TAGLINE = 'Know where you stand. Know where you\'re going.';

/** Default university */
export const DEFAULT_UNIVERSITY = 'ESUT Agbani';

/** Nigerian 5-point grade scale — default, can be overridden by admin */
export const GRADE_SCALE: GradeScaleEntry[] = [
  { minScore: 70, maxScore: 100, grade: 'A' as Grade, gradePoint: 5 },
  { minScore: 60, maxScore: 69, grade: 'B' as Grade, gradePoint: 4 },
  { minScore: 50, maxScore: 59, grade: 'C' as Grade, gradePoint: 3 },
  { minScore: 45, maxScore: 49, grade: 'D' as Grade, gradePoint: 2 },
  { minScore: 40, maxScore: 44, grade: 'E' as Grade, gradePoint: 1 },
  { minScore: 0, maxScore: 39, grade: 'F' as Grade, gradePoint: 0 },
];

/** Degree class thresholds */
export const DEGREE_CLASSES: DegreeClass[] = [
  {
    label: 'First Class',
    shortLabel: '1st',
    colorToken: '--class-first',
    icon: '🏆',
    minCGPA: 4.5,
    maxCGPA: 5.0,
  },
  {
    label: 'Second Class Upper (2:1)',
    shortLabel: '2:1',
    colorToken: '--class-2upper',
    icon: '🎖',
    minCGPA: 3.5,
    maxCGPA: 4.49,
  },
  {
    label: 'Second Class Lower (2:2)',
    shortLabel: '2:2',
    colorToken: '--class-2lower',
    icon: '✅',
    minCGPA: 2.4,
    maxCGPA: 3.49,
  },
  {
    label: 'Third Class',
    shortLabel: '3rd',
    colorToken: '--class-third',
    icon: '⚠️',
    minCGPA: 1.5,
    maxCGPA: 2.39,
  },
  {
    label: 'Pass',
    shortLabel: 'Pass',
    colorToken: '--class-pass',
    icon: '🔴',
    minCGPA: 1.0,
    maxCGPA: 1.49,
  },
  {
    label: 'Fail',
    shortLabel: 'Fail',
    colorToken: '--class-fail',
    icon: '❌',
    minCGPA: 0,
    maxCGPA: 0.99,
  },
];

/** Student levels in Nigerian universities */
export const STUDENT_LEVELS = [100, 200, 300, 400, 500] as const;

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
