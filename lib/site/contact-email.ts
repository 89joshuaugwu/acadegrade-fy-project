/**
 * Pure contact-email rules, shared by server pages, the public endpoint and
 * client components. Resolution order: the admin-managed
 * `config/about.contactEmail`, then `NEXT_PUBLIC_SUPPORT_EMAIL`, then nothing.
 * With nothing, pages link to /support instead of a mailto.
 */

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export const SUPPORT_PAGE_PATH = '/support';

export function normalizeContactEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function resolveContactEmail(sources: { configEmail?: unknown; envEmail?: unknown }): string | null {
  return normalizeContactEmail(sources.configEmail) ?? normalizeContactEmail(sources.envEmail);
}

/** The environment fallback, readable on both server and client. */
export function envContactEmail(): string | null {
  return normalizeContactEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}

export function contactHref(email: string | null | undefined, subject?: string): string {
  if (!email) return SUPPORT_PAGE_PATH;
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
