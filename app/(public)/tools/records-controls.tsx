'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { OLEVEL_GRADES, type OlevelGrade } from '@/lib/records/olevelRules';
import { findOlevelSubject, normaliseSubjectKey, searchOlevelSubjects, type OlevelSubject } from '@/lib/records/olevelSubjects';
import { ErrorLine, TButton, inputClass } from '@/components/site/tools/controls';
import { trackToolEvent } from '@/components/public/tools/track';

/**
 * Controls for the WAEC credit checker and the admission aggregate, in the
 * tools' brand v2 look (owner rule: no native selects, checkboxes or number
 * spinners). Grade chips are a radiogroup on native radios (one tab stop,
 * arrow keys move), the subject picker is a WAI-ARIA combobox with list
 * autocomplete over the shared catalogue's aliases, and the formula choice
 * is a radiogroup of cards.
 */

const KIND_WORD = { credit: 'credit', pass: 'pass', fail: 'fail' } as const;

/* --------------------------------------------------------- grade chips */

/**
 * A1 to F9 as a radiogroup. Five to a row on a phone (two rows, thumb-sized),
 * all nine in one row once the row has room. Each radio is named with what
 * the grade counts as ("C6, credit").
 */
export function GradeChips({
  name,
  label,
  value,
  onChange,
  className = '',
}: {
  name: string;
  label: string;
  value: OlevelGrade | null;
  onChange: (grade: OlevelGrade) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid grid-cols-5 gap-1.5 @md:grid-cols-9 ${className}`}>
      {OLEVEL_GRADES.map((band) => (
        <label key={band.grade} className="relative min-w-0">
          <input
            type="radio"
            name={name}
            value={band.grade}
            checked={value === band.grade}
            aria-label={`${band.grade}, ${KIND_WORD[band.kind]}`}
            onChange={(event) => {
              if (event.target.checked) onChange(band.grade);
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="ag-pill ag-num h-10 w-full min-w-0 px-0 text-[0.875rem]"
            data-tone={band.kind === 'fail' ? 'mark' : undefined}
            data-kind={band.kind}
          >
            {band.grade}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ subject picker */

export interface PickedSubject {
  /** Catalogue id, or '' for a name the catalogue does not know. */
  id: string;
  name: string;
}

interface Option {
  key: string;
  subject: PickedSubject;
  /** The alias the query matched ("F/Maths"), when it is not the name. */
  matched?: string;
}

function matchedAlias(subject: OlevelSubject, query: string): string | undefined {
  const q = normaliseSubjectKey(query);
  if (!q || normaliseSubjectKey(subject.name).includes(q)) return undefined;
  return subject.aliases.find((alias) => normaliseSubjectKey(alias).startsWith(q)) ?? subject.aliases.find((alias) => normaliseSubjectKey(alias).includes(q));
}

/**
 * A subject field with suggestions from the O-level catalogue. Typing a short
 * name ("Eng Lang", "F/Maths", "CRK") lists the subject it stands for; Enter
 * or a tap picks it. With `allowCustom`, a name the catalogue does not know is
 * kept as typed, and offered as its own option. The input keeps focus; arrows
 * move through the list (aria-activedescendant); Escape closes it.
 */
export function SubjectPicker({
  label,
  hideLabel = false,
  value,
  onType,
  onPick,
  onBlur,
  onFocus,
  exclude = [],
  allowCustom = true,
  error,
  hint,
  placeholder = 'Type a subject',
  className = '',
  clearOnPick = false,
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  onType: (text: string) => void;
  onPick: (subject: PickedSubject) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Catalogue ids not to offer (already in this sitting). */
  exclude?: readonly string[];
  allowCustom?: boolean;
  error?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
  /** Empty the field after a pick (the course-subject adder). */
  clearOnPick?: boolean;
}) {
  const fieldId = `ag-subject-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const listId = `${fieldId}-list`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = useMemo<Option[]>(() => {
    const query = value.trim();
    const current = findOlevelSubject(query);
    const found = searchOlevelSubjects(query, 8)
      .filter((subject) => !exclude.includes(subject.id) && subject.id !== current?.id)
      .slice(0, 6)
      .map((subject) => ({ key: subject.id, subject: { id: subject.id, name: subject.name }, matched: matchedAlias(subject, query) }));
    // The exact match first, even when it is excluded elsewhere, so the field never hides what it resolves to.
    if (current && !exclude.includes(current.id) && current.name !== query) found.unshift({ key: current.id, subject: { id: current.id, name: current.name }, matched: matchedAlias(current, query) });
    if (allowCustom && query && !current && !found.some((option) => normaliseSubjectKey(option.subject.name) === normaliseSubjectKey(query))) {
      found.push({ key: `custom-${normaliseSubjectKey(query)}`, subject: { id: '', name: query }, matched: undefined });
    }
    return found;
  }, [value, exclude, allowCustom]);

  const expanded = open && options.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const pick = (option: Option) => {
    onPick(option.subject);
    if (clearOnPick) onType('');
    setOpen(false);
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'mb-2 block text-[0.875rem] font-medium text-ag-ink'}>
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && options[active] ? optionId(active) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onType(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => onFocus?.()}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              setActive(0);
            } else setActive((index) => (options.length ? (index + 1) % options.length : 0));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => (options.length ? (index - 1 + options.length) % options.length : 0));
          } else if (event.key === 'Enter') {
            if (expanded && options[active]) {
              event.preventDefault();
              pick(options[active]);
            }
          } else if (event.key === 'Escape') {
            if (open) {
              event.preventDefault();
              setOpen(false);
            }
          }
        }}
        className={`${inputClass({ size: 'sm', invalid: Boolean(error) })} h-11`}
      />
      {/* Always in the DOM so aria-controls points at something; empty while closed. */}
      <ul
        id={listId}
        role="listbox"
        aria-label={`Subjects for ${label}`}
        className={
          expanded
            ? 'absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(23,19,58,0.45)] ring-1 ring-ag-ink/10'
            : 'hidden'
        }
      >
        {expanded
          ? options.map((option, index) => (
              <li
                key={option.key}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => setActive(index)}
                onClick={() => pick(option)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[0.9375rem] text-ag-ink ${index === active ? 'bg-ag-haze' : ''}`}
              >
                {option.subject.id ? (
                  <span className="min-w-0">{option.subject.name}</span>
                ) : (
                  <span className="min-w-0">
                    Use “{option.subject.name}”
                  </span>
                )}
                {option.matched ? (
                  <span aria-hidden="true" className="shrink-0 text-[0.8125rem] text-ag-mist">
                    {option.matched}
                  </span>
                ) : null}
              </li>
            ))
          : null}
      </ul>
      {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[0.8125rem] leading-snug text-ag-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------- choice cards */

export function ChoiceCards<V extends string>({
  name,
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  name: string;
  label: string;
  options: readonly { value: V; title: string; summary: string }[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid grid-cols-[minmax(0,1fr)] gap-2.5 @2xl:grid-cols-3 ${className}`}>
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label key={option.value} className="relative flex min-w-0 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={(event) => {
                if (event.target.checked) onChange(option.value);
              }}
              className="peer sr-only"
            />
            <span
              className={`flex w-full flex-col rounded-2xl px-4 py-3.5 transition-[box-shadow,background-color] duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ag-violet ${
                checked ? 'bg-ag-night text-white' : 'bg-white ring-1 ring-inset ring-ag-ink/15 hover:ring-ag-violet/60'
              }`}
            >
              <span className={`text-[0.9375rem] font-semibold leading-snug ${checked ? 'text-white' : 'text-ag-ink'}`}>{option.title}</span>
              <span className={`mt-1 text-[0.8125rem] leading-snug ${checked ? 'text-ag-mist-night' : 'text-ag-mist'}`}>{option.summary}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- share */

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('copy failed');
}

