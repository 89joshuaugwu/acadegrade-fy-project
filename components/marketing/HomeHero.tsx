import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { LinkButton } from '@/components/ui';

const semesterPoints = [
  { label: '100L S1', cgpa: '3.18', x: 52, y: 184 },
  { label: '100L S2', cgpa: '3.36', x: 164, y: 157 },
  { label: '200L S1', cgpa: '3.57', x: 276, y: 118 },
  { label: '200L S2', cgpa: '3.71', x: 388, y: 91 },
] as const;

function DegreeMeridianPreview() {
  return (
    <figure
      aria-labelledby="degree-meridian-title"
      aria-describedby="degree-meridian-caption"
      className="relative overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--acade-border-subtle)] pb-4">
        <div>
          <p className="text-xs font-semibold text-[var(--acade-primary)]">Illustrative example</p>
          <h2 id="degree-meridian-title" className="mt-1 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
            Degree outlook
          </h2>
        </div>
        <span className="rounded-full bg-[var(--acade-primary-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--acade-primary)]">
          5-point scale
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 440 230"
          role="img"
          aria-labelledby="meridian-plot-title meridian-plot-description"
          className="hidden h-auto w-full overflow-visible sm:block"
        >
          <title id="meridian-plot-title">Illustrative cumulative grade point trajectory</title>
          <desc id="meridian-plot-description">
            Cumulative grade point average rises from 3.18 to 3.71 over four illustrative semesters.
          </desc>
          {[52, 96, 140, 184].map((y) => (
            <line
              key={y}
              x1="28"
              x2="416"
              y1={y}
              y2={y}
              stroke="var(--acade-border-subtle)"
              strokeWidth="1"
            />
          ))}
          <path
            d="M 52 184 C 98 181, 119 166, 164 157 S 235 136, 276 118 S 348 98, 388 91"
            fill="none"
            stroke="var(--chart-cgpa)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 52 201 C 103 196, 117 190, 164 192 S 232 171, 276 165 S 343 150, 388 153"
            fill="none"
            stroke="var(--chart-pi)"
            strokeWidth="2.5"
            strokeDasharray="7 7"
            strokeLinecap="round"
          />
          {semesterPoints.map((point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={index === semesterPoints.length - 1 ? 7 : 5}
                fill="var(--acade-surface)"
                stroke="var(--chart-cgpa)"
                strokeWidth="3"
              />
              <text
                x={point.x}
                y="219"
                textAnchor="middle"
                fill="var(--acade-text-faint)"
                fontSize="12"
              >
                {point.label}
              </text>
            </g>
          ))}
          <g transform="translate(330 47)">
            <rect width="86" height="31" rx="10" fill="var(--acade-primary)" />
            <text
              x="43"
              y="20"
              textAnchor="middle"
              fill="var(--acade-on-primary)"
              fontSize="12"
              fontWeight="700"
            >
              3.71 CGPA
            </text>
          </g>
        </svg>

        <ol aria-label="Illustrative semester progression" className="space-y-0 sm:hidden">
          {semesterPoints.map((point, index) => (
            <li key={point.label} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
              <span className="relative flex h-14 justify-center" aria-hidden="true">
                {index < semesterPoints.length - 1 && <span className="absolute top-7 h-full w-px bg-[var(--acade-border)]" />}
                <span className="relative mt-5 size-2.5 rounded-full border-2 border-[var(--chart-cgpa)] bg-[var(--acade-surface)]" />
              </span>
              <span className="text-sm font-medium text-[var(--acade-text-muted)]">{point.label}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-text)]">{point.cgpa}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--acade-text-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-[var(--chart-cgpa)]" aria-hidden="true" />
            CGPA
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-[var(--chart-pi)]" aria-hidden="true" />
            PI
          </span>
          <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[var(--acade-text)]">4 semesters</span>
        </div>
      </div>

      <figcaption id="degree-meridian-caption" className="mt-5 border-t border-[var(--acade-border-subtle)] pt-4 text-sm leading-6 text-[var(--acade-text-muted)]">
        A deterministic product example showing how recorded semesters become a readable academic trajectory.
      </figcaption>
    </figure>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="relative overflow-hidden border-b border-[var(--acade-border-subtle)]">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-[var(--acade-border-subtle)] lg:block" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:py-28">
        <div className="lg:col-span-6">
          <div className="mb-7 flex flex-wrap items-center gap-3 text-sm font-medium text-[var(--acade-text-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 py-1.5">
              <ShieldCheck className="size-4 text-[var(--acade-success)]" aria-hidden="true" />
              Academic clarity, semester by semester
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Private by default
            </span>
          </div>

          <h1
            id="home-hero-title"
            className="max-w-[12ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.625rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[var(--acade-text)]"
          >
            Know where your degree is heading.
          </h1>
          <p className="mt-6 max-w-[58ch] text-[clamp(1rem,1.8vw,1.125rem)] leading-7 text-[var(--acade-text-muted)]">
            Record semester results, understand CGPA and performance trends, and plan your next academic move from one clear workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LinkButton href="/register" size="lg" className="group">
              Start your academic record
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </LinkButton>
            <LinkButton href="/calculator" size="lg" variant="outline">
              Try the CGPA calculator
            </LinkButton>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-1 gap-5 border-t border-[var(--acade-border-subtle)] pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-[var(--acade-text-faint)]">Your input</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--acade-text)]">Semester records</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--acade-text-faint)]">Your view</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--acade-text)]">CGPA + PI</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--acade-text-faint)]">Your control</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--acade-text)]">Sharing choices</dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-6 lg:pl-4">
          <div className="absolute -left-5 top-10 hidden h-24 w-px bg-[var(--acade-gold)] lg:block" aria-hidden="true" />
          <DegreeMeridianPreview />
        </div>
      </div>
    </section>
  );
}
