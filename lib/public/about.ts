import { formatCgpa, roundCgpa } from '@/lib/cgpa/academicRules';
import { SHARE_EXPIRY_CHOICES } from '@/lib/share/options';
import {
  EXAMPLE_COURSES,
  EXAMPLE_META_LINE,
  EXAMPLE_PRIOR_TOTALS,
  computeExampleSlip,
  exampleCourseMetrics,
  exampleSemesterFromScores,
} from './example-student';
import { LIVE_SCALES, type PublicScale } from './scales';

/**
 * Content for /about (docs/public-redesign/pages/about.md). The admin's four
 * fields (headline, description, mission, trust statement) come from
 * config/about; everything here is fixed product fact. The working sheet is
 * computed with the real engine, never typed.
 */

export interface AboutFact {
  fact: string;
  line: string;
}

export const ABOUT_FACTS: readonly AboutFact[] = [
  { fact: 'Enugu State, Nigeria', line: 'Where AcadeGrade is made and run.' },
  { fact: 'Nigerian universities', line: 'The 5-point scale, with PI beside GPA.' },
  { fact: 'Free for students', line: 'No subscription and no payment details.' },
  { fact: 'Web and Android', line: 'The website works on iPhone too.' },
];

export const OPERATOR_NAME = 'Joshua Chimaobie Ugwu';

export const OPERATOR_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Run by', value: OPERATOR_NAME },
  { label: 'Studied', value: 'Computer Science at ESUT' },
  { label: 'Based in', value: 'Enugu State, Nigeria' },
  { label: 'Price for students', value: 'Free' },
];

export const OPERATOR_NOTE = `${OPERATOR_NAME} operates AcadeGrade as an individual. It is not a company and is not affiliated with any university.`;

/** The founder's public profiles (owner-approved for About, PRODUCT.md). */
export const FOUNDER_LINE =
  'Joshua studied Computer Science at Enugu State University of Science and Technology (ESUT), Agbani. He builds AcadeGrade for students at Nigerian universities, the way he wanted it as one.';

