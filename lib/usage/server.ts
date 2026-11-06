import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { shouldEnforceInsightCooldown } from '@/lib/ai/insight-cooldown';
import { FEATURE_IDS, USAGE_FEATURES, featureWindows, readUsagePolicy, type UsageFeatureId, type UsageSummary } from './policy';

export async function getUsagePolicy() {
  const snapshot = await adminDb.collection('config').doc('usage').get();
  return readUsagePolicy(snapshot.data());
}

export async function resolveFeatureWindows(id: UsageFeatureId) {
  return featureWindows(id, await getUsagePolicy());
}

// Keep IDs and expiry semantics identical to lib/api/rate-limit.ts. Reading
// never starts a window or increments counters, including expired windows.
function rateDocumentId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

function insightTimestamp(value: unknown): number {
  if (!value) return 0;
  const timestamp = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  const parsed = new Date(value as string).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getUsageSummary(uid: string): Promise<UsageSummary> {
  const [policy, analytics] = await Promise.all([
    getUsagePolicy(), adminDb.collection('analytics').doc(uid).get(),
  ]);
  const checkedAt = Date.now();
  const lastInsight = analytics.data()?.lastInsight;
  const lastCall = insightTimestamp(lastInsight?.timestamp);
  const ageMs = lastCall ? checkedAt - lastCall : Number.POSITIVE_INFINITY;
  const cooldownUntil = shouldEnforceInsightCooldown(true, Boolean(lastInsight?.data), ageMs)
    ? lastCall + 12 * 60 * 60 * 1000 : null;

  const features = await Promise.all(FEATURE_IDS.map(async id => {
    const feature = USAGE_FEATURES[id];
    const windows = featureWindows(id, policy);
    const states = await Promise.all(windows.map(async window => {
      const snapshot = await adminDb.collection('_api_rate_limits')
        .doc(rateDocumentId(`${uid}_${feature.endpoint}_${window.name}`)).get();
      const data = snapshot.data();
      const storedStart = data?.windowStartedAt?.toMillis?.() ?? 0;
      const expired = !storedStart || checkedAt >= storedStart + window.windowMs;
      const count = expired ? 0 : Number(data?.count ?? 0);
      const remaining = Math.max(0, window.limit - count);
      const resetAt = expired ? null : storedStart + window.windowMs;
      const retry = count >= window.limit ? Math.max(1, Math.ceil(((resetAt ?? checkedAt + window.windowMs) - checkedAt) / 1000)) : 0;
      return { remaining, resetAt, retry };
    }));
    const daily = states[1];
    const cooldown = id === 'insights' ? cooldownUntil : null;
    return {
      id, label: feature.label, freeDailyLimit: policy.dailyLimits[id],
      freeRemaining: daily.remaining, freeResetAt: daily.resetAt,
      availableNow: cooldown ? 0 : Math.min(...states.map(state => state.remaining)),
      retryAfterSeconds: Math.max(...states.map(state => state.retry), cooldown ? Math.max(1, Math.ceil((cooldown - checkedAt) / 1000)) : 0),
      cooldownUntil: cooldown,
    };
  }));
  return { features, checkedAt };
}
