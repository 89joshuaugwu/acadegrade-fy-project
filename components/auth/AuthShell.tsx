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
      className="relative overflow-hidden rounded-[var(--radius-surface)] bg-[var(--acade-deep)] p-5"
    >
      <div className="relative">
        <p className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)]">
          From results to outlook
        </p>

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
                stroke={index === 3 ? 'var(--acade-gold)' : 'var(--acade-primary)'}
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
        className="relative hidden min-h-dvh overflow-hidden bg-[var(--acade-primary-dim)] p-8 lg:flex lg:flex-col lg:justify-between xl:p-10"
      >
        <div className="relative max-w-xl pt-10 xl:pt-14">
          <h2
            id={`${titleId}-proof`}
            className="max-w-lg text-balance font-[family-name:var(--font-bricolage)] text-[length:clamp(2rem,3.2vw,3rem)] font-bold leading-[1.04] tracking-[-0.035em]"
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
                  className="auth-proof-item flex items-start gap-3 text-[length:var(--text-base)] leading-6 text-[var(--acade-text)]"
                  style={{ '--auth-item-index': index } as React.CSSProperties}
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
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
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/" size="sm" />
            {eyebrow ? (
              <p className="hidden truncate border-l border-[var(--acade-border)] pl-3 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] sm:block">
                {eyebrow}
              </p>
            ) : null}
          </div>
          <ThemeControl compact />
        </header>

        <main
          aria-labelledby={titleId}
          className="flex flex-1 items-start justify-center px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8 xl:px-10"
        >
          <div className={cn('w-full max-w-[33rem]', contentClassName)}>
            <Card
              padding="none"
              className="overflow-hidden rounded-[var(--radius-dialog)] border-[var(--acade-border)] p-5 shadow-[var(--shadow-popover)] sm:p-8"
            >
              <h1
                id={titleId}
                className="font-[family-name:var(--font-bricolage)] text-[length:clamp(1.75rem,3.5vw,2.25rem)] font-bold leading-tight tracking-[-0.035em]"
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

            <p className="auth-disclaimer mt-5 text-center text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
              Your academic data stays attached to your account and is never changed by signing in.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
