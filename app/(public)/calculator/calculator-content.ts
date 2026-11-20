import { EXAMPLE_STUDENT } from '@/lib/public/example-student';
import { DEFAULT_SCALE } from '@/lib/public/scales';

/** Copy for /calculator (calculator.md §4). Scale figures come from lib/public/scales.ts. */

const scale = DEFAULT_SCALE;
const points = scale.gradeBands.map((band) => `${band.grade} = ${band.gradePoint}`);
const pointsLine = `${points.slice(0, -1).join(', ')} and ${points[points.length - 1]}`;

export const CALCULATOR_COPY = {
  title: 'CGPA calculator for Nigerian universities',
  description:
    'Work out your semester GPA, PI and CGPA from your result slip, using letter grades or scores. For Nigerian universities. Free, no account, nothing saved.',
  keywords: ['CGPA calculator', 'GPA calculator Nigeria', 'Performance Index calculator', '5 point scale GPA calculator'],
  h1: 'Work out your GPA and CGPA',
  sentence: 'Enter the courses on your result slip to see your GPA, PI and CGPA. Free, no account needed, and nothing you type is saved.',
  facts: ['No account needed', 'Letter grades or scores', 'PI beside your GPA'],
  /** The line above the rows when the example is loaded (no middle-dot meta strings in v2). */
  exampleLine: `Example: ${EXAMPLE_STUDENT.levelLabel} ${EXAMPLE_STUDENT.programme}, ${EXAMPLE_STUDENT.session} ${EXAMPLE_STUDENT.semester.toLowerCase()}`,
  honestNote: "Your own estimate, worked out on this device. Your university's result is the official one.",
  close: 'Keep every semester in one record.',
} as const;

export const CALCULATOR_FAQS: readonly { question: string; answer: string }[] = [
  {
    question: 'How do I calculate my GPA on the 5-point scale?',
    answer: `Multiply each course's grade point by its units, add them up and divide by your total units. ${pointsLine}. For example, an A, a B and a C in 3-, 3- and 2-unit courses give (15 + 12 + 6) ÷ 8 = 4.13.`,
  },
  {
    question: 'What is the difference between GPA and CGPA?',
    answer:
      'Your GPA covers one semester. Your CGPA covers every semester so far, weighted by units. To see your CGPA here, open "Add your CGPA so far" and enter your CGPA and units before this semester: 4.47 over 74 units plus a 4.15 semester over 13 units gives 4.42.',
  },
  {
    question: 'What is PI (Performance Index)?',
    answer:
      'PI uses your actual scores instead of the letter: each total ÷ 100 × 5, averaged by units. A 76 counts as 3.80 and a 65 as 3.25, so PI shows how strong your scores are inside each grade. Not every school uses PI. With letter grades only, PI equals your GPA.',
  },
  {
    question: 'Should I enter letter grades or scores?',
    answer: `Use what your result slip shows. Scores give you PI as well as GPA. If your slip shows CA and exam separately, add them: CA out of ${scale.scoreSplit.ca} plus exam out of ${scale.scoreSplit.exam} is your score out of 100.`,
  },
  {
    question: 'Can I share my calculation without an account?',
    answer:
      'Yes. "Share this calculation" gives a link with your courses built into it, so anyone with the link sees them. Nothing is stored on our side. For a link that expires or needs a PIN, save the semester to your record and share your transcript.',
  },
  {
    question: 'Is this my official result, and is anything saved?',
    answer:
      'No to both. It is your own estimate, worked out on this device; your university\'s result is the official one. Nothing is saved unless you choose "Save to your record", which keeps the courses on this device for 24 hours while you sign up.',
  },
];
