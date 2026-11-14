import { afterEach, describe, expect, it } from 'vitest';
import { isCronRequest } from '@/lib/cron/auth';

const SECRET = 'a'.repeat(40);
const original = process.env.CRON_SECRET;
const request = (authorization?: string) => new Request('https://app.test/api/cron/daily', {
  headers: authorization === undefined ? {} : { Authorization: authorization },
});

afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe('isCronRequest', () => {
  it('accepts exactly the bearer secret', () => {
    process.env.CRON_SECRET = SECRET;
    expect(isCronRequest(request(`Bearer ${SECRET}`))).toBe(true);
  });

  it('rejects a missing header, a wrong secret and a wrong scheme', () => {
    process.env.CRON_SECRET = SECRET;
    expect(isCronRequest(request())).toBe(false);
    expect(isCronRequest(request(`Bearer ${'b'.repeat(40)}`))).toBe(false);
    expect(isCronRequest(request(SECRET))).toBe(false);
    expect(isCronRequest(request(`Basic ${SECRET}`))).toBe(false);
    expect(isCronRequest(request(`Bearer ${SECRET}x`))).toBe(false);
    expect(isCronRequest(request('Bearer '))).toBe(false);
  });

  it('refuses everything when the secret is unset or shorter than 16 characters', () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(request('Bearer '))).toBe(false);
    expect(isCronRequest(request('Bearer undefined'))).toBe(false);
    process.env.CRON_SECRET = 'short-secret';
    expect(isCronRequest(request('Bearer short-secret'))).toBe(false);
    process.env.CRON_SECRET = '';
    expect(isCronRequest(request('Bearer '))).toBe(false);
  });
});
