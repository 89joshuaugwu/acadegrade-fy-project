/** Distinct push tokens on a profile (the `fcmTokens` array plus the legacy `fcmToken`). */
export function deviceTokens(profile: Record<string, unknown> | undefined | null): string[] {
  if (!profile) return [];
  const list = Array.isArray(profile.fcmTokens)
    ? profile.fcmTokens.filter((token): token is string => typeof token === 'string' && token.length > 0)
    : [];
  if (typeof profile.fcmToken === 'string' && profile.fcmToken) list.push(profile.fcmToken);
  return [...new Set(list)];
}
