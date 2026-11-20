import { DEFAULT_SCALE, type PublicClassBand } from '@/lib/public/scales';

/**
 * The four quick tools: copy, FAQs, hub grouping and worked examples.
 * The hub (/tools), every tool page, the sitemap and the JSON-LD read this
 * list, so a new tool is one entry here. Class thresholds in the FAQs are
 * templated from lib/public/scales.ts.
 */

export interface ToolFaq {
  question: string;
  answer: string;
}

export type ToolSlug = 'degree-class-checker' | 'required-gpa' | 'carry-over-impact' | 'weighted-average';

export interface ToolConfig {
  slug: ToolSlug;
  /** Title tag (the template adds "| AcadeGrade") and WebApplication name. */
  title: string;
  /** The h1 on the slip. */
  heading: string;
  /** The supporting sentence under the h1. */
  sentence: string;
  /** Meta description, 140 to 160 characters. */
  description: string;
  keywords: string[];
  faqs: ToolFaq[];
  /** Hub menu: the name, the question it answers and its group. */
  menuName: string;
  question: string;
  group: 'Where you stand' | 'What comes next';
  /** "More free tools" table: the kind column. */
  kind: string;
  /** Close sentence. */
  close: string;
}

const scale = DEFAULT_SCALE;
const band = (short: PublicClassBand['short']) => scale.classBands.find((entry) => entry.short === short)!;
const range = (short: PublicClassBand['short']) => `${band(short).min.toFixed(2)} to ${band(short).max.toFixed(2)}`;
const first = band('1st');
const pass = band('Pass');

