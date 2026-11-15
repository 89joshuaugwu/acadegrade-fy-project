export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolConfig {
  slug: 'degree-class-checker' | 'required-gpa' | 'carry-over-impact' | 'weighted-average';
  title: string;
  heading: string;
  description: string;
  keywords: string[];
  faqs: ToolFaq[];
}

export const TOOL_CONFIGS: readonly ToolConfig[] = [
  {
    slug: 'degree-class-checker',
    title: 'Degree class checker',
    heading: 'Degree class checker',
    description: 'Enter a CGPA on the 5.0 scale and see which degree class it falls in, and how far the next class up is.',
    keywords: ['degree class calculator', 'CGPA to degree class Nigeria', 'first class CGPA 5.0 scale'],
    faqs: [
      {
        question: 'What CGPA is a First Class on the 5.0 scale?',
        answer: 'On the scale used here, a CGPA of 4.50 to 5.00 is First Class, 3.50 to 4.49 is Second Class Upper, 2.40 to 3.49 is Second Class Lower, 1.50 to 2.39 is Third Class, and 1.00 to 1.49 is a Pass.',
      },
      {
        question: 'Does the checker round my CGPA?',
        answer: 'Yes. The class is read from the CGPA rounded to two decimal places, the same way it is shown on your results.',
      },
      {
        question: 'Will my school classify me the same way?',
        answer: 'Not always. Some schools use different boundaries or extra conditions. Your school\'s published grading rules decide your actual class.',
      },
    ],
  },
  {
    slug: 'required-gpa',
    title: 'Required GPA calculator',
    heading: 'What GPA do I need?',
    description: 'Enter your current CGPA, units done and units left, then pick a target CGPA to see the average GPA you need over the remaining units.',
    keywords: ['required GPA calculator', 'what GPA do I need', 'target CGPA calculator'],
    faqs: [
      {
        question: 'How is the required GPA worked out?',
        answer: 'It is the average GPA over your remaining units that brings the overall CGPA to your target: (target x all units - current CGPA x completed units) / remaining units.',
      },
      {
        question: 'What if the answer is above 5.00?',
        answer: 'Then the target cannot be reached with the units you have left, even with straight As. The tool shows the highest CGPA you can still reach.',
      },
      {
        question: 'Which units count as remaining?',
        answer: 'Use the units you still expect to take. Carry-over courses you will retake are part of those units if your school counts them again.',
      },
    ],
  },
  {
    slug: 'carry-over-impact',
    title: 'Carry-over impact calculator',
    heading: 'Carry-over impact on your CGPA',
    description: 'See how retaking a failed course could change your CGPA, under both common school rules: the retake adds to the total, or it replaces the failed attempt.',
    keywords: ['carry over CGPA', 'resit course CGPA effect', 'failed course CGPA calculator'],
    faqs: [
      {
        question: 'Why does the tool show two results?',
        answer: 'Schools differ. Some keep the failed attempt in the total and add the retake as extra units. Others replace the failed attempt with the retake. Check which rule your school follows.',
      },
      {
        question: 'Are the failed units included in my completed units?',
        answer: 'Yes. Enter your completed units including the failed course, because an F is already counted in your CGPA with zero grade points.',
      },
      {
        question: 'Can a retake lower my CGPA?',
        answer: 'Only if the retake grade is below your current CGPA and your school counts both attempts. A pass on a retake replacing an F always helps.',
      },
    ],
  },
  {
    slug: 'weighted-average',
    title: 'Weighted average score calculator',
    heading: 'Weighted average score',
    description: 'Enter course scores out of 100 with their units to get the credit-weighted average score. This is a percentage, not a CGPA.',
    keywords: ['weighted average score calculator', 'credit weighted average', 'average score by units'],
    faqs: [
      {
        question: 'How is the weighted average calculated?',
        answer: 'Each score is multiplied by its units, the results are added up, and the total is divided by the total units.',
      },
      {
        question: 'Is the weighted average my CGPA?',
        answer: 'No. A CGPA averages grade points on the 5.0 scale. The weighted average is a percentage of raw scores, so it can give a finer picture than grades alone.',
      },
      {
        question: 'Which rows are left out?',
        answer: 'Rows with a missing or invalid score (outside 0 to 100) or units below 1 are skipped, and the tool says how many.',
      },
    ],
  },
];

export const TOOL_PATHS = TOOL_CONFIGS.map((tool) => `/tools/${tool.slug}` as const);

export function getTool(slug: ToolConfig['slug']): ToolConfig {
  const tool = TOOL_CONFIGS.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Unknown tool ${slug}`);
  return tool;
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
