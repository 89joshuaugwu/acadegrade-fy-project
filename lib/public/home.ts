import { faqPageJsonLd, type FaqEntry } from '@/components/public/Accordion';
import { formatCgpa, requiredAverageForTarget, roundCgpa, type TargetPlanInput } from '@/lib/cgpa/academicRules';
import type { HandoffCourse } from '@/lib/handoff/calculator';
import {
  EXAMPLE_COURSES,
  EXAMPLE_PRIOR_SEMESTERS,
  EXAMPLE_PRIOR_TOTALS,
  EXAMPLE_STUDENT,
  computeExampleSlip,
  exampleCourseMetrics,
  exampleSemesterFromScores,
  type ExampleSlipState,
} from '@/lib/public/example-student';
import { DEFAULT_SCALE, classBandLine, gradeBandLine, type PublicScale } from '@/lib/public/scales';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/seo/site';

/**
 * Home page data (docs/public-redesign/pages/home.md): the copy deck, the live
 * slip helpers, the Scale bars, the showcase slips, the itinerary, the sheets,
 * the FAQ (which also feeds the FAQPage JSON-LD) and the photograph slots.
 * Every number comes from the example student (lib/public/example-student.ts)
 * through the real engine (lib/cgpa/academicRules.ts) and is pinned by
 * tests/unit/public/home-data.test.ts.
 */

// ------------------------------------------------------------------ SEO

export const HOME_TITLE = 'AcadeGrade: CGPA, GPA and degree class for Nigerian universities';
/** 158 characters; the same sentence as the site default. */
export const HOME_DESCRIPTION = SITE_DESCRIPTION;

// ------------------------------------------------------------------ hero

export const HOME_HERO = {
  title: 'Know your CGPA. Know your class.',
  /** The h1 split over its two planned lines. */
  titleLines: ['Know your CGPA.', 'Know your class.'],
  sentence:
    'AcadeGrade turns each semester’s result slip into your GPA, CGPA and degree class, then helps you plan the next one. Free for Nigerian university students.',
  primary: 'Start your free record',
  primaryTouched: 'Save this semester',
  signedIn: 'Open dashboard',
  primaryHref: '/register',
  signedInHref: '/dashboard',
  caption: 'Example result slip',
  hint: 'Change a grade to see your class move.',
  footLabels: { gpa: 'Semester GPA', cgpa: 'CGPA', class: 'Class', carry: 'Carry-overs' },
  links: [
    { label: 'Try the full calculator', href: '/calculator' },
    { label: 'Get the Android app', href: '/app' },
    { label: 'Sign in', href: '/login' },
  ],
} as const;

/** "Before this semester: 331 points over 74 units (CGPA 4.47)" */
export function priorRecordLine(): string {
  const { points, units } = EXAMPLE_PRIOR_TOTALS;
  return `Before this semester: ${points} points over ${units} units (CGPA ${formatCgpa(points / units)})`;
}

/** "0.07 to First Class", or "First Class" once there. */
export function toFirstClassLine(slip: ExampleSlipState): string {
  return slip.toFirstClass > 0 ? `${slip.toFirstClass.toFixed(2)} to First Class` : 'First Class';
}

/** What the polite live region reads once the keys settle: "CGPA 4.53, First Class". */
export function liveSlipAnnouncement(slip: ExampleSlipState): string {
  const carry = slip.carryOvers > 0 ? `, ${slip.carryOvers} carry-over${slip.carryOvers === 1 ? '' : 's'}` : '';
  return `CGPA ${formatCgpa(slip.cgpa)}, ${slip.classBand.label}${carry}`;
}

/** "1 carry-over" / "2 carry-overs" for the foot. */
export function carryOverLabel(count: number): string {
  return `${count} carry-over${count === 1 ? '' : 's'}`;
}

/** The slip as calculator handoff rows (letter-grade mode), for "Save this semester". */
export function homeHandoffCourses(slip: ExampleSlipState): HandoffCourse[] {
  return slip.rows.map((row) => ({ code: row.code, units: row.units, grade: row.grade }));
}

// ------------------------------------------------------------------ pictures

/**
 * Photograph slots, by slot name only (owner decision 20 Nov: no identifiable
 * university in any image). lib/public/page-photos.ts (imagery lane) resolves
 * a slot to a neutral photograph or null; every section falls back to a
 * UiFrame or a drawn stationery picture when it is null. Never a slug here.
 */
