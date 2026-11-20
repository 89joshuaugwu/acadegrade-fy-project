import { formatCgpa } from '@/lib/cgpa/academicRules';
import { computeForecast } from '@/lib/ai/forecast';
import { USAGE_FEATURES, type UsageFeatureId } from '@/lib/usage/policy';
import { EXAMPLE_PRIOR_SEMESTERS, computeExampleSlip, exampleCourseMetrics, exampleRunningCgpa } from './example-student';
import { exampleDegreeGoal } from './features-overview';
import { ADULT_FEATURE_VALUE, coinWord, coinsOn, dailyAllowance } from './features-shared';
import type { PublicUsage } from './usage-public';

/**
 * /features/ai-insights, titled AcadeMind (docs/public-redesign/pages/features-academind.md).
 * The example analysis is a fixed sample of the kind of text AcadeMind
 * writes; every figure in it is computed here and pinned by tests.
 */

export const ACADEMIND_COPY = {
  title: 'AcadeMind',
  description:
    'AcadeMind writes a plain analysis of your semesters, forecasts your CGPA and answers what-if questions. Free daily uses, off until you allow it. 18 and over.',
  keywords: ['CGPA forecast', 'what GPA do I need', 'first class target', 'academic analysis'],
  h1: ['AcadeMind reads', 'your record.'],
  sentence:
    'A written analysis of your semesters, a forecast of where your CGPA is heading, and what-if answers in plain English. Guidance to plan with, never a verdict.',
  /** The product's own AI_DISCLAIMER (components/ai/AiDisclosure.tsx, a client module); a test keeps them equal. */
  disclaimer: "AI-generated. It can be wrong and isn't official academic advice.",
} as const;

/* ------------------------------------------------------------ the record */

export interface RecordRow {
  label: string;
  session: string;
  units: number;
  points: number;
  note?: string;
  gpa: string;
  cgpaAfter: string;
}

/** The five semesters behind CGPA 4.43, with running CGPAs 4.72, 4.75, 4.42, 4.47, 4.43. */
export function exampleRecord(): RecordRow[] {
  const running = exampleRunningCgpa();
  const slip = computeExampleSlip();
  const prior = EXAMPLE_PRIOR_SEMESTERS.map((semester, index) => ({
    label: semester.label,
    session: semester.session,
    units: semester.units,
    points: semester.points,
    note: semester.note,
    gpa: formatCgpa(semester.points / semester.units),
    cgpaAfter: formatCgpa(running[index]),
  }));
  return [
    ...prior,
    { label: '300L First Semester', session: '2025/2026', units: slip.units, points: slip.points, gpa: formatCgpa(slip.gpa), cgpaAfter: formatCgpa(slip.cgpa) },
  ];
}

/* ------------------------------------------------------- written analysis */

export interface AnalysisSection {
  heading: string;
  text: string;
}

export function exampleAnalysis(): AnalysisSection[] {
  const slip = computeExampleSlip();
  const ifA = computeExampleSlip({ 'MTH 301': 'A' });
  const goal = exampleDegreeGoal();
  const scores = Object.fromEntries(exampleCourseMetrics().map((m) => [m.code, { total: m.totalScore, grade: m.grade }]));
  return [
    {
      heading: 'Strengths',
      text: `Your Computer Science courses are consistently strong. CSC 301 (${scores['CSC 301'].total}) and CSC 305 (${scores['CSC 305'].total}) were both ${scores['CSC 301'].grade} this semester.`,
    },
    {
      heading: 'Concerns',
      text: `Mathematics is where you lose points. MTH 201 needed a retake in 200L, and MTH 301 is your lowest score this semester (${scores['MTH 301'].total}, ${scores['MTH 301'].grade}).`,
    },
    {
      heading: 'Recommendations',
      text: `Give your extra reading hours to mathematics. Had MTH 301 been an A, this semester would have been ${formatCgpa(ifA.gpa)} instead of ${formatCgpa(slip.gpa)}.`,
    },
    {
      heading: 'Degree outlook',
      text: `${slip.classBand.label} at ${formatCgpa(slip.cgpa)}, ${formatCgpa(slip.toFirstClass)} below First Class. With three semesters left, an average of ${goal.required} gets you there.`,
    },
  ];
}

export const ANALYSIS_META = 'Example · 300L Computer Science · after 2025/2026 First Semester';
export const ANALYSIS_FEEDBACK = 'Helpful · Not helpful · Report';

