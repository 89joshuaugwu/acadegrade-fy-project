'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

interface IconActionBase {
  /** Verb-first name, shown in the tooltip and used as the accessible name. */
  label: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger';
  /** Where the tooltip sits against the button; use "end" for the last button in a row. */
  align?: 'center' | 'end';
  className?: string;
}

type IconActionProps = IconActionBase &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label' | 'children' | 'className'>)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'className'>)
  );

const CONTROL =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border transition-colors duration-150 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

/**
 * A square 44px icon button (or link) with a real tooltip on hover and keyboard
 * focus. The tooltip repeats the accessible name, so it is hidden from screen readers.
 */
export const IconAction = forwardRef<HTMLElement, IconActionProps>(function IconAction(
  { label, icon, tone = 'default', align = 'center', className, ...rest },
  ref,
) {
  const tipId = useId();
  const look = cn(
    CONTROL,
    tone === 'danger'
      ? 'border-transparent text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)]'
      : 'border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text)] hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  );
  const content = <span aria-hidden="true" className="flex">{icon}</span>;

  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {'href' in rest && rest.href !== undefined ? (
        <a ref={ref as React.Ref<HTMLAnchorElement>} aria-label={label} className={look} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {content}
        </a>
      ) : (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          aria-label={label}
          className={look}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {content}
        </button>
      )}
      <span
        id={tipId}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-[calc(100%+6px)] z-20 whitespace-nowrap rounded-lg bg-[var(--acade-text)] px-2.5 py-1.5 text-[0.8125rem] font-medium text-[var(--acade-surface)] shadow-[var(--shadow-popover)]',
          'translate-y-1 opacity-0 transition duration-150 motion-reduce:transition-none',
          'group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:translate-y-0 group-has-[:focus-visible]/tip:opacity-100',
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        )}
      >
        {label}
      </span>
    </span>
  );
});
