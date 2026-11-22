import { describe, expect, it } from 'vitest';
import { expiryChipLabel, parseShareInput, shortShareLink, viewsLabel } from '@/lib/share/link';

const HOSTS = ['acadegrade.vercel.app', 'localhost:3000'];
const parse = (input: string) => parseShareInput(input, { allowedHosts: HOSTS });

describe('parseShareInput', () => {
  it('reads a full share link on this site', () => {
    expect(parse('https://acadegrade.vercel.app/share/0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('accepts the local dev host and http', () => {
    expect(parse('http://localhost:3000/share/0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('reads a link pasted without the scheme, with www, a trailing slash, query or hash', () => {
    expect(parse('acadegrade.vercel.app/share/0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
    expect(parse('https://www.acadegrade.vercel.app/share/0a1b2c3d4e5f/')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
    expect(parse('https://acadegrade.vercel.app/share/0a1b2c3d4e5f?utm_source=whatsapp#top')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('treats the host case-insensitively', () => {
    expect(parse('HTTPS://AcadeGrade.Vercel.App/share/0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('strips spaces, quotes, angle brackets and sentence punctuation from a pasted message', () => {
    expect(parse('  <https://acadegrade.vercel.app/share/0a1b2c3d4e5f>.  ')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
    expect(parse('"0a1b2c3d4e5f",')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
    expect(parse('(https://acadegrade.vercel.app/share/0a1b2c3d4e5f)')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('accepts a bare id, including older Firestore-style ids', () => {
    expect(parse('0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
    expect(parse('Xy7_k2-PqRsTuVwXyZ12')).toEqual({ ok: true, id: 'Xy7_k2-PqRsTuVwXyZ12' });
  });

  it('accepts a path on its own', () => {
    expect(parse('/share/0a1b2c3d4e5f')).toEqual({ ok: true, id: '0a1b2c3d4e5f' });
  });

  it('says when the box is empty', () => {
    expect(parse('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects links on other sites', () => {
    expect(parse('https://evil.example/share/0a1b2c3d4e5f')).toEqual({ ok: false, reason: 'other-site' });
    expect(parse('https://acadegrade.vercel.app.evil.example/share/0a1b2c3d4e5f')).toEqual({ ok: false, reason: 'other-site' });
  });

  it('rejects other pages on this site and malformed ids', () => {
    expect(parse('https://acadegrade.vercel.app/dashboard')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('https://acadegrade.vercel.app/share/')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('https://acadegrade.vercel.app/share/abc/def')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('abc')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('hello there friend')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('../../api/admin')).toEqual({ ok: false, reason: 'not-a-share-link' });
  });

  it('rejects non-web schemes', () => {
    expect(parse('javascript:alert(1)')).toEqual({ ok: false, reason: 'not-a-share-link' });
    expect(parse('ftp://acadegrade.vercel.app/share/0a1b2c3d4e5f')).toEqual({ ok: false, reason: 'not-a-share-link' });
  });
});

describe('shortShareLink', () => {
  it('drops the scheme and www so the link fits one line', () => {
    expect(shortShareLink('https://www.acadegrade.vercel.app/share/0a1b2c3d4e5f')).toBe('acadegrade.vercel.app/share/0a1b2c3d4e5f');
  });

  it('returns the input when it is not a URL', () => {
    expect(shortShareLink('not a url')).toBe('not a url');
  });
});

describe('expiryChipLabel', () => {
  const now = Date.UTC(2026, 10, 22, 12);
  const at = (ms: number) => new Date(now + ms);
  const HOUR = 3_600_000;

  it('counts whole days up, so a new 7-day link reads 7 days', () => {
    expect(expiryChipLabel(at(7 * 24 * HOUR - 5000), now)).toBe('Expires in 7 days');
    expect(expiryChipLabel(at(30 * 24 * HOUR), now)).toBe('Expires in 30 days');
  });

  it('switches to hours inside the last day', () => {
    expect(expiryChipLabel(at(24 * HOUR), now)).toBe('Expires in 1 day');
    expect(expiryChipLabel(at(5 * HOUR + 10), now)).toBe('Expires in 6 hours');
    expect(expiryChipLabel(at(HOUR), now)).toBe('Expires in 1 hour');
    expect(expiryChipLabel(at(20 * 60_000), now)).toBe('Expires in under an hour');
  });

  it('reads expired for a past date and copes with strings and bad values', () => {
    expect(expiryChipLabel(at(-1), now)).toBe('Expired');
    expect(expiryChipLabel(at(2 * 24 * HOUR).toISOString(), now)).toBe('Expires in 2 days');
    expect(expiryChipLabel('nonsense', now)).toBeNull();
  });
});

describe('viewsLabel', () => {
  it('pluralises and names zero plainly', () => {
    expect(viewsLabel(0)).toBe('No views yet');
    expect(viewsLabel(1)).toBe('1 view');
    expect(viewsLabel(3)).toBe('3 views');
    expect(viewsLabel(undefined)).toBeNull();
  });
});
