import type { ReactNode } from 'react';
import { reveal } from '@/components/motion/Reveal';
import { Words } from '@/components/motion/Words';
import '@/components/site/company/legal.css';
import { CookieChoicesLink } from '@/components/public/CookieChoicesLink';
import { LegalContents } from '@/components/site/company/LegalContents';
import { PrintButton } from '@/components/site/company/PrintButton';
import { Container, TextLinkV2, Trail } from '@/components/site/ui';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export const LEGAL_DRAFT_NOTICE = 'Draft — pending legal review';

/** Link class for the legal text on public pages (brand v2 text link). */
export const PUBLIC_LEGAL_LINK_CLASS =
  'ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';

/** About {n} minutes to read: words ÷ 200, rounded up (at least 1). */
export function legalReadingMinutes(body: string): number {
  const words = body.replace(/[#*|[\](){}>-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export interface LegalRelatedLink {
  href: string;
  label: string;
}

interface LegalPageProps {
  title: string;
  summary: string;
  /** Same scheme as `config/legal` (for example `2026-11-13`). */
  version: string;
  /** Already formatted ("13 November 2026"). */
  effectiveDate: string;
  sections: LegalSection[];
  draft?: boolean;
  /** The editor's note on the published version ("What changed: …"). */
  changeNote?: string;
  readingMinutes?: number;
  /** Document name for the contents label and the closing panel ("Privacy notice"). */
  documentName?: string;
  /** Links in the closing panel. */
  related?: readonly LegalRelatedLink[];
  /** Add "Cookie choices" (reopens the cookie card) to the closing panel. */
  cookieChoices?: boolean;
  /** Page address printed under the head ("acadegrade.vercel.app/privacy"). */
  printAddress?: string;
}

const END_LINK = 'ag-focus rounded text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';

/**
 * A legal document in brand v2 (docs/brand-v2/DESIGN.md): a compact night head with the
 * title, version, effective date, reading time and change note as plain text, then a calm
 * reading column on white with a sticky contents list beside it from 1024px (a <details>
 * below that), and a closing panel to print or move on. Prints as a plain A4 document.
 */
export function LegalPage({
  title,
  summary,
  version,
  effectiveDate,
  sections,
  draft = false,
  changeNote,
  readingMinutes,
  documentName = title,
  related = [],
  cookieChoices = false,
  printAddress,
}: LegalPageProps) {
  const items = sections.map((section) => ({ id: section.id, title: section.title }));
  const navLabel = `${documentName} contents`;

  return (
    <article className="ag-site" data-legal-document="" aria-labelledby="legal-title">
      <header className="ag-legal-hero ag-hero-sky ag-noise relative overflow-hidden text-white">
        <Container className="relative pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20">
          <div className="mx-auto max-w-[1080px]">
            <div className="ag-rise" data-print="hide">
              <Trail items={[{ label: 'Home', href: '/' }, { label: documentName }]} />
            </div>
            {draft ? (
              <p role="note" className="mt-6 inline-block rounded-lg bg-ag-gold px-3 py-1.5 text-[0.875rem] font-semibold text-ag-night">
                {LEGAL_DRAFT_NOTICE}
              </p>
            ) : null}
            <h1 id="legal-title" className={`ag-display ${typeof title === 'string' ? 'mo-load-words' : 'ag-rise'} mt-6 max-w-3xl text-[2.5rem] font-bold leading-[1.03] sm:text-[3.5rem] lg:text-[4rem]`}>
              <Words>{title}</Words>
            </h1>
            {summary.trim() ? (
              <p className="ag-rise ag-rise-2 mt-5 max-w-[42rem] text-[1.0625rem] leading-relaxed text-ag-mist-night sm:text-[1.125rem]">{summary}</p>
            ) : null}
            <dl className="ag-rise ag-rise-3 mt-9 flex flex-wrap gap-x-10 gap-y-5 text-[0.9375rem]">
              <div>
                <dt className="text-ag-mist-night">Version</dt>
                <dd className="ag-num mt-1 font-semibold text-white">{version}</dd>
              </div>
              <div>
                <dt className="text-ag-mist-night">Effective</dt>
                <dd className="mt-1 font-semibold text-white">
                  <time>{effectiveDate}</time>
                </dd>
              </div>
              {readingMinutes ? (
                <div>
                  <dt className="text-ag-mist-night">Reading time</dt>
                  <dd className="mt-1 font-semibold text-white">
                    About {readingMinutes} {readingMinutes === 1 ? 'minute' : 'minutes'}
                  </dd>
                </div>
              ) : null}
            </dl>
            {changeNote?.trim() ? (
              <p className="ag-rise ag-rise-3 mt-7 max-w-[42rem] border-l-2 border-ag-gold pl-4 text-[0.9375rem] leading-relaxed text-white/80">
                What changed: {changeNote.trim()}
              </p>
            ) : null}
            {printAddress ? <p className="ag-legal-address">{printAddress}</p> : null}
          </div>
        </Container>
      </header>

      <div className="ag-legal-body bg-white py-14 sm:py-20">
        <Container>
          <div className="ag-legal-grid mx-auto grid max-w-[1080px] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
            <div className="mo-load-visual hidden lg:block">
              <LegalContents items={items} label={navLabel} />
            </div>
            <div className="min-w-0 max-w-[720px]">
              <div className="mb-12 lg:hidden">
                <LegalContents items={items} label={navLabel} variant="details" />
              </div>
              <div className="ag-legal-text">
                {sections.map((section) => (
                  <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                    <h2 id={`${section.id}-title`}>{section.title}</h2>
                    {section.content}
                  </section>
                ))}
              </div>

              <footer {...reveal('pop')} className="ag-legal-end mt-16 rounded-[28px] bg-ag-haze p-7 sm:p-9">
                <p className="ag-display text-[1.375rem] font-bold leading-tight text-ag-ink">{documentName}</p>
                <p className="mt-2 text-[0.9375rem] text-ag-mist">
                  Version {version}, effective {effectiveDate}.
                </p>
                <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8" data-print="hide">
                  <PrintButton />
                  <ul className="flex flex-wrap gap-x-6 gap-y-3">
                    {related.map((link) => (
                      <li key={link.href}>
                        <TextLinkV2 href={link.href} className="text-[0.9375rem]">
                          {link.label}
                        </TextLinkV2>
                      </li>
                    ))}
                    {cookieChoices ? (
                      <li>
                        <CookieChoicesLink className={END_LINK} />
                      </li>
                    ) : null}
                  </ul>
                </div>
              </footer>
            </div>
          </div>
        </Container>
      </div>
    </article>
  );
}

/** The plan's name for the same component. */
export const LegalDocument = LegalPage;
