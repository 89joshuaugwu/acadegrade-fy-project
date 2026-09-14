'use client';

import { cn } from '@/lib/utils/cn';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  className?: string;
  disabled?: boolean;
  'aria-label': string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-grid min-h-12 max-w-full auto-cols-fr grid-flow-col rounded-[var(--radius-control)]',
        'border border-[var(--acade-border)] bg-[var(--acade-overlay)] p-1',
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex min-h-10 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-3',
              'text-sm font-semibold transition-colors duration-150',
              selected
                ? 'bg-[var(--acade-deep)] text-[var(--acade-text)] shadow-[var(--shadow-card)]'
                : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]',
              (disabled || option.disabled) && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={ariaLabel}
              value={option.value}
              checked={selected}
              disabled={disabled || option.disabled}
              onChange={() => onValueChange(option.value)}
              className="peer absolute inset-0 opacity-0 focus-visible:outline-none"
            />
            <span className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--acade-primary)]" />
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
