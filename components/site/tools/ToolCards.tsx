import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A tool as a card: the name is the link (stretched over the whole card, so
 * the card is the target), with the question it answers and an optional
 * live example. Server-safe; client pages pass live hints in.
 */

export function ToolCard({
  name,
  href,
  ariaLabel,
  tone = 'white',
  children,
  top,
  footer,
  className = '',
  headingLevel: Tag = 'h3',
}: {
  /** A visual above the name (the hub's worked examples). */
  top?: ReactNode;
  name: string;
  href: string;
  /** Accessible name when the card needs more than the name (the hub: "Required GPA: what average…"). */
  ariaLabel?: string;
  tone?: 'white' | 'haze';
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <li
      className={`group relative flex min-w-0 flex-col rounded-[24px] p-6 transition duration-200 focus-within:ring-2 focus-within:ring-ag-violet hover:-translate-y-0.5 motion-reduce:transform-none sm:p-7 ${
        tone === 'white'
          ? 'bg-white ring-1 ring-ag-ink/[0.06] hover:shadow-[0_24px_50px_-30px_rgba(23,19,58,0.45)]'
          : 'bg-ag-haze hover:shadow-[0_24px_50px_-30px_rgba(23,19,58,0.35)]'
      } ${className}`}
    >
      {top}
      <Tag className="ag-display text-[1.375rem] font-bold leading-tight text-ag-ink">
        <Link
          href={href}
          aria-label={ariaLabel}
          className="rounded outline-none after:absolute after:inset-0 after:rounded-[24px] after:content-[''] group-hover:text-ag-violet"
        >
          {name}
        </Link>
      </Tag>
      {children}
      {footer ? <div className="mt-auto pt-6">{footer}</div> : null}
    </li>
  );
}

/** The visual cue at a card's foot, styled as a text link (the card itself is the link). */
export function OpenCue({ children = 'Open the tool' }: { children?: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 transition group-hover:decoration-ag-violet"
    >
      {children}
    </span>
  );
}
