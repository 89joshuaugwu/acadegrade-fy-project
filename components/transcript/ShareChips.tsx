import { Clock, Eye, FileText, ImageIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ChipProps {
  icon?: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'warning';
  children: React.ReactNode;
}

/** A small fact about a link. Not interactive. */
export function Chip({ icon, tone = 'neutral', children }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[0.8125rem] font-medium leading-none',
        tone === 'brand' && 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)] ring-1 ring-inset ring-[var(--acade-primary)]/35',
        tone === 'warning' && 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]',
        tone === 'neutral' && 'bg-[var(--acade-surface)] text-[var(--acade-text)] ring-1 ring-inset ring-[var(--acade-border)]',
      )}
    >
      {icon ? <span aria-hidden="true" className="flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

export interface ShareChipFacts {
  expiry?: string | null;
  /** Full date for screen readers, e.g. "29 November 2026". */
  expiryDate?: string | null;
  summary?: boolean;
  pin?: boolean;
  photo?: boolean;
  views?: string | null;
}

/** The facts of one share link as a wrapping row of chips. */
export function ShareChips({ expiry, expiryDate, summary, pin, photo, views }: ShareChipFacts) {
  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Link details">
      {expiry ? (
        <li>
          <Chip icon={<Clock size={13} />} tone={expiry === 'Expired' ? 'warning' : 'neutral'}>
            {expiry}
            {expiryDate ? <span className="sr-only">{`, on ${expiryDate}`}</span> : null}
          </Chip>
        </li>
      ) : null}
      <li>
        <Chip icon={<FileText size={13} />}>{summary ? 'Summary' : 'Full transcript'}</Chip>
      </li>
      {pin ? (
        <li>
          <Chip icon={<Lock size={13} />} tone="brand">PIN</Chip>
        </li>
      ) : null}
      {photo ? (
        <li>
          <Chip icon={<ImageIcon size={13} />}>Photo</Chip>
        </li>
      ) : null}
      {views ? (
        <li>
          <Chip icon={<Eye size={13} />}>{views}</Chip>
        </li>
      ) : null}
    </ul>
  );
}
