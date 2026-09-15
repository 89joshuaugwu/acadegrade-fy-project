import Image from 'next/image';
import { ArrowRight, BadgeCheck, CalendarRange, LockKeyhole, Route, Scale } from 'lucide-react';
import heroStudent from '../../mobile-app-images/Smiling Student Showcasing Academic Dashboard.png';
import { LinkButton } from '@/components/ui';

function TrajectoryField() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-[var(--acade-border)] opacity-70" viewBox="0 0 1440 760" preserveAspectRatio="none">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M0 146H1440M0 236H1440M0 326H1440M0 416H1440M0 506H1440M0 596H1440" opacity=".42" />
        <path d="M145 132V624M340 132V624M535 132V624M730 132V624M925 132V624M1120 132V624M1315 132V624" strokeDasharray="3 10" opacity=".45" />
      </g>
      <g stroke="var(--acade-gold)" strokeWidth="2" opacity=".34">
        <path d="M145 596v15M340 596v15M535 596v15M730 596v15M925 596v15M1120 596v15M1315 596v15" />
      </g>
      <path d="M38 562 C210 552 285 520 410 490 S660 442 770 390 S1010 330 1115 256 S1290 190 1410 158" fill="none" stroke="var(--chart-cgpa)" strokeWidth="3" strokeLinecap="round" opacity=".22" />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="relative overflow-hidden border-b border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
      <div className="relative overflow-hidden">
        <TrajectoryField />

        <div className="relative mx-auto grid min-h-[640px] max-w-[1200px] grid-cols-1 items-center gap-8 px-4 pb-0 pt-8 sm:px-6 sm:pt-10 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-4">
          <div className="marketing-stagger z-10 pb-12 pt-3 lg:col-span-6 lg:pb-20 lg:pt-0">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[var(--acade-border)] bg-[var(--acade-surface)] px-3 py-2 text-sm font-semibold text-[var(--acade-text-muted)] shadow-[var(--shadow-card)]">
              <Route className="size-4 text-[var(--acade-primary)]" aria-hidden="true" />
              Your degree, made easier to read
            </div>

            <p className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--acade-primary)]">
              Record · Understand · Plan
            </p>

            <h1 id="home-hero-title" className="mt-6 max-w-[11ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.75rem,5.6vw,4.25rem)] font-bold leading-[1.01] tracking-[-0.052em] text-[var(--acade-text)]">
              See the path behind every result.
            </h1>
            <p className="mt-6 max-w-[55ch] text-[length:var(--text-lg)] leading-8 text-[var(--acade-text-muted)]">
              Record each semester, understand your CGPA and performance signals, then plan your next academic move with evidence you can inspect.
            </p>

            <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
              <LinkButton href="/register" size="lg" className="group w-full whitespace-nowrap lg:w-auto">
                Start your academic record
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/calculator" size="lg" variant="outline" className="w-full whitespace-nowrap bg-[var(--acade-surface)] lg:w-auto">
                Try the CGPA calculator
              </LinkButton>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[var(--acade-text-muted)]">
              <span className="inline-flex items-center gap-2"><LockKeyhole className="size-4 text-[var(--acade-success)]" aria-hidden="true" />Private by default</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-[var(--acade-primary)]" aria-hidden="true" />Calculation basis included</span>
            </div>
          </div>

          <div className="marketing-visual relative self-end lg:col-span-6">
            <div className="absolute bottom-12 left-1/2 h-[72%] w-[88%] -translate-x-1/2 rounded-[50%] bg-[var(--acade-primary-dim)] opacity-80" aria-hidden="true" />
            <Image src={heroStudent} alt="Student holding a phone showing the AcadeGrade academic dashboard" width={1199} height={1312} priority sizes="(max-width: 1023px) 100vw, 50vw" className="relative mx-auto max-h-[650px] w-full object-contain object-bottom" />
            <div className="absolute bottom-7 right-0 hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 shadow-[var(--shadow-popover)] sm:block lg:right-2">
              <p className="text-xs font-semibold text-[var(--acade-text-faint)]">CURRENT TRAJECTORY</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">3.71 <span className="text-sm text-[var(--acade-success)]">+0.08</span></p>
              <p className="mt-1 text-xs text-[var(--acade-text-muted)]">after 117 recorded credits</p>
            </div>
          </div>
        </div>
      </div>

      <div aria-label="Nigerian university grading context" className="relative border-t border-[var(--acade-border)] bg-[var(--acade-surface)]">
        <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-7 sm:px-6 md:grid-cols-[1.1fr_1fr_1fr] md:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold text-[var(--acade-primary)]">Built around familiar academic workflows</p>
            <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">Designed for personal record-keeping across Nigerian university sessions and grading contexts.</p>
          </div>
          <div className="flex items-start gap-3 md:border-l md:border-[var(--acade-border-subtle)] md:pl-6">
            <CalendarRange className="mt-0.5 size-5 shrink-0 text-[var(--acade-gold)]" aria-hidden="true" />
            <div><p className="font-semibold">Session and level aware</p><p className="mt-1 text-sm text-[var(--acade-text-muted)]">100L–500L · 2025/2026 sessions</p></div>
          </div>
          <div className="flex items-start gap-3 md:border-l md:border-[var(--acade-border-subtle)] md:pl-6">
            <Scale className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
            <div><p className="font-semibold">Configured grading scales</p><p className="mt-1 text-sm text-[var(--acade-text-muted)]">Confirm your institution’s applicable rules</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
