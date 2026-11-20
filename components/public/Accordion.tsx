import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Native details/summary, no lines between rows (24 to 28px of space).
 * The summary is at lead size with a two-stroke chevron that turns 180
 * degrees in 160ms; the answer fades in at body size in full ink.
 * FAQ data comes from one typed list per page, which also feeds the
 * FAQPage JSON-LD (faqPageJsonLd below), so the two never drift.
 */

export interface AccordionItem {
  id?: string;
  question: string;
  /** The visible answer. */
  answer: ReactNode;
}

interface AccordionProps {
  items: readonly AccordionItem[];
  /** Index of the item open on load. */
  defaultOpen?: number;
  /** Wrap each question in a heading of this level (h3 by default) for the outline. */
  headingLevel?: 2 | 3 | 4 | null;
  className?: string;
}

export function Accordion({ items, defaultOpen, headingLevel = 3, className }: AccordionProps) {
  const Heading = headingLevel ? (`h${headingLevel}` as const) : null;
  return (
    <div className={cn('pg-accordion', className)}>
      {items.map((item, index) => (
        <details key={item.id ?? item.question} id={item.id} open={defaultOpen === index || undefined}>
          <summary>
            {Heading ? <Heading className="pg-accordion__q">{item.question}</Heading> : <span>{item.question}</span>}
            <span className="pg-chevron" aria-hidden="true" />
          </summary>
          <div className="pg-accordion__answer">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

export interface FaqEntry {
  question: string;
  /** Plain-text answer, word for word as shown on the page. */
  answer: string;
}

/** FAQPage JSON-LD from the same list the page shows. */
export function faqPageJsonLd(entries: readonly FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
