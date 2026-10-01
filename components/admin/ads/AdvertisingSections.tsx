'use client';

import { useRef, useState, type ReactNode } from 'react';

interface Section {
  id: string;
  label: string;
  description: string;
  content: ReactNode;
}

export function AdvertisingSections({ id, label, sections }: { id: string; label: string; sections: Section[] }) {
  const [selected, setSelected] = useState(sections[0]?.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2 border-b border-[var(--acade-border)] pb-3">
        {sections.map((section, index) => (
          <button
            key={section.id}
            ref={element => { tabs.current[index] = element; }}
            type="button"
            role="tab"
            id={`${id}-${section.id}-tab`}
            aria-controls={`${id}-${section.id}-panel`}
            aria-selected={selected === section.id}
            tabIndex={selected === section.id ? 0 : -1}
            onClick={() => setSelected(section.id)}
            onKeyDown={event => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
              else if (event.key === 'ArrowLeft') next = (index - 1 + sections.length) % sections.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = sections.length - 1;
              else return;
              event.preventDefault();
              setSelected(sections[next].id);
              tabs.current[next]?.focus();
            }}
            className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] ${selected === section.id ? 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]'}`}
          >
            {section.label}
          </button>
        ))}
      </div>
      {sections.map(section => (
        <div
          key={section.id}
          role="tabpanel"
          id={`${id}-${section.id}-panel`}
          aria-labelledby={`${id}-${section.id}-tab`}
          hidden={selected !== section.id}
          tabIndex={0}
          className="space-y-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]"
        >
          <p className="text-sm leading-6 text-[var(--acade-text-muted)]">{section.description}</p>
          {section.content}
        </div>
      ))}
    </div>
  );
}
