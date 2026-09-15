import { BookOpenCheck, ChartNoAxesCombined, ShieldCheck } from 'lucide-react';
import { Card, Logo, ThemeControl } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

const defaultProofItems = [
  'Keep every semester in one clear record',
  'Understand CGPA and performance trends together',
  'See what to improve before the next result',
] as const;

export interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  eyebrow?: string;
  support?: React.ReactNode;
  proofTitle?: string;
  proofDescription?: string;
  proofItems?: readonly string[];
  className?: string;
  contentClassName?: string;
}

function DegreeMeridian() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5 shadow-[var(--shadow-card)]"
    >
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(var(--acade-border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--acade-border-subtle)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.15em] text-[var(--acade-text-muted)]">
            Degree meridian
          </span>
          <span className="rounded-full bg-[var(--acade-primary-dim)] px-2.5 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--acade-primary)]">
            Clear outlook
          </span>
        </div>

        <svg viewBox="0 0 420 152" className="mt-5 h-auto w-full" focusable="false">
          <path
            d="M10 124 C82 122 92 96 154 98 C224 101 242 56 302 64 C346 69 366 41 410 28"
            fill="none"
            stroke="var(--acade-border)"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.32"
          />
          <path
            d="M10 124 C82 122 92 96 154 98 C224 101 242 56 302 64 C346 69 366 41 410 28"
            fill="none"
            stroke="var(--acade-primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {[10, 154, 302, 410].map((x, index) => {
            const y = [124, 98, 64, 28][index];
            return (
              <circle
                key={x}
                cx={x}
                cy={y}
                r="7"
                fill="var(--acade-deep)"
                stroke="var(--acade-primary)"
                strokeWidth="4"
              />
            );
          })}
        </svg>

        <div className="mt-1 grid grid-cols-3 gap-2 text-[length:var(--text-xs)] font-medium text-[var(--acade-text-muted)]">
          <span>Results</span>
          <span className="text-center">CGPA + PI</span>
          <span className="text-right">Outlook</span>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
  eyebrow,
  support,
  proofTitle = 'See your whole degree clearly',
  proofDescription = 'Turn scattered results into a dependable academic record and a practical view of what comes next.',
  proofItems = defaultProofItems,
  className,
  contentClassName,
}: AuthShellProps) {
  const titleId = `auth-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'}-title`;

  return (
    <div
      className={cn(
        'min-h-dvh bg-[var(--acade-void)] text-[var(--acade-text)]',
        'lg:grid lg:grid-cols-[minmax(20rem,0.82fr)_minmax(32rem,1.18fr)]',
        className
      )}
    >
      <aside
        aria-labelledby={`${titleId}-proof`}
        className="relative hidden min-h-dvh overflow-hidden border-r border-[var(--acade-border-subtle)] bg-[var(--acade-primary-dim)] p-8 lg:flex lg:flex-col lg:justify-between xl:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 size-72 rounded-full border border-[var(--acade-primary)] opacity-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 top-1/3 size-72 rounded-full border border-[var(--acade-primary)] opacity-10"
        />

        <div className="relative max-w-xl pt-10 xl:pt-14">
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--acade-primary)]">
            Academic clarity, semester by semester
          </p>
          <h2
            id={`${titleId}-proof`}
            className="mt-4 max-w-lg font-[family-name:var(--font-bricolage)] text-[length:clamp(2rem,3.2vw,3rem)] font-bold leading-[1.04] tracking-[-0.035em]"
          >
            {proofTitle}
          </h2>
          <p className="mt-4 max-w-lg text-[length:var(--text-base)] leading-7 text-[var(--acade-text-muted)]">
            {proofDescription}
          </p>
        </div>

        <div className="relative my-8 max-w-xl xl:my-10">
          <DegreeMeridian />

          <ul className="mt-6 grid gap-3">
            {proofItems.map((item, index) => {
              const Icon = [BookOpenCheck, ChartNoAxesCombined, ShieldCheck][index % 3];
              return (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--acade-border)] bg-[var(--acade-deep)] text-[var(--acade-primary)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
          Built for the rhythm of Nigerian university life.
        </p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
          <Logo href="/" size="sm" />
          <ThemeControl compact />
        </header>

        <main
          aria-labelledby={titleId}
          className="flex flex-1 items-start justify-center px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8 xl:px-10"
        >
          <div className={cn('w-full max-w-[33rem]', contentClassName)}>
            <Card
              padding="none"
              className="overflow-hidden rounded-[var(--radius-dialog)] border-[var(--acade-border)] p-5 shadow-[var(--shadow-popover)] sm:p-7"
            >
              {eyebrow && (
                <p className="mb-3 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--acade-primary)]">
                  {eyebrow}
                </p>
              )}
              <h1
                id={titleId}
                className="font-[family-name:var(--font-bricolage)] text-[length:clamp(1.65rem,3.5vw,2.1rem)] font-bold leading-tight tracking-[-0.03em]"
              >
                {title}
              </h1>
              <p className="mt-2 max-w-[46ch] text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)] sm:text-[length:var(--text-base)]">
                {description}
              </p>

              <div className="mt-6">{children}</div>

              {support && (
                <nav
                  aria-label="Authentication support"
                  className="mt-7 border-t border-[var(--acade-border-subtle)] pt-5 text-center text-[length:var(--text-sm)] text-[var(--acade-text-muted)] [&_a]:font-semibold [&_a]:text-[var(--acade-primary)] [&_a]:underline-offset-4 hover:[&_a]:underline focus-within:[&_a]:outline-none focus-within:[&_a]:ring-2 focus-within:[&_a]:ring-[var(--acade-primary)]"
                >
                  {support}
                </nav>
              )}
            </Card>

            <p className="mt-5 text-center text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
              Your academic data stays attached to your account and is never changed by signing in.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
