import {
  buildStudyPlan,
  expandOccurrences,
  expiryState,
  reminderTimes,
  validityEnd,
  type EventType,
  type StudyPlanInput,
  type Timetable,
  type TimetableEvent,
} from '@/lib/timetable/engine';
import { blockedFromFixedTimetables } from '@/lib/timetable/builder';
import { describeValidity, extendValidity, formatDate, formatEndsAt, icsFileName } from '@/lib/timetable/format';
import { TIMETABLE_LIMITS } from '@/lib/timetable/validate';

/**
 * /features/timetable (docs/public-redesign/pages/features-timetable.md).
 * The example week and the reading plan come from the real engine
 * (lib/timetable/engine.ts): the plan is buildStudyPlan's output for the
 * inputs below, computed when the page renders, so it can never drift from
 * the real rules. Pinned in tests/unit/public/product-data.test.ts.
 */

export const TIMETABLE_COPY = {
  title: 'Timetable and reminders',
  description:
    'Keep your lectures, reading and exams in one timetable. Build a reading plan with AcadeMind and get reminders on Android, even offline. Free for students.',
  keywords: ['lecture timetable app', 'reading timetable', 'study planner Nigeria', 'exam timetable reminder'],
  h1: ['Your week,', 'on time.'],
  sentence:
    'Put in your lectures and exams, let AcadeMind build a reading plan around them, and get a reminder before each one on your Android phone.',
} as const;

export const DEFAULT_OFFSETS = [10];

const weekly = (id: string, title: string, type: EventType, courseCode: string, day: number, startTime: string, endTime: string, venue: string): TimetableEvent => ({
  id,
  title,
  type,
  courseCode,
  venue,
  recurrence: { kind: 'weekly', days: [day] },
  startTime,
  endTime,
});

/** "300L First Semester lectures": fixed, 3 months from Mon 2 Nov 2026. */
export const FIXED_TIMETABLE: Timetable = {
  title: '300L First Semester lectures',
  kind: 'fixed',
  validity: { startsOn: '2026-11-02', unit: 'months', amount: 3, endsAt: validityEnd('2026-11-02', 'months', 3) },
  reminders: { defaultOffsetsMin: DEFAULT_OFFSETS },
  status: 'active',
  events: [
    weekly('csc301-mon', 'Data Structures', 'lecture', 'CSC 301', 1, '09:00', '11:00', 'LT 2'),
    weekly('mth301-mon', 'Numerical Analysis', 'lecture', 'MTH 301', 1, '12:00', '14:00', 'Maths Hall'),
    weekly('csc303-tue', 'Operating Systems', 'lecture', 'CSC 303', 2, '10:00', '12:00', 'LT 1'),
    weekly('gst311-tue', 'Entrepreneurship', 'lecture', 'GST 311', 2, '14:00', '15:00', 'Faculty Hall'),
    weekly('csc305-wed', 'Computer Networks', 'lecture', 'CSC 305', 3, '08:00', '10:00', 'LT 2'),
    weekly('mth301-wed', 'Numerical Analysis tutorial', 'class', 'MTH 301', 3, '13:00', '14:00', 'Maths Hall'),
    weekly('csc303-thu', 'Operating Systems', 'lecture', 'CSC 303', 4, '09:00', '10:00', 'LT 1'),
    weekly('csc305-thu', 'Computer Networks practical', 'class', 'CSC 305', 4, '16:00', '18:00', 'Lab 3'),
    weekly('csc301-fri', 'Data Structures', 'lecture', 'CSC 301', 5, '10:00', '11:00', 'LT 2'),
  ],
};

export const PLAN_STARTS = '2026-11-30';
export const PLAN_ENDS = validityEnd(PLAN_STARTS, 'weeks', 2).slice(0, 10);

export const BUILDER_SUBJECTS: StudyPlanInput['subjects'] = [
  { name: 'Numerical Analysis', code: 'MTH 301', priority: 3, difficulty: 3, examDate: '2026-12-11' },
  { name: 'Operating Systems', code: 'CSC 303', priority: 3, difficulty: 2, examDate: '2026-12-09' },
  { name: 'Data Structures', code: 'CSC 301', priority: 2, difficulty: 2, examDate: '2026-12-14' },
  { name: 'Entrepreneurship', code: 'GST 311', priority: 1, difficulty: 1 },
];

