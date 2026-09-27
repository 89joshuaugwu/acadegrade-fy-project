import { describe, expect, it } from 'vitest';
import { resolveInsightRefresh } from '@/lib/ai/insight-refresh-state';

describe('insight refresh state', () => {
  it('keeps a prior insight stale when the server serves a cached response', () => {
    const previous = { timestamp: 'original-time', data: { strengths: ['Previous'] } };
    const result = resolveInsightRefresh(previous, { strengths: ['Previous'], stale: true });
    expect(result).toEqual({ lastInsight: previous, insightsStale: true, refreshed: false });
  });

  it('accepts a newly generated insight as current', () => {
    const result = resolveInsightRefresh(undefined, { strengths: ['New'] }, 'new-time');
    expect(result).toEqual({ lastInsight: { timestamp: 'new-time', data: { strengths: ['New'] } }, insightsStale: false, refreshed: true });
  });
});
