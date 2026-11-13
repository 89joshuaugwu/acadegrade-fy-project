'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, BrainCircuit, Mail, RefreshCw, ShieldCheck, Target } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { PageTransition } from '@/components/shared/PageTransition';
import { Button, LinkButton } from '@/components/ui';
import { DEFAULT_ABOUT_CONTENT, type AboutContent } from '@/lib/about/content';
import { contactHref } from '@/lib/site/contact-email';
import { LandingMotion } from '@/components/marketing/LandingMotion';
import { DirectionalText, TypedText } from '@/components/marketing/PublicTextMotion';

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
  const [error, setError] = useState(false);

  const loadAbout = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/about', { signal });
      if (!response.ok) throw new Error('Unable to load About content.');
      const payload = await response.json();
      if (!signal?.aborted) {
        if (payload?.about) setData(payload.about);
        setError(false);
      }
    } catch (loadError) {
      if (signal?.aborted) return;
      console.error('Failed to load About content:', loadError);
      setError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const request = window.setTimeout(() => void loadAbout(controller.signal), 0);
    return () => {
      window.clearTimeout(request);
      controller.abort();
    };
  }, [loadAbout]);

  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <LandingMotion>
      <PageTransition>
        <main className="overflow-hidden">
          <section className="relative">
            <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
              <div className="lg:col-span-7">
                <DirectionalText
                  as="h1"
                  text={data.headline}
                  accentWords={2}
                  className="max-w-[16ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2.125rem,5vw,4rem)] font-bold leading-[1.03] tracking-[-0.04em]"
                />
                <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)] sm:text-lg">
                  {data.platformDescription}
                </p>

                <div className="mt-9 flex flex-col gap-3 lg:flex-row">
                  <LinkButton href="/register" size="lg" className="marketing-edge-cta marketing-press group w-full whitespace-nowrap lg:w-auto">
                    Build your academic record <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </LinkButton>
                  <LinkButton href="/calculator" variant="outline" size="lg" className="marketing-press w-full whitespace-nowrap lg:w-auto">
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
                <DegreeSignal />
              </div>
            </div>
          </section>

          <section aria-labelledby="principles-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <TypedText
                  as="h2"
                  id="principles-title"
                  text="Clarity before complexity."
                  className="max-w-md font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.04em]"
                />
                <p className="mt-5 max-w-lg text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
                  Academic tools should reduce uncertainty. Every AcadeGrade feature is designed to make progress visible, calculations explainable, and the next decision easier.
                </p>
              </div>

              <div className="grid gap-2">
                {principles.map(({ icon: Icon, title, description }) => (
                  <article data-landing-motion="card" key={title} className="rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-6 sm:p-7">
                    <h3 className="flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-[-0.02em]">
                      <Icon size={22} className="shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
                      {title}
                    </h3>
                    <p className="mt-2 max-w-[60ch] text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Mission and commitment" className="bg-[var(--acade-deep)]">
            <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
              <article data-landing-motion="card" className="rounded-[var(--radius-dialog)] bg-[var(--acade-primary-dim)] p-6 sm:p-10">
                <h2 className="flex items-center gap-3 text-lg font-semibold text-[var(--acade-text)]"><Target size={22} className="text-[var(--acade-primary)]" aria-hidden="true" />Our mission</h2>
                <p className="mt-6 font-[family-name:var(--font-bricolage)] text-2xl font-semibold leading-snug tracking-[-0.02em] sm:text-[1.875rem] sm:leading-[1.25]">{data.mission}</p>
              </article>
              <article data-landing-motion="card" className="rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-6 sm:p-10">
                <h2 className="flex items-center gap-3 text-lg font-semibold text-[var(--acade-success)]"><ShieldCheck size={22} aria-hidden="true" />Our commitment</h2>
                <p className="mt-6 font-[family-name:var(--font-bricolage)] text-2xl font-semibold leading-snug tracking-[-0.02em] sm:text-[1.875rem] sm:leading-[1.25]">{data.trustStatement}</p>
              </article>
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex flex-col justify-between gap-8 rounded-[var(--radius-dialog)] bg-[var(--acade-primary)] p-7 text-[var(--acade-on-primary)] sm:p-10 lg:flex-row lg:items-end lg:p-14">
              <div>
                <h2 className="max-w-[22ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.875rem,3.4vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.035em]">
                  Let&apos;s make academic progress easier to understand.
                </h2>
                <p className="mt-3 text-[1.0625rem] opacity-90">Questions or partnership ideas are welcome.</p>
              </div>
              <a
                href={contactHref(data.contactEmail || null)}
                className="marketing-press inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-surface)] px-6 font-semibold text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-on-primary)] motion-reduce:transform-none"
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
    <figure data-ui="" className="relative overflow-hidden rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-6 ring-1 ring-[var(--acade-border)] sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-lg font-semibold">Progress, in context</p>
        <span className="rounded-full bg-[var(--acade-success-dim)] px-3 py-1.5 text-[0.8125rem] font-semibold text-[var(--acade-success)]">Private</span>
      </div>
      <svg viewBox="0 0 440 220" role="img" aria-labelledby="about-chart-title about-chart-desc" className="h-auto w-full">
        <title id="about-chart-title">Illustrative degree progress</title>
        <desc id="about-chart-desc">A steady academic progress line across four semesters.</desc>
        <path d="M24 178 C95 170 100 145 160 148 S244 112 292 109 S365 70 416 58" fill="none" stroke="var(--acade-primary)" strokeWidth="4" strokeLinecap="round" />
        {[{ x: 24, y: 178 }, { x: 160, y: 148 }, { x: 292, y: 109 }, { x: 416, y: 58 }].map((point, index, points) => (
          <circle key={point.x} cx={point.x} cy={point.y} r={index === points.length - 1 ? 8 : 6} fill="var(--acade-surface)" stroke={index === points.length - 1 ? 'var(--acade-gold)' : 'var(--acade-primary)'} strokeWidth="4" />
        ))}
      </svg>
      <figcaption className="mt-6 text-[0.9375rem] leading-6 text-[var(--acade-text-muted)]">
        AcadeGrade turns semester records into a readable journey without replacing your institution&apos;s official transcript.
      </figcaption>
    </figure>
  );
}
