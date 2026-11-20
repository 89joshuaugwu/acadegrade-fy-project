'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { PhoneFrame } from '@/components/site/ui';

/**
 * "What the app adds" on /app: a list of the Android extras as tabs; the
 * chosen one swaps the phone's screen (a short crossfade) and shows its fact.
 * Screens are server-rendered HTML passed in as nodes.
 */

export interface ExtraTab {
  id: string;
  name: string;
  fact: string;
  screenAlt: string;
  screen: ReactNode;
}

export function AppExtras({ extras }: { extras: ExtraTab[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = extras[active] ?? extras[0];

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + extras.length) % extras.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
      <div role="tablist" aria-label="What the app adds" aria-orientation="vertical" className="space-y-2">
        {extras.map((extra, index) => {
          const selected = index === active;
          return (
            <button
              key={extra.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              className={`ag-focus block w-full rounded-[20px] px-5 py-4 text-left transition sm:px-6 ${
                selected ? 'bg-ag-night text-white' : 'bg-ag-haze text-ag-ink hover:bg-ag-violet/10'
              }`}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKey(event, index)}
            >
              <span className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? 'bg-ag-gold' : 'bg-ag-violet/40'}`} aria-hidden="true" />
                <span className="ag-display text-[1.25rem] font-bold sm:text-[1.375rem]">{extra.name}</span>
              </span>
              {selected ? (
                <span aria-hidden="true" className="mt-2 block pl-[1.375rem] text-[0.9375rem] leading-relaxed text-ag-mist-night">
                  {extra.fact}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="relative">
        <p className="sr-only">{current.fact}</p>
        <div className="absolute -inset-6 rounded-full bg-ag-violet/15 blur-3xl" aria-hidden="true" />
        <PhoneFrame className="relative">
          <div className="relative h-[560px]" role="img" aria-label={current.screenAlt}>
            {extras.map((extra, index) => (
              <div
                key={extra.id}
                className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${index === active ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
                inert
              >
                {extra.screen}
              </div>
            ))}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
