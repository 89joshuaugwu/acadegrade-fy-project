import { describe, expect, it } from 'vitest';
import { attentionItems } from '@/components/admin/overview/NeedsAttention';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const HOUR = 3_600_000;
const base = { pendingSuggestions: null, aiManaged: true, release: null, maintenanceMode: false, coinsEnabled: false, mobileAds: null };
const ids = (dailyJobs: Parameters<typeof attentionItems>[0]['dailyJobs']) => attentionItems({ ...base, dailyJobs, now: NOW }).map((item) => item.id);

describe('daily job warnings (R4.5)', () => {
  it('flags daily jobs that have not run in 48 hours', () => {
    expect(ids({ never: false, finishedAt: NOW - 49 * HOUR, failedJobs: [] })).toEqual(['daily-stale']);
  });

  it('stays quiet when the last run was recent and clean', () => {
    expect(ids({ never: false, finishedAt: NOW - 20 * HOUR, failedJobs: [] })).toEqual([]);
    expect(ids({ never: false, finishedAt: NOW - 47 * HOUR, failedJobs: [] })).toEqual([]);
  });

  it('flags a daily job that failed in the last run', () => {
    const items = attentionItems({ ...base, dailyJobs: { never: false, finishedAt: NOW - HOUR, failedJobs: ['cleanup'] }, now: NOW });
    expect(items.map((item) => item.id)).toEqual(['daily-failed']);
    expect(items[0].text).toContain('cleanup');
  });

  it('says the jobs have never run, pointing at the secret and Vercel Cron', () => {
    const items = attentionItems({ ...base, dailyJobs: { never: true, finishedAt: null, failedJobs: [] }, now: NOW });
    expect(items.map((item) => item.id)).toEqual(['daily-never']);
    expect(items[0].text).toMatch(/CRON_SECRET/);
  });

  it('raises no alarm when the status could not be read or is not provided', () => {
    expect(ids(null)).toEqual([]);
    expect(ids(undefined)).toEqual([]);
  });
});
