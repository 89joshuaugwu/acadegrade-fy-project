import type { DisplayStatus } from '@/lib/timetable/format';

export const DISPLAY_STATUS_STYLE: Record<DisplayStatus, string> = {
  active: 'border-[var(--acade-success)]/30 bg-[var(--acade-success)]/12 text-[var(--acade-success)]',
  ending_soon: 'border-[var(--acade-warning)]/30 bg-[var(--acade-warning)]/12 text-[var(--acade-warning)]',
  expired: 'border-[var(--acade-danger)]/30 bg-[var(--acade-danger)]/12 text-[var(--acade-danger)]',
  archived: 'border-[var(--acade-border)] bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]',
};
