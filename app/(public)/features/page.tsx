import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  FileScan,
  ShieldCheck,
} from 'lucide-react';
import { EditorialHero, ProductCta, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Academic tracking features',
  description: 'Explore AcadeGrade features for result tracking, CGPA and PI analysis, result-slip scanning, transcripts, forecasts, and AI-assisted academic insights.',
  path: '/features',
  keywords: ['student result tracker', 'academic performance tracker', 'CGPA tracker', 'AI academic insights'],
});

const capabilities = [
  {
    icon: BookOpenCheck,
    label: 'Record',
    title: 'A structured home for every semester',
    description: 'Keep course scores, letter grades, credit units, sessions, and semester status together in one readable timeline.',
    detail: 'Manual entry · flexible score modes · semester context',
  },
  {
    icon: ChartNoAxesCombined,
    label: 'Understand',
    title: 'CGPA and PI, read together',
    description: 'See grade-point progress beside raw-score performance so a single average never tells the whole story.',
    detail: 'CGPA · Performance Index · degree class · trends',
  },
  {
    icon: FileScan,
    label: 'Save time',
    title: 'Reviewable result-slip scanning',
    description: 'Extract course details from an image or PDF, check every value, and decide what enters your record.',
    detail: 'Image and PDF input · editable extraction · explicit save',
    href: '/features/result-scanner',
  },
  {
    icon: BrainCircuit,
    label: 'Plan',
    title: 'Insights grounded in your record',
    description: 'Explore trend explanations, risk signals, forecasts, and what-if scenarios without presenting them as official advice.',
    detail: 'Trend context · forecasts · what-if planning',
    href: '/features/ai-insights',
  },
] as const;

export default function FeaturesPage() {
  return (
    <PublicPage>
      <EditorialHero
        eyebrow="Product features"
        title="One record. A clearer degree journey."
        description="AcadeGrade brings your semester results, calculations, scans, and planning tools into a private workspace designed for how university progress actually unfolds."
        primary={{ href: '/register', label: 'Start your academic record' }}
        secondary={{ href: '/calculator', label: 'Try the free calculator' }}
        aside={<FeatureSignal />}
      />

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="The workspace"
          title="Useful at the moment you need it."
          description="Begin with the basics, then unlock more context as your academic history grows. Every layer remains understandable on its own."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-border)] md:grid-cols-2">
          {capabilities.map(({ icon: Icon, label, title, description, detail, ...item }, index) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-5">
                  <div className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                    <Icon size={21} aria-hidden="true" />
                  </div>
                  <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">0{index + 1}</span>
                </div>
                <p className="mt-9 text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-primary)]">{label}</p>
                <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight">{title}</h2>
                <p className="mt-4 leading-7 text-[var(--acade-text-muted)]">{description}</p>
                <div className="mt-8 flex items-end justify-between gap-4 border-t border-[var(--acade-border-subtle)] pt-5">
                  <p className="font-[family-name:var(--font-geist-mono)] text-xs leading-5 text-[var(--acade-text-faint)]">{detail}</p>
                  {'href' in item ? <ArrowRight className="size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" /> : null}
                </div>
              </>
            );

            return 'href' in item ? (
              <Link key={title} href={item.href} className="group bg-[var(--acade-surface)] p-6 transition-colors hover:bg-[var(--acade-deep)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--acade-primary)] sm:p-8">
                {content}
              </Link>
            ) : (
              <article key={title} className="bg-[var(--acade-surface)] p-6 sm:p-8">{content}</article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <ShieldCheck size={27} className="text-[var(--acade-success)]" aria-hidden="true" />
            <h2 className="mt-6 font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-[-0.03em]">Your record stays yours.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <p className="leading-7 text-[var(--acade-text-muted)]">AcadeGrade is a personal tracking workspace. Your academic data is connected to your account and is not a replacement for your institution&apos;s official transcript.</p>
            <p className="leading-7 text-[var(--acade-text-muted)]">Scanning and AI-assisted tools keep you in control: review extracted values before saving and treat generated guidance as context, not an academic decision.</p>
          </div>
        </div>
      </section>

      <ProductCta />
    </PublicPage>
  );
}

function FeatureSignal() {
  return (
    <div className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--acade-border-subtle)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">Degree workspace</p>
          <p className="mt-1 text-lg font-bold">Progress in context</p>
        </div>
        <span className="rounded-full bg-[var(--acade-success-dim)] px-3 py-1.5 text-xs font-bold text-[var(--acade-success)]">Private</span>
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] bg-[var(--acade-deep)] p-4">
          <dt className="text-xs text-[var(--acade-text-faint)]">Academic view</dt>
          <dd className="mt-2 text-xl font-bold">CGPA + PI</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-[var(--acade-deep)] p-4">
          <dt className="text-xs text-[var(--acade-text-faint)]">Input modes</dt>
          <dd className="mt-2 text-xl font-bold">3 ways</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)] p-4 text-sm leading-6 text-[var(--acade-text-muted)]">
        Enter results manually, import a code, or review a scan before saving.
      </div>
    </div>
  );
}