export const FOUNDER_LINKS: readonly { href: string; label: string }[] = [
  { href: 'https://buildwithzaza.vercel.app', label: 'Portfolio' },
  { href: 'https://github.com/89joshuaugwu', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/joshua-ugwu-63b2b0283', label: 'LinkedIn' },
];

export interface CoverItem {
  name: string;
  value: string;
}

export interface CoverList {
  title: string;
  items: CoverItem[];
}

/** The grading lines for one live scale: generated from the scale data, so a new scale adds its own lines. */
export function gradingCoverItems(scale: PublicScale): CoverItem[] {
  const top = scale.gradeBands[0];
  const bottom = scale.gradeBands[scale.gradeBands.length - 1];
  const firstClass = scale.classBands[0];
  const lowestClass = scale.classBands.find((band) => band.engineShort === 'Pass') ?? scale.classBands[scale.classBands.length - 1];
  const items: CoverItem[] = [
    { name: `${scale.maxPoint}-point scale`, value: `${top.grade} = ${top.gradePoint} to ${bottom.grade} = ${bottom.gradePoint}` },
    { name: 'Degree classes', value: `${firstClass.label} to ${lowestClass.label}` },
  ];
  if (scale.hasPI) items.push({ name: 'Performance Index', value: 'beside every GPA' });
  return items;
}

export function coverLists(scales: readonly PublicScale[] = LIVE_SCALES): CoverList[] {
  const grading = scales.flatMap(gradingCoverItems);
  return [
    {
      title: 'Grading',
      items: [
        ...grading,
        { name: 'Carry-overs', value: 'flagged until passed' },
        { name: 'Levels', value: '100L to 500L' },
        { name: 'Entry', value: 'direct entry and spill-over' },
      ],
    },
    {
      title: 'Where',
      items: [
        { name: 'Website', value: 'any browser' },
        { name: 'Android', value: 'the AcadeGrade app' },
        { name: 'iPhone', value: 'the website in Safari' },
        { name: 'Free tools', value: 'no account needed' },
        { name: 'Transcripts', value: 'PDF and share links' },
      ],
    },
  ];
}

export const WORKING_PRINCIPLES: readonly { title: string; body: string; links?: { text: string; href: string }[] }[] = [
  {
    title: 'The rules are printed, not hidden.',
    body: 'The 5-point scale, the class bands and the PI formula are on the home page and in every free tool.',
    links: [
      { text: 'home page', href: '/' },
      { text: 'free tool', href: '/tools' },
    ],
  },
  { title: 'Every figure has its courses behind it.', body: 'Open any GPA in your record and you see the courses and units that made it.' },
  { title: 'One engine everywhere.', body: 'The website, the Android app, the calculator and the free tools all use the same calculation code.' },
  {
    title: 'Your handbook is the final word.',
    body: 'If your university uses different bands, its rules apply. AcadeGrade is your personal record, not an official result.',
  },
];

export interface SheetItem {
  name: string;
  description?: string;
  value: string;
  highlight?: boolean;
}

export interface SheetGroup {
  title: string;
  items: SheetItem[];
}

const two = (value: number) => value.toFixed(2);

/**
 * The working sheet: one course, the semester and the record for the
 * example student, every figure from lib/cgpa/academicRules.ts
 * (GPA 4.15, PI 3.30, CGPA 4.43, Second Class Upper, 0.07 to First Class).
 */
export function aboutWorkingSheet(scale: PublicScale = LIVE_SCALES[0]): { meta: string; groups: SheetGroup[] } {
  const metrics = exampleCourseMetrics();
  const first = metrics[0];
  const firstCourse = EXAMPLE_COURSES[0];
  const band = scale.gradeBands.find((entry) => entry.grade === first.grade);
  const semester = exampleSemesterFromScores();
  const weighted = metrics.map((course) => course.gradePoint * course.units);
  const points = weighted.reduce((sum, value) => sum + value, 0);
  const piWeighted = metrics.reduce((sum, course) => sum + course.piPoint * course.units, 0);
  const slip = computeExampleSlip();
  const prior = EXAMPLE_PRIOR_TOTALS;
  const firstClassFloor = scale.classBands[0].min;

  return {
    meta: EXAMPLE_META_LINE,
    groups: [
      {
        title: 'One course',
        items: [
          { name: `${firstCourse.code} ${firstCourse.title}`, value: `${firstCourse.units} units` },
          { name: 'Continuous assessment', value: `${firstCourse.ca} of ${scale.scoreSplit.ca}` },
          { name: 'Examination', value: `${firstCourse.exam} of ${scale.scoreSplit.exam}` },
          { name: 'Total', value: String(first.totalScore ?? firstCourse.ca + firstCourse.exam) },
          {
            name: 'Grade',
            description: band ? `${band.minScore} to ${band.maxScore} is an ${band.grade}` : undefined,
            value: `${first.grade} = ${first.gradePoint} points`,
          },
          { name: 'Units × points', value: `${first.units} × ${first.gradePoint} = ${first.units * first.gradePoint}` },
        ],
      },
      {
        title: 'The semester',
        items: [
          { name: `Units × points, ${metrics.length} courses`, description: weighted.join(' + '), value: String(points) },
          { name: 'Units taken', description: metrics.map((course) => course.units).join(' + '), value: String(semester.creditLoaded) },
          { name: 'Semester GPA', description: `${points} ÷ ${semester.creditLoaded}`, value: formatCgpa(semester.gpa) },
          {
            name: 'Performance Index',
            description: `Each total ÷ 100 × ${scale.maxPoint}, weighted by units: ${two(piWeighted)} ÷ ${semester.creditLoaded}`,
            value: formatCgpa(semester.pi),
          },
        ],
      },
      {
        title: 'The record',
        items: [
          { name: 'Before this semester', value: `${prior.points} points, ${prior.units} units` },
          {
            name: 'CGPA',
            description: `(${prior.points} + ${points}) ÷ (${prior.units} + ${semester.creditLoaded}) = ${slip.totalPoints} ÷ ${slip.totalUnits}`,
            value: formatCgpa(slip.cgpa),
            highlight: true,
          },
          { name: 'Class', value: slip.classBand.label },
          {
            name: `To ${scale.classBands[0].label} (${two(firstClassFloor)})`,
            value: slip.toFirstClass > 0 ? `${two(roundCgpa(slip.toFirstClass))} to go` : 'Reached',
          },
        ],
      },
    ],
  };
}

export const WORKING_SHEET_NOTES = [
  'Figures are rounded to two places, half up, and the class is read from the rounded CGPA.',
  'Your handbook decides if your school differs.',
] as const;

export interface Commitment {
  text: string;
  where: string;
  href?: string;
  /** Reopens the cookie stub instead of navigating. */
  cookieChoices?: boolean;
}

export interface CommitmentGroup {
  title: string;
  rows: Commitment[];
}

function expiryList(days: readonly number[]): string {
  if (days.length <= 1) return `${days[0] ?? 30} days`;
  return `${days.slice(0, -1).join(', ')} or ${days[days.length - 1]} days`;
}

export const COMMITMENTS: readonly CommitmentGroup[] = [
  {
    title: 'Your record',
    rows: [
      { text: 'Only you can see your record unless you share it', where: 'Private by default' },
      { text: 'Download everything you have entered', where: 'Settings → Privacy & AI choices', href: '/settings#privacy' },
      { text: 'Delete your account and records at any time', where: 'Delete your account', href: '/account-deletion' },
    ],
  },
  {
    title: 'Sharing',
    rows: [
      { text: `Share links expire after ${expiryList(SHARE_EXPIRY_CHOICES)}`, where: 'You choose' },
      { text: 'Show a summary only, or protect a link with a PIN', where: 'When you create a link' },
      { text: 'Every shared record is labelled self-reported and unofficial', where: 'Always' },
    ],
  },
  {
    title: 'AcadeMind',
    rows: [
      { text: 'Off until you allow it, and only for students 18 or older', where: 'Settings → Privacy & AI choices', href: '/settings#privacy' },
      { text: 'Your name, email and matric number are removed before a written analysis is requested', where: 'Written Analysis' },
      { text: 'A scanned slip is not kept after the scan; only the rows you confirm are saved', where: 'Result scanner' },
    ],
  },
  {
    title: 'Money',
    rows: [
      { text: 'We do not sell your information', where: 'Ever' },
      { text: 'Ads and ad cookies on the website only with your permission', where: 'Cookie choices', cookieChoices: true },
    ],
  },
];

export interface PosterLine {
  line: string;
  fact: string;
}

/** "What AcadeGrade is not". Coin wording appears only while coins are switched on. */
export function posterLines({ coinsEnabled }: { coinsEnabled: boolean }): PosterLine[] {
  return [
    { line: 'Not official.', fact: "Your university's transcript stays the official record. AcadeGrade is your own." },
    { line: 'Not affiliated.', fact: 'No university, and not the National Universities Commission, issues, verifies or endorses AcadeGrade.' },
    {
      line: 'Not for sale.',
      fact: coinsEnabled
        ? "We don't sell your information, and there is no subscription. Coins can't be bought."
        : "We don't sell your information, and there is no subscription.",
    },
    { line: 'Not a verdict.', fact: 'AcadeMind gives guidance. Your department and your adviser decide.' },
  ];
}

export const ABOUT_CLOSE = {
  headline: 'Keep your record ready.',
  sentence: "Results come out whether you're ready or not. Your record takes about two minutes to start, and it's free.",
} as const;

/** At more than 32 characters the h1 drops from display to head, so it still fits on two or three lines. */
export const ABOUT_HEADLINE_DISPLAY_MAX = 32;
