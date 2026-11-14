export type LegalDocumentId = 'terms' | 'privacy';

export const LEGAL_DOCUMENT_IDS: readonly LegalDocumentId[] = ['terms', 'privacy'];

export const isLegalDocumentId = (value: unknown): value is LegalDocumentId => value === 'terms' || value === 'privacy';

/** The `config/legal` field that holds each document's current version. */
export const LEGAL_VERSION_FIELD: Record<LegalDocumentId, 'termsVersion' | 'privacyVersion'> = {
  terms: 'termsVersion',
  privacy: 'privacyVersion',
};

/**
 * The next version id: today's date (UTC) as YYYY-MM-DD, or YYYY-MM-DD.N when the
 * current version already starts with today's date, so ids stay unique and sortable.
 */
export function nextLegalVersion(current: string, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  if (!current.startsWith(today)) return today;
  const suffix = /^\d{4}-\d{2}-\d{2}\.(\d+)$/.exec(current);
  return `${today}.${suffix ? Number(suffix[1]) + 1 : 2}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `2026-11-13` becomes `13 November 2026`. Anything else is returned unchanged. */
export function formatLegalDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : iso;
}
