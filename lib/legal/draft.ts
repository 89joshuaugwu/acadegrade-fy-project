import { parseLegalMarkup } from './markup';

export interface LegalDraftInput {
  title: string;
  summary: string;
  /** YYYY-MM-DD */
  effectiveDate: string;
  body: string;
  changeNote: string;
}

export type LegalDraftResult =
  | { ok: true; draft: LegalDraftInput }
  | { ok: false; error: string; issues?: string[] };

export const LEGAL_BODY_MAX = 60_000;
const ALLOWED_KEYS = new Set(['title', 'summary', 'effectiveDate', 'body', 'changeNote']);
const DAY_MS = 86_400_000;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A real calendar date in YYYY-MM-DD form (so 2026-02-31 is rejected). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && isoDay(date.getTime()) === value;
}

const text = (value: unknown) => (typeof value === 'string' ? value : null);

/**
 * Validates a legal text draft from the admin editor. Markup problems are returned
 * as `issues` so the editor can list them next to the preview.
 */
export function validateLegalDraft(input: unknown, now: number = Date.now()): LegalDraftResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Send the draft as a JSON object.' };
  const record = input as Record<string, unknown>;
  const unknown = Object.keys(record).find((key) => !ALLOWED_KEYS.has(key));
  if (unknown) return { ok: false, error: `Unsupported field "${unknown}".` };

  const title = text(record.title)?.trim() ?? null;
  const summary = record.summary === undefined ? '' : text(record.summary)?.trim() ?? null;
  const effectiveDate = text(record.effectiveDate)?.trim() ?? null;
  const body = text(record.body);
  const changeNote = record.changeNote === undefined ? '' : text(record.changeNote)?.trim() ?? null;

  if (title === null || title.length < 2 || title.length > 120) return { ok: false, error: 'The title must be 2 to 120 characters.' };
  if (summary === null || summary.length > 400) return { ok: false, error: 'The summary must be at most 400 characters.' };
  if (effectiveDate === null || !isCalendarDate(effectiveDate)) return { ok: false, error: 'The effective date must be a real date written as YYYY-MM-DD.' };
  if (effectiveDate < isoDay(now - DAY_MS)) return { ok: false, error: 'The effective date cannot be earlier than yesterday.' };
  if (body === null || !body.trim()) return { ok: false, error: 'The text cannot be empty.' };
  if (body.length > LEGAL_BODY_MAX) return { ok: false, error: `The text is too long (the limit is ${LEGAL_BODY_MAX.toLocaleString('en-GB')} characters).` };
  if (changeNote === null || changeNote.length > 300) return { ok: false, error: 'The change note must be at most 300 characters.' };

  const { issues } = parseLegalMarkup(body);
  if (issues.length > 0) return { ok: false, error: 'The text has formatting problems. Fix them and try again.', issues };

  return { ok: true, draft: { title, summary, effectiveDate, body, changeNote } };
}
