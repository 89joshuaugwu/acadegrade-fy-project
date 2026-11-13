import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { shouldEnforceInsightCooldown } from '@/lib/ai/insight-cooldown';
import { FEATURE_IDS, USAGE_FEATURES, featureWindows, inspectUsagePolicy, type UsageFeatureId, type UsageSummary } from './policy';

const warnedPolicies = new Set<string>();

/** Effective policy plus where it came from. Storage errors propagate; only
 * missing/invalid stored fields fall back (per field) to defaults. */
export async function inspectStoredUsagePolicy() {
  const snapshot = await adminDb.collection('config').doc('usage').get();
  const inspection = inspectUsagePolicy(snapshot.data());
  // A never-saved coins map is the expected state of older documents, not a rejection.
  const rejected = inspection.fallbacks.filter(field => field !== 'coins');
  const signature = rejected.join(',');
  if (inspection.source !== 'default' && rejected.length && !warnedPolicies.has(signature)) {
    warnedPolicies.add(signature);
    // Field paths only: never log stored values.
    console.warn('[usage-policy] config/usage has missing or invalid fields; defaults apply to them', { fields: rejected });
  }
  return inspection;
}

export async function getUsagePolicy() {
  return (await inspectStoredUsagePolicy()).policy;
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
  // The route enforces this only for forced regeneration; a non-forced
  // cache-miss request is still served. Report it alongside, never as zero availability.
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
    return {
      id, label: feature.label, freeDailyLimit: policy.dailyLimits[id],
      freeRemaining: daily.remaining, freeResetAt: daily.resetAt,
      availableNow: Math.min(...states.map(state => state.remaining)),
      retryAfterSeconds: Math.max(...states.map(state => state.retry)),
      cooldownUntil: id === 'insights' ? cooldownUntil : null,
    };
  }));
  return { features, checkedAt };
}
