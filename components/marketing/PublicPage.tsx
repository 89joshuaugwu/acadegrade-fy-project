import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { LinkButton } from '@/components/ui/LinkButton';
import { LandingMotion } from './LandingMotion';
import { getContactEmail } from '@/lib/site/contact';

export async function PublicPage({ children }: { children: ReactNode }) {
  const contactEmail = await getContactEmail();
  return (
    <div className="public-atmosphere min-h-screen text-[var(--acade-text)]">
      <Navbar />
      <div id="hero-sentinel" className="pointer-events-none absolute top-0 h-px w-full" aria-hidden="true" />
      <LandingMotion>
        <main>{children}</main>
      </LandingMotion>
      <PublicFooter contactEmail={contactEmail} />
    </div>
  );
}

export interface BreadcrumbItem {
  href: string;
  label: string;
}

/** A real breadcrumb for nested public pages; the current page is the last, unlinked item. */
export function Breadcrumb({ trail, current }: { trail: readonly BreadcrumbItem[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.9375rem] text-[var(--acade-text-muted)]">
        {trail.map((item) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <Link href={item.href} className="rounded-md font-medium underline-offset-4 hover:text-[var(--acade-text)] hover:underline">
              {item.label}
            </Link>
            <ChevronRight className="size-4" aria-hidden="true" />
          </li>
        ))}
        <li aria-current="page" className="font-semibold text-[var(--acade-text)]">{current}</li>
      </ol>
    </nav>
  );
}

interface EditorialHeroProps {
  title: string;
  description: string;
  /** Parent pages for a breadcrumb, shown only on nested routes. */
  trail?: readonly BreadcrumbItem[];
  /** Short page name for the breadcrumb's current item. */
  crumb?: string;
  aside?: ReactNode;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export function EditorialHero({
  title,
  description,
  trail,
  crumb,
  aside,
  primary,
  secondary,
}: EditorialHeroProps) {
  return (
    <section className="public-atmosphere-section">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
        <div className={aside ? 'lg:col-span-7' : 'lg:col-span-9'}>
          {trail && crumb ? <div className="mb-6"><Breadcrumb trail={trail} current={crumb} /></div> : null}
          <h1 className="max-w-[18ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(2.125rem,5vw,4rem)] font-bold leading-[1.03] tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)] sm:text-lg">
            {description}
          </p>
          {primary || secondary ? (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primary ? (
                <LinkButton href={primary.href} size="lg" className="marketing-press group">
                  {primary.label} <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </LinkButton>
              ) : null}
              {secondary ? (
                <LinkButton href={secondary.href} variant="outline" size="lg" className="marketing-press">
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
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id?: string;
}) {
  return (
    <div className="max-w-3xl">
      <h2 id={id} data-landing-motion="heading" className="text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.75rem,3.8vw,3.25rem)] font-bold leading-[1.06] tracking-[-0.04em]">
        {title}
      </h2>
      <p data-landing-motion="" style={{ '--landing-delay': '90ms' } as React.CSSProperties} className="mt-5 max-w-[58ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">{description}</p>
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
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div data-landing-motion="section" className="grid gap-8 rounded-[var(--radius-dialog)] bg-[var(--acade-primary)] p-7 text-[var(--acade-on-primary)] sm:p-10 md:grid-cols-[1fr_auto] md:items-end lg:p-14">
        <div>
          <h2 className="max-w-[22ch] text-balance font-[family-name:var(--font-bricolage)] text-[clamp(1.875rem,3.4vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.035em]">{title}</h2>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-7 opacity-90">{description}</p>
        </div>
        <LinkButton href="/register" size="lg" className="marketing-press group bg-[var(--acade-surface)] text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]">
          Get started <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </LinkButton>
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-4" role="list">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[1.0625rem] leading-7 text-[var(--acade-text)]">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
