import { computeCourseMetrics, computeSemesterGPA, formatCgpa, type AcademicGrade } from '@/lib/cgpa/academicRules';
import { parsePortalText } from '@/lib/import/portalText';
import { USAGE_FEATURES } from '@/lib/usage/policy';
import { EXAMPLE_COURSES, EXAMPLE_STUDENT, computeExampleSlip } from './example-student';
import { ADULT_FEATURE_VALUE, coinsOn, dailyAllowance } from './features-shared';
import type { PublicUsage } from './usage-public';

/**
 * /features/result-scanner (docs/public-redesign/pages/features-result-scanner.md).
 * The slip is the example semester with its CA and exam scores; the live
 * plate recomputes with lib/cgpa/academicRules.ts.
 */

export const SCANNER_COPY = {
  title: 'Result scanner',
  description:
    'Photograph your Nigerian university result slip or paste your portal results. AcadeGrade turns them into course rows you check before anything is saved.',
  keywords: ['result slip scanner', 'scan university result', 'paste portal results', 'GPA from result slip'],
  h1: ['Snap the slip.', 'Check the rows.'],
  sentence:
    'AcadeGrade reads the courses, units and scores from a photo, image or PDF of your result slip. You check every row, and nothing is saved until you do.',
  rowsIntro: 'What AcadeGrade gives back: five rows for you to check. Change any value before you save.',
  rowsCaption: 'Course rows after a scan, on the website',
  close: 'Results out? Scan your slip and have your GPA in a minute.',
} as const;

/* -------------------------------------------------------------- the slip */

export interface SlipRow {
  sn: number;
  code: string;
  title: string;
  units: number;
  ca: number;
  exam: number;
  total: number;
  grade: AcademicGrade;
}

export function scannerSlip() {
  const rows: SlipRow[] = EXAMPLE_COURSES.map((course, index) => {
    const metrics = computeCourseMetrics({ code: course.code, title: course.title, units: course.units, caScore: course.ca, examScore: course.exam });
    return { sn: index + 1, code: course.code, title: course.title, units: course.units, ca: course.ca, exam: course.exam, total: metrics.totalScore ?? 0, grade: metrics.grade };
  });
  const slip = computeExampleSlip();
  return {
    heading: 'Statement of semester result',
    faculty: `${EXAMPLE_STUDENT.faculty} · ${EXAMPLE_STUDENT.department}`,
    identity: [
      `Name: ${EXAMPLE_STUDENT.name}`,
      `Reg. no.: ${EXAMPLE_STUDENT.regNo}`,
      `Level: ${EXAMPLE_STUDENT.level} · Session: ${EXAMPLE_STUDENT.session} · ${EXAMPLE_STUDENT.semester}`,
    ],
    rows,
    foot: `TNU ${slip.units} · TCP ${slip.points} · GPA ${formatCgpa(slip.gpa)} · CGPA ${formatCgpa(slip.cgpa)}`,
  };
}

/* ------------------------------------------------------------ live plate */

export interface PlateRow {
  code: string;
  title: string;
  units: number;
  ca: number;
  exam: number;
}

/** The plate's rows "as read": a crease turned GST 311's 2 units into 1. */
export const MISREAD_CODE = 'GST 311';

export function plateRows(state: 'as-read' | 'checked'): PlateRow[] {
  return EXAMPLE_COURSES.map((course) => ({
    code: course.code,
    title: course.title,
    units: state === 'as-read' && course.code === MISREAD_CODE ? 1 : course.units,
    ca: course.ca,
    exam: course.exam,
  }));
}

export interface PlateFigures {
  units: number;
  gpa: string;
  pi: string;
  rows: { code: string; total: number | null; grade: AcademicGrade }[];
}

/** GPA, PI and grades for the plate's rows, with the real engine. */
export function plateFigures(rows: readonly { code: string; title: string; units: number; ca: number | null; exam: number | null }[]): PlateFigures {
  const metrics = rows.map((row) =>
    computeCourseMetrics({
      code: row.code,
      title: row.title,
      units: Number.isFinite(row.units) && row.units > 0 ? row.units : 0,
      caScore: row.ca,
      examScore: row.exam,
    })
  );
  const semester = computeSemesterGPA(metrics);
  return {
    units: semester.creditLoaded,
    gpa: formatCgpa(semester.gpa),
    pi: formatCgpa(semester.pi),
    rows: metrics.map((m) => ({ code: m.code, total: m.totalScore, grade: m.grade })),
  };
}

export const PLATE_COPY = {
  heading: 'Every row, checked by you',
  description:
    'Scans are fast, not perfect. A crease, a shadow or a faint stamp can turn a 2 into a 1. Here GST 311 came through as 1 unit. Change it to 2 and watch the GPA correct itself.', // taste-skill-ignore: approved copy (a shadow on a photo), not a CSS shadow
  apply: 'Change it to 2',
  reset: 'Show it as read',
  tabs: { asRead: 'As read', checked: 'After your check' },
} as const;