export const HOME_PHOTO_SLOTS = {
  showcase: 'home.showcase',
  faqTall: 'home.faq-tall',
  faqSquare: 'home.faq-square',
} as const;

export type HomePhotoSlot = (typeof HOME_PHOTO_SLOTS)[keyof typeof HOME_PHOTO_SLOTS];

/** The three app screens the hero phone crossfades between. */
export const HOME_HERO_SCREENS = [
  { id: 'dashboard', caption: 'Dashboard on Android, example student' },
  { id: 'semester', caption: 'Semester view on Android, example student' },
  { id: 'timetable', caption: 'Timetable on Android, example student' },
] as const;

// ------------------------------------------------------------------ Scale

export interface ScaleBar {
  id: string;
  name: string;
  /** Short figure on the right of the bar. */
  value: string;
  /** Rows of figures (grades, classes) or a sentence. */
  rows?: readonly string[];
  text?: string;
  /** What the arc meter shows while this bar is open. */
  meter: { value: number | null; highlight: { from: number; to: number } | null; label: string };
}

/** The seven bars, generated from the live scale, the first open. */
export function scaleBars(scale: PublicScale = DEFAULT_SCALE): ScaleBar[] {
  const load = computeExampleSlip();
  const metrics = exampleCourseMetrics();
  const semester = exampleSemesterFromScores();
  const first = scale.classBands[0];
  const pass = scale.classBands.find((band) => band.engineShort === 'Pass');
  const piExample = (code: string) => {
    const row = metrics.find((item) => item.code === code);
    return row ? { score: row.totalScore ?? 0, pi: row.piPoint.toFixed(2) } : null;
  };
  const high = piExample('CSC 301');
  const mid = piExample('CSC 305');
  const lowest = scale.gradeBands[scale.gradeBands.length - 1];
  return [
    {
      id: 'grades',
      name: `Grades on the ${scale.maxPoint}-point scale`,
      value: `A = ${scale.gradeBands[0].gradePoint} to ${lowest.grade} = ${lowest.gradePoint}`,
      rows: scale.gradeBands.map(gradeBandLine),
      meter: { value: null, highlight: { from: 1, to: scale.maxPoint }, label: 'Grade points' },
    },
    {
      id: 'classes',
      name: 'Degree classes',
      value: `${first.min.toFixed(2)} for a First`,
      rows: scale.classBands.filter((band) => band.engineShort !== 'Fail').map(classBandLine),
      meter: { value: load.cgpa, highlight: { from: first.min, to: first.max }, label: 'Example CGPA' },
    },
    {
      id: 'gpa',
      name: 'How your GPA is worked out',
      value: `${load.points} ÷ ${load.units}`,
      text: `Multiply each course’s point by its units, add them up, divide by your total units. The example above: ${load.points} ÷ ${load.units} = ${formatCgpa(load.gpa)}.`,
      meter: { value: load.gpa, highlight: null, label: 'Example semester GPA' },
    },
    {
      id: 'pi',
      name: 'Performance Index (PI)',
      value: `PI ${formatCgpa(semester.pi)}`,
      text: `PI uses your actual scores, not just the letter: each total ÷ 100 × ${scale.maxPoint}, averaged by units. A ${high?.score} counts as ${high?.pi}, a ${mid?.score} as ${mid?.pi}. AcadeGrade shows PI beside your GPA.`,
      meter: { value: semester.pi, highlight: null, label: 'Example PI' },
    },
    {
      id: 'carry',
      name: 'Carry-overs',
      value: `${lowest.grade} = ${lowest.gradePoint} points`,
      text: 'An F stays on your record until you pass the course again. AcadeGrade flags it and shows what it does to your CGPA.',
      meter: { value: null, highlight: { from: 0, to: pass?.min ?? 1 }, label: 'Below a Pass' },
    },
    {
      id: 'entry',
      name: 'Direct entry and spill-over',
      value: '200L or 300L start',
      text: 'Started in 200L or 300L? Your timeline starts there. Extra semesters after your final year are counted as spill-over.',
      meter: { value: load.cgpa, highlight: null, label: 'Example CGPA' },
    },
    {
      id: 'handbook',
      name: 'Your handbook decides',
      value: 'Final word',
      text: 'Most Nigerian universities use these bands. If yours differs, your handbook is the final word; AcadeGrade’s numbers are your personal record, not an official result.',
      meter: { value: null, highlight: null, label: 'Grade points' },
    },
  ];
}

