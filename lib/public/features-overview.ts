import { formatCgpa, requiredAverageForTarget, roundCgpa } from '@/lib/cgpa/academicRules';
import { requiredGpa } from '@/app/(public)/tools/tool-math';
import {
  EXAMPLE_COURSES,
  EXAMPLE_PRIOR_SEMESTERS,
  EXAMPLE_PRIOR_TOTALS,
  computeExampleSlip,
  exampleCourseMetrics,
  exampleSemesterFromScores,
} from './example-student';
import { ADULT_FEATURE_VALUE } from './features-shared';

/**
 * /features (docs/public-redesign/pages/features.md). Every figure is worked
 * out from the example student with the real engine and pinned in
 * tests/unit/public/product-data.test.ts.
 */

export const FEATURES_COPY = {
  /** The root layout's template adds " | AcadeGrade". */
  title: 'Features',
  description:
    'Everything AcadeGrade does for Nigerian university students: GPA, CGPA and PI, result scanning, AcadeMind, timetables with reminders and transcripts you can share.',
  keywords: ['CGPA tracker Nigeria', 'result slip scanner', 'degree class calculator', 'student timetable app'],
  h1: ['From result slip', 'to plan.'],
  sentence:
    'AcadeGrade keeps every semester, works out your GPA, CGPA, PI and degree class, and helps you plan the next one. Free for Nigerian university students, on the web and on Android.',
  heroLinks: [
    { href: '/calculator', label: 'Try the calculator first' },
    { href: '/app', label: 'Get the Android app' },
  ],
} as const;

/* ------------------------------------------------------------ contents sheet */

export interface ContentsRow {
  name: string;
  value: string;
  description: string;
  href: string;
}

export interface ContentsGroup {
  name: string;
  rows: ContentsRow[];
}

export const CONTENTS_GROUPS: readonly ContentsGroup[] = [
  {
    name: 'Your record',
    rows: [
      { name: 'Semesters, GPA and CGPA', value: 'Web and Android', description: 'GPA and PI each semester, CGPA, class and carry-overs', href: '#record' },
      { name: 'Transcript and share links', value: 'Web and Android', description: 'A clean PDF, or a link that expires', href: '#transcript' },
      { name: 'Course codes for classmates', value: 'Web and Android', description: 'Share your course list; scores stay private', href: '#sharing' },
    ],
  },
  {
    name: 'Getting results in',
    rows: [
      { name: 'Result scanner', value: ADULT_FEATURE_VALUE, description: 'Photograph the slip; check every row', href: '#scanner' },
      { name: 'Paste from your portal', value: 'Everyone', description: 'Copy your results page; check every row', href: '#scanner' },
    ],
  },
  {
    name: 'Planning',
    rows: [
      { name: 'AcadeMind', value: ADULT_FEATURE_VALUE, description: 'Written analysis, forecast and what-if', href: '#academind' },
      { name: 'Timetables', value: 'Reminders on Android', description: 'Lectures, reading plans and exams', href: '#timetable' },
      { name: 'Free planning tools', value: 'No sign-up', description: 'Required GPA, carry-over impact and more', href: '#planning' },
    ],
  },
];

/* ------------------------------------------------------------------ receipt */

export interface ReceiptRow {
  label: string;
  value: string;
}

export interface ReceiptGroup {
  name: string;
  rows: ReceiptRow[];
}

export interface WorkedRecord {
  groups: ReceiptGroup[];
  total: { label: string; value: string };
  cgpa: string;
  caption: string;
  semesterPoints: number;
  semesterUnits: number;
  gpa: string;
  pi: string;
  totalUnits: number;
  totalPoints: number;
}

