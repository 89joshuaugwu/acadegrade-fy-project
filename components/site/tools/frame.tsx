import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { CheckIcon, Container, FaqList, Heading } from '@/components/site/ui';
import { reveal } from '@/components/motion/Reveal';
import { Words } from '@/components/motion/Words';

/**
 * The frame every tools page shares (calculator, /tools, the four tools):
 * a compact night hero whose bottom the tool panel overlaps, so the tool is
 * the first thing on the page; then plain sections in alternating tones.
 * Server-safe.
 */

/**
 * The tools hero: the same night sky, type and entrance as PageHero
 * (components/site/ui.tsx), with extra room at the foot so the tool panel
 * below can rise over it. Keep the h1 to two lines.
 */
export function ToolHero({
  title,
  sentence,
  trail,
  facts,
  titleId = 'page-title',
}: {
  title: ReactNode;
  sentence?: ReactNode;
  trail?: ReactNode;
  facts?: readonly string[];
  titleId?: string;
}) {
  return (
    <section className="ag-hero-sky ag-noise relative overflow-hidden text-white" aria-labelledby={titleId}>
      <Container className="relative pb-32 pt-10 sm:pb-36 sm:pt-14 lg:pb-40">
        <div className="max-w-3xl">
          {trail ? <div className="ag-rise mb-6">{trail}</div> : null}
          <h1 id={titleId} className={`ag-display ${typeof title === 'string' ? 'mo-load-words' : 'ag-rise'} text-[2.5rem] font-bold leading-[1.03] sm:text-[3.5rem] lg:text-[4rem]`}>
            <Words>{title}</Words>
          </h1>
          {sentence ? <p className="ag-rise ag-rise-2 mt-5 max-w-[38rem] text-[1.0625rem] leading-relaxed text-ag-mist-night sm:text-[1.125rem]">{sentence}</p> : null}
          {facts?.length ? (
            <ul className="ag-rise ag-rise-3 mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
              {facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2 text-ag-gold">
                  <CheckIcon />
                  <span className="text-white/80">{fact}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * The haze band that holds the tool. Its panel rises over the hero's foot.
 * No overflow clipping here, so sticky children (the phone summary strip,
 * the result card) keep working.
 */
export function ToolStage({ children, label, after }: { children: ReactNode; label: string; after?: ReactNode }) {
  return (
    <section aria-label={label} className="relative z-10 flow-root bg-ag-haze pb-16 sm:pb-20">
      <Container>
        <div className="mo-load -mt-24 sm:-mt-28" style={{ '--mo-at': '260ms' } as CSSProperties}>{children}</div>
        {after}
      </Container>
    </section>
  );
}

/** The white panel inside the stage: inputs on the left, the night result card on the right at 1024px and up. */
export const PANEL_CLASS =
  'rounded-[28px] bg-white p-4 shadow-[0_30px_80px_-40px_rgba(23,19,58,0.45)] ring-1 ring-ag-ink/[0.04] sm:rounded-[32px] sm:p-7 lg:p-9';

/** A plain section with a heading block. */
export function ToolSection({
  id,
  title,
  lead,
  tone = 'white',
  children,
  className = '',
}: {
  id: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: 'white' | 'haze';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`${tone === 'haze' ? 'bg-ag-haze' : 'bg-white'} py-20 sm:py-28 ${className}`}>
      <Container>
        <Heading id={id} title={title} lead={lead} />
        <div {...reveal('rise', 120)} className="mt-12 sm:mt-14">{children}</div>
      </Container>
    </section>
  );
}

/** FAQ: heading on the left, the questions on the right (as on the home page). Pair with faqPageJsonLd. */
export function ToolFaqSection({
  id,
  title,
  faqs,
  tone = 'white',
}: {
  id: string;
  title: string;
  faqs: readonly { question: string; answer: string }[];
  tone?: 'white' | 'haze';
}) {
  return (
    <section aria-labelledby={id} className={`${tone === 'haze' ? 'bg-ag-haze' : 'bg-white'} py-20 sm:py-28`}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <div>
          <h2 id={id} {...reveal('words')} className="ag-display text-[2.25rem] font-bold leading-[1.05] text-ag-ink sm:text-[3rem]">
            <Words>{title}</Words>
          </h2>
          <p {...reveal('rise')} className="mt-5 text-[1.0625rem] leading-relaxed text-ag-mist">
            Anything else?{' '}
            <Link href="/support" className="ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet">
              Ask support
            </Link>
          </p>
        </div>
        <FaqList items={faqs.map((faq) => ({ id: faq.question, question: faq.question, answer: faq.answer }))} />
      </Container>
    </section>
  );
}

/** The line under a tool panel: an estimate, nothing saved. */
export function UnderNote({ children }: { children: ReactNode }) {
  return <div className="mt-5 max-w-3xl text-[0.875rem] leading-relaxed text-ag-mist">{children}</div>;
}