// ------------------------------------------------------------------ showcase

/**
 * Required average over the remaining units, rounded UP to two decimals so a
 * student never aims too low (4.6625 → 4.67). Capped at the scale maximum;
 * null when nothing remains.
 */
export function requiredAverageRoundedUp(input: TargetPlanInput & { targetCgpa: number }, max = DEFAULT_SCALE.maxPoint): number | null {
  const required = requiredAverageForTarget(input);
  if (required === null) return null;
  const cleaned = Number(required.toFixed(10));
  return Math.min(max, Math.ceil(cleaned * 100 - 1e-9) / 100);
}

export const HOME_TARGET = { targetCgpa: 4.5, remainingUnits: 40 } as const;

export interface ShowcaseSlip {
  id: string;
  title: string;
  lines: readonly string[];
  /** The AcadeMind slip carries its logo. */
  academind?: boolean;
  /** Tilt in degrees (two slips tilt 1 to 2 degrees). */
  tilt?: number;
  /** Height on desktop in svh (26 to 44). */
  height: number;
}

export function showcaseSlips(): ShowcaseSlip[] {
  const load = computeExampleSlip();
  const semester = exampleSemesterFromScores();
  const required = requiredAverageRoundedUp({
    currentCgpa: load.cgpa,
    completedUnits: load.totalUnits,
    remainingUnits: HOME_TARGET.remainingUnits,
    targetCgpa: HOME_TARGET.targetCgpa,
  });
  const retake = EXAMPLE_PRIOR_SEMESTERS.find((item) => item.note?.includes('retake'));
  return [
    {
      id: 'semester',
      title: 'Semester result',
      lines: [`${EXAMPLE_STUDENT.session} ${EXAMPLE_STUDENT.semester}`, `${semester.creditLoaded} units`, `GPA ${formatCgpa(semester.gpa)}`, `PI ${formatCgpa(semester.pi)}`],
      height: 38,
    },
    {
      id: 'record',
      title: 'Your record',
      lines: [`CGPA ${formatCgpa(load.cgpa)}`, `${load.totalUnits} units`, load.classBand.label, toFirstClassLine(load)],
      tilt: -1.5,
      height: 44,
    },
    {
      id: 'carry',
      title: 'Carry-overs',
      lines: ['None outstanding', `MTH 201: passed on retake, ${retake?.session ?? '2024/2025'}`],
      height: 30,
    },
    {
      id: 'target',
      title: 'Your target',
      lines: [`Aiming for First Class (${HOME_TARGET.targetCgpa.toFixed(2)})`, `Remaining: ${HOME_TARGET.remainingUnits} units`, `You need ${required?.toFixed(2)} average`],
      height: 40,
    },
    {
      id: 'academind',
      title: 'AcadeMind',
      lines: ['Your strongest results are in 3-unit CSC courses. Raising MTH 301 is the quickest way to First Class.'],
      academind: true,
      tilt: 1,
      height: 34,
    },
    {
      id: 'lecture',
      title: 'Next lecture',
      lines: ['CSC 401 Software Engineering', 'Mon 9:00, LT 2', 'Reminder 8:50'],
      height: 26,
    },
  ];
}

export const HOME_SHOWCASE = {
  title: 'What one slip gives you',
  lead: 'The moment your results are in, AcadeGrade works out the semester, updates your record and tells you what it means for your class.',
  more: 'Then it keeps going: what you need next semester, which courses to carry, when your next lecture starts.',
} as const;

// ------------------------------------------------------------------ itinerary

export interface ItineraryRow {
  label: string;
  value: string;
}

export interface Itinerary {
  title: string;
  sentence: string;
  groups: readonly { title: string; rows: readonly ItineraryRow[] }[];
  total: ItineraryRow;
}

