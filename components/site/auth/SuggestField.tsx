'use client';

import { useId, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { ACADEMIC_ALIASES } from '@/lib/utils/academic-data';
import { searchAcademicNames, type AcademicAliasMap } from '@/lib/utils/academic-search';
import { FieldError, FieldHint, LABEL, inputClass } from './controls';

/**
 * A text field with brand v2 suggestions (replaces the native <datalist>
 * popup, owner rule: no browser-looking controls). The student can pick a
 * suggestion or keep exactly what they typed. WAI-ARIA combobox with list
 * autocomplete: the input keeps focus, arrows move through the list
 * (aria-activedescendant), Enter picks, Escape closes. Works with
 * react-hook-form's register() (the ref, name, onChange and onBlur pass
 * through); `onPick` sets the chosen value.
 */

const MAX_SHOWN = 8;

/** Bundled seeds for every kind, used when the caller passes no live aliases. */
const BUNDLED_ALIASES: AcademicAliasMap = { ...ACADEMIC_ALIASES.departments, ...ACADEMIC_ALIASES.programmes, ...ACADEMIC_ALIASES.universities };

type SuggestFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'list' | 'value'> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Everything that may be suggested. */
  suggestions: readonly string[];
  /** Other names per suggestion ("ESUT"), so short names find the listed entry. */
  aliases?: AcademicAliasMap;
  /** What is in the field now (for filtering). */
  current: string;
  /** Called with the suggestion the student picked. */
  onPick: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Alias-aware matches (lib/utils/academic-search): "ESUT" or "UNILAG" finds the listed name.
 * The value already in the field is not offered again.
 */
export function matchSuggestions(all: readonly string[], typed: string, max = MAX_SHOWN, aliases?: AcademicAliasMap): string[] {
  const current = (typed ?? '').trim().toLowerCase();
  return searchAcademicNames(all, typed ?? '', aliases, max + 1).filter((item) => item.toLowerCase() !== current).slice(0, max);
}

export function SuggestField({ label, hint, error, suggestions, aliases, current, onPick, id, ref, onKeyDown, onBlur, onFocus, onChange, ...input }: SuggestFieldProps) {
  const generated = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fieldId = id ?? `ag-suggest-${generated}`;
  const listId = `${fieldId}-list`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<number | null>(null);

  const matches = useMemo(() => matchSuggestions(suggestions, current ?? '', MAX_SHOWN, aliases ?? BUNDLED_ALIASES), [suggestions, current, aliases]);
  const expanded = open && matches.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const pick = (value: string) => {
    onPick(value);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActive((index) => (matches.length ? (index + 1) % matches.length : -1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActive((index) => (matches.length ? (index <= 0 ? matches.length - 1 : index - 1) : -1));
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
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={fieldId} className={LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          {...input}
          className={inputClass(Boolean(error), 'pr-11')}
          onChange={(event) => {
            onChange?.(event);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={(event) => {
            onFocus?.(event);
            if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
            setOpen(true);
          }}
          onBlur={(event) => {
            onBlur?.(event);
            // Let a pointer pick land before the list closes.
            closeTimer.current = window.setTimeout(() => {
              setOpen(false);
              setActive(-1);
            }, 120);
          }}
          onKeyDown={handleKeyDown}
        />
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ag-mist">
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <ul
          id={listId}
          role="listbox"
          aria-label={typeof label === 'string' ? `${label} suggestions` : 'Suggestions'}
          hidden={!expanded}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(23,19,58,0.35)] ring-1 ring-ag-ink/10"
        >
          {matches.map((item, index) => (
            <li
              key={item}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                // Keep focus in the field; pick on press so the blur cannot close the list first.
                event.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer rounded-xl px-3.5 py-2.5 text-[0.9375rem] text-ag-ink ${index === active ? 'bg-ag-haze' : ''}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}