export const TOOL_CONFIGS: readonly ToolConfig[] = [
  {
    slug: 'degree-class-checker',
    title: 'Degree class checker',
    heading: 'Degree class checker',
    sentence:
      'Type your CGPA to see which class it falls in on the 5-point scale used by Nigerian universities, and how far the next class is.',
    description: `Type your CGPA and see your degree class on the Nigerian 5-point scale: First Class from ${first.min.toFixed(2)}, 2:1 from ${band('2:1').min.toFixed(2)}, 2:2 from ${band('2:2').min.toFixed(2)}. Free, and nothing is saved.`,
    keywords: ['degree class calculator', 'CGPA to degree class Nigeria', 'first class CGPA 5.0 scale', '2:1 CGPA range', 'what CGPA is first class'],
    faqs: [
      {
        question: 'What CGPA is a First Class in Nigeria?',
        answer: `On the 5-point scale most Nigerian universities use, First Class is a CGPA of ${range('1st')}. Second Class Upper is ${range('2:1')}, Second Class Lower ${range('2:2')}, Third Class ${range('3rd')} and Pass ${range('Pass')}. Your handbook is the final word.`,
      },
      {
        question: 'Is a CGPA of 4.49 a First Class?',
        answer: `No. 4.49 is Second Class Upper, 0.01 short of First Class at ${first.min.toFixed(2)}. Classes are read from the CGPA rounded to two decimals, so a CGPA of 4.495 or more shows as 4.50 and counts as First Class here. Ask your department how your school rounds.`,
      },
      {
        question: 'What CGPA is a 2:1?',
        answer: `A Second Class Upper (2:1) is a CGPA of ${range('2:1')}. A Second Class Lower (2:2) is ${range('2:2')}.`,
      },
      {
        question: 'Can I still make First Class from where I am?',
        answer:
          'It depends on how many units you have left. Put your CGPA, units done and units left into the Required GPA tool to see the average you would need, or the highest CGPA you can still reach.',
      },
      {
        question: `What happens below a CGPA of ${pass.min.toFixed(2)}?`,
        answer: `On this scale there is no class below ${pass.min.toFixed(2)}, where a Pass begins. Your school's regulations say what happens next, so speak to your level adviser.`,
      },
      {
        question: 'Is this my official degree class?',
        answer: 'No. It is a personal estimate from the CGPA you type. Your university awards your class, and nothing you type here is saved.',
      },
    ],
    menuName: 'Degree class checker',
    question: 'Which class is my CGPA in, and how far is the next one?',
    group: 'Where you stand',
    kind: 'Class',
    close: 'Let your class update itself.',
  },
  {
    slug: 'required-gpa',
    title: 'Required GPA calculator',
    heading: 'What GPA do I need?',
    sentence:
      "Enter your CGPA so far, the units behind it and the units you have left, then choose a target. You'll see the average you need from here.",
    description:
      'Find the average GPA you need over your remaining units to reach First Class, a 2:1 or any target CGPA on the Nigerian 5-point scale. Free, nothing saved.',
    keywords: ['required GPA calculator', 'what GPA do I need', 'target CGPA calculator', 'GPA needed for first class Nigeria', '2:2 to 2:1'],
    faqs: [
      {
        question: 'What GPA do I need to get a First Class?',
        answer:
          'Work out the points a 4.50 needs over all your units, take away the points you have, and divide by the units you have left. With a CGPA of 4.20 after 90 units and 60 units left, you need (4.50 × 150 − 4.20 × 90) ÷ 60 = 4.95.',
      },
      {
        question: 'How is the required GPA worked out?',
        answer:
          'It is the average over your remaining units that brings your overall CGPA to the target: (target × all units − current CGPA × units done) ÷ units left.',
      },
      {
        question: `What if the answer is above ${scale.maxPoint.toFixed(2)}?`,
        answer:
          'Then the target cannot be reached with the units you have left, even with an A in every course. The tool shows the highest CGPA you can still reach, so you can aim for that.',
      },
      {
        question: 'Which units count as remaining?',
        answer:
          'The units you still expect to take, including any carry-over courses you will retake if your school counts them again. Your course adviser can confirm your remaining load.',
      },
      {
        question: 'Can I move from a 2:2 to a 2:1 in my final year?',
        answer:
          'Often, if enough units are left. From a CGPA of 3.30 after 120 units, with 40 units left, reaching 3.50 needs (3.50 × 160 − 3.30 × 120) ÷ 40 = 4.10 on average.',
      },
      {
        question: 'Does AcadeGrade keep the numbers I type here?',
        answer:
          'No. This tool saves nothing; close the page and it is gone. In a free AcadeGrade record your target stays set and the needed average updates after each semester.',
      },
    ],
    menuName: 'Required GPA',
    question: 'What average do I need over my remaining units to reach my target?',
    group: 'What comes next',
    kind: 'Target',
    close: 'Set your target once. Your record keeps count.',
  },
  {
    slug: 'carry-over-impact',
    title: 'Carry-over impact calculator',
    heading: 'Carry-over impact',
    sentence: 'See what retaking a failed course could do to your CGPA. Schools count a retake in one of two ways, so you get both answers.',
    description:
      'See how retaking a failed course changes your CGPA under the two common rules: the retake added as extra units, or the retake replacing the F. Free.',
    keywords: ['carry over CGPA', 'how does a carry over affect CGPA', 'resit course CGPA effect', 'failed course CGPA calculator', 'does retake replace F'],
    faqs: [
      {
        question: 'How does a carry-over affect my CGPA?',
        answer:
          'A failed course (F) adds its units to your total with 0 points, so it pulls your CGPA down until you pass it. For example, 57 units averaging 3.16 plus a 3-unit F comes to about 180 points over 60 units: a CGPA of 3.00.',
      },
      {
        question: 'Does a retake replace my F?',
        answer:
          'It depends on your school. Some replace the failed attempt with the retake grade; others keep the F and add the retake as new units. This tool shows both, so check your handbook for the rule that applies to you.',
      },
      {
        question: 'Should I count the failed course in units completed?',
        answer:
          'Yes. Enter your units completed including the failed course, and your current CGPA as your result shows it. The F is already inside that CGPA with 0 points.',
      },
      {
        question: 'Can a retake lower my CGPA?',
        answer:
          'Only when the retake is added as extra units and its grade is below your current CGPA. With a CGPA of 3.00 over 60 units, a D (2 points) on a 3-unit retake gives 2.95. When the retake replaces the F, it can never lower your CGPA.',
      },
      {
        question: 'What is the difference between a carry-over and a spill-over?',
        answer:
          'A carry-over is a course you failed and must take again. A spill-over is a student who stays beyond the normal length of the programme, often to clear carry-overs.',
      },
      {
        question: 'Is this result official?',
        answer: "No. It is a personal estimate from the numbers you type, and nothing is saved. Your university's result is the official one.",
      },
    ],
    menuName: 'Carry-over impact',
    question: 'What will retaking a failed course do to my CGPA?',
    group: 'What comes next',
    kind: 'Retake',
    close: 'Track every carry-over until it clears.',
  },
  {
    slug: 'weighted-average',
    title: 'Weighted average score calculator',
    heading: 'Weighted average score',
    sentence: "Enter each course's score out of 100 and its units to get your average score, weighted by units. Up to 20 courses.",
    description:
      'Work out your weighted average score from course scores and units, and see how it compares with your GPA and PI. Up to 20 courses. Free, nothing saved.',
    keywords: ['weighted average score calculator', 'credit weighted average', 'average score by units', 'how to calculate weighted average score Nigeria'],
    faqs: [
      {
        question: 'How do I calculate my weighted average score?',
        answer:
          "Multiply each course's score by its units, add the results and divide by your total units. Scores of 76, 65 and 56 in 3-unit courses and 72 and 61 in 2-unit courses give 857 ÷ 13 = 65.9.",
      },
      {
        question: 'Is my weighted average score the same as my CGPA?',
        answer:
          'No. Your CGPA averages grade points on the 5-point scale, so a 69 and a 60 both count as a B (4 points). The weighted average keeps the scores themselves, so it shows the difference between them.',
      },
      {
        question: 'How is it different from PI?',
        answer:
          'PI turns each score into points on the 5-point scale (score ÷ 100 × 5) and averages them by units, so PI is your weighted average score divided by 20: 65.9 ÷ 20 = 3.30.',
      },
      {
        question: 'When would I need a weighted average score?',
        answer:
          "Some scholarship, postgraduate and job forms ask for an average score instead of a CGPA. Give the figure the form asks for, and attach your university's transcript wherever the form asks for proof.",
      },
      {
        question: 'Which rows are left out?',
        answer:
          'Rows with a score outside 0 to 100, or units of 0 or less, are left out, and the tool tells you how many. Empty rows are ignored. Nothing you type is saved.',
      },
      {
        question: 'Can I use letter grades instead of scores?',
        answer:
          'No. A letter covers a range (a B is anything from 60 to 69), so it has no single score. For letter grades, use the CGPA calculator.',
      },
    ],
    menuName: 'Weighted average score',
    question: 'What is my average score out of 100, weighted by units?',
    group: 'Where you stand',
    kind: 'Average',
    close: 'Keep every score, every semester.',
  },
];

export const TOOL_PATHS = TOOL_CONFIGS.map((tool) => `/tools/${tool.slug}` as const);

export function getTool(slug: ToolSlug): ToolConfig {
  const tool = TOOL_CONFIGS.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Unknown tool ${slug}`);
  return tool;
}

/** The hub's order: grouped "Where you stand", then "What comes next". */
export function toolsByGroup(): { group: ToolConfig['group']; tools: ToolConfig[] }[] {
  const order: ToolSlug[] = ['degree-class-checker', 'weighted-average', 'required-gpa', 'carry-over-impact'];
  const sorted = order.map(getTool);
  return (['Where you stand', 'What comes next'] as const).map((group) => ({ group, tools: sorted.filter((tool) => tool.group === group) }));
}

export function faqJsonLd(faqs: readonly ToolFaq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
