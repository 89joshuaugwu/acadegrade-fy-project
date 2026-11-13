import Image from 'next/image';
import { ArrowRight, BadgeCheck, CalendarRange, LockKeyhole, Scale } from 'lucide-react';
import heroStudent from '../../mobile-app-images/Smiling Student Showcasing Academic Dashboard.png';
import heroStudentDashboard from '../../mobile-app-images/heroimage2.png';
import heroStudentScanner from '../../mobile-app-images/heroimage3.png';
import { LinkButton } from '@/components/ui';
import { HeroTypedPhrases } from './LandingMotion';

const heroPhrases = [
  'Understand your CGPA.',
  'Spot courses at risk.',
  'Plan the next semester.',
] as const;

/** The Degree Meridian: one rising trace with semester ticks, the page's single motif. */
function MeridianField() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 760" preserveAspectRatio="none">
      <path
        d="M-20 600 C200 590 290 556 420 520 S680 462 790 404 S1030 330 1140 252 S1320 180 1460 146"
        fill="none"
        stroke="var(--chart-cgpa)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M-20 640 C210 634 300 612 420 590 S690 548 790 512 S1040 468 1140 420 S1330 380 1460 362"
        fill="none"
        stroke="var(--chart-pi)"
        strokeWidth="2"
        strokeDasharray="6 10"
        strokeLinecap="round"
        opacity=".18"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="public-atmosphere-section relative overflow-hidden">
      <div className="relative overflow-hidden">
        <MeridianField />

        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-4 pt-8 sm:px-6 sm:pt-12 lg:min-h-[640px] lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-6">
          <div data-landing-hero="" className="marketing-stagger z-10 pb-2 sm:pb-6 lg:col-span-7 lg:pb-24">
            <h1
              id="home-hero-title"
              className="max-w-[17ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2.125rem,4.7vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.04em] text-[var(--acade-text)]"
            >
              See the path behind every result.
            </h1>

            <p className="marketing-hero-type-line mt-4 font-[family-name:var(--font-bricolage)] text-[clamp(1.375rem,2.3vw,2rem)] font-semibold leading-tight tracking-[-0.025em]">
              <span className="sr-only">Understand your CGPA, spot courses at risk and plan the next semester.</span>
              <HeroTypedPhrases phrases={heroPhrases} />
            </p>

            <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-7 text-[var(--acade-text-muted)] sm:text-lg sm:leading-8">
              Record each semester, understand your CGPA and performance signals, then plan your next academic move with evidence you can inspect.
            </p>

            <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
              <LinkButton href="/register" size="lg" className="marketing-edge-cta marketing-press group w-full whitespace-nowrap lg:w-auto">
                Start your academic record
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/calculator" size="lg" variant="outline" className="marketing-press w-full whitespace-nowrap bg-[var(--acade-surface)] lg:w-auto">
                Try the CGPA calculator
              </LinkButton>
            </div>

            <ul aria-label="What to expect" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[var(--acade-text-muted)]">
              <li
                data-landing-motion=""
                style={{ '--landing-delay': '200ms', '--landing-distance': '8px' } as React.CSSProperties}
                className="inline-flex items-center gap-2"
              >
                <LockKeyhole className="size-4 text-[var(--acade-success)]" aria-hidden="true" />Private by default
              </li>
              <li
                data-landing-motion=""
                style={{ '--landing-delay': '280ms', '--landing-distance': '8px' } as React.CSSProperties}
                className="inline-flex items-center gap-2"
              >
                <BadgeCheck className="size-4 text-[var(--acade-primary)]" aria-hidden="true" />Calculation basis included
              </li>
            </ul>
          </div>

          <figure
            role="img"
            aria-label="Students using AcadeGrade on mobile to review a dashboard and scan academic records"
            className="hero-art-frame relative mx-auto aspect-[6/7] w-full max-w-[32rem] self-end lg:col-span-5 lg:-translate-y-6"
          >
            <div className="hero-art-disc absolute bottom-12 left-1/2 h-[72%] w-[88%] -translate-x-1/2 rounded-[50%] bg-[var(--acade-primary-dim)]" aria-hidden="true" />
            <Image
              src={heroStudent}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 1023px) min(100vw, 32rem), 32rem"
              className="hero-art-image hero-art-image-primary object-contain object-bottom"
            />
            <Image
              src={heroStudentDashboard}
              alt=""
              fill
              sizes="(max-width: 1023px) min(100vw, 32rem), 32rem"
              className="hero-art-image hero-art-image-secondary object-contain object-bottom"
            />
            <Image
              src={heroStudentScanner}
              alt=""
              fill
              sizes="(max-width: 1023px) min(100vw, 32rem), 32rem"
              className="hero-art-image hero-art-image-tertiary object-contain object-bottom"
            />
            <div data-ui="" className="hero-trajectory-card absolute bottom-7 right-0 z-10 hidden rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-4 shadow-[var(--shadow-popover)] ring-1 ring-[var(--acade-border)] sm:block lg:-right-2">
              <p className="text-[0.8125rem] font-semibold text-[var(--acade-text-muted)]">Current trajectory</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
                3.71 <span className="text-sm text-[var(--acade-success)]">+0.08</span>
              </p>
              <p className="mt-1 text-[0.8125rem] text-[var(--acade-text-muted)]">CGPA after 117 recorded credits</p>
            </div>
          </figure>
        </div>
      </div>

      <div aria-label="Nigerian university grading context" className="relative bg-[var(--acade-surface)]">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_1fr_1fr] md:items-center md:gap-10 lg:px-8">
          <div>
            <p className="font-semibold text-[var(--acade-text)]">Built around familiar academic workflows</p>
            <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">Designed for personal record-keeping across Nigerian university sessions and grading contexts.</p>
          </div>
          <div className="flex items-start gap-3">
            <CalendarRange className="mt-0.5 size-5 shrink-0 text-[var(--acade-gold)]" aria-hidden="true" />
            <div><p className="font-semibold">Session and level aware</p><p className="mt-1 text-sm text-[var(--acade-text-muted)]">100L–500L · 2025/2026 sessions</p></div>
          </div>
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
            <div><p className="font-semibold">Configured grading scales</p><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Confirm your institution’s applicable rules</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
