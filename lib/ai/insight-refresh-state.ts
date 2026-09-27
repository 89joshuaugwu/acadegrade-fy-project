export function resolveInsightRefresh<T extends object>(
  previous: { timestamp: unknown; data: T } | undefined,
  incoming: T & { stale?: boolean; staleMessage?: string },
  now: unknown = new Date(),
) {
  if (incoming.stale) {
    return { lastInsight: previous, insightsStale: true, refreshed: false };
  }

  const { stale: _stale, staleMessage: _staleMessage, ...data } = incoming;
  return { lastInsight: { timestamp: now, data: data as T }, insightsStale: false, refreshed: true };
}