/** Exactly what the example builder was given. */
export function builderInput(): StudyPlanInput {
  return {
    subjects: BUILDER_SUBJECTS,
    availability: {
      days: [1, 2, 3, 4, 5, 6],
      windows: [{ start: '16:00', end: '20:00' }],
      sessionMinutes: 60,
      breakMinutes: 10,
      sessionsPerDay: { mode: 'perDay', counts: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3 } },
    },
    blocked: blockedFromFixedTimetables([FIXED_TIMETABLE]),
    startsOn: PLAN_STARTS,
    endsOn: PLAN_ENDS,
  };
}

let cachedPlan: ReturnType<typeof buildStudyPlan> | null = null;

/** buildStudyPlan for the example input (pure, so computed once per server). */
export function examplePlan() {
  cachedPlan ??= buildStudyPlan(builderInput());
  return cachedPlan;
}

/** "Exam reading plan": the builder's sessions as a reading timetable, 2 weeks from Mon 30 Nov. */
export function readingTimetable(): Timetable {
  return {
    title: 'Exam reading plan',
    kind: 'reading',
    builtWith: 'academind',
    validity: { startsOn: PLAN_STARTS, unit: 'weeks', amount: 2, endsAt: validityEnd(PLAN_STARTS, 'weeks', 2) },
    reminders: { defaultOffsetsMin: DEFAULT_OFFSETS },
    status: 'active',
    events: examplePlan().events,
  };
}

/* ------------------------------------------------------------------ agenda */

export interface AgendaBand {
  id: string;
  start: string;
  end: string;
  title: string;
  note: string;
  reminder: string;
  timetable: string;
  /** "09:00 to 11:00, Data Structures, CSC 301, LT 2, lecture, reminder at 08:50" */
  spoken: string;
}

export interface AgendaDay {
  id: string;
  date: string;
  weekday: string;
  dayLabel: string;
  long: string;
  bands: AgendaBand[];
}

const TYPE_WORD: Record<EventType, string> = { lecture: 'Lecture', class: 'Class', exam: 'Exam', study: 'Study', other: 'Event' };

/** The hero agenda: Mon 30 Nov to Sat 5 Dec, both timetables, reminders from the engine. */
export function exampleWeek(): AgendaDay[] {
  const reading = readingTimetable();
  const sources = [
    { timetable: FIXED_TIMETABLE, name: '300L lectures' },
    { timetable: reading, name: 'Exam reading plan' },
  ];
  const byId = new Map<string, TimetableEvent>();
  for (const { timetable } of sources) for (const event of timetable.events) byId.set(event.id, event);

  const days: AgendaDay[] = [];
  for (let offset = 0; offset < 6; offset += 1) {
    const date = new Date(Date.UTC(2026, 10, 30 + offset)).toISOString().slice(0, 10);
    const bands: AgendaBand[] = [];
    for (const { timetable, name } of sources) {
      for (const occurrence of expandOccurrences(timetable, `${date}T00:00:00`, `${date}T23:59:59`)) {
        const event = byId.get(occurrence.eventId);
        if (!event) continue;
        const start = occurrence.start.slice(11, 16);
        const end = occurrence.end.slice(11, 16);
        const reminder = (reminderTimes(occurrence, timetable.reminders.defaultOffsetsMin)[0] ?? '').slice(11, 16);
        const builder = timetable.builtWith === 'academind';
        const note = builder
          ? `${event.courseCode} · Built with AcadeMind`
          : `${event.courseCode} · ${event.venue} · ${TYPE_WORD[event.type]}`;
        bands.push({
          id: `${occurrence.eventId}-${date}`,
          start,
          end,
          title: event.title,
          note,
          reminder,
          timetable: name,
          spoken: `${start} to ${end}, ${event.title}, ${[event.courseCode, event.venue].filter(Boolean).join(', ')}, ${builder ? 'built with AcadeMind' : TYPE_WORD[event.type].toLowerCase()}, reminder at ${reminder}`,
        });
      }
    }
    bands.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    const label = formatDate(date); // "Mon 30 Nov 2026"
    const [weekday, day, month] = label.split(' ');
    days.push({ id: `day-${date}`, date, weekday, dayLabel: `${day} ${month}`, long: `${weekday} ${day} ${month}`, bands });
  }
  return days;
}

/* -------------------------------------------------------------------- kinds */

