import { EXAMPLE_COURSES } from '@/lib/public/example-student';
import { DEFAULT_SCALE, type PublicClassBand } from '@/lib/public/scales';
import { ADMISSION_EXAMPLE, WAEC_EXAMPLE, admissionView, waecView } from './records-model';
import { carryOverImpact, checkDegreeClass, requiredGpa, weightedAverageFromRows } from './tool-math';
import type { ToolSlug } from './tools-config';

/**
 * Copy and worked examples for the /tools hub (tools-hub.md). Each value on
 * the "Four quick answers" sheet is computed from tool-math.ts at build
 * time, so the hub can never drift from the tools.
 */

const scale = DEFAULT_SCALE;
const range = (short: PublicClassBand['short']) => {
  const band = scale.classBands.find((entry) => entry.short === short)!;
  return `${band.min.toFixed(2)} to ${band.max.toFixed(2)}`;
};

export const HUB_COPY = {
  title: 'Free CGPA tools for Nigerian universities',
  description:
    'Free tools for Nigerian students: CGPA calculator, degree class, required GPA, carry-over, weighted average, WAEC credit checker and JAMB aggregate.',
  h1: 'Free CGPA tools',
  sentence:
    'Work out your GPA and CGPA, check your class and see what next semester needs. Before university, check your WAEC credits and your admission aggregate. Free, and nothing you type is saved.',
  facts: ['No account needed', scale.line, "Personal estimates; your university's result is the official one"],
  shared: ['Answers appear as you type.', 'Nothing you type is saved or sent.', `${scale.line}.`, 'Personal estimates, not official results.'],
  close: 'Ready to keep every semester in one place?',
} as const;

/** The worked example behind each tool's value on the sheet. */
export function hubExample(slug: ToolSlug): { value: string; spoken: string } {
  switch (slug) {
    case 'degree-class-checker': {
      const check = checkDegreeClass(4.43)!;
      return { value: `4.43 → ${check.band.shortLabel}`, spoken: `Example: 4.43 is Second Class Upper, ${check.gap?.toFixed(2)} short of First Class.` };
    }
    case 'weighted-average': {
      const rows = EXAMPLE_COURSES.map((course) => ({ score: String(course.ca + course.exam), units: String(course.units) }));
      const average = weightedAverageFromRows(rows).average!.toFixed(1);
      return { value: average, spoken: `Example: a weighted average score of ${average} out of 100.` };
    }
    case 'required-gpa': {
      const outcome = requiredGpa({ currentCgpa: 3.38, completedUnits: 90, remainingUnits: 60, targetCgpa: 3.5 });
      const needed = outcome.status === 'needed' ? outcome.required.toFixed(2) : '';
      return { value: `${needed} needed`, spoken: `Example: from 3.38 after 90 units, 3.50 needs an average of ${needed}.` };
    }
    case 'carry-over-impact': {
      const impact = carryOverImpact({ currentCgpa: 3, completedUnits: 60, failedUnits: 3, retakeGrade: 'A' })!;
      return {
        value: `${impact.bothAttemptsCount.toFixed(2)} or ${impact.replacesFailure.toFixed(2)}`,
        spoken: `Example: an A on a 3-unit retake gives ${impact.bothAttemptsCount.toFixed(2)} or ${impact.replacesFailure.toFixed(2)}, depending on your school's rule.`,
      };
    }
    case 'waec-credit-checker': {
      const view = waecView(WAEC_EXAMPLE);
      return { value: `${view.credits} credits`, spoken: `Example: two sittings combined give ${view.credits} credits, including English Language and Mathematics.` };
    }
    case 'admission-aggregate': {
      const aggregate = admissionView(ADMISSION_EXAMPLE).aggregate!.toFixed(2);
      return { value: aggregate, spoken: `Example: 268 in UTME, five O-level credits and 62 in post-UTME give an aggregate of ${aggregate} out of 100.` };
    }
  }
}

export const HUB_FAQS: readonly { question: string; answer: string }[] = [
  { question: 'Are these tools free?', answer: 'Yes. All seven are free, need no account and work in any phone browser.' },
  {
    question: 'Which grading scale do they use?',
    answer: `The Nigerian university 5-point scale: A (70 to 100) is 5 points down to F (0 to 39) at 0, with classes from First Class (${range('1st')}) to Pass (${range('Pass')}), and PI beside your GPA. If your handbook differs, it is the final word. The WAEC credit checker uses the O-level letters A1 to F9, and the admission aggregate works out of 100.`,
  },
  {
    question: 'Do the tools save what I type?',
    answer:
      'No. The six quick tools save nothing: close the page and it is gone. The CGPA calculator keeps your courses only if you choose "Save to your record", and then only on your device for 24 hours while you sign up.',
  },
  {
    question: 'Which tool should I use?',
    answer:
      'The CGPA calculator for a semester\'s courses; the degree class checker if you know your CGPA; Required GPA to plan for a target class; Carry-over impact before a retake; the weighted average score if a form asks for an average score. Before university, the WAEC credit checker for your O-level and the admission aggregate for UTME and post-UTME.',
  },
  {
    question: 'Are the results official?',
    answer: "No. They are personal estimates from the numbers you type. Your university's result and transcript are the official ones.",
  },
];