/* --------------------------------------------------------------- forecast */

export interface ExampleForecast {
  history: number[];
  historyLabels: string[];
  projected: [number, number];
  next: string;
  after: string;
  trend: string;
  alt: string;
}

export function exampleForecast(): ExampleForecast {
  const history = exampleRunningCgpa();
  const result = computeForecast(history, history);
  const projected = result.projectedCgpa as [number, number];
  const shown = history.map((value) => formatCgpa(value));
  return {
    history,
    historyLabels: ['100L 1st', '100L 2nd', '200L 1st', '200L 2nd', '300L 1st'],
    projected,
    next: formatCgpa(projected[0]),
    after: formatCgpa(projected[1]),
    trend: 'Trend: slipping since 100L',
    alt: `Running CGPA ${shown.join(', ')}; projected ${formatCgpa(projected[0])} next semester and ${formatCgpa(projected[1])} after.`,
  };
}

/* ---------------------------------------------------------------- what-if */

export function exampleWhatIf() {
  const goal = exampleDegreeGoal();
  return {
    ...goal,
    note: `${goal.required} means an A in almost every course for three semesters. It can be done, but only if mathematics stops costing you points. Second Class Upper stays safe as long as you average ${goal.upperFloor} or more.`,
  };
}

/* ------------------------------------------------------- what it tells you */

export interface TellBlock {
  id: 'analysis' | 'forecast' | 'whatif';
  title: string;
  lines: string[];
}

const usesLine = (usage: PublicUsage | null, id: UsageFeatureId, noun: string) =>
  dailyAllowance(usage, id, { count: (n) => `${n} ${noun} free each day`, unknown: 'Free uses every day' });

export function tellBlocks(usage: PublicUsage | null): TellBlock[] {
  return [
    {
      id: 'analysis',
      title: 'Written analysis',
      lines: [
        'Strengths, concerns, recommendations and your degree outlook',
        'Built from your courses, scores and semesters',
        'Your name, email and reg. no. are removed before it is sent',
        'A fresh analysis at most every 12 hours',
        dailyAllowance(usage, 'insights', { count: (n) => `${n} free each day`, unknown: 'Free uses every day' }),
      ],
    },
    {
      id: 'forecast',
      title: 'Forecast',
      lines: [
        'Where your CGPA and PI are heading if your pattern holds',
        'The projection is plain maths and works for every student',
        'AcadeMind adds a short trend note when you allow it',
        'Carry-overs still to clear are listed beside it',
        usesLine(usage, 'forecast', 'trend notes'),
      ],
    },
    {
      id: 'whatif',
      title: 'What-if',
      lines: [
        'Pick a target class and see the GPA you need',
        'Change the semesters left and your unit load',
        'The numbers work for every student',
        'AcadeMind adds a note on how to get there when you allow it',
        usesLine(usage, 'whatif', 'notes'),
      ],
    },
  ];
}

/* ------------------------------------------------------------- statements */

export const STATEMENTS: readonly { field: 'ground-2' | 'paper' | 'ink' | 'gold'; phrase: string; text: string }[] = [
  {
    field: 'ground-2',
    phrase: 'Guidance, not a verdict.',
    text: 'Your degree class is decided by your university, from its own records and rules. AcadeMind helps you think it through; it never decides.',
  },
  {
    field: 'paper',
    phrase: 'Forecasts can be wrong.',
    text: "A forecast follows your past pattern. One strong semester changes it, and so can a course you haven't taken yet.",
  },
  {
    field: 'ink',
    phrase: 'Check it against your record.',
    text: 'Every answer sits beside the real numbers it came from, so you can check it line by line. Spot something wrong? Report it from the answer.',
  },
  {
    field: 'gold',
    phrase: 'Yours to switch on.',
    text: "AcadeMind runs only if you're 18 or over and allow AI processing. Withdraw any time in Settings; your record and all the maths keep working.",
  },
];

/* --------------------------------------------------------- free every day */

export interface MenuItem {
  name: string;
  value: string;
  description: string;
}

export interface MenuGroup {
  name: string;
  items: MenuItem[];
}

/** "At most 2 an hour", "At most 3 in 5 minutes", from the fixed burst windows. */
const burstLine = (id: UsageFeatureId) => {
  const burst = USAGE_FEATURES[id].burst;
  if (burst.windowMs === 3600000) return `At most ${burst.limit} an hour`;
  return `At most ${burst.limit} in ${Math.round(burst.windowMs / 60000)} minutes`;
};

