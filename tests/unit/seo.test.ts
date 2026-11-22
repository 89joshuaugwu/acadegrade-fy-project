import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
  vi.resetModules();
});

describe('public search discovery', () => {
  it('publishes only canonical public-information routes in the sitemap', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test/';
    const { default: sitemap } = await import('@/app/sitemap');

    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      'https://product.acadegrade.test',
      'https://product.acadegrade.test/features',
      'https://product.acadegrade.test/features/result-scanner',
      'https://product.acadegrade.test/features/ai-insights',
      'https://product.acadegrade.test/features/timetable',
      'https://product.acadegrade.test/app',
      'https://product.acadegrade.test/app/download/ios',
      'https://product.acadegrade.test/calculator',
      'https://product.acadegrade.test/tools',
      'https://product.acadegrade.test/tools/degree-class-checker',
      'https://product.acadegrade.test/tools/required-gpa',
      'https://product.acadegrade.test/tools/carry-over-impact',
      'https://product.acadegrade.test/tools/weighted-average',
      'https://product.acadegrade.test/about',
      'https://product.acadegrade.test/support',
      'https://product.acadegrade.test/privacy',
      'https://product.acadegrade.test/terms',
      'https://product.acadegrade.test/account-deletion',
    ]);
    expect(urls.join(' ')).not.toMatch(/login|register|forgot-password|dashboard|admin/);
  });

  it('points robots at the configured canonical host and blocks private areas', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test/';
    const { default: robots } = await import('@/app/robots');

    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(result.host).toBe('https://product.acadegrade.test');
    expect(result.sitemap).toBe('https://product.acadegrade.test/sitemap.xml');
    expect(rules?.disallow).toEqual(expect.arrayContaining([
      '/api/',
      '/admin/',
      '/dashboard',
      '/login',
      '/register',
      '/forgot-password',
      '/maintenance',
      '/offline',
    ]));
    // Shared course lists and transcripts carry noindex in their HTML. Crawlers must be
    // allowed to fetch them to see it, and X will not show a card for a blocked URL.
    expect(rules?.disallow).not.toEqual(expect.arrayContaining(['/c/']));
    expect(rules?.disallow).not.toEqual(expect.arrayContaining(['/share/']));
  });
});


describe('site JSON-LD contact email', () => {
  it('publishes the configured address and omits email when none is configured', async () => {
    const previous = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    try {
      delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
      const { getSiteJsonLd } = await import('@/lib/seo/site');
      const organization = (ld: ReturnType<typeof getSiteJsonLd>) => ld.find((entry) => entry['@type'] === 'Organization') as Record<string, unknown>;

      expect(organization(getSiteJsonLd())).not.toHaveProperty('email');
      expect(organization(getSiteJsonLd(null))).not.toHaveProperty('email');
      expect(organization(getSiteJsonLd('Admin@Example.org')).email).toBe('admin@example.org');

      process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'env@example.org';
      expect(organization(getSiteJsonLd()).email).toBe('env@example.org');
      expect(JSON.stringify(getSiteJsonLd(null))).not.toContain('support@acadegrade.com');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
      else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = previous;
    }
  });
});
