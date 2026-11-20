'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * One button shape, decided once: square, filled ink, paper text, 52px
 * (44px small). Hover raises a 4px stripe inside; press moves 1px; focus is
 * the gold outline. On ink or violet fields use tone="paper". One primary
 * action per screen; secondary actions are TextLinks.
 */

export type ButtonTone = 'ink' | 'paper';
export type ButtonSize = 'md' | 'sm';

interface CommonProps {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  /** Shows a spinner at the right; the label and width stay. */
  busy?: boolean;
  className?: string;
  children: ReactNode;
}

function classes({ tone = 'ink', size = 'md', block }: Pick<CommonProps, 'tone' | 'size' | 'block'>, className?: string) {
  return cn('pg-btn', tone === 'paper' && 'pg-btn--paper', size === 'sm' && 'pg-btn--sm', block && 'pg-btn--block', className);
}

function Inner({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <>
      <span className="pg-btn__label">{children}</span>
      {busy ? <span className="pg-spinner" aria-hidden="true" /> : null}
      <span className="pg-btn__stripe" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
    </>
  );
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

/**
 * A real <button>. `disabled` is rendered as aria-disabled so the button stays
 * focusable and explains itself; clicks are swallowed while disabled or busy.
 */
export function Button({ tone, size, block, busy = false, disabled, className, children, onClick, type = 'button', ...rest }: ButtonProps) {
  const inert = Boolean(disabled) || busy;
  return (
    <button
      type={type}
      className={classes({ tone, size, block }, className)}
      aria-disabled={inert ? true : undefined}
      aria-busy={busy ? true : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (inert) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <Inner busy={busy}>{children}</Inner>
    </button>
  );
}

type LinkButtonProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> & {
    href: string;
    /** Use a plain <a> (downloads, external, route handlers that redirect). */
    external?: boolean;
    prefetch?: boolean;
  };

/** A link that looks like the primary button (Get started, Download for Android). */
export function LinkButton({ tone, size, block, busy, className, children, href, external = false, prefetch, ...rest }: LinkButtonProps) {
  const cls = classes({ tone, size, block }, className);
  if (external) {
    return (
      <a href={href} className={cls} {...rest}>
        <Inner busy={busy}>{children}</Inner>
      </a>
    );
  }
  return (
    <Link href={href} className={cls} prefetch={prefetch} {...rest}>
      <Inner busy={busy}>{children}</Inner>
    </Link>
  );
}
