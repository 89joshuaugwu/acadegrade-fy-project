/**
 * Support requests (`support_tickets/{id}`, server-only). Text only, no
 * attachments. Closed tickets are purged 180 days after closing by the daily
 * cron (`supportRetentionJob`).
 */
export const SUPPORT_CATEGORIES = ['bug', 'account', 'grades', 'ai', 'ads', 'privacy', 'other'] as const;
export type SupportCategory = typeof SUPPORT_CATEGORIES[number];
export const SUPPORT_PLATFORMS = ['web', 'android'] as const;
export type SupportPlatform = typeof SUPPORT_PLATFORMS[number];
export type SupportStatus = 'open' | 'waiting' | 'closed';

export const SUPPORT_MESSAGE_MIN = 10;
export const SUPPORT_MESSAGE_MAX = 2000;
export const SUPPORT_REPLY_MAX = 2000;
export const SUPPORT_MAX_REPLIES = 20;
export const SUPPORT_PURGE_AFTER_MS = 180 * 24 * 60 * 60 * 1000;
export const SUPPORT_STUDENT_LIST_LIMIT = 20;

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: 'Something is broken',
  account: 'My account or sign-in',
  grades: 'Grades or CGPA',
  ai: 'AI features',
  ads: 'Ads or coins',
  privacy: 'Privacy or my data',
  other: 'Something else',
};

export interface SupportTicketInput {
  category: SupportCategory;
  message: string;
  platform: SupportPlatform;
  appVersion: string | null;
  route: string | null;
}

export class SupportValidationError extends Error {}

function optionalText(value: unknown, max: number, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new SupportValidationError(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new SupportValidationError(`${field} must be at most ${max} characters`);
  return trimmed || null;
}

/** Validates a POST /api/support/tickets body. Throws SupportValidationError with a readable message. */
export function parseSupportTicket(body: unknown): SupportTicketInput {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  if (!SUPPORT_CATEGORIES.includes(value.category as SupportCategory)) throw new SupportValidationError('Choose what your request is about');
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  if (message.length < SUPPORT_MESSAGE_MIN || message.length > SUPPORT_MESSAGE_MAX) {
    throw new SupportValidationError(`Describe the problem in ${SUPPORT_MESSAGE_MIN} to ${SUPPORT_MESSAGE_MAX} characters`);
  }
  if (!SUPPORT_PLATFORMS.includes(value.platform as SupportPlatform)) throw new SupportValidationError('Unknown platform');
  return {
    category: value.category as SupportCategory,
    message,
    platform: value.platform as SupportPlatform,
    appVersion: optionalText(value.appVersion, 32, 'appVersion'),
    route: optionalText(value.route, 120, 'route'),
  };
}

export function toIsoTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const stamp = value as { toDate?: () => Date };
  const date = value instanceof Date ? value : typeof stamp.toDate === 'function' ? stamp.toDate() : new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/** What the student sees: no uid, email or admin identities. */
export function studentTicketView(id: string, data: Record<string, unknown>) {
  const replies = Array.isArray(data.replies) ? data.replies as Record<string, unknown>[] : [];
  return {
    id,
    category: data.category,
    message: data.message,
    status: data.status,
    platform: data.platform,
    createdAt: toIsoTime(data.createdAt),
    updatedAt: toIsoTime(data.updatedAt),
    closedAt: toIsoTime(data.closedAt),
    replies: replies.map((reply) => ({ message: reply.message, at: toIsoTime(reply.at) })),
  };
}
