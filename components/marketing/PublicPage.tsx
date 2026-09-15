import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { LinkButton } from '@/components/ui/LinkButton';

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <div id="hero-sentinel" className="pointer-events-none absolute top-0 h-px w-full" aria-hidden="true" />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

interface EditorialHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  aside,
  primary,
  secondary,
}: EditorialHeroProps) {
  return (
    <section className="border-b border-[var(--acade-border-subtle)]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className={aside ? 'lg:col-span-7' : 'lg:col-span-9'}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acade-primary)]">{eyebrow}</p>
          <h1 className="mt-5 max-w-[15ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.045em]">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1rem,1.5vw,1.125rem)] leading-8 text-[var(--acade-text-muted)]">
            {description}
          </p>
          {primary || secondary ? (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primary ? (
                <LinkButton href={primary.href} size="lg">
                  {primary.label} <ArrowRight size={18} aria-hidden="true" />
                </LinkButton>
              ) : null}
              {secondary ? (
                <LinkButton href={secondary.href} variant="outline" size="lg">
                  {secondary.label}
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>
        {aside ? <div className="lg:col-span-5">{aside}</div> : null}
      </div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acade-primary)]">{eyebrow}</p>
      <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl leading-7 text-[var(--acade-text-muted)]">{description}</p>
    </div>
  );
}

export function ProductCta({
  title = 'Build a record you can actually use.',
  description = 'Start with one semester, then let your academic picture become clearer over time.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid gap-8 rounded-[var(--radius-dialog)] border border-[var(--acade-primary)]/30 bg-[var(--acade-primary)] p-7 text-[var(--acade-on-primary)] shadow-[var(--shadow-card)] sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] opacity-75">Your academic workspace</p>
          <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-bricolage)] text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-2xl leading-7 opacity-85">{description}</p>
        </div>
        <LinkButton href="/register" size="lg" className="bg-[var(--acade-surface)] text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]">
          Get started <ArrowRight size={18} aria-hidden="true" />
        </LinkButton>
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-4" role="list">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-7 text-[var(--acade-text-muted)]">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
