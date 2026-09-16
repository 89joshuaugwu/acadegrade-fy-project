'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, BrainCircuit, Mail, RefreshCw, ShieldCheck, Target } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button, LinkButton, Skeleton } from '@/components/ui';
import { DEFAULT_ABOUT_CONTENT, type AboutContent } from '@/lib/about/content';
import { LandingMotion } from '@/components/marketing/LandingMotion';

const principles = [
  {
    icon: BookOpenCheck,
    title: 'One dependable record',
    description: 'Keep semester results, courses, credits, and progress in a structure that remains easy to understand.',
  },
  {
    icon: BrainCircuit,
    title: 'Insight with context',
    description: 'Use CGPA, raw-score performance, and trends together instead of relying on one number in isolation.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    description: 'Your academic information stays tied to your account, with explicit controls whenever you choose to share it.',
  },
] as const;

export default function AboutPage() {
  const [data, setData] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAbout = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch('/api/about', { signal });
      if (!response.ok) throw new Error('Unable to load About content.');
      const payload = await response.json();
      if (!signal?.aborted && payload?.about) setData(payload.about);
    } catch (loadError) {
      if (signal?.aborted) return;
      console.error('Failed to load About content:', loadError);
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAbout(controller.signal);
    return () => controller.abort();
  }, [loadAbout]);

  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <LandingMotion>
      <PageTransition>
        <main className="overflow-hidden">
          <section className="relative border-b border-[var(--acade-border-subtle)]">
            <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
              <div className="lg:col-span-7">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--acade-primary)]">
                  About AcadeGrade
                </p>
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full max-w-2xl rounded-2xl" />
                    <Skeleton className="mt-6 h-24 w-full max-w-xl rounded-2xl" />
                  </>
                ) : (
                  <>
                    <h1 data-landing-motion="heading" className="max-w-[13ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
                      {data.headline}
                    </h1>
                    <p data-landing-motion="hero-copy" className="mt-6 max-w-2xl text-[clamp(1rem,1.7vw,1.2rem)] leading-8 text-[var(--acade-text-muted)]">
                      {data.platformDescription}
                    </p>
                  </>
                )}

                <div className="mt-9 flex flex-col gap-3 lg:flex-row">
                  <LinkButton href="/register" size="lg" className="marketing-edge-cta w-full whitespace-nowrap lg:w-auto">
                    Build your academic record <ArrowRight size={18} aria-hidden="true" />
                  </LinkButton>
                  <LinkButton href="/calculator" variant="outline" size="lg" className="w-full whitespace-nowrap lg:w-auto">
                    Try the calculator
                  </LinkButton>
                </div>

                {error ? (
                  <div className="mt-6 flex max-w-xl items-center justify-between gap-4 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">
                    <span>Showing our standard product information.</span>
                    <Button variant="ghost" size="sm" onClick={() => void loadAbout()}>
                      <RefreshCw size={15} aria-hidden="true" /> Retry
                    </Button>
                  </div>
                ) : null}
              </div>

              <div data-landing-motion="card" className="relative lg:col-span-5">
                <div aria-hidden="true" className="mb-5 hidden items-center gap-2 lg:flex">
                  <span className="h-px w-14 bg-[var(--acade-primary)]" />
                  <span className="h-px w-5 bg-[var(--acade-gold)]" />
                </div>
                <DegreeSignal />
              </div>
            </div>
          </section>

          <section aria-labelledby="principles-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div data-landing-motion="section">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acade-primary)]">How we build</p>
                <h2 id="principles-title" data-landing-motion="type" className="marketing-type-line mt-4 max-w-md font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.04em]">
                  Clarity before complexity.
                </h2>
                <p className="mt-5 max-w-lg leading-7 text-[var(--acade-text-muted)]">
                  Academic tools should reduce uncertainty. Every AcadeGrade feature is designed to make progress visible, calculations explainable, and the next decision easier.
                </p>
              </div>

              <div className="divide-y divide-[var(--acade-border-subtle)] border-y border-[var(--acade-border-subtle)]">
                {principles.map(({ icon: Icon, title, description }, index) => (
                  <article data-landing-motion="card" key={title} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:gap-5">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] text-[var(--acade-primary)]">
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-lg font-bold">{title}</h3>
                        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">0{index + 1}</span>
                      </div>
                      <p className="mt-2 max-w-xl leading-7 text-[var(--acade-text-muted)]">{description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="border-y border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
            <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
              <article data-landing-motion="card" className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 sm:p-8">
                <Target className="text-[var(--acade-primary)]" size={25} aria-hidden="true" />
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[var(--acade-text-faint)]">Our mission</p>
                <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight sm:text-3xl">{data.mission}</h2>
              </article>
              <article data-landing-motion="card" className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 sm:p-8">
                <ShieldCheck className="text-[var(--acade-success)]" size={25} aria-hidden="true" />
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[var(--acade-text-faint)]">Our commitment</p>
                <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold leading-tight sm:text-3xl">{data.trustStatement}</h2>
              </article>
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col justify-between gap-8 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-primary)] p-7 text-[var(--acade-on-primary)] shadow-[var(--shadow-card)] sm:p-10 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.17em] opacity-75">Questions or partnerships</p>
                <h2 className="mt-3 max-w-xl font-[family-name:var(--font-bricolage)] text-3xl font-bold leading-tight sm:text-4xl">
                  Let&apos;s make academic progress easier to understand.
                </h2>
              </div>
              <a
                href={`mailto:${data.contactEmail}`}
                className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-surface)] px-6 font-semibold text-[var(--acade-text)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-on-primary)] motion-reduce:transform-none"
              >
                <Mail size={18} aria-hidden="true" /> Contact AcadeGrade
              </a>
            </div>
          </section>
        </main>
      </PageTransition>
      </LandingMotion>
      <PublicFooter />
    </div>
  );
}

function DegreeSignal() {
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">Degree signal</p>
          <p className="mt-1 text-lg font-bold">Progress, in context</p>
        </div>
        <span className="rounded-full bg-[var(--acade-primary-dim)] px-3 py-1.5 text-xs font-bold text-[var(--acade-primary)]">Private</span>
      </div>
      <svg viewBox="0 0 440 220" role="img" aria-labelledby="about-chart-title about-chart-desc" className="h-auto w-full">
        <title id="about-chart-title">Illustrative degree progress</title>
        <desc id="about-chart-desc">A steady academic progress line across four semesters.</desc>
        {[48, 92, 136, 180].map((y) => (
          <line key={y} x1="18" x2="422" y1={y} y2={y} stroke="var(--acade-border-subtle)" />
        ))}
        <path d="M24 178 C95 170 100 145 160 148 S244 112 292 109 S365 70 416 58" fill="none" stroke="var(--acade-primary)" strokeWidth="4" strokeLinecap="round" />
        {[{ x: 24, y: 178 }, { x: 160, y: 148 }, { x: 292, y: 109 }, { x: 416, y: 58 }].map((point) => (
          <circle key={point.x} cx={point.x} cy={point.y} r="6" fill="var(--acade-surface)" stroke="var(--acade-primary)" strokeWidth="4" />
        ))}
      </svg>
      <figcaption className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5 text-sm leading-6 text-[var(--acade-text-muted)]">
        AcadeGrade turns semester records into a readable journey without replacing your institution&apos;s official transcript.
      </figcaption>
    </figure>
  );
}
