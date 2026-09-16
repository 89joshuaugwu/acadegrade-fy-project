import { BookOpenCheck, ChartNoAxesCombined, Compass } from 'lucide-react';

const workflow = [
  {
    marker: '01',
    title: 'Record what happened',
    description: 'Add scores, grades, credits, semester and session context.',
    icon: BookOpenCheck,
  },
  {
    marker: '02',
    title: 'See where you stand',
    description: 'Read CGPA, PI, degree class and completion context together.',
    icon: ChartNoAxesCombined,
  },
  {
    marker: '03',
    title: 'Plan what comes next',
    description: 'Test scenarios and focus attention where the credit impact matters.',
    icon: Compass,
  },
] as const;

export function ProductStory() {
  return (
    <section id="how-it-works" aria-labelledby="product-story-title" className="public-atmosphere-section scroll-mt-20 border-b border-[var(--acade-border-subtle)]">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-5 border-b border-[var(--acade-border)] pb-9 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold text-[var(--acade-primary)]">A practical academic rhythm</p>
            <h2 id="product-story-title" className="mt-3 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.5vw,2.75rem)] font-semibold tracking-[-0.035em]">Record. Understand. Plan.</h2>
          </div>
          <p className="max-w-[48ch] leading-7 text-[var(--acade-text-muted)] lg:col-span-5">One connected record supports the three decisions students return to throughout a degree.</p>
        </div>

        <ol aria-label="Academic workflow" className="mt-7 grid gap-0 sm:mt-10 md:grid-cols-3">
          {workflow.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.marker} className={`py-6 md:px-7 md:py-7 ${index < workflow.length - 1 ? 'border-b border-[var(--acade-border-subtle)] md:border-b-0 md:border-r' : ''} ${index === 0 ? 'md:pl-0' : ''} ${index === workflow.length - 1 ? 'md:pr-0' : ''}`}>
                <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-primary)]">{step.marker}</span>
                <Icon className="mt-6 size-7 text-[var(--acade-primary)]" aria-hidden="true" />
                <h3 className="mt-5 font-[family-name:var(--font-bricolage)] text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
