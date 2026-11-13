/**
 * Tolerant reading of `GET /api/admin/audit`. The endpoint is new, so this
 * accepts the shapes it is likely to use and never throws on an odd entry.
 */

export interface AuditChange {
  /** The changed key, or '' when the whole value changed. */
  key: string;
  before: string;
  after: string;
}

export interface AuditEntry {
  id: string;
  /** ISO time, or null when the entry has no readable time. */
  at: string | null;
  actor: string;
  action: string;
  target: string;
  details: string;
  /** Keys whose value differs between `before` and `after`. */
  changes: AuditChange[];
}

export interface AuditPage {
  entries: AuditEntry[];
  nextCursor: string | null;
}

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);

function readTime(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (isRecord(value)) {
    // Firestore Timestamp, serialised by either SDK.
    const seconds = typeof value.seconds === 'number' ? value.seconds : typeof value._seconds === 'number' ? value._seconds : null;
    if (seconds !== null) return new Date(seconds * 1000).toISOString();
  }
  return null;
}

/** A short readable form of a string or a small object. */
function readText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(readText).filter(Boolean).join(', ');
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${key}: ${isRecord(item) || Array.isArray(item) ? JSON.stringify(item) : String(item)}`)
      .join(' · ');
  }
  return '';
}

function shortValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function readChanges(before: unknown, after: unknown): AuditChange[] {
  if (isRecord(before) || isRecord(after)) {
    const from = isRecord(before) ? before : {};
    const to = isRecord(after) ? after : {};
    return [...new Set([...Object.keys(from), ...Object.keys(to)])]
      .filter((key) => JSON.stringify(from[key]) !== JSON.stringify(to[key]))
      .map((key) => ({ key, before: shortValue(from[key]), after: shortValue(to[key]) }));
  }
  if ((before ?? null) === null && (after ?? null) === null) return [];
  return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ key: '', before: shortValue(before), after: shortValue(after) }];
}

function readTarget(value: unknown): string {
  if (isRecord(value) && (typeof value.type === 'string' || typeof value.id === 'string')) {
    return [value.type, value.id].filter((part) => typeof part === 'string' && part).join(' ');
  }
  return readText(value);
}

function readActor(raw: Raw): string {
  const actor = raw.actorEmail ?? raw.actor ?? raw.email ?? raw.admin ?? raw.actorUid;
  if (isRecord(actor)) return readText(actor.email ?? actor.uid ?? actor);
  return readText(actor);
}

export function parseAuditPage(body: unknown): AuditPage {
  const value = isRecord(body) ? body : {};
  const list = Array.isArray(value.entries) ? value.entries : Array.isArray(value.items) ? value.items : [];
  const entries = list.filter(isRecord).map((raw, index): AuditEntry => ({
    id: readText(raw.id) || `entry-${index}`,
    at: readTime(raw.createdAtMs) ?? readTime(raw.createdAt ?? raw.at ?? raw.timestamp ?? raw.time),
    actor: readActor(raw),
    action: readText(raw.action ?? raw.type ?? raw.event),
    target: readTarget(raw.target ?? raw.resource ?? raw.path),
    details: readText(raw.summary ?? raw.details ?? raw.message),
    changes: readChanges(raw.before, raw.after),
  }));
  // The server's cursor is the last entry's `createdAtMs`.
  const cursor = value.nextCursor ?? value.cursor ?? null;
  const nextCursor = typeof cursor === 'number' && Number.isFinite(cursor) ? String(cursor) : typeof cursor === 'string' && cursor ? cursor : null;
  return { entries, nextCursor };
}

/** Only `limit`, `action` and `cursor` filter on the server. */
export function auditUrl({ action, cursor }: { action: string; cursor?: string | null }) {
  const params = new URLSearchParams({ limit: '50' });
  if (action.trim()) params.set('action', action.trim());
  if (cursor) params.set('cursor', cursor);
  return `/api/admin/audit?${params.toString()}`;
}
