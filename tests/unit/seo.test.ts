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
      'https://product.acadegrade.test/calculator',
      'https://product.acadegrade.test/about',
      'https://product.acadegrade.test/support',
      'https://product.acadegrade.test/privacy',
      'https://product.acadegrade.test/terms',
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
    ]));
  });
});

