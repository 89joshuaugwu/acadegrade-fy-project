import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  aboutData: undefined as Record<string, unknown> | undefined,
  readError: null as Error | null,
  reads: 0,
}));

vi.mock('next/cache', () => ({
  // Pass-through: the cache wrapper is Next's job; these tests cover the resolution order.
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => {
          mocks.reads += 1;
          if (mocks.readError) throw mocks.readError;
          return { exists: mocks.aboutData !== undefined, data: () => mocks.aboutData };
        },
      }),
    }),
  },
}));

import { contactHref, normalizeContactEmail, resolveContactEmail } from '@/lib/site/contact-email';
import { getContactEmail } from '@/lib/site/contact';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

beforeEach(() => {
  mocks.aboutData = undefined;
  mocks.readError = null;
  mocks.reads = 0;
  delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = ORIGINAL_ENV;
});

describe('contact email resolution (pure)', () => {
  it('accepts only a plausible single address, trimmed and lower-cased', () => {
    expect(normalizeContactEmail('  Help@Example.ORG ')).toBe('help@example.org');
    expect(normalizeContactEmail('')).toBeNull();
    expect(normalizeContactEmail('not an email')).toBeNull();
    expect(normalizeContactEmail('a@b.co?subject=x')).toBeNull();
    expect(normalizeContactEmail(42)).toBeNull();
  });

  it('prefers the admin setting, then the environment, then nothing', () => {
    expect(resolveContactEmail({ configEmail: 'admin@example.org', envEmail: 'env@example.org' })).toBe('admin@example.org');
    expect(resolveContactEmail({ configEmail: '', envEmail: 'env@example.org' })).toBe('env@example.org');
    expect(resolveContactEmail({ configEmail: 'broken', envEmail: 'env@example.org' })).toBe('env@example.org');
    expect(resolveContactEmail({ configEmail: undefined, envEmail: undefined })).toBeNull();
  });

  it('links to a mailto when an address exists and to /support otherwise', () => {
    expect(contactHref('help@example.org', 'Privacy request')).toBe('mailto:help@example.org?subject=Privacy%20request');
    expect(contactHref('help@example.org')).toBe('mailto:help@example.org');
    expect(contactHref(null, 'Privacy request')).toBe('/support');
  });
});

describe('getContactEmail (server)', () => {
  it('1. uses config/about.contactEmail when the admin has set one', async () => {
    mocks.aboutData = { contactEmail: 'Team@Example.org' };
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'env@example.org';
    await expect(getContactEmail()).resolves.toBe('team@example.org');
  });

  it('2. falls back to NEXT_PUBLIC_SUPPORT_EMAIL when the admin value is missing', async () => {
    mocks.aboutData = { headline: 'x' };
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'env@example.org';
    await expect(getContactEmail()).resolves.toBe('env@example.org');
  });

  it('2. also falls back to the environment when Firestore cannot be read', async () => {
    mocks.readError = new Error('unavailable');
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'env@example.org';
    await expect(getContactEmail()).resolves.toBe('env@example.org');
  });

  it('3. returns null when neither is configured (pages then link to /support)', async () => {
    await expect(getContactEmail()).resolves.toBeNull();
  });

  it('never invents the old hard-coded address', async () => {
    await expect(getContactEmail()).resolves.not.toBe('support@acadegrade.com');
  });
});
