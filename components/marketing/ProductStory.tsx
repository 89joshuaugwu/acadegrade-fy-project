import { ArrowRight, BookOpen, Compass, LineChart } from 'lucide-react';
import { LinkButton } from '@/components/ui';

const workflow = [
  {
    marker: 'Record',
    title: 'Record what happened',
    description: 'Add course scores or letter grades semester by semester, with the credit units and session context that make them meaningful.',
    detail: 'Course records · semester context · flexible score modes',
    icon: BookOpen,
    featured: true,
  },
  {
    marker: 'Understand',
    title: 'See where you stand',
    description: 'Read CGPA and PI together, follow the calculation basis, and separate an incomplete record from an actual academic risk.',
    detail: 'CGPA · PI · degree class · completion state',
    icon: LineChart,
    featured: false,
  },
  {
    marker: 'Plan',
    title: 'Plan what comes next',
    description: 'Use trends and what-if scenarios to test the impact of future performance before the next result arrives.',
    detail: 'Forecasts · scenarios · course priorities',
    icon: Compass,
    featured: false,
  },
] as const;

export function ProductStory() {
  return (
    <section id="how-it-works" aria-labelledby="product-story-title" className="scroll-mt-20 border-b border-[var(--acade-border-subtle)]">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-6 border-b border-[var(--acade-border)] pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-sm font-semibold text-[var(--acade-primary)]">A connected academic workflow</p>
            <h2
              id="product-story-title"
              className="mt-3 max-w-[15ch] font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--acade-text)]"
            >
              One record, three useful answers.
            </h2>
          </div>
          <p className="max-w-[46ch] text-base leading-7 text-[var(--acade-text-muted)] lg:col-span-4">
            AcadeGrade follows the order students actually need: capture the evidence, understand the present, then decide the next move.
          </p>
        </div>

        <ol aria-label="Academic workflow" className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:grid-rows-2">
          {workflow.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.marker}
                className={
                  step.featured
                    ? 'relative overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8 lg:col-span-7 lg:row-span-2 lg:min-h-[430px]'
                    : 'rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-6 lg:col-span-5'
                }
              >
                <div className={step.featured ? 'flex h-full flex-col' : 'flex gap-4'}>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className={step.featured ? 'mt-10 sm:mt-16 lg:mt-auto lg:pt-20' : 'min-w-0'}>
                    <p className="text-xs font-semibold text-[var(--acade-text-faint)]">{step.marker}</p>
                    <h3 className="mt-2 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)] sm:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[48ch] text-sm leading-6 text-[var(--acade-text-muted)] sm:text-base sm:leading-7">
                      {step.description}
                    </p>
                    <p className="mt-5 border-t border-[var(--acade-border-subtle)] pt-4 font-[family-name:var(--font-geist-mono)] text-xs leading-5 text-[var(--acade-text-faint)]">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[var(--radius-surface)] bg-[var(--acade-primary-dim)] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Build an academic record you can act on.</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">Start with one semester and grow the record at your own pace.</p>
          </div>
          <LinkButton href="/register" className="group shrink-0">
            Create your account
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