export function kindFields() {
  const plan = examplePlan();
  return [
    {
      field: 'ink' as const,
      name: 'Fixed',
      sentence: 'Lectures, classes and exams you type in once. They repeat every week until the timetable ends.',
      figure: 'Mon 09:00',
      caption: 'Data Structures, LT 2, every Monday',
    },
    {
      field: 'violet' as const,
      name: 'Reading',
      sentence: 'Your own study sessions. Type them in, or let AcadeMind build them around your lectures.',
      figure: String(plan.events.length),
      caption: 'sessions in a two-week exam plan',
    },
    {
      field: 'gold' as const,
      name: 'Custom',
      sentence: 'Anything else on a schedule: fellowship, gym, a weekend shift.',
      figure: String(TIMETABLE_LIMITS.maxTimetables),
      caption: `timetables you can keep, each with up to ${TIMETABLE_LIMITS.maxEvents} events`,
    },
  ];
}

/* ------------------------------------------------------------------- coupon */

export const COUPON = {
  heading: 'Build with AcadeMind',
  body: 'Answer six questions and AcadeMind lays out reading sessions around your lectures, by clear rules you can read. Change anything before you save.',
  free: 'Free with no daily limit, and open to every student, including under-18s.',
  answers: [
    { question: 'Subjects', answer: '4: MTH 301, CSC 303, CSC 301, GST 311, each with a priority, a difficulty and an exam date' },
    { question: 'Days', answer: 'Monday to Saturday' },
    { question: 'Study window', answer: '16:00 to 20:00, the same every day (or a different window for each day)' },
    { question: 'Sessions', answer: '60 minutes with 10-minute breaks · 2 a day, 3 on Saturday (or the same number every day)' },
    { question: 'Busy times', answer: 'Your lectures, filled in for you · Thu 16:00 to 18:00, Lab 3' },
    { question: 'How long', answer: '2 weeks from Mon 30 Nov' },
  ],
  action: 'Build yours',
  under:
    'Up to 12 subjects. Sessions from 25 minutes to 3 hours, up to 8 a day. On Android the questions come one per screen; on the website, in five steps.',
} as const;

/* ------------------------------------------------------- it shows its working */

const LEVEL = { 1: 'low', 2: 'medium', 3: 'high' } as const;
const EASE = { 1: 'easy', 2: 'medium', 3: 'hard' } as const;
const shortDate = (date: string) => {
  const [weekday, day, month] = formatDate(date).split(' ');
  return `${weekday} ${day} ${month}`;
};

export interface WorkingRow {
  label: string;
  value: string;
}

/** The plan's receipt: sessions per subject (from the engine's "why" lines) and the rules it followed. */
export function planWorking() {
  const plan = examplePlan();
  const counts = new Map<string, number>();
  for (const line of plan.why) {
    const match = /^(.+): (\d+) sessions? \(/.exec(line);
    if (match) counts.set(match[1], Number(match[2]));
  }
  const subjects: WorkingRow[] = [...BUILDER_SUBJECTS]
    .sort((a, b) => (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0))
    .map((subject) => ({
      label: `${subject.name} · ${LEVEL[subject.priority]}, ${EASE[subject.difficulty]}, ${subject.examDate ? `exam ${shortDate(subject.examDate)}` : 'no exam date'}`,
      value: String(counts.get(subject.name) ?? 0),
    }));
  const total = plan.events.length;
  // The study day before each exam has half its sessions (Sunday is not a study day here).
  const studyWeekdays = builderInput().availability.days;
  const lighter = BUILDER_SUBJECTS.flatMap((s) => (s.examDate ? [s.examDate] : []))
    .map((exam) => new Date(Date.parse(`${exam}T00:00:00Z`) - 86400000).toISOString().slice(0, 10))
    .filter((date) => date >= PLAN_STARTS && date <= PLAN_ENDS && studyWeekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()))
    .sort();
  // "Tue 8, Thu 10 Dec"
  const lighterLabel = lighter
    .map((date, index) => {
      const [weekday, day, month] = shortDate(date).split(' ');
      return index === lighter.length - 1 ? `${weekday} ${day} ${month}` : `${weekday} ${day}`;
    })
    .join(', ');
  const studyDays = new Set(plan.events.map((event) => (event.recurrence.kind === 'once' ? event.recurrence.date : ''))).size;
  const warning = plan.warnings.find((line) => /^Only \d+ of \d+/.test(line)) ?? '';
  const fit = /^Only (\d+) of (\d+)/.exec(warning);
  return {
    total,
    studyDays,
    groups: [
      { name: 'Sessions per subject', rows: subjects },
      {
        name: 'Rules it followed',
        rows: [
          { label: 'Harder and higher-priority subjects get more', value: 'applied' },
          { label: 'An exam coming up soon adds sessions', value: 'applied' },
          { label: 'Lighter day before an exam', value: lighterLabel },
          { label: 'Never on or after its exam day', value: `all ${BUILDER_SUBJECTS.length} subjects` },
          { label: 'Never the same subject twice in a row', value: `all ${studyDays} days` },
        ],
      },
      ...(fit ? [{ name: 'Heads-up', rows: [{ label: `Only ${fit[1]} of ${fit[2]} requested sessions fit`, value: 'Thu 3 Dec, Lab 3' }] }] : []),
    ] as { name: string; rows: WorkingRow[] }[],
    totalRow: { label: 'Exam reading plan', value: `${total} sessions` },
    why: plan.why,
    warnings: plan.warnings,
  };
}

