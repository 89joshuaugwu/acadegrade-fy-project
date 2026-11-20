'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOptionV2 {
  value: string;
  label: string;
  /** Optional second line, for example a short description. */
  hint?: string;
}

export interface SelectV2Props {
  options: readonly SelectOptionV2[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  placeholder?: string;
  /** Renders a hidden input so the value posts with a normal form. */
  name?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  searchable?: boolean;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  id?: string;
  className?: string;
  /** Called when focus leaves the whole control (trigger and list), for on-blur validation. */
  onBlur?: () => void;
}

/**
 * Brand v2 dropdown (owner rule: no native browser controls on the site).
 * WAI-ARIA select-only combobox: the trigger is a button with role combobox, the list a listbox.
 * Keyboard: Enter, Space, ArrowDown or ArrowUp open; arrows, Home, End move; Enter selects; Escape and Tab close;
 * typing a letter jumps to the next option that starts with it.
 */
export function SelectV2({
  options,
  value,
  onChange,
  label,
  hideLabel = false,
  placeholder = 'Choose one',
  name,
  required,
  error,
  hint,
  searchable = false,
  disabled = false,
  tone = 'light',
  id: idProp,
  className,
  onBlur,
}: SelectV2Props) {
  const autoId = useId();
  const id = idProp ?? `sel-${autoId.replace(/:/g, '')}`;
  const listboxId = `${id}-list`;
  const labelId = `${id}-label`;
  const messageId = `${id}-msg`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dark = tone === 'dark';

  const selected = options.find((o) => o.value === value);
  const filtered = searchable && query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const optionId = (v: string) => `${listboxId}-${v.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const activeOption = active >= 0 ? filtered[active] : undefined;

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery('');
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect && typeof window !== 'undefined') setDropUp(window.innerHeight - rect.bottom < 300 && rect.top > 300);
    const index = options.findIndex((o) => o.value === value);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }, [options, value]);

  const choose = useCallback(
    (v: string) => {
      onChange(v);
      close(true);
    },
    [onChange, close],
  );

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  useEffect(() => {
    if (open && searchable) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable]);

  useEffect(() => {
    if (!open || active < 0) return;
    const item = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[active];
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close(true);
        return;
      case 'Tab':
        close(false);
        return;
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => (filtered.length ? (i + 1) % filtered.length : -1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : -1));
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(filtered.length - 1);
        return;
      case 'Enter':
        e.preventDefault();
        if (activeOption) choose(activeOption.value);
        return;
      case ' ':
        if (!searchable) {
          e.preventDefault();
          if (activeOption) choose(activeOption.value);
        }
        return;
      default:
        if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
          const key = e.key.toLowerCase();
          const start = active + 1;
          const order = [...filtered.slice(start), ...filtered.slice(0, start)];
          const hit = order.find((o) => o.label.toLowerCase().startsWith(key));
          if (hit) setActive(filtered.indexOf(hit));
        }
    }
  }

  const describedBy = error || hint ? messageId : undefined;

  return (
    <div
      ref={rootRef}
      className={cn('flex w-full min-w-0 flex-col gap-2', className)}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (onBlur && !rootRef.current?.contains(e.relatedTarget as Node | null)) onBlur();
      }}
    >
      <span id={labelId} className={cn('text-[0.875rem] font-medium', dark ? 'text-white/85' : 'text-ag-ink', hideLabel && 'sr-only')}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-labelledby={`${labelId} ${id}`}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open && !searchable && activeOption ? optionId(activeOption.value) : undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        className={cn(
          'flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl px-4 text-left text-[1rem] outline-none transition-[box-shadow,background-color] duration-150',
          dark
            ? 'bg-white/5 text-white ring-1 ring-white/15 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ag-gold'
            : 'bg-white text-ag-ink ring-1 ring-ag-ink/15 hover:ring-ag-ink/30 focus-visible:ring-2 focus-visible:ring-ag-violet',
          open && (dark ? 'ring-2 ring-ag-gold' : 'ring-2 ring-ag-violet'),
          error && 'ring-2 ring-[#C2361F]',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && (dark ? 'text-white/50' : 'text-ag-mist'))}>{selected ? selected.label : placeholder}</span>
        <ChevronDown aria-hidden="true" size={18} className={cn('shrink-0 transition-transform duration-200 motion-reduce:transition-none', dark ? 'text-white/60' : 'text-ag-mist', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute left-0 right-0 z-50 overflow-hidden rounded-2xl p-1.5 shadow-[0_24px_60px_-20px_rgba(23,19,58,0.45)]',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            dark ? 'bg-ag-night-2 ring-1 ring-white/10' : 'bg-white ring-1 ring-ag-ink/10',
          )}
        >
          {searchable ? (
            <div className="relative p-1">
              <Search aria-hidden="true" size={16} className={cn('pointer-events-none absolute left-4 top-1/2 -translate-y-1/2', dark ? 'text-white/50' : 'text-ag-mist')} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                role="combobox"
                aria-label={`Search ${label}`}
                aria-controls={listboxId}
                aria-expanded="true"
                aria-autocomplete="list"
                aria-activedescendant={activeOption ? optionId(activeOption.value) : undefined}
                placeholder="Type to search"
                className={cn(
                  'h-11 w-full rounded-xl pl-9 pr-3 text-[0.9375rem] outline-none',
                  dark ? 'bg-white/5 text-white placeholder:text-white/40 ring-1 ring-white/10 focus:ring-ag-gold' : 'bg-ag-haze text-ag-ink placeholder:text-ag-mist ring-1 ring-transparent focus:ring-ag-violet',
                )}
              />
            </div>
          ) : null}
          <ul ref={listRef} id={listboxId} role="listbox" aria-labelledby={labelId} className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <li className={cn('px-3 py-3 text-[0.9375rem]', dark ? 'text-white/60' : 'text-ag-mist')}>Nothing matches that.</li>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === active;
                return (
                  <li
                    key={o.value}
                    id={optionId(o.value)}
                    role="option"
                    aria-selected={isSelected}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => choose(o.value)}
                    onPointerMove={() => setActive(i)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[0.9375rem]',
                      dark ? 'text-white' : 'text-ag-ink',
                      isActive && (dark ? 'bg-white/10' : 'bg-ag-haze'),
                      isSelected && 'font-semibold',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block">{o.label}</span>
                      {o.hint ? <span className={cn('block text-[0.8125rem] font-normal', dark ? 'text-white/60' : 'text-ag-mist')}>{o.hint}</span> : null}
                    </span>
                    {isSelected ? <Check aria-hidden="true" size={16} className={cn('shrink-0', dark ? 'text-ag-gold' : 'text-ag-violet')} /> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
      </div>

      {error ? (
        // Tied to the trigger by aria-describedby and aria-invalid; no role="alert", so a form-level alert isn't doubled.
        <p id={messageId} className={cn('flex items-start gap-1.5 text-[0.875rem] font-medium', dark ? 'text-[#FF9C8F]' : 'text-[#C2361F]')}>
          <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={messageId} className={cn('text-[0.875rem]', dark ? 'text-white/60' : 'text-ag-mist')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
