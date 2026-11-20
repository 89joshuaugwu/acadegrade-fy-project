'use client';

import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A styled choose-or-drop control over a hidden <input type="file">. `onChange` receives the real
 * input's change event (dropped files are set on the input first), so existing upload handlers work
 * unchanged. The visible text names the input.
 */
export function FilePicker({
  buttonLabel = 'Choose file',
  hint,
  accept,
  onChange,
  disabled,
  multiple,
  id,
  name,
  className,
  compact = false,
  icon,
}: {
  /** The action words; also the input's accessible name. */
  buttonLabel?: string;
  hint?: ReactNode;
  accept?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  multiple?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** A single-line button instead of a drop area. */
  compact?: boolean;
  icon?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const input = inputRef.current;
    if (!input || disabled || !event.dataTransfer?.files?.length) return;
    try {
      input.files = event.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {
      // Some browsers refuse to set files programmatically; choosing still works.
    }
  };

  return (
    <label
      onDragOver={(event) => { if (!disabled) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'group flex min-h-11 max-w-full cursor-pointer items-center gap-3 rounded-[12px] border text-sm transition-colors',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)]',
        compact
          ? 'inline-flex border-[var(--acade-border)] bg-[var(--acade-surface)] px-4 font-semibold text-[var(--acade-text)] hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]'
          : 'border-dashed border-[var(--acade-control-border)] bg-[var(--acade-deep)] px-4 py-3 hover:border-[var(--acade-primary)]',
        dragging && 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span aria-hidden="true" className={cn('shrink-0', compact ? 'text-current' : 'flex size-9 items-center justify-center rounded-[10px] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]')}>
        {icon ?? <UploadCloud className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className={cn('block', !compact && 'font-semibold text-[var(--acade-primary)]')}>{buttonLabel}</span>
        {hint && !compact ? <span className="block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}
