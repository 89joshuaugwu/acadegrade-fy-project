'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { findOlevelSubject, normaliseSubjectKey, searchOlevelSubjects, subjectIdFor } from '@/lib/records/olevelSubjects';
import { SUBJECT_NAME_MAX } from '@/lib/records/olevelRules';
import { cn } from '@/lib/utils/cn';

export interface PickedSubject {
  subjectId: string;
  name: string;
}

interface SubjectPickerProps {
  label: string;
  /** Visually hidden label (rows in a table). */
  hideLabel?: boolean;
  value: PickedSubject | null;
  onChange: (value: PickedSubject | null) => void;
  /** Subjects already used elsewhere in the same sitting: not offered again. */
  excludeIds?: readonly string[];
  error?: string;
  placeholder?: string;
}

const MAX_SHOWN = 7;

/**
 * Subject search for WAEC/NECO rows (owner rule: no native controls). Finds
 * catalogue subjects by name or alias ("Eng", "F/Maths", "CRK", "Agric"), and
 * keeps any other name exactly as typed (stored as a custom subject). WAI-ARIA
 * combobox with list autocomplete: the input keeps focus, arrows move, Enter
 * picks, Escape closes.
 */
export function SubjectPicker({ label, hideLabel = false, value, onChange, excludeIds = [], error, placeholder = 'Start typing, e.g. Maths' }: SubjectPickerProps) {
  const id = useId().replace(/:/g, '');
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = text ?? value?.name ?? '';
  const options = useMemo(() => {
    const typed = shown.trim();
    const found = searchOlevelSubjects(typed, MAX_SHOWN + excludeIds.length)
      .filter((subject) => !excludeIds.includes(subject.id) || subject.id === value?.subjectId)
      .slice(0, MAX_SHOWN)
      .map((subject) => ({ subjectId: subject.id, name: subject.name, custom: false }));
    const exact = typed && findOlevelSubject(typed);
    if (typed && !exact && !found.some((option) => normaliseSubjectKey(option.name) === normaliseSubjectKey(typed))) {
      found.push({ subjectId: subjectIdFor(typed), name: typed.slice(0, SUBJECT_NAME_MAX), custom: true });
    }
    return found;
  }, [shown, excludeIds, value?.subjectId]);

  const pick = (option: PickedSubject) => {
    onChange({ subjectId: option.subjectId, name: option.name });
    setText(null);
    setOpen(false);
  };

  /** Leaving the field keeps what was typed: a catalogue match, or a custom subject. */
  const commit = () => {
    setOpen(false);
    if (text === null) return;
    const typed = text.trim();
    setText(null);
    if (!typed) {
      onChange(null);
      return;
    }
    const subject = findOlevelSubject(typed);
    onChange(subject ? { subjectId: subject.id, name: subject.name } : { subjectId: subjectIdFor(typed), name: typed.slice(0, SUBJECT_NAME_MAX) });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (options.length ? (index + 1) % options.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (options.length ? (index - 1 + options.length) % options.length : 0));
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setText(null);
    }
  };

  const activeId = open && options[active] ? `${listId}-${active}` : undefined;

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={cn('text-[0.875rem] font-medium text-[var(--acade-text-muted)]', hideLabel && 'sr-only')}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        maxLength={SUBJECT_NAME_MAX}
        placeholder={placeholder}
        value={shown}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={cn(
          'h-12 w-full min-w-0 text-ellipsis rounded-xl border bg-[var(--acade-deep)] px-3 text-[1rem] sm:px-4 text-[var(--acade-text)] transition-colors',
          'placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20',
          error ? 'border-[var(--acade-danger)]' : 'border-[var(--acade-control-border)]',
        )}
      />
      {open && options.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-1 shadow-[var(--shadow-popover)]"
          style={{ zIndex: 'var(--z-dropdown)' }}
        >
          {options.map((option, index) => {
            const selected = option.subjectId === value?.subjectId;
            return (
              <li
                key={`${option.subjectId}-${option.custom ? 'custom' : 'listed'}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                // Keep focus in the input so the blur commit does not fire first.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[0.9375rem] text-[var(--acade-text)]',
                  index === active && 'bg-[var(--acade-overlay)]',
                )}
              >
                <span className="min-w-0 truncate">{option.custom ? `Use “${option.name}”` : option.name}</span>
                {selected ? <Check size={16} aria-hidden="true" className="shrink-0 text-[var(--acade-primary)]" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[0.8125rem] font-medium text-[var(--acade-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
