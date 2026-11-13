const workflow = [
  {
    title: 'Record what happened',
    description: 'Add scores, grades, credits, semester and session context.',
    tone: 'story-segment--record',
  },
  {
    title: 'See where you stand',
    description: 'Read CGPA, PI, degree class and completion context together.',
    tone: 'story-segment--understand',
  },
  {
    title: 'Plan what comes next',
    description: 'Test scenarios and focus attention where the credit impact matters.',
    tone: 'story-segment--plan',
  },
] as const;

export function ProductStory() {
  return (
    <section id="how-it-works" aria-labelledby="product-story-title" className="public-atmosphere-section scroll-mt-20">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <h2
            data-landing-motion="words"
            id="product-story-title"
            className="font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] lg:col-span-7"
          >
            <span>Record.</span>{' '}<span>Understand.</span>{' '}<span>Plan.</span>
          </h2>
          <p className="max-w-[44ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)] lg:col-span-5 lg:justify-self-end">
            One connected record supports the three decisions students return to throughout a degree.
          </p>
        </div>

        <ol aria-label="Academic workflow" className="story-rail mt-10 grid gap-8 sm:mt-14 md:grid-cols-3 md:gap-1.5">
          {workflow.map((step, index) => (
            <li key={step.title} data-landing-motion="capture" data-landing-order={index} className="min-w-0">
              <div className={`story-segment ${step.tone}`}>
                <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{step.title}</h3>
              </div>
              <p className="mt-4 max-w-[34ch] leading-7 text-[var(--acade-text-muted)] md:pr-6">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
