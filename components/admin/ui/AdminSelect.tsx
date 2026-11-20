'use client';

import { Select, type SelectProps } from '@/components/ui/Select';
import { cn } from '@/lib/utils/cn';

/**
 * The kit Select (custom listbox, never a native <select>) with an option to hide the visible label
 * while keeping it as the accessible name ("AI chat priority 1 provider"), for dense rows.
 * The combobox's accessible name is always `label`.
 */
export function AdminSelect({ label, hideLabel = false, className, ...props }: SelectProps & { label: string; hideLabel?: boolean }) {
  return <Select label={label} className={cn(hideLabel && '[&>label]:sr-only', className)} {...props} />;
}

/** Build Select options from plain values. */
export function optionsFrom(values: readonly (string | number)[], label: (value: string) => string = (value) => value) {
  return values.map((value) => ({ value: String(value), label: label(String(value)) }));
}
