'use client';

import { useEffect, useState } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils/cn';

const themeChoices = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const;

export interface ThemeControlProps {
  className?: string;
  compact?: boolean;
  'aria-label'?: string;
}

export function ThemeControl({
  className,
  compact = false,
  'aria-label': ariaLabel = 'Choose colour theme',
}: ThemeControlProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedTheme = mounted ? theme ?? 'system' : 'system';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={!mounted}
      className={cn(
        'inline-grid min-h-12 grid-cols-3 items-stretch rounded-[var(--radius-control)]',
        'border border-[var(--acade-border)] bg-[var(--acade-overlay)] p-1',
        compact ? 'w-[9.75rem]' : 'w-[16.5rem]',
        className
      )}
    >
      {themeChoices.map(({ value, label, icon: Icon }) => {
        const selected = selectedTheme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={compact ? label : undefined}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2',
              'text-xs font-semibold transition-[background-color,color,box-shadow] duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
              selected
                ? 'bg-[var(--acade-deep)] text-[var(--acade-text)] shadow-[var(--shadow-card)]'
                : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]',
              !mounted && 'cursor-default'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
