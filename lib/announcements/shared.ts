/**
 * Announcements (G1), shared by the admin editor, the server and the student
 * inbox/banner. Client-safe: no server imports.
 *
 * `announcements/{id}`:
 *   { title ≤ 80, body ≤ 500, linkUrl | null (https, or an app path starting with "/"),
 *     audience: { universities?: string[] ≤ 5; levels?: number[] ≤ 5 },
 *     startsAt, endsAt | null, status: 'draft'|'scheduled'|'published'|'archived',
 *     showAsBanner, push, sentAt | null, createdBy, createdAt, updatedAt }
 * Clients may read only published ones (firestore.rules).
 */
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface AnnouncementAudienceInput {
  universities?: string[];
  levels?: number[];
}

export interface AnnouncementFields {
  title: string;
  body: string;
  linkUrl: string | null;
  audience: AnnouncementAudienceInput;
  startsAt: Date;
  endsAt: Date | null;
  showAsBanner: boolean;
  push: boolean;
}

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_BODY_MAX = 500;
export const ANNOUNCEMENT_AUDIENCE_MAX = 5;
export const ANNOUNCEMENTS_READ_KEY = (uid: string) => `acadegrade:announcements-read:v1:${uid}`;

export class AnnouncementValidationError extends Error {}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const stamp = value as { toDate?: () => Date; toMillis?: () => number };
  if (typeof stamp.toMillis === 'function') return new Date(stamp.toMillis());
  if (typeof stamp.toDate === 'function') return stamp.toDate();
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date : null;
}

export const announcementTime = (value: unknown): number | null => toDate(value)?.getTime() ?? null;

/** https://… or an in-app path such as /results (never protocol-relative //…). */
export function isAllowedAnnouncementLink(value: string): boolean {
  if (value.length > 300) return false;
  if (value.startsWith('/')) return !value.startsWith('//') && !value.includes('\\');
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates the editable fields. `now` fills a missing start time. */
export function parseAnnouncementFields(input: unknown, now: number): AnnouncementFields {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!title || title.length > ANNOUNCEMENT_TITLE_MAX) throw new AnnouncementValidationError(`Title must be 1 to ${ANNOUNCEMENT_TITLE_MAX} characters`);
  const body = typeof value.body === 'string' ? value.body.trim() : '';
  if (!body || body.length > ANNOUNCEMENT_BODY_MAX) throw new AnnouncementValidationError(`Message must be 1 to ${ANNOUNCEMENT_BODY_MAX} characters`);

  let linkUrl: string | null = null;
  if (typeof value.linkUrl === 'string' && value.linkUrl.trim()) {
    linkUrl = value.linkUrl.trim();
    if (!isAllowedAnnouncementLink(linkUrl)) throw new AnnouncementValidationError('Link must start with https:// or be an app path such as /results');
  } else if (value.linkUrl !== undefined && value.linkUrl !== null && value.linkUrl !== '') {
    throw new AnnouncementValidationError('Link must be text');
  }

  const audienceValue = value.audience && typeof value.audience === 'object' ? value.audience as Record<string, unknown> : {};
  const universities = Array.isArray(audienceValue.universities)
    ? [...new Set(audienceValue.universities.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))]
    : [];
  const levels = Array.isArray(audienceValue.levels) ? [...new Set(audienceValue.levels.map(Number))] : [];
  if (universities.length > ANNOUNCEMENT_AUDIENCE_MAX || levels.length > ANNOUNCEMENT_AUDIENCE_MAX) {
    throw new AnnouncementValidationError(`Choose at most ${ANNOUNCEMENT_AUDIENCE_MAX} universities and ${ANNOUNCEMENT_AUDIENCE_MAX} levels`);
  }
  if (universities.some((name) => name.length > 120)) throw new AnnouncementValidationError('University names must be at most 120 characters');
  if (levels.some((level) => !Number.isInteger(level) || level < 100 || level > 1000)) throw new AnnouncementValidationError('Levels must be whole numbers such as 100 or 300');
  if (universities.length + levels.length > ANNOUNCEMENT_AUDIENCE_MAX) {
    throw new AnnouncementValidationError(`A push can target at most ${ANNOUNCEMENT_AUDIENCE_MAX} universities and levels combined`);
  }

  const startsAt = value.startsAt === undefined || value.startsAt === null || value.startsAt === '' ? new Date(now) : toDate(value.startsAt);
  if (!startsAt) throw new AnnouncementValidationError('Start time is not a valid date');
  const endsAt = toDate(value.endsAt);
  if (value.endsAt !== undefined && value.endsAt !== null && value.endsAt !== '' && !endsAt) throw new AnnouncementValidationError('End time is not a valid date');
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) throw new AnnouncementValidationError('End time must be after the start time');

  return {
    title,
    body,
    linkUrl,
    audience: {
      ...(universities.length ? { universities } : {}),
      ...(levels.length ? { levels } : {}),
    },
    startsAt,
    endsAt,
    showAsBanner: value.showAsBanner === true,
    push: value.push === true,
  };
}

/** Published, started and not ended (server time is UTC; compare epoch ms). */
export function isAnnouncementActive(data: { status?: unknown; startsAt?: unknown; endsAt?: unknown }, now: number): boolean {
  if (data.status !== 'published') return false;
  const starts = announcementTime(data.startsAt);
  const ends = announcementTime(data.endsAt);
  return (starts === null || starts <= now) && (ends === null || ends > now);
}

/** Client-side audience check. An empty audience is everyone. */
export function announcementMatchesProfile(
  audience: AnnouncementAudienceInput | null | undefined,
  profile: { university?: unknown; currentLevel?: unknown } | null | undefined,
): boolean {
  const universities = audience?.universities ?? [];
  const levels = audience?.levels ?? [];
  const university = typeof profile?.university === 'string' ? profile.university.trim().toLowerCase() : '';
  const level = Number(profile?.currentLevel);
  if (universities.length && !universities.some((name) => name.trim().toLowerCase() === university)) return false;
  if (levels.length && !levels.includes(level)) return false;
  return true;
}
