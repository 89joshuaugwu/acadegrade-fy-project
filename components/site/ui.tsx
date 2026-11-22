import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { reveal } from '@/components/motion/Reveal';
import { Words } from '@/components/motion/Words';

/**
 * Brand v2 "Gold hour" kit (docs/brand-v2/DESIGN.md, docs/brand-v2/BUILD_V2.md).
 * Every public page builds from these pieces so the site reads as one product.
 * Server-safe: no hooks here. Client pieces live in their own files.
 */

export type Tone = 'white' | 'haze' | 'night' | 'gold';

const TONE: Record<Tone, string> = {
  white: 'bg-white text-ag-ink',
  haze: 'bg-ag-haze text-ag-ink',
  night: 'ag-hero-sky text-white',
  gold: 'bg-ag-gold text-ag-night',
};

export function Container({ children, className = '', narrow = false }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={`mx-auto w-full ${narrow ? 'max-w-[880px]' : 'max-w-[1240px]'} px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** A full-width band. Space is generous by default (py-24 / sm:py-32); pass `tight` for py-16 / sm:py-20. */
export function Section({
  tone = 'white',
  children,
  className = '',
  tight = false,
  id,
  labelledBy,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  tight?: boolean;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`relative overflow-hidden ${TONE[tone]} ${tight ? 'py-16 sm:py-20' : 'py-24 sm:py-32'} ${className}`}>
      {children}
    </section>
  );
}

/** Section heading (h2 by default) in the display face, with an optional lead sentence. */
export function Heading({
  id,
  title,
  lead,
  as: Tag = 'h2',
  onDark = false,
  className = '',
  size = 'lg',
}: {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  onDark?: boolean;
  className?: string;
  size?: 'xl' | 'lg' | 'md';
}) {
  const sizes = {
    xl: 'text-[2.75rem] sm:text-[3.75rem] lg:text-[4.25rem] leading-[1.02]',
    lg: 'text-[2.25rem] sm:text-[3rem] leading-[1.05]',
    md: 'text-[1.75rem] sm:text-[2.25rem] leading-[1.1]',
  };
  return (
    <div className={`max-w-2xl ${className}`}>
      <Tag id={id} {...reveal(typeof title === 'string' ? 'words' : 'rise')} className={`ag-display font-bold ${sizes[size]} ${onDark ? 'text-white' : 'text-ag-ink'}`}>
        <Words>{title}</Words>
      </Tag>
      {lead ? <p {...reveal('rise')} className={`mt-5 text-[1.0625rem] leading-relaxed sm:text-[1.125rem] ${onDark ? 'text-ag-mist-night' : 'text-ag-mist'}`}>{lead}</p> : null}
    </div>
  );
}

type ButtonVariant = 'gold' | 'night' | 'violet' | 'ghostOnDark' | 'ghostOnLight';

const BUTTON: Record<ButtonVariant, string> = {
  gold: 'bg-ag-gold text-ag-night hover:brightness-105 shadow-[0_12px_40px_-14px_rgba(255,178,63,0.7)]',
  night: 'bg-ag-night text-white hover:bg-ag-night-2',
  violet: 'bg-ag-violet text-white hover:brightness-110',
  ghostOnDark: 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15',
  ghostOnLight: 'bg-white text-ag-ink ring-1 ring-ag-ink/10 hover:ring-ag-ink/25',
};

export function buttonClass(variant: ButtonVariant = 'gold', size: 'md' | 'lg' = 'md', block = false) {
  const pad = size === 'lg' ? 'px-6 py-4 text-[1rem]' : 'px-5 py-3 text-[0.9375rem]';
  return `ag-focus inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${pad} ${BUTTON[variant]} ${block ? 'w-full' : ''}`;
}

/** Link styled as a button. Use for navigation; use <button className={buttonClass()}> for actions. */
export function ButtonLink({
  href,
  variant = 'gold',
  size = 'md',
  block = false,
  className = '',
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; size?: 'md' | 'lg'; block?: boolean; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={`${buttonClass(variant, size, block)} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

/** Underlined text link. */
export function TextLinkV2({ href, children, onDark = false, className = '' }: { href: string; children: ReactNode; onDark?: boolean; className?: string }) {
  const tone = onDark
    ? 'text-white decoration-white/35 hover:decoration-ag-gold'
    : 'text-ag-violet decoration-ag-violet/30 hover:decoration-ag-violet';
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const cls = `ag-focus rounded font-semibold underline underline-offset-4 ${tone} ${className}`;
  return external ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** A rounded panel. Radius by hierarchy: panels 32px (rounded-[32px]), cards inside 20px (rounded-[20px]). */
export function Panel({ children, className = '', as: Tag = 'article' }: { children: ReactNode; className?: string; as?: 'article' | 'div' | 'section' | 'li' }) {
  return (
    <Tag {...reveal('pop')} className={`relative overflow-hidden rounded-[32px] ${className}`}>
      {children}
    </Tag>
  );
}

export function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.16" />
      <path d="M5.2 9.3l2.4 2.3 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A list of short facts with gold (on dark) or violet (on light) check marks. */
export function CheckList({ items, onDark = false, className = '' }: { items: readonly ReactNode[]; onDark?: boolean; className?: string }) {
  return (
    <ul {...reveal('stagger')} className={`space-y-3 text-[1rem] ${className}`}>
      {items.map((item, index) => (
        <li key={index} className={`flex items-start gap-3 ${onDark ? 'text-ag-gold' : 'text-ag-violet'}`}>
          <CheckIcon className="mt-0.5" />
          <span className={onDark ? 'text-white/85' : 'text-ag-ink'}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Breadcrumb trail for inner pages ("Features / Result scanner"). */
export function Trail({ items, onDark = true }: { items: readonly { label: string; href?: string }[]; onDark?: boolean }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={`flex flex-wrap items-center gap-2 text-[0.875rem] ${onDark ? 'text-ag-mist-night' : 'text-ag-mist'}`}>
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className={`ag-focus rounded hover:underline ${onDark ? 'hover:text-white' : 'hover:text-ag-ink'}`}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={onDark ? 'text-white' : 'text-ag-ink'}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The dark hero every inner page opens with (night sky, display h1, sentence,
 * actions, optional visual on the right). Keep the h1 to two lines.
 */
export function PageHero({
  title,
  sentence,
  actions,
  aside,
  trail,
  titleId = 'page-title',
  compact = false,
}: {
  title: ReactNode;
  sentence?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  trail?: ReactNode;
  titleId?: string;
  compact?: boolean;
}) {
  return (
    <section className="ag-hero-sky ag-noise relative overflow-hidden text-white" aria-labelledby={titleId}>
      <Container
        className={`relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 ${compact ? 'pb-16 pt-12 sm:pb-20 sm:pt-16' : 'pb-20 pt-12 sm:pt-16 lg:pb-28 lg:pt-20'} ${
          aside ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-14' : ''
        }`}
      >
        <div className="max-w-2xl">
          {trail ? <div className="ag-rise mb-6">{trail}</div> : null}
          <h1 id={titleId} className={`ag-display ${typeof title === 'string' ? 'mo-load-words' : 'ag-rise'} text-[2.5rem] font-bold leading-[1.03] sm:text-[3.5rem] lg:text-[4rem]`}>
            <Words>{title}</Words>
          </h1>
          {sentence ? <p className="ag-rise ag-rise-2 mt-6 max-w-[36rem] text-[1.125rem] leading-relaxed text-ag-mist-night">{sentence}</p> : null}
          {actions ? <div className="ag-rise ag-rise-3 mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">{actions}</div> : null}
        </div>
        {aside ? <div className="mo-load-visual min-w-0">{aside}</div> : null}
      </Container>
    </section>
  );
}

/** FAQ list (native details). Pair it with faqPageJsonLd from components/public/Accordion for structured data. */
export function FaqList({ items, onDark = false }: { items: readonly { id?: string; question: string; answer: ReactNode }[]; onDark?: boolean }) {
  return (
    <div {...reveal('stagger')} className={`divide-y border-y ${onDark ? 'divide-white/10 border-white/10' : 'divide-ag-ink/10 border-ag-ink/10'}`}>
      {items.map((item, index) => (
        <details key={item.id ?? index} className="ag-faq group">
          <summary className={`ag-focus flex items-center justify-between gap-6 rounded py-6 text-[1.0625rem] font-semibold sm:text-[1.125rem] ${onDark ? 'text-white' : 'text-ag-ink'}`}>
            {item.question}
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={`ag-faq-icon shrink-0 ${onDark ? 'text-ag-gold' : 'text-ag-violet'}`}>
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </summary>
          <div className={`max-w-2xl pb-6 text-[1rem] leading-relaxed ${onDark ? 'text-ag-mist-night' : 'text-ag-mist'}`}>{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/** The gold closing band used at the foot of most pages. */
export function ClosingBand({ title, actions, id = 'closing-title' }: { title: ReactNode; actions: ReactNode; id?: string }) {
  return (
    <section className="bg-ag-gold" aria-labelledby={id}>
      <Container className="flex flex-col items-start gap-8 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
        <h2 id={id} {...reveal(typeof title === 'string' ? 'words' : 'rise')} className="ag-display max-w-2xl text-[2.25rem] font-bold leading-[1.05] text-ag-night sm:text-[3rem]">
          <Words>{title}</Words>
        </h2>
        <div {...reveal('rise', 220)} className="flex flex-wrap items-center gap-x-6 gap-y-4">{actions}</div>
      </Container>
    </section>
  );
}

/** Small rounded label (a status or a fact), not an eyebrow above headings. */
export function Chip({ children, tone = 'haze' }: { children: ReactNode; tone?: 'haze' | 'gold' | 'violet' | 'onDark' }) {
  const tones = {
    haze: 'bg-ag-haze text-ag-ink',
    gold: 'bg-ag-gold/25 text-ag-ink',
    violet: 'bg-ag-violet/10 text-ag-violet',
    onDark: 'bg-white/10 text-white',
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** A flat phone frame for app screens (no gloss). Put real HTML screens inside. */
export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[340px] ${className}`}>
      <div {...reveal('pop')} className="relative rounded-[44px] bg-[#05040F] p-3 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[34px] bg-ag-haze text-ag-ink">{children}</div>
      </div>
    </div>
  );
}
