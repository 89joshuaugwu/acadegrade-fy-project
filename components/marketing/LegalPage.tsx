import type { ReactNode } from 'react';
import { PublicPage } from './PublicPage';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <PublicPage>
      <header className="border-b border-[var(--acade-border-subtle)]">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--acade-primary)]">{eyebrow}</p>
          <h1 className="mt-5 font-[family-name:var(--font-bricolage)] text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-[-0.045em]">{title}</h1>
          <p className="mt-6 max-w-3xl text-[clamp(1rem,1.5vw,1.125rem)] leading-8 text-[var(--acade-text-muted)]">{summary}</p>
          <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.12em] text-[var(--acade-text-faint)]">Effective {effectiveDate}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--acade-text-faint)]">On this page</p>
          <nav aria-label={`${title} sections`} className="mt-4 border-l border-[var(--acade-border)]">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block border-l-2 border-transparent px-4 py-2.5 text-sm text-[var(--acade-text-muted)] transition-colors hover:border-[var(--acade-primary)] hover:text-[var(--acade-text)]">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 divide-y divide-[var(--acade-border-subtle)]">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 py-8 first:pt-0">
              <h2 className="font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{section.title}</h2>
              <div className="mt-4 space-y-4 leading-7 text-[var(--acade-text-muted)]">{section.content}</div>
            </section>
          ))}
        </article>
      </div>
    </PublicPage>
  );
}
