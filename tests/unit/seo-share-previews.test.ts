import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  vi.resetModules();
});

describe('shared transcript link previews', () => {
  it('are generic for every link: no Firestore read, no name, no figures', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { shareMetadataFor } = await import('@/app/(public)/share/[shareId]/metadata');

    const a = shareMetadataFor('full-open-link');
    const b = shareMetadataFor('pin-protected-link');
    const strip = (m: ReturnType<typeof shareMetadataFor>) =>
      JSON.stringify({ ...m, openGraph: { ...m.openGraph, url: undefined } });

    expect(strip(a)).toBe(strip(b));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(a)).not.toMatch(/CGPA|First Class|\d\.\d\d/);
  });

  it('stay out of search but keep a full rich preview', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test';
    const { shareMetadataFor } = await import('@/app/(public)/share/[shareId]/metadata');
    const meta = shareMetadataFor('abc 123');
    const og = meta.openGraph as Record<string, unknown>;

    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(og).toMatchObject({
      siteName: 'AcadeGrade',
      locale: 'en_NG',
      type: 'website',
      url: 'https://product.acadegrade.test/share/abc%20123',
    });
    expect(meta.alternates).toBeUndefined();
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('page metadata', () => {
  it('leaves images to each route opengraph-image file and keeps the site basics', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test';
    const { createPageMetadata } = await import('@/lib/seo/site');
    const meta = createPageMetadata({ title: 'About', description: 'About us.', path: '/about' });
    const og = meta.openGraph as Record<string, unknown>;

    expect(og.images).toBeUndefined();
    expect((meta.twitter as Record<string, unknown>).images).toBeUndefined();
    expect(og).toMatchObject({ siteName: 'AcadeGrade', locale: 'en_NG', url: 'https://product.acadegrade.test/about' });
    expect(meta.alternates).toEqual({ canonical: 'https://product.acadegrade.test/about' });
  });

  it('names the site in preview titles, which the title template does not reach', async () => {
    const { createPageMetadata } = await import('@/lib/seo/site');
    const meta = createPageMetadata({ title: 'About', description: 'About us.', path: '/about' });
    expect(meta.title).toBe('About');
    expect((meta.openGraph as Record<string, unknown>).title).toBe('About | AcadeGrade');
    expect((meta.twitter as Record<string, unknown>).title).toBe('About | AcadeGrade');
  });

  it('lets tool pages use their own generated image on X instead of a hand-written path', async () => {
    const { toolsMetadata } = await import('@/components/public/tools/seo');
    const meta = toolsMetadata({ title: 'Degree class checker', description: 'd', path: '/tools/degree-class-checker' });
    expect((meta.twitter as Record<string, unknown>).images).toBeUndefined();
  });
});

describe('site JSON-LD', () => {
  it('names the WebSite alongside the organisation and the app', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://product.acadegrade.test';
    const { getSiteJsonLd } = await import('@/lib/seo/site');
    const website = getSiteJsonLd(null).find((entry) => entry['@type'] === 'WebSite') as Record<string, unknown> | undefined;
    expect(website).toMatchObject({
      '@id': 'https://product.acadegrade.test/#website',
      name: 'AcadeGrade',
      url: 'https://product.acadegrade.test',
      inLanguage: 'en-NG',
      publisher: { '@id': 'https://product.acadegrade.test/#organization' },
    });
  });
});

describe('brand v2 share assets', () => {
  it('draws Open Graph images in Gold hour colours with local fonts only', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { OG_COLOURS, loadOgFonts } = await import('@/lib/public/og');

    expect(OG_COLOURS.night).toBe('#0E0B2B');
    expect(OG_COLOURS.gold).toBe('#FFB23F');
    const fonts = await loadOgFonts();
    expect(fonts.map((font) => font.name)).toEqual(expect.arrayContaining(['Bricolage Grotesque', 'Geist']));
    expect(fonts.every((font) => font.data.byteLength > 10_000)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prints a figure as written on its own scale (credits out of 9, an aggregate out of 100)', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { OgCard } = await import('@/lib/public/og');
    const credits = renderToStaticMarkup(OgCard({ headline: 'WAEC credit checker', figure: { value: 6, max: 9, text: '6', label: 'credits' } }));
    expect(credits).toContain('>6</span>');
    expect(credits).not.toContain('6.00');
    const cgpa = renderToStaticMarkup(OgCard({ headline: 'Degree class checker', figure: { value: 4.43, label: 'Second Class Upper' } }));
    expect(cgpa).toContain('>4.43</span>');
  });

  it('gives the installed app the Night theme colour', () => {
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'public/manifest.json'), 'utf8'));
    expect(manifest.theme_color).toBe('#0E0B2B');
    expect(manifest.background_color).toBe('#0E0B2B');
  });
});