/** "As read, GST 311 showed 1 unit and a GPA of 4.17." for the no-JavaScript fallback. */
export function plateFallbackLine(): string {
  return `As read, ${MISREAD_CODE} showed 1 unit and a GPA of ${plateFigures(plateRows('as-read')).gpa}.`;
}

/* ------------------------------------------------------------ step lines */

export const STEP_LINES: readonly { line: string; text: string }[] = [
  { line: 'First, photograph your slip.', text: "Use your phone's camera, or choose a JPG, PNG or PDF up to 10 MB. Lay the slip flat in good light." },
  { line: 'Then AcadeGrade reads each course.', text: 'Codes, titles, units, CA and exam scores come back as rows while you wait.' },
  { line: 'You check every row.', text: "Fix anything misread, add a course it missed, remove one you don't want." },
  { line: 'Nothing is saved until you do.', text: 'Save, and your semester GPA, PI and CGPA update at once.' },
];

/* ------------------------------------------------------------ ways in */

export interface WayRow {
  name: string;
  scan: string;
  paste: string;
  type: string;
}

/** The comparison table, with live allowances. The coins row only exists when coins are on for scans. */
export function waysIn(usage: PublicUsage | null): WayRow[] {
  const burst = USAGE_FEATURES.ocr.burst.limit;
  const scanDaily = dailyAllowance(usage, 'ocr', {
    count: (n) => `${n} scans in any 24 hours, at most ${burst} in 15 minutes`,
    unknown: 'Free scans every day',
  });
  const rows: WayRow[] = [
    { name: 'What you need', scan: 'A photo, image or PDF of your slip', paste: 'The results text from your school portal', type: 'Your slip in front of you' },
    { name: 'Who can use it', scan: `Students ${ADULT_FEATURE_VALUE} who allow AI processing`, paste: 'Everyone, including under-18s', type: 'Everyone' },
    { name: 'Free each day', scan: scanDaily, paste: 'No limit', type: 'No limit' },
  ];
  if (coinsOn(usage, 'ocr')) {
    rows.push({
      name: 'More when you need it',
      scan: 'On Android, extra scans with coins from short ads',
      paste: 'Not needed',
      type: 'Not needed',
    });
  }
  rows.push(
    { name: 'What leaves your phone', scan: 'The image or PDF, to be read', paste: 'Nothing until you save', type: 'Nothing until you save' },
    { name: 'Where', scan: 'Website and Android app', paste: 'Website and Android app', type: 'Website and Android app' },
    { name: 'Before saving', scan: 'You check every row', paste: 'You check every row', type: 'You check as you type' },
    { name: 'Best for', scan: 'A printed slip or a screenshot', paste: 'A results page you can copy', type: 'One course, or a quick fix' }
  );
  return rows;
}

/* ------------------------------------------------------------- paste sample */

export const PASTE_SAMPLE = [
  'Course Code   Course Title   Units   Score   Grade',
  ...EXAMPLE_COURSES.map((course) => {
    const total = course.ca + course.exam;
    const grade = computeCourseMetrics({ code: course.code, title: course.title, units: course.units, caScore: course.ca, examScore: course.exam }).grade;
    return `${course.code}   ${course.title}   ${course.units}   ${total}   ${grade}`;
  }),
].join('\n');

export function pasteResult() {
  const parsed = parsePortalText(PASTE_SAMPLE);
  const count = parsed.rows.length;
  return {
    rows: parsed.rows,
    unparsed: parsed.unparsed,
    found: `${count} ${count === 1 ? 'course' : 'courses'} found`,
    action: `Add ${count} ${count === 1 ? 'course' : 'courses'} for review`,
  };
}

/* ----------------------------------------------------------------- receipt */

export const SCAN_RECEIPT = {
  heading: 'What happens to your slip',
  paragraph:
    'Scanning is optional and stays off until you allow AI processing. When you scan, the picture is sent to an AI provider named in our privacy notice, read, and returned as rows. AcadeGrade does not keep the file; only the rows you confirm are saved.',
  link: { href: '/privacy#ai-and-scanning', label: 'Read the scanning section of the privacy notice' },
  name: 'Your scan',
  rows: [
    { label: 'Sent to be read', value: 'The image or PDF' },
    { label: 'Your name and reg. no. on the slip', value: 'Go with the picture' },
    { label: 'From a PDF with real text', value: 'Name, reg. no. and email lines removed first' },
    { label: 'Read by', value: 'An AI provider in our privacy notice' },
    { label: 'Provider request logs', value: 'Up to 55 days, for abuse checks' },
    { label: 'Training on your slip', value: 'We ask providers not to' },
    { label: 'Saved to your record', value: 'Only the rows you confirm' },
    { label: 'Your consent', value: 'Off until you allow it' },
  ],
  total: { label: 'Files kept after the scan', value: '0' },
} as const;

export const UNDER_18_LINE = {
  lead: 'Under 18?',
  text: 'Scanning stays off for your account, but pasting and typing work exactly the same, and so does everything you save.',
} as const;
