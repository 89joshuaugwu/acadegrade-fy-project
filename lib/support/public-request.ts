import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN, type SupportCategory } from './tickets';

/**
 * Public support requests (POST /api/support/public): for people who cannot sign in
 * (support.md §8, BUILD_BRIEF §2). Stored in `support_tickets` with `uid: null` and
 * `source: 'public'`; the admin replies by email only. Pure; safe on the client.
 */
export const PUBLIC_SUPPORT_CATEGORIES = ['account', 'privacy', 'other'] as const satisfies readonly SupportCategory[];
export type PublicSupportCategory = typeof PUBLIC_SUPPORT_CATEGORIES[number];

export const PUBLIC_SUPPORT_NAME_MAX = 80;
export const PUBLIC_SUPPORT_EMAIL_MAX = 254;
/** The hidden form field. People never see it; simple bots fill it in. */
export const PUBLIC_SUPPORT_HONEYPOT_FIELD = 'website';

export interface PublicSupportRequest {
  name: string | null;
  email: string;
  category: PublicSupportCategory;
  message: string;
  route: string;
  /** True when the hidden field was filled: answer as if sent, store nothing. */
  honeypot: boolean;
}

export class PublicSupportValidationError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePublicSupportRequest(body: unknown): PublicSupportRequest {
  const value = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};

  const trap = value[PUBLIC_SUPPORT_HONEYPOT_FIELD];
  const honeypot = typeof trap === 'string' ? trap.trim().length > 0 : trap !== undefined && trap !== null && trap !== false;

  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  if (!email || email.length > PUBLIC_SUPPORT_EMAIL_MAX || !EMAIL.test(email)) {
    throw new PublicSupportValidationError('Enter the email address we should reply to');
  }
  if (!PUBLIC_SUPPORT_CATEGORIES.includes(value.category as PublicSupportCategory)) {
    throw new PublicSupportValidationError('Choose what your request is about');
  }
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  if (message.length < SUPPORT_MESSAGE_MIN || message.length > SUPPORT_MESSAGE_MAX) {
    throw new PublicSupportValidationError(`Describe the problem in ${SUPPORT_MESSAGE_MIN} to ${SUPPORT_MESSAGE_MAX} characters`);
  }

  let name: string | null = null;
  if (value.name !== undefined && value.name !== null) {
    if (typeof value.name !== 'string') throw new PublicSupportValidationError('Name must be text');
    const trimmed = value.name.trim();
    if (trimmed.length > PUBLIC_SUPPORT_NAME_MAX) throw new PublicSupportValidationError(`Keep your name under ${PUBLIC_SUPPORT_NAME_MAX} characters`);
    name = trimmed || null;
  }

  let route = '/support';
  if (value.route !== undefined && value.route !== null) {
    const candidate = typeof value.route === 'string' ? value.route.trim() : '';
    if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.length > 120) {
      throw new PublicSupportValidationError('Unknown page');
    }
    route = candidate;
  }

  return { name, email, category: value.category as PublicSupportCategory, message, route, honeypot };
}
