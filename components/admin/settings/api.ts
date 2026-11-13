import { parseAdminSettingsMutation } from '@/lib/admin/settings-schema';

/** Every admin settings write goes through `POST /api/admin/settings`, unchanged. */
export async function postAdminSettings(token: string, body: unknown) {
  const response = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof data?.error === 'string' ? data.error : 'The setting was not saved.');
  }
}

function accepts(body: unknown) {
  try { parseAdminSettingsMutation(body); return true; } catch { return false; }
}

/**
 * Server work is landing in stages. The settings schema module is shared by the
 * client and the API route, so asking it is the honest test of whether a field
 * would save. Controls for unsupported fields are hidden, not broken.
 */
export const settingsCapabilities = {
  ageGate: () => accepts({ field: 'ageGate', value: { enforceUnknown: true } }),
  feature: (id: string) => accepts({ field: 'disabledFeatures', value: [id] }),
  admobAndroidAppId: () => accepts({ field: 'admobAndroidAppId', value: '' }),
};
