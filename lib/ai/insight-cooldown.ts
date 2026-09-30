const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function shouldEnforceInsightCooldown(
  forceRegenerate: boolean,
  hasSavedInsight: boolean,
  ageMs: number,
): boolean {
  return forceRegenerate && hasSavedInsight && ageMs < TWELVE_HOURS_MS;
}
