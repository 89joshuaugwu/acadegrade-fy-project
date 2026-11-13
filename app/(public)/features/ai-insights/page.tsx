import type { Metadata } from 'next';
import Image from 'next/image';
import { ChartSpline, Compass, Scale, ShieldCheck, Sparkles } from 'lucide-react';
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
        trail={[{ href: '/features', label: 'Features' }]}
        crumb="AcadeMind insights"
        title="Turn academic history into better questions."
        description="AcadeGrade combines deterministic calculations with AI-assisted explanations so you can understand patterns, explore possibilities, and plan with more context."
        primary={{ href: '/register', label: 'Build your academic record' }}
        secondary={{ href: '/features', label: 'View all features' }}
        aside={<InsightPreview />}
      />

      <section aria-labelledby="insight-types-title" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28">
        <SectionIntro
          id="insight-types-title"
          title="Insight that starts with your own data."
          description="The clearer your semester history, the more useful the context AcadeGrade can surface around your performance."
        />
        <ul className="mt-12 grid gap-2">
          {insightTypes.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid gap-3 rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-6 sm:grid-cols-[minmax(12rem,18rem)_1fr] sm:items-baseline sm:gap-10 sm:p-8">
              <h3 className="flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em]">
                <Icon className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
                {title}
              </h3>
              <p className="max-w-[60ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="boundaries-title" className="bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
          <div className="lg:col-span-5">
            <ShieldCheck className="size-7 text-[var(--acade-success)]" aria-hidden="true" />
            <h2 id="boundaries-title" className="mt-5 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.06] tracking-[-0.04em]">Guidance, not a verdict.</h2>
          </div>
          <div className="lg:col-span-7">
            <CheckList items={[
              'Official CGPA and degree decisions always come from your institution.',
              'Forecasts and scenarios are estimates, not guaranteed outcomes.',
              'AI explanations can be incomplete and should be checked against your actual record.',
              'You choose when to use an AI-assisted feature and what record context it analyzes.',
            ]} />
          </div>
        </div>
      </section>

      <ProductCta title="See your progress from more than one angle." description="Build a dependable semester history first, then use insights and scenarios to plan with clearer context." />
    </PublicPage>
  );
}

function InsightPreview() {
  return (
    <figure data-ui="" className="rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-6 ring-1 ring-[var(--acade-border)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/acadegradeailogo.png" alt="AcadeMind" width={28} height={28} className="size-7 object-contain" />
          <div><p className="font-semibold">Academic signal</p><p className="text-[0.8125rem] text-[var(--acade-text-muted)]">Illustrative insight</p></div>
        </div>
        <Sparkles className="size-5 text-[var(--acade-gold)]" aria-hidden="true" />
      </div>
      <blockquote className="mt-7">
        <p className="font-[family-name:var(--font-bricolage)] text-xl font-semibold leading-8 tracking-[-0.01em] sm:text-2xl sm:leading-9">“Your recent trajectory is improving. Compare the credit weight of your remaining courses before choosing the next target.”</p>
      </blockquote>
      <dl className="mt-7 grid grid-cols-3 gap-2" aria-label="Illustrative academic indicators">
        {[['Trend', 'Rising'], ['Risk', 'Review'], ['Plan', 'Ready']].map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-control)] bg-[var(--acade-overlay)] px-3 py-3">
            <dt className="text-[0.8125rem] text-[var(--acade-text-muted)]">{label}</dt>
            <dd className="mt-0.5 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-5 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Example guidance only. Generated insights may be incomplete or inaccurate.</figcaption>
    </figure>
  );
}
