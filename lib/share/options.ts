/**
 * Options for creating a transcript share link (POST /api/transcript/share).
 * Pure and safe to import on the client and the server.
 *
 * Every field is optional. Installed Android apps send only `{ showPhoto }`, and that
 * payload must keep today's behaviour: 30 days, every course row, no PIN.
 */

export const SHARE_EXPIRY_CHOICES = [1, 7, 30] as const;
export type ShareExpiryDays = (typeof SHARE_EXPIRY_CHOICES)[number];
export const DEFAULT_SHARE_EXPIRY_DAYS: ShareExpiryDays = 30;

export const SHARE_LEVELS = ['full', 'summary'] as const;
export type ShareLevel = (typeof SHARE_LEVELS)[number];

/** Header the viewer sends the PIN in. Never put the PIN in a URL or a request body. */
export const SHARE_PIN_HEADER = 'X-Share-Pin';

const PIN_PATTERN = /^\d{4,6}$/;

/** ASCII digits only (`\d` without the `u` flag), 4 to 6 of them. */
export function isValidPin(value: unknown): value is string {
  return typeof value === 'string' && PIN_PATTERN.test(value);
}

export interface ShareOptions {
  showPhoto: boolean;
  expiresInDays: ShareExpiryDays;
  level: ShareLevel;
  /** Plain PIN, only held long enough to hash it. */
  pin: string | null;
}

export type ShareOptionsError = 'INVALID_EXPIRY' | 'INVALID_LEVEL' | 'INVALID_PIN';

export type ParsedShareOptions =
  | { ok: true; value: ShareOptions }
  | { ok: false; code: ShareOptionsError; error: string };

/**
 * Reads the POST body. A missing or non-object body is today's default.
 * Messages never repeat the submitted values, so a rejected PIN is never echoed.
 */
export function parseShareOptions(body: unknown): ParsedShareOptions {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

  // Unchanged rule from before: anything other than an explicit `false` shows the photo.
  const showPhoto = input.showPhoto !== false;

  let expiresInDays: ShareExpiryDays = DEFAULT_SHARE_EXPIRY_DAYS;
  if (input.expiresInDays !== undefined) {
    if (!SHARE_EXPIRY_CHOICES.includes(input.expiresInDays as ShareExpiryDays)) {
      return { ok: false, code: 'INVALID_EXPIRY', error: 'expiresInDays must be 1, 7 or 30.' };
    }
    expiresInDays = input.expiresInDays as ShareExpiryDays;
  }

  let level: ShareLevel = 'full';
  if (input.level !== undefined) {
    if (!SHARE_LEVELS.includes(input.level as ShareLevel)) {
      return { ok: false, code: 'INVALID_LEVEL', error: "level must be 'full' or 'summary'." };
    }
    level = input.level as ShareLevel;
  }

  let pin: string | null = null;
  if (input.pin !== undefined) {
    if (!isValidPin(input.pin)) {
      return { ok: false, code: 'INVALID_PIN', error: 'The PIN must be 4 to 6 digits.' };
    }
    pin = input.pin;
  }

  return { ok: true, value: { showPhoto, expiresInDays, level, pin } };
}
