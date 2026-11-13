import { ArrowRight } from 'lucide-react';
import { Disclosure, LinkButton } from '@/components/ui';

const questions = [
  {
    question: 'Is AcadeGrade an official university record?',
    answer: "No. AcadeGrade is a personal academic planning and record-management product. Use your institution's official records for formal verification, graduation decisions, and other official purposes.",
  },
  {
    question: 'How are CGPA and PI different?',
    answer: 'CGPA follows the applicable letter-grade points and credit weighting. PI uses the weighted raw-score signal when scores are available, helping you see movement that a letter grade can hide.',
  },
  {
    question: 'Can I use my institution’s grading scale?',
    answer: 'AcadeGrade is designed to work with configured academic scales and programme timelines. Always confirm that the selected scale matches the rules used by your institution.',
  },
  {
    question: 'What gets shared from my account?',
    answer: 'Your workspace is private by default. When a sharing feature is available, you choose what to create and share; review the generated record before sending its link.',
  },
] as const;

export function HomeFAQ() {
  return (
    <section aria-labelledby="home-faq-title" className="public-atmosphere-section">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <h2
            data-landing-motion="words"
            id="home-faq-title"
            className="max-w-[13ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.125rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--acade-text)]"
          >
            <span>Clear</span>{' '}<span>answers</span>{' '}<span>before</span>{' '}<span>you</span>{' '}<span>begin.</span>
          </h2>
          <p
            data-landing-motion=""
            style={{ '--landing-delay': '160ms' } as React.CSSProperties}
            className="mt-5 max-w-[42ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]"
          >
            AcadeGrade is built to help you understand and manage your academic journey without blurring the line between personal planning and official records.
          </p>
          <LinkButton href="/register" variant="outline" className="marketing-press group mt-7">
            Start your academic record
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </LinkButton>
        </div>

        <div className="faq-tiles grid gap-2 lg:col-span-7">
          {questions.map((item, index) => (
            <Disclosure
              key={item.question}
              label={item.question}
              defaultOpen={index === 1}
              className="faq-tile"
            >
              <p className="max-w-[60ch] text-base leading-7">{item.answer}</p>
            </Disclosure>
          ))}
        </div>
      </div>
    </section>
  );
}