/** The receipt that adds up to the example CGPA (54 points, GPA 4.15, PI 3.30, 385 ÷ 87 = 4.43). */
export function workedRecord(): WorkedRecord {
  const slip = computeExampleSlip();
  const semester = exampleSemesterFromScores();
  const scores = exampleCourseMetrics().map((metrics) => metrics.totalScore ?? 0);
  const priorCount = EXAMPLE_PRIOR_SEMESTERS.length;
  const courseRows = slip.rows.map((row) => ({
    label: `${row.code} ${row.title} · ${row.units} units × ${row.grade} (${row.point})`,
    value: String(row.weighted),
  }));
  const gpa = formatCgpa(slip.gpa);
  const pi = formatCgpa(semester.pi);
  const cgpa = formatCgpa(slip.cgpa);
  return {
    groups: [
      {
        name: 'Before this semester',
        rows: [{ label: `100L and 200L, ${priorCount === 4 ? 'four' : priorCount} semesters`, value: `${EXAMPLE_PRIOR_TOTALS.units} units · ${EXAMPLE_PRIOR_TOTALS.points} points` }],
      },
      {
        name: '2025/2026 First Semester',
        rows: [
          ...courseRows,
          { label: `Semester: ${slip.points} points ÷ ${slip.units} units`, value: `GPA ${gpa}` },
          { label: `Performance Index (scores ${scores.join(', ')})`, value: `PI ${pi}` },
        ],
      },
      {
        name: 'Your record',
        rows: [
          { label: 'All units', value: String(slip.totalUnits) },
          { label: 'All points', value: String(slip.totalPoints) },
        ],
      },
    ],
    total: { label: `CGPA: ${slip.totalPoints} ÷ ${slip.totalUnits}`, value: cgpa },
    cgpa,
    caption: `CGPA after ${slip.totalUnits} units · ${slip.classBand.label} · ${formatCgpa(slip.toFirstClass)} to First Class`,
    semesterPoints: slip.points,
    semesterUnits: slip.units,
    gpa,
    pi,
    totalUnits: slip.totalUnits,
    totalPoints: slip.totalPoints,
  };
}

/* ------------------------------------------------------------- degree goal */

/** Three more semesters of the example's 13 units. */
export const EXAMPLE_SEMESTERS_LEFT = 3;
export const EXAMPLE_UNITS_PER_SEMESTER = EXAMPLE_COURSES.reduce((sum, course) => sum + course.units, 0);

export interface DegreeGoal {
  current: string;
  target: string;
  targetLabel: string;
  semestersLeft: number;
  unitsPerSemester: number;
  /** Required average, rounded up (4.67). */
  required: string;
  /** Target average score, "93". */
  averageScore: number;
  /** Average that keeps Second Class Upper, rounded up (1.44). */
  upperFloor: string;
}

/** The degree goal: First Class (4.50) from 385 points over 87 units with 3 × 13 units left. */
export function exampleDegreeGoal(target = 4.5): DegreeGoal {
  const slip = computeExampleSlip();
  const remaining = EXAMPLE_SEMESTERS_LEFT * EXAMPLE_UNITS_PER_SEMESTER;
  const current = slip.totalPoints / slip.totalUnits;
  const outcome = requiredGpa({ currentCgpa: current, completedUnits: slip.totalUnits, remainingUnits: remaining, targetCgpa: target });
  const raw = requiredAverageForTarget({ currentCgpa: current, completedUnits: slip.totalUnits, remainingUnits: remaining, targetCgpa: target }) ?? 0;
  const floor = requiredGpa({ currentCgpa: current, completedUnits: slip.totalUnits, remainingUnits: remaining, targetCgpa: 3.5 });
  return {
    current: formatCgpa(current),
    target: target.toFixed(2),
    targetLabel: 'First Class',
    semestersLeft: EXAMPLE_SEMESTERS_LEFT,
    unitsPerSemester: EXAMPLE_UNITS_PER_SEMESTER,
    required: outcome.status === 'needed' ? outcome.required.toFixed(2) : formatCgpa(raw),
    averageScore: Math.round((raw / 5) * 100),
    upperFloor: floor.status === 'needed' ? floor.required.toFixed(2) : formatCgpa(roundCgpa(0)),
  };
}

/* ------------------------------------------------------------------ sheets */

export interface FeatureSheet {
  id: 'scanner' | 'academind' | 'timetable' | 'planning';
  field: 'ink' | 'violet' | 'gold' | 'paper';
  name: string;
  facts: [string, string, string];
  paragraph: string;
  link: { href: string; label: string };
}

