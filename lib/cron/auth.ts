import { timingSafeEqual } from 'node:crypto';

const MIN_SECRET_LENGTH = 16;

/**
 * True only when the request carries `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron sends that header automatically when CRON_SECRET is set. A missing or
 * too-short secret refuses everything, so a misconfigured server is never open.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return false;

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;

  const supplied = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  // timingSafeEqual needs equal lengths; a length mismatch is a plain rejection.
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
