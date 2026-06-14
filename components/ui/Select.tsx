'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Custom Select dropdown — fully custom, not native <select>.
 *
 * Features:
 * - Searchable variant with input filtering
 * - Min 48px touch targets on all options
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - AnimatePresence dropdown open/close
 * - Reduced motion support
 */
function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  searchable = false,
  disabled = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const shouldReduceMotion = useReducedMotion();

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen, searchable]);

  // Reset highlight on filter change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearch('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && filtered[highlightIndex]) {
            handleSelect(filtered[highlightIndex].value);
          }
          break;
      }
    },
    [isOpen, filtered, highlightIndex, handleSelect]
  );

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]"
        >
          {label}
        </label>
      )}

      <div className="relative" onKeyDown={handleKeyDown}>
        {/* Trigger button */}
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label ?? placeholder}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full h-12 px-4 rounded-xl flex items-center justify-between',
            'bg-[var(--acade-deep)] text-[var(--acade-text)]',
            'border border-[var(--acade-border)]',
            'text-[length:var(--text-base)] font-[family-name:var(--font-dm-sans)]',
            'transition-colors duration-150 cursor-pointer',
            'focus:outline-none focus:border-[var(--acade-primary)] focus:ring-2 focus:ring-[var(--acade-primary)]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--acade-danger)]',
            isOpen && 'border-[var(--acade-primary)] ring-2 ring-[var(--acade-primary)]/20'
          )}
        >
          <span className={cn(!selectedOption && 'text-[var(--acade-text-faint)]')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={18}
            className={cn(
              'shrink-0 text-[var(--acade-text-faint)] transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'absolute top-full left-0 right-0 mt-1',
                'bg-[var(--acade-surface)] border border-[var(--acade-border)]',
                'rounded-xl shadow-2xl overflow-hidden'
              )}
              style={{ zIndex: 'var(--z-dropdown)' } as React.CSSProperties}
            >
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-[var(--acade-border)]">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--acade-text-faint)]"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className={cn(
                        'w-full h-10 pl-9 pr-3 rounded-lg',
                        'bg-[var(--acade-deep)] text-[var(--acade-text)]',
                        'border border-[var(--acade-border-subtle)]',
                        'text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]',
                        'placeholder:text-[var(--acade-text-faint)]',
                        'focus:outline-none focus:border-[var(--acade-primary)]'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Options list */}
              <ul
                ref={listRef}
                role="listbox"
                className="max-h-60 overflow-y-auto py-1"
              >
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-[length:var(--text-sm)] text-[var(--acade-text-faint)] text-center">
                    No options found
                  </li>
                ) : (
                  filtered.map((option, index) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={option.value === value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'flex items-center justify-between px-4 h-12 cursor-pointer',
                        'text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]',
                        'transition-colors duration-75',
                        option.value === value
                          ? 'text-[var(--acade-primary)] bg-[var(--acade-primary)]/5'
                          : 'text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]',
                        index === highlightIndex && 'bg-[var(--acade-overlay)]'
                      )}
                    >
                      <span>{option.label}</span>
                      {option.value === value && (
                        <Check size={16} className="shrink-0 text-[var(--acade-primary)]" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            role="alert"
            className="text-[length:var(--text-xs)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Select };
export type { SelectProps, SelectOption };
