'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Search } from 'lucide-react';
import { searchAcademicNames } from '@/lib/utils/academic-search';
import { cn } from '@/lib/utils/cn';

export type PickerEntry = { id: string; name: string; aliases?: string[] };

const MAX_SHOWN = 8;
const fieldClass = 'h-12 w-full rounded-[12px] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] pl-11 pr-4 text-sm text-[var(--acade-text)] placeholder:text-[var(--acade-text-faint)] transition-colors focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';

/**
 * Searchable picker of existing catalogue entries (WAI-ARIA combobox, no native
 * select). Matches names and aliases ("ESUT", "UNILAG"); arrows move, Enter picks,
 * Escape closes. Typing after a pick clears the pick until a new one is chosen.
 */
export function EntryPicker({ label, hint, entries, value, onChange, placeholder }: {
  label: string;
  hint?: string;
  entries: readonly PickerEntry[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const generated = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const inputId = `entry-picker-${generated}`;
  const listId = `${inputId}-list`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const selected = entries.find((entry) => entry.id === value) ?? null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<number | null>(null);

  const aliasMap = useMemo(() => Object.fromEntries(entries.map((entry) => [entry.name, entry.aliases ?? []])), [entries]);
  const matches = useMemo(() => {
    const names = searchAcademicNames(entries.map((entry) => entry.name), query, aliasMap, MAX_SHOWN);
    return names.map((name) => entries.find((entry) => entry.name === name)!).filter(Boolean);
  }, [entries, query, aliasMap]);
  const expanded = open && matches.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const pick = (entry: PickerEntry) => {
    onChange(entry.id);
    setQuery('');
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (matches.length ? (index + step + matches.length) % matches.length : -1));
    } else if (event.key === 'Enter' && expanded && active >= 0 && matches[active]) {
      event.preventDefault();
      pick(matches[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--acade-text)]">{label}</label>
      <div className="relative">
        <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)]" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={hintId}
          value={selected && !query ? selected.name : query}
          placeholder={placeholder}
          className={fieldClass}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            closeTimer.current = window.setTimeout(() => { setOpen(false); setActive(-1); }, 120);
          }}
          onKeyDown={onKeyDown}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} options`}
          hidden={!expanded}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-1.5 shadow-[0_18px_40px_-18px_rgba(14,11,43,0.45)]"
        >
          {matches.map((entry, index) => (
            <li
              key={entry.id}
              id={optionId(index)}
              role="option"
              aria-selected={entry.id === value}
              onMouseDown={(event) => { event.preventDefault(); pick(entry); }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-[10px] px-3 py-2.5 text-sm text-[var(--acade-text)]',
                index === active && 'bg-[var(--acade-overlay)]',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words">{entry.name}</span>
                {entry.aliases?.length ? <span className="block text-[0.8125rem] text-[var(--acade-text-muted)]">Also known as {entry.aliases.slice(0, 4).join(', ')}</span> : null}
              </span>
              {entry.id === value ? <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--acade-primary)]" /> : null}
            </li>
          ))}
        </ul>
      </div>
      {hint ? <p id={hintId} className="mt-1.5 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{hint}</p> : null}
    </div>
  );
}