export const HOME_ITINERARY: Itinerary = {
  title: 'Results day, sorted.',
  sentence: 'Most students spend results day doing arithmetic on the back of a page. Here is the same day with AcadeGrade.',
  groups: [
    {
      title: 'Results day',
      rows: [
        { label: 'Scan or paste your result slip', value: '30 sec' },
        { label: 'Check each course', value: '1 min' },
        { label: 'Save the semester', value: '1 tap' },
      ],
    },
    {
      title: 'That evening',
      rows: [
        { label: 'Read your GPA, CGPA and class', value: 'instant' },
        { label: 'See any carry-over flagged', value: 'instant' },
      ],
    },
    {
      title: 'Before next semester',
      rows: [
        { label: 'Set the class you’re aiming for', value: '1 min' },
        { label: 'Build a reading timetable with AcadeMind', value: '2 min' },
        { label: 'Turn on reminders', value: 'automatic' },
      ],
    },
  ],
  total: { label: 'You hold: an up-to-date CGPA and a plan', value: 'about 5 minutes' },
};

// ------------------------------------------------------------------ sheets

export type SheetFragment = 'scanner' | 'academind' | 'timetable' | 'transcript' | 'plan';

export interface HomeSheet {
  id: string;
  field: 'ink' | 'violet' | 'gold' | 'paper' | 'ground-2';
  name: string;
  paragraph: string;
  fragment: SheetFragment;
  caption: string;
  linkLabel: string;
  href: string;
}

export const HOME_SHEETS_HEADING = 'Everything after the slip';

export const HOME_SHEETS: readonly HomeSheet[] = [
  {
    id: 'scan',
    field: 'ink',
    name: 'Scan or paste your results',
    paragraph:
      'Photograph a result slip or paste your portal page. AcadeGrade reads the courses, you check every line, and nothing is saved until you say so.',
    fragment: 'scanner',
    caption: 'Scanner review, five rows read from the example slip',
    linkLabel: 'Result scanner',
    href: '/features/result-scanner',
  },
  {
    id: 'academind',
    field: 'violet',
    name: 'AcadeMind reads your record',
    paragraph:
      'A written analysis of your semesters, a forecast of where your CGPA is heading, and what-if answers in plain English. Your grades stay yours.',
    fragment: 'academind',
    caption: 'AcadeMind written analysis for the example student',
    linkLabel: 'AcadeMind',
    href: '/features/ai-insights',
  },
  {
    id: 'timetable',
    field: 'gold',
    name: 'Timetable with reminders',
    paragraph:
      'Put in your lectures and exams, or let AcadeMind build a reading plan around them. Reminders reach your Android phone even without data.',
    fragment: 'timetable',
    caption: 'Week view and a lecture reminder',
    linkLabel: 'Timetable',
    href: '/features/timetable',
  },
  {
    id: 'transcript',
    field: 'paper',
    name: 'A transcript you can share safely',
    paragraph: 'Download a clean record of every semester, or share a link that expires, shows only a summary, or needs a PIN.',
    fragment: 'transcript',
    caption: 'Transcript summary and share settings',
    linkLabel: 'Features',
    href: '/features#transcript',
  },
  {
    id: 'plan',
    field: 'ground-2',
    name: 'Plan the next semester',
    paragraph: 'See the GPA you need for your target class, check your unit load, preview grades you’re still waiting for.',
    fragment: 'plan',
    caption: 'What-if result and a unit-load warning',
    linkLabel: 'Free tools',
    href: '/tools',
  },
];

// ------------------------------------------------------------------ proof

export const HOME_PROOF_TITLE = 'What students say';

// ------------------------------------------------------------------ letter

export const HOME_LETTER = {
  title: 'Why I built AcadeGrade',
  paragraphs: [
    'I studied Computer Science at ESUT. Every results day, I watched friends add up grade points on the back of a page, then do it again because they weren’t sure.',
    'I built AcadeGrade so the arithmetic is never the hard part. You enter your results once, or scan the slip, and the numbers are always right and always explained.',
    'It is your record. It stays private, and you decide who sees it and for how long.',
    'If something is wrong or missing for your school, write to me. I read every message.',
  ],
  signOff: 'Joshua',
  role: 'Founder, AcadeGrade · Computer Science, ESUT',
  portraitAlt: 'Joshua Ugwu, founder of AcadeGrade',
  writeLabel: 'Write to us',
  writeHref: '/support',
} as const;

// ------------------------------------------------------------------ FAQ

export const HOME_FAQ_TITLE = 'Before you start';

export const HOME_FACTS = [
  'Free for students',
  'On the web and on Android',
  'For Nigerian universities, on the 5-point scale with PI',
  'Your record stays private',
] as const;

