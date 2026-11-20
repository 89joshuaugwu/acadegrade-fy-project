'use client';

import { useEffect, useState } from 'react';

export interface ContentsItem {
  id: string;
  title: string;
}

interface LegalContentsProps {
  items: readonly ContentsItem[];
  /** Accessible name of the nav ("Privacy notice contents"). */
  label: string;
  /** Phone and tablet version: a closed <details>; choosing a link closes it. */
  variant?: 'sticky' | 'details';
}

/** The section being read: the last one whose top has passed a line 35% down the viewport. */
function sectionInView(items: readonly ContentsItem[]): string | null {
  const doc = document.documentElement;
  if (items.length && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
    // At the very end the last, short sections never reach the line.
    const last = document.getElementById(items[items.length - 1].id);
    if (last && last.getBoundingClientRect().top < window.innerHeight) return items[items.length - 1].id;
  }
  const line = window.innerHeight * 0.35;
  let current: string | null = null;
  for (const item of items) {
    const element = document.getElementById(item.id);
    if (!element) continue;
    if (element.getBoundingClientRect().top <= line) current = item.id;
    else break;
  }
  return current;
}

/**
 * The legal contents list. Plain links without JavaScript; with it, the
 * section being read is marked aria-current="location" (a light scroll spy,
 * one read per animation frame; nothing is marked above the first section).
 */
export function LegalContents({ items, label, variant = 'sticky' }: LegalContentsProps) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (variant !== 'sticky') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setActive(sectionInView(items));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items, variant]);

  if (variant === 'details') {
    return (
      <details className="ag-faq group rounded-[20px] bg-ag-haze" data-print="hide">
        <summary className="ag-focus flex min-h-[56px] items-center justify-between gap-4 rounded-[20px] px-5 py-4 text-[1rem] font-semibold text-ag-ink">
          <span>
            Contents <span className="font-normal text-ag-mist">({items.length} sections)</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="ag-faq-icon shrink-0 text-ag-violet">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </summary>
        <nav aria-label={label} className="px-3 pb-4">
          <ol className="space-y-0.5">
            {items.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                  className="ag-focus flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 text-[0.9375rem] text-ag-ink hover:bg-white"
                >
                  <span className="ag-num w-6 shrink-0 text-right text-[0.8125rem] font-semibold text-ag-violet">{index + 1}</span>
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </details>
    );
  }

  return (
    <nav aria-label={label} data-print="hide" className="sticky top-[96px] max-h-[calc(100svh-120px)] overflow-y-auto pb-6 pr-2">
      <p className="ag-display text-[1.125rem] font-bold text-ag-ink">Contents</p>
      <ol className="mt-4 space-y-0.5 border-l border-ag-ink/10">
        {items.map((item, index) => {
          const current = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? 'location' : undefined}
                className={`ag-focus -ml-px flex gap-3 rounded-r-lg border-l-2 py-2 pl-4 pr-2 text-[0.875rem] leading-snug transition-colors ${
                  current ? 'border-ag-violet font-semibold text-ag-ink' : 'border-transparent text-ag-mist hover:text-ag-ink'
                }`}
              >
                <span className={`ag-num w-5 shrink-0 text-right ${current ? 'text-ag-violet' : 'text-ag-mist/70'}`}>{index + 1}</span>
                <span>{item.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
