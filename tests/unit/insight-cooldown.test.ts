import { describe, expect, it } from 'vitest';
import { shouldEnforceInsightCooldown } from '@/lib/ai/insight-cooldown';

describe('written insight regeneration cooldown', () => {
  it('blocks a forced refresh inside 12 hours by default', () => {
    expect(shouldEnforceInsightCooldown(true, true, 60_000)).toBe(true);
  });

  it('does not block an ordinary cached read', () => {
    expect(shouldEnforceInsightCooldown(false, true, 60_000)).toBe(false);
  });

  it('does not block a first generation or an expired cooldown', () => {
    expect(shouldEnforceInsightCooldown(true, false, 60_000)).toBe(false);
    expect(shouldEnforceInsightCooldown(true, true, 12 * 60 * 60 * 1000)).toBe(false);
  });
});
