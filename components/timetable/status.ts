import type { DisplayStatus } from '@/lib/timetable/format';
import type { EventType } from '@/lib/timetable/engine';

export const DISPLAY_STATUS_STYLE: Record<DisplayStatus, string> = {
  active: 'border-[var(--acade-success)]/25 bg-[var(--acade-success-dim)] text-[var(--acade-success)]',
  ending_soon: 'border-[var(--acade-gold)]/30 bg-[var(--acade-gold-dim)] text-[var(--acade-gold)]',
  expired: 'border-[var(--acade-danger)]/25 bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]',
  archived: 'border-[var(--acade-border)] bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]',
};

/** Colour of an event type: a CSS colour used for the accent bar and the type label. */
export const EVENT_TYPE_COLOUR: Record<EventType, string> = {
  lecture: 'var(--acade-primary)',
  class: 'var(--acade-info)',
  exam: 'var(--acade-gold)',
  study: 'var(--acade-success)',
  other: 'var(--acade-text-faint)',
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  lecture: 'Lecture',
  class: 'Class',
  exam: 'Exam',
  study: 'Study session',
  other: 'Other',
};
