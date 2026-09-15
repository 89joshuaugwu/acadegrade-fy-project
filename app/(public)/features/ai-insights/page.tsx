import type { Metadata } from 'next';
import { BrainCircuit, ChartSpline, Compass, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { CheckList, EditorialHero, ProductCta, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'AI-assisted academic insights',
  description: 'Use your academic record to explore trends, risks, forecasts, and what-if scenarios with clear boundaries around AI-generated guidance.',
  path: '/features/ai-insights',
  keywords: ['AI academic insights', 'CGPA forecast', 'grade what-if calculator', 'academic performance trends'],
});

const insightTypes = [
  { icon: ChartSpline, title: 'Trend context', text: 'Connect changes in CGPA and Performance Index to the semesters and credit loads behind them.' },
  { icon: Compass, title: 'Forward view', text: 'Explore a forecast based on the academic history currently available in your workspace.' },
  { icon: Scale, title: 'What-if planning', text: 'Test how possible future performance could affect your trajectory before the next result arrives.' },
] as const;

export default function AiInsightsPage() {
  return (
    <PublicPage>
      <EditorialHero
        eyebrow="AcadeMind insights"
        title="Turn academic history into better questions."
        description="AcadeGrade combines deterministic calculations with AI-assisted explanations so you can understand patterns, explore possibilities, and plan with more context."
        primary={{ href: '/register', label: 'Build your academic record' }}
        secondary={{ href: '/features', label: 'View all features' }}
        aside={<InsightPreview />}
      />

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="From record to direction"
          title="Insight that starts with your own data."
          description="The clearer your semester history, the more useful the context AcadeGrade can surface around your performance."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {insightTypes.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="border-t-2 border-[var(--acade-primary)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
              <div className="flex items-center justify-between">
                <Icon className="size-6 text-[var(--acade-primary)]" aria-hidden="true" />
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">0{index + 1}</span>
              </div>
              <h2 className="mt-10 font-[family-name:var(--font-bricolage)] text-2xl font-bold">{title}</h2>
              <p className="mt-4 leading-7 text-[var(--acade-text-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <ShieldCheck className="size-7 text-[var(--acade-success)]" aria-hidden="true" />
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.17em] text-[var(--acade-primary)]">Clear boundaries</p>
            <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Guidance, not a verdict.</h2>
          </div>
          <CheckList items={[
            'Official CGPA and degree decisions always come from your institution.',
            'Forecasts and scenarios are estimates, not guaranteed outcomes.',
            'AI explanations can be incomplete and should be checked against your actual record.',
            'You choose when to use an AI-assisted feature and what record context it analyzes.',
          ]} />
        </div>
      </section>

      <ProductCta title="See your progress from more than one angle." description="Build a dependable semester history first, then use insights and scenarios to plan with clearer context." />
    </PublicPage>
  );
}

function InsightPreview() {
  return (
    <figure className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]"><BrainCircuit size={20} aria-hidden="true" /></span>
          <div><p className="text-sm font-bold">Academic signal</p><p className="text-xs text-[var(--acade-text-faint)]">Illustrative insight</p></div>
        </div>
        <Sparkles className="size-5 text-[var(--acade-gold)]" aria-hidden="true" />
      </div>
      <blockquote className="mt-8 border-l-2 border-[var(--acade-primary)] pl-5">
        <p className="font-[family-name:var(--font-bricolage)] text-xl font-semibold leading-8">Your recent trajectory is improving. Compare the credit weight of your remaining courses before choosing the next target.</p>
      </blockquote>
      <div className="mt-8 grid grid-cols-3 gap-2" aria-label="Illustrative academic indicators">
        {[['Trend', 'Rising'], ['Risk', 'Review'], ['Plan', 'Ready']].map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-control)] bg-[var(--acade-deep)] p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-[var(--acade-text-faint)]">{label}</p>
            <p className="mt-1 text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-5 text-xs leading-5 text-[var(--acade-text-faint)]">Example guidance only. Generated insights may be incomplete or inaccurate.</figcaption>
    </figure>
  );
}