/**
 * Shares the page's own address, which already carries everything typed
 * (records-url.ts). The phone share sheet when there is one, else the
 * clipboard, else the link in a field to copy by hand.
 */
export function ShareLink({ tool, label, title }: { tool: string; label: string; title: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [href, setHref] = useState('');
  const share = async () => {
    const url = window.location.href;
    setHref(url);
    trackToolEvent('tool_used', { tool, action: 'share' });
    const phone = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (phone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await copyText(url);
      setState('copied');
      window.setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('failed');
    }
  };
  return (
    <div>
      <TButton variant="ghostOnDark" block onClick={share}>
        {state === 'copied' ? 'Link copied' : label}
      </TButton>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Link copied' : ''}
      </span>
      {state === 'failed' ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[0.8125rem] text-white/85" htmlFor={`${tool}-share-link`}>
            Copy this link to share it.
          </label>
          <input
            id={`${tool}-share-link`}
            readOnly
            value={href}
            onFocus={(event) => event.currentTarget.select()}
            className={inputClass({ dark: true })}
          />
        </div>
      ) : null}
    </div>
  );
}

/** A small "x" icon button (remove a row, a sitting or a course subject). */
export function RemoveButton({ label, onClick, onDark = false }: { label: string; onClick: () => void; onDark?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`ag-focus grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
        onDark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-ag-mist hover:bg-white hover:text-[#C2361F]'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
