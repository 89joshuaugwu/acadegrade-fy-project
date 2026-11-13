import type { ReactNode } from 'react';
import { PublicPage } from './PublicPage';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export const LEGAL_DRAFT_NOTICE = 'Draft — pending legal review';

/**
 * Text the operator still has to supply, for example `[OPERATOR NAME]`.
 * Rendered as bold, bracketed, highlighted text so it cannot be missed.
 */
export function Placeholder({ children }: { children: string }) {
  return (
    <mark data-legal-placeholder="" className="rounded-sm bg-[var(--acade-gold-dim)] px-1 font-semibold text-[var(--acade-gold)] [box-decoration-break:clone]">
      [{children}]
    </mark>
  );
}

export function LegalPage({
  title,
  summary,
  version,
  effectiveDate,
  sections,
  draft = false,
}: {
  title: string;
  summary: string;
  /** Same scheme as `config/legal` (for example `2026-11-13`). */
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
  draft?: boolean;
}) {
  return (
    <PublicPage>
      <header className="public-atmosphere-section">
        <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
          {draft ? (
            <p role="note" className="mb-8 inline-flex rounded-[var(--radius-control)] border-2 border-[var(--acade-gold)] bg-[var(--acade-gold-dim)] px-4 py-2.5 text-[0.9375rem] font-bold text-[var(--acade-gold)]">
              {LEGAL_DRAFT_NOTICE}
            </p>
          ) : null}
          <h1 className="font-[family-name:var(--font-bricolage)] text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.03] tracking-[-0.04em]">{title}</h1>
          <p className="mt-6 max-w-[60ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)] sm:text-lg">{summary}</p>
          <p className="mt-6 inline-flex flex-wrap gap-x-3 rounded-full bg-[var(--acade-surface)] px-4 py-2 text-[0.9375rem] text-[var(--acade-text)]">
            <span>Version <span className="font-semibold">{version}</span></span>
            <span aria-hidden="true">·</span>
            <span>Effective <time className="font-semibold">{effectiveDate}</time></span>
          </p>
        </div>
      </header>

      <div className="bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20 lg:px-8 lg:py-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">On this page</p>
            <nav aria-label={`${title} sections`} className="mt-3">
              <ol className="grid gap-0.5">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-[0.9375rem] leading-5 text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="legal-article min-w-0 max-w-[68ch]">
            {sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-28 pb-12 last:pb-0 sm:pb-14">
                <h2 id={`${section.id}-title`} className="text-balance font-[family-name:var(--font-bricolage)] text-[1.625rem] font-bold leading-tight tracking-[-0.025em] sm:text-3xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-[1.0625rem] leading-8 text-[var(--acade-text)] [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_table]:w-full [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold">{section.content}</div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </PublicPage>
  );
}