export function freeEveryDay(usage: PublicUsage | null): { groups: MenuGroup[]; closing: string } {
  const perDay = (id: UsageFeatureId) => dailyAllowance(usage, id, { count: (n) => `${n} a day`, unknown: 'Every day' });
  const groups: MenuGroup[] = [
    {
      name: 'Free each day',
      items: [
        { name: 'Written analysis', value: perDay('insights'), description: `${burstLine('insights')}, and a fresh one every 12 hours` },
        { name: 'Forecast trend notes', value: perDay('forecast'), description: burstLine('forecast') },
        { name: 'What-if notes', value: perDay('whatif'), description: burstLine('whatif') },
        { name: 'Result scans', value: perDay('ocr'), description: burstLine('ocr') },
      ],
    },
    {
      name: 'Always free, no limit',
      items: [
        { name: 'Your record, GPA, PI and CGPA', value: 'Free', description: 'Every semester, every figure' },
        { name: 'What-if numbers', value: 'Free', description: 'The GPA you need for any target, worked out on your device' },
        { name: 'Timetables and Build with AcadeMind', value: 'Free', description: 'Rule-based, with no daily limit' },
        { name: 'Calculator and free tools', value: 'Free', description: 'No sign-up needed' },
      ],
    },
  ];
  if (usage && coinsOn(usage)) {
    const coins = usage.coins;
    const names: Record<UsageFeatureId, string> = {
      insights: 'Written analysis',
      forecast: 'Forecast trend note',
      whatif: 'What-if note',
      ocr: 'Result scan',
    };
    const items: MenuItem[] = [
      {
        name: 'Earn coins',
        value: `${coins.coinsPerAd} per ad`,
        description: `Watch a short ad in the Android app, up to ${coins.dailyEarnCap} coins a day`,
      },
    ];
    for (const id of ['insights', 'forecast', 'whatif', 'ocr'] as const) {
      const feature = coins.features[id];
      if (!feature.enabled) continue;
      items.push({ name: names[id], value: coinWord(feature.price), description: `Up to ${feature.dailyUseCap} extra a day` });
    }
    groups.push({ name: 'Extra uses with coins on Android', items });
    return {
      groups,
      closing: `Coins can't be bought, and there is nothing to pay for. Coins aren't offered to accounts under 18.`,
    };
  }
  return { groups, closing: 'Used them all? Your free uses come back within 24 hours.' };
}

/* ----------------------------------------------------------- data answers */

export const DATA_QA: readonly { question: string; answer: string }[] = [
  {
    question: 'What does AcadeMind see?',
    answer:
      'Your courses, scores, grades, GPA, CGPA and programme details. Before a written analysis is sent, your name, email and registration number are removed. Forecast and what-if requests send numbers only.',
  },
  {
    question: 'Who reads it?',
    answer:
      'AI providers that work for AcadeGrade: Google (Gemini), Groq, and OpenRouter, which may pass a request to another model provider. They are in the United States and other countries.',
  },
  {
    question: 'Do they keep it?',
    answer:
      "Some keep request logs for up to 55 days to check for abuse. Where a provider lets us, we ask that your data is not used to train its models, and we ask OpenRouter to use only providers that don't collect it.",
  },
  {
    question: 'Is it on by default?',
    answer:
      'No. AI processing stays off until you allow it, and you can withdraw in Settings, Privacy & AI choices, at any time. Withdrawing is as easy as allowing, and your record keeps working.',
  },
  {
    question: "I'm under 18. Can I use it?",
    answer: `AcadeMind, result scanning and coins are for students ${ADULT_FEATURE_VALUE}. Everything else, from your CGPA to your timetables, works the same. When you turn 18, choose "I've turned 18" in Settings. Please make sure a parent or guardian knows you use AcadeGrade.`,
  },
  {
    question: 'What if an answer is wrong?',
    answer:
      'Tell us. Every answer has Helpful, Not helpful and Report. AcadeMind can be wrong; your record and your university’s rules are the final word.',
  },
];

/** The AI providers named in answer 2; a test checks them against the privacy notice. */
export const NAMED_PROVIDERS = ['Gemini', 'Groq', 'OpenRouter'] as const;

export const CLOSE = {
  heading: 'Ask your record a question.',
  paragraph: "Add your semesters, allow AcadeMind when you're ready, and read your first analysis today. Free every day.",
} as const;
