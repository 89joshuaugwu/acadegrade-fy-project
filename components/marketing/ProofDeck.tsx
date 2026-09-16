'use client';

import { Children, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Equalize sticky release edges without fixing any card's content height. */
export function ProofDeck({ children }: { children: ReactNode }) {
  const deckRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck || typeof ResizeObserver === 'undefined') return;
    const cards = Array.from(deck.querySelectorAll<HTMLElement>('.academic-proof-card'));
    const measure = () => {
      const stackHeight = Math.max(...cards.map((card, index) => card.getBoundingClientRect().height + index * 64));
      deck.style.setProperty('--proof-stack-height', `${stackHeight}px`);
    };
    const observer = new ResizeObserver(measure);
    cards.forEach(card => observer.observe(card));
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={deckRef} aria-label="Illustrative calculation sequence" className="academic-ledger-field academic-proof-deck min-w-0 space-y-6 rounded-[var(--radius-dialog)] border border-[var(--acade-border-subtle)] p-3 sm:p-5 lg:col-span-7 lg:space-y-0">
      {Children.map(children, (child, index) => (
        <li data-stage={index + 1} className="academic-proof-slot" style={{ '--proof-offset': `${index * 64}px`, zIndex: index + 1 } as CSSProperties}>
          {child}
        </li>
      ))}
    </ol>
  );
}
