import { ArrowRight, MessageCircleQuestion } from 'lucide-react';
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
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:col-span-5">
          <div className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
            <MessageCircleQuestion className="size-5" aria-hidden="true" />
          </div>
          <h2
            data-landing-motion="words"
            id="home-faq-title"
            className="mt-5 max-w-[12ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--acade-text)]"
          >
            <span>Clear</span>{' '}<span>answers</span>{' '}<span>before</span>{' '}<span>you</span>{' '}<span>begin.</span>
          </h2>
          <p
            data-landing-motion=""
            style={{ '--landing-delay': '160ms' } as React.CSSProperties}
            className="mt-5 max-w-[42ch] text-base leading-7 text-[var(--acade-text-muted)]"
          >
            AcadeGrade is built to help you understand and manage your academic journey without blurring the line between personal planning and official records.
          </p>
          <LinkButton href="/register" variant="outline" className="group mt-7">
            Start your academic record
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </LinkButton>
        </div>

        <div className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-5 sm:px-7 lg:col-span-7">
          {questions.map((item, index) => (
            <Disclosure
              key={item.question}
              label={item.question}
              defaultOpen={index === 1}
              className="py-2 last:border-b-0"
            >
              <p>{item.answer}</p>
            </Disclosure>
          ))}
        </div>
      </div>
    </section>
  );
}