/* --------------------------------------------------------- as long as you need */

export const LENGTHS = [
  { unit: 'Hours', text: 'For an exam day. Ending-soon notice 1 hour before.' },
  { unit: 'Days', text: 'For a short stretch. Notice 1 day before.' },
  { unit: 'Weeks', text: 'For a reading plan. Notice 3 days before.' },
  { unit: 'Months', text: 'For a semester of lectures. Notice 7 days before.' },
] as const;

export const LENGTH_NOTE =
  'Choose how long a timetable lasts when you make it. Before it ends, AcadeGrade tells you, and Extend adds more time without touching your events. Edit any event, title or reminder whenever you like.';

export const LENGTH_LIMIT_LINE = `Up to ${TIMETABLE_LIMITS.maxAmount} of any unit. Weekly events repeat until the end; one-off events keep their date.`;

/** The moment the Extend fragment shows: Fri 11 Dec 2026, 09:00 (inside the plan's last 3 days). */
export const EXTEND_AT = '2026-12-11T09:00:00';

export function extendExample() {
  const reading = readingTimetable();
  const extended = extendValidity(reading, 'weeks', 2, EXTEND_AT);
  return {
    title: reading.title,
    kindLine: `Reading timetable, ${reading.events.length} events`,
    validity: describeValidity(reading),
    status: expiryState(reading, EXTEND_AT) === 'ending_soon' ? 'Ending soon' : 'Active',
    newEnd: formatEndsAt({ ...reading, validity: extended }),
    extended,
  };
}

/* ---------------------------------------------------------------- reminders */

export function notificationExample() {
  const first = expandOccurrences(FIXED_TIMETABLE, '2026-11-30T00:00:00', '2026-11-30T23:59:59')[0];
  const event = FIXED_TIMETABLE.events.find((entry) => entry.id === first.eventId) as TimetableEvent;
  const start = first.start.slice(11, 16);
  return {
    title: event.title,
    // The body format the Android app sends (planReminders).
    body: `Starts in ${DEFAULT_OFFSETS[0]} minutes, at ${start}, ${event.venue}.`,
  };
}

export const ICS_FILE = icsFileName('Exam reading plan');

/* ---------------------------------------------------------------------- FAQ */

export const TIMETABLE_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: 'Will reminders work without data?',
    answer:
      'Yes, on Android. Reminders are set on your phone, so they arrive with no data and no signal. The app keeps the next two weeks of reminders ready and tops them up whenever you open it, so open AcadeGrade at least once every two weeks.',
  },
  {
    question: "Why didn't a reminder arrive?",
    answer:
      'Some phones stop background reminders to save battery. Open Settings, then Apps, AcadeGrade, Battery, and choose Unrestricted; the names differ a little between phones. Check that notifications are allowed for AcadeGrade too. On some phones a reminder can arrive a few minutes late.',
  },
  {
    question: 'Is it an alarm?',
    answer:
      "It's a high-priority notification, not a ringing alarm that takes over your screen. If your phone offers Alarms & reminders for AcadeGrade, allow it so reminders arrive on the minute.",
  },
  {
    question: 'Do reminders work on the website or on an iPhone?',
    answer:
      "Not as notifications. On the website, download your timetable as a calendar file (.ics) and open it in Google Calendar or your phone's calendar, which will remind you at the same times.",
  },
  {
    question: 'Does Build with AcadeMind use up my AcadeMind uses?',
    answer: 'No. It follows fixed rules, costs nothing, has no daily limit and works for students under 18 too.',
  },
  {
    question: 'Can I change a timetable after saving it?',
    answer: `Yes. Add, edit or remove events, change times and reminders, or rename it whenever you like. You can keep up to ${TIMETABLE_LIMITS.maxTimetables} timetables, each with up to ${TIMETABLE_LIMITS.maxEvents} events.`,
  },
  {
    question: 'What happens when a timetable ends?',
    answer:
      'Its weekly events stop and so do its reminders. On Android you get a notice before it ends, and Extend brings it back with every event as it was. You can also archive it to keep it out of your week.',
  },
];
