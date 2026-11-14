import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';
import {
  TOPIC_ALL, conditionForAudience, levelTopic, syncUserTopics, topicsForProfile, universityTopic,
} from '@/lib/notifications/topics';

const uniHash = (name: string) => createHash('sha256').update(name.trim().toLowerCase()).digest('hex').slice(0, 16);

describe('topic names', () => {
  it('topics per profile; opt-out gives none', () => {
    expect(universityTopic('  University of Lagos ')).toBe(`ag_u_${uniHash('university of lagos')}`);
    expect(universityTopic('UNIVERSITY OF LAGOS')).toBe(universityTopic('university of lagos'));
    expect(universityTopic('')).toBeNull();
    expect(levelTopic(300)).toBe('ag_l_300');
    expect(levelTopic('200')).toBe('ag_l_200');
    expect(levelTopic(0)).toBeNull();
    expect(levelTopic('abc')).toBeNull();

    expect(topicsForProfile({ university: 'University of Lagos', currentLevel: 300 })).toEqual([
      TOPIC_ALL, `ag_u_${uniHash('university of lagos')}`, 'ag_l_300',
    ]);
    // Old accounts with no university or level still get the "everyone" topic.
    expect(topicsForProfile({})).toEqual(['ag_all']);
    expect(topicsForProfile({ university: 'X', currentLevel: 100, notificationPreferences: { adminBroadcasts: false } })).toEqual([]);
    expect(topicsForProfile({ notificationPreferences: { adminBroadcasts: true } })).toEqual(['ag_all']);
  });

  it('condition ≤ 5 topics', () => {
    expect(conditionForAudience({})).toBe("'ag_all' in topics");
    expect(conditionForAudience({ universities: [], levels: [] })).toBe("'ag_all' in topics");
    expect(conditionForAudience({ levels: [100, 200] })).toBe("('ag_l_100' in topics || 'ag_l_200' in topics)");
    const lagos = universityTopic('University of Lagos');
    expect(conditionForAudience({ universities: ['University of Lagos'], levels: [400] }))
      .toBe(`('${lagos}' in topics) && ('ag_l_400' in topics)`);
    expect(() => conditionForAudience({ universities: ['A', 'B', 'C'], levels: [100, 200, 300] })).toThrow(/5 topics/);
    expect(() => conditionForAudience({ levels: [100, 200, 300, 400, 500, 600] })).toThrow(/5 topics/);
    expect(conditionForAudience({ universities: ['A', 'B'], levels: [100, 200, 300] })).toMatch(/&&/);
  });
});

describe('syncUserTopics', () => {
  let store: ReturnType<typeof queryTestDb>;
  const messaging = { subscribeToTopic: vi.fn(), unsubscribeFromTopic: vi.fn() };

  beforeEach(() => {
    store = queryTestDb();
    messaging.subscribeToTopic.mockReset().mockResolvedValue({ successCount: 1, failureCount: 0, errors: [] });
    messaging.unsubscribeFromTopic.mockReset().mockResolvedValue({ successCount: 1, failureCount: 0, errors: [] });
  });

  it('syncUserTopics diffs and chunks tokens', async () => {
    const tokens = Array.from({ length: 1500 }, (_, index) => `tok-${index}`);
    store.docs.set('users/u1', { university: 'Uni A', currentLevel: 200, fcmTokens: tokens });

    const first = await syncUserTopics(store.db, messaging, 'u1');
    const desired = topicsForProfile({ university: 'Uni A', currentLevel: 200 });
    expect(first.subscribed).toEqual(desired);
    // 1,500 tokens -> two calls (1,000 + 500) per topic.
    expect(messaging.subscribeToTopic).toHaveBeenCalledTimes(desired.length * 2);
    for (const [chunk] of messaging.subscribeToTopic.mock.calls) expect((chunk as string[]).length).toBeLessThanOrEqual(1000);
    expect(store.docs.get('users/u1')).toMatchObject({ fcmTopics: desired, fcmTopicsTokensHash: expect.stringMatching(/^[a-f0-9]{64}$/) });

    // Nothing changed: no calls, no write.
    messaging.subscribeToTopic.mockClear();
    const writes = store.writes.length;
    expect((await syncUserTopics(store.db, messaging, 'u1')).changed).toBe(false);
    expect(messaging.subscribeToTopic).not.toHaveBeenCalled();
    expect(store.writes.length).toBe(writes);

    // Level change: subscribe to the new level only, unsubscribe the old one.
    store.docs.set('users/u1', { ...store.docs.get('users/u1'), currentLevel: 300, fcmTokens: ['a', 'b'] });
    messaging.subscribeToTopic.mockClear();
    const moved = await syncUserTopics(store.db, messaging, 'u1');
    // The token set changed too, so every desired topic is (re)subscribed for the current tokens.
    expect(moved.subscribed).toEqual(topicsForProfile({ university: 'Uni A', currentLevel: 300 }));
    expect(moved.unsubscribed).toEqual(['ag_l_200']);
    expect(messaging.unsubscribeFromTopic).toHaveBeenCalledWith(['a', 'b'], 'ag_l_200');

    // Same tokens, new level: only the difference.
    store.docs.set('users/u1', { ...store.docs.get('users/u1'), currentLevel: 400 });
    messaging.subscribeToTopic.mockClear();
    messaging.unsubscribeFromTopic.mockClear();
    const diff = await syncUserTopics(store.db, messaging, 'u1');
    expect(diff).toMatchObject({ subscribed: ['ag_l_400'], unsubscribed: ['ag_l_300'], changed: true });
    expect(messaging.subscribeToTopic).toHaveBeenCalledWith(['a', 'b'], 'ag_l_400');
  });

  it('unsubscribes everything on opt-out and copes with no tokens', async () => {
    store.docs.set('users/u2', { fcmTokens: ['t1'], university: 'Uni A' });
    await syncUserTopics(store.db, messaging, 'u2');
    store.docs.set('users/u2', { ...store.docs.get('users/u2'), notificationPreferences: { adminBroadcasts: false } });
    const result = await syncUserTopics(store.db, messaging, 'u2');
    expect(result.subscribed).toEqual([]);
    expect(result.unsubscribed.sort()).toEqual([TOPIC_ALL, universityTopic('Uni A')].sort());
    expect(store.docs.get('users/u2').fcmTopics).toEqual([]);

    store.docs.set('users/u3', { university: 'Uni A' });
    messaging.subscribeToTopic.mockClear();
    expect(await syncUserTopics(store.db, messaging, 'u3')).toMatchObject({ subscribed: [], unsubscribed: [] });
    expect(messaging.subscribeToTopic).not.toHaveBeenCalled();
    await expect(syncUserTopics(store.db, messaging, 'missing')).resolves.toMatchObject({ changed: false });
  });
});