export interface HomeFaqItem extends FaqEntry {
  id: string;
  /** Words in the answer that link somewhere (same visible text). */
  link?: { text: string; href: string };
}

export const HOME_FAQ: readonly HomeFaqItem[] = [
  {
    id: 'faq-free',
    question: 'Is AcadeGrade free?',
    answer:
      'Yes. Recording results, the calculator, the free tools, transcripts and the timetable are free. AcadeMind has free daily uses; on Android you can earn extra uses by watching a short ad.',
  },
  {
    id: 'faq-official',
    question: 'Is this my official result?',
    answer: 'No. AcadeGrade is your personal record, worked out from the results you enter. Your university’s transcript stays the official one.',
  },
  {
    id: 'faq-universities',
    question: 'Which universities does it work for?',
    answer:
      'Nigerian universities that grade on the 5-point scale (A = 5 down to F = 0). If your school changes any band, your handbook is the final word.',
  },
  {
    id: 'faq-scan',
    question: 'What happens to my result slip when I scan it?',
    answer:
      'It is read to fill in your courses, you check every line, and nothing is saved until you confirm. Scanning is not available to students under 18.',
  },
  {
    id: 'faq-android',
    question: 'Do I need the Android app?',
    answer: 'No. Everything works on the website. The app adds timetable reminders that work offline and the result scanner on your camera.',
    link: { text: 'Android app', href: '/app' },
  },
  {
    id: 'faq-delete',
    question: 'Can I delete my account?',
    answer: 'Yes, any time in Settings. Your records are removed; see Delete your account for what is kept for a short time and why.',
    link: { text: 'Delete your account', href: '/account-deletion' },
  },
];

export const HOME_FAQ_MORE = { label: 'Read all questions on Support', href: '/support' } as const;

// ------------------------------------------------------------------ CTA

export const HOME_REPLY = {
  line: 'Results come out whether you’re ready or not. Be the one who already knows.',
  title: 'Start your record',
  sentence: 'About two minutes. Free, private and yours.',
  action: 'Create your free record',
  secondary: { label: 'or try the calculator first', href: '/calculator' },
} as const;

// ------------------------------------------------------------------ media settings

export interface HomeMedia {
  /** config/about.founderPhotoUrl: the letter shows a portrait only when set. */
  founderPhotoUrl: string | null;
  /** config/about.scanVideoUrl: the showcase's first slip becomes a muted loop only when set. */
  scanVideoUrl: string | null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The two optional media fields from config/about, https only. */
export function pickHomeMedia(data: Record<string, unknown> | undefined | null): HomeMedia {
  return { founderPhotoUrl: httpsUrl(data?.founderPhotoUrl), scanVideoUrl: httpsUrl(data?.scanVideoUrl) };
}

// ------------------------------------------------------------------ JSON-LD

/** Organization + SoftwareApplication + FAQPage (exactly the visible questions). */
export function homeJsonLd(siteUrl: string, contactEmail: string | null): Record<string, unknown>[] {
  const organizationId = `${siteUrl}/#organization`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE_NAME,
      url: siteUrl,
      logo: absoluteUrl('/android-chrome-512x512.png'),
      founder: { '@type': 'Person', name: 'Joshua Ugwu' },
      ...(contactEmail ? { email: contactEmail } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: SITE_NAME,
      url: siteUrl,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Android, Web',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      description: HOME_DESCRIPTION,
      publisher: { '@id': organizationId },
      featureList: [
        'GPA, CGPA, PI and degree class from your result slip',
        'Result slip scanning with review before save',
        'AcadeMind written analysis, forecast and what-if answers',
        'Timetable with reminders',
        'Transcripts and share links with expiry and PIN',
      ],
    },
    faqPageJsonLd(HOME_FAQ.map(({ question, answer }) => ({ question, answer }))),
  ];
}

/** The example's course list, re-exported for the fragments. */
export { EXAMPLE_COURSES };

/** Used by the CGPA figure in fragments: 4.43. */
export function exampleCgpaText(): string {
  return formatCgpa(computeExampleSlip().cgpa);
}

/** Rounded CGPA as a number, for meters. */
export function exampleCgpa(): number {
  return roundCgpa(computeExampleSlip().cgpa);
}
