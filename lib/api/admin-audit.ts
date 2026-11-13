import 'server-only';

import { randomBytes } from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Append-only admin audit trail in `_admin_audit` (client rules deny all).
 * One record per admin change: actor, action, target and before/after
 * summaries. Secrets are stripped and large values are bounded.
 *
 * Writing never throws: the change has already happened, so a failed audit
 * write is logged (action only) rather than turned into an error response.
 */
export interface AdminAuditInput {
  actorEmail: string;
  actorUid?: string;
  /** Dotted, stable id such as `settings.update` or `users.disable`. */
  action: string;
  /** What changed, e.g. `config/settings.maintenanceMode` or `users/{uid}`. */
  target: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
}

const SECRET_KEY = /^(password|app_?password|api_?key|secret|client_?secret|private_?key|ciphertext|iv|tag|token|id_?token|access_?token|refresh_?token|signature|authorization)$/i;
const MAX_STRING = 500;
const MAX_ARRAY = 50;
const MAX_DEPTH = 5;

export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (value instanceof Date) return value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SECRET_KEY.test(key))
      .map(([key, item]) => [key, sanitizeAuditValue(item, depth + 1)]));
  }
  return String(value).slice(0, MAX_STRING);
}

export async function writeAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    const now = new Date();
    const id = `${now.getTime()}-${randomBytes(6).toString('hex')}`;
    await adminDb.collection('_admin_audit').doc(id).create({
      actorUid: input.actorUid ?? null,
      actorEmail: input.actorEmail.trim().toLowerCase(),
      action: input.action,
      target: input.target,
      summary: input.summary ? String(input.summary).slice(0, MAX_STRING) : null,
      before: sanitizeAuditValue(input.before),
      after: sanitizeAuditValue(input.after),
      createdAt: now,
      createdAtMs: now.getTime(),
    });
  } catch {
    console.warn('[admin audit] write failed', { action: input.action });
  }
}