export const FEATURE_SHEETS: readonly FeatureSheet[] = [
  {
    id: 'scanner',
    field: 'ink',
    name: 'Scan or paste your results',
    facts: ['Photo, image or PDF up to 10 MB', 'Paste text from your school portal', 'You check every row before saving'],
    paragraph:
      'Photograph your result slip or paste your portal page. AcadeGrade reads the courses into rows, you check each one, and nothing is saved until you say so.',
    link: { href: '/features/result-scanner', label: 'How the result scanner works' },
  },
  {
    id: 'academind',
    field: 'violet',
    name: 'AcadeMind reads your record',
    facts: ['Written analysis', 'Forecast of your CGPA', 'What-if guidance'],
    paragraph:
      'AcadeMind writes a plain analysis of your semesters, shows where your CGPA is heading and answers what-if questions. It is guidance to plan with, never a verdict.',
    link: { href: '/features/ai-insights', label: 'Meet AcadeMind' },
  },
  {
    id: 'timetable',
    field: 'gold',
    name: 'Timetables that remind you',
    facts: ['Lectures, reading and exams', 'Build with AcadeMind', 'Reminders on Android, even offline'],
    paragraph:
      'Put in your lectures and exams, or let AcadeMind lay out a reading plan around them. Your Android phone reminds you before each one, with or without data.',
    link: { href: '/features/timetable', label: 'See how timetables work' },
  },
  {
    id: 'planning',
    field: 'paper',
    name: 'Plan the next semester',
    facts: ['Required GPA for your target class', "Preview grades you're still waiting for", 'Carry-over impact'],
    paragraph:
      "Pick the class you're aiming for and see the GPA you need. Try the grade you expect for a course that's still awaiting result, and see what a carry-over does to your CGPA.",
    link: { href: '/tools', label: 'Open the free tools' },
  },
];

/* --------------------------------------------------------------- transcript */

export const TRANSCRIPT_TICKET = {
  heading: 'A transcript you can share safely',
  lines: [
    'Every semester in one clean PDF',
    'Print it, or hide or show your photo',
    'Marked as your own record, not an official one',
    'Share it as a link with a QR code',
  ],
  value: '30 days',
  stubLines: ['Links last 1, 7 or 30 days', 'Full record or summary only', 'Optional PIN of 4 to 6 digits', 'Delete a link any time'],
  action: { label: 'Make your transcript', href: '/register', signedInHref: '/transcript' },
  under:
    'People you share with see a clean copy labelled as a self-reported record. When the link expires or you delete it, it stops working.',
} as const;

/* ------------------------------------------------------------- small things */

export interface SmallPoint {
  id?: string;
  title: string;
  text: string;
}

export const SMALL_POINTS: readonly SmallPoint[] = [
  { id: 'sharing', title: 'Course codes for classmates', text: 'Share your course list as a code or link. Classmates get the codes, titles and units; your scores stay private.' },
  { title: 'Carry-overs flagged', text: 'An F stays marked until you pass the course again, with what it does to your CGPA.' },
  { title: 'Weighted average score', text: 'Your average mark across every course, weighted by units, beside your CGPA.' },
  { title: "Grades you're waiting for", text: 'Try the grade you expect for a course awaiting result and watch your CGPA move. Nothing is saved.' },
  { title: 'Unit-load check', text: "A gentle note if a course is entered twice or a semester's units fall outside your school's range." },
  { title: 'Milestones', text: 'A quiet note when you reach something good. Never a comparison with anyone else.' },
  { title: 'Semester recap', text: 'A one-time summary when you complete a semester: what you earned and what changed.' },
  { title: 'Direct entry and spill-over', text: 'Started in 200L or 300L, or have extra semesters? Your timeline fits.' },
  { title: 'Data saver', text: 'Lighter screens and fewer images when your data is running low.' },
  { title: 'Signed-in devices', text: "See where you're signed in and sign out everywhere at once." },
  { title: 'Notices and support', text: 'Announcements in your inbox, and a support inbox that replies to you in the app.' },
  { title: 'Light or dark', text: 'Follows your phone, or choose for yourself.' },
];

/* ----------------------------------------------------------------- privacy */

export const PRIVACY_ROWS: readonly { figure: string; text: string }[] = [
  {
    figure: '18+',
    text: 'AcadeMind and result scanning are for students 18 and over, and only after you allow them. Under 18? Your record, the calculator, paste-from-portal and timetables all work.',
  },
  { figure: '1, 7, 30', text: 'Days a share link can last. You choose, and you can delete a link sooner.' },
  { figure: '4–6', text: 'Digits in the optional PIN that guards a share link.' },
  {
    figure: '0',
    text: 'Records sold. We never sell your personal information, and classmates never see your scores, even when you share course codes.',
  },
];

export const CLOSE_COPY = {
  headline: ['Start with', 'one slip.'],
  sentence: 'Add this semester’s results and your GPA, CGPA and class are ready in minutes. Free, private and yours.',
} as const;
