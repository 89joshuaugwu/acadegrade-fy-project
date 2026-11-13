import 'server-only';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Server-side view of the public `config/settings` document.
 *
 * Reads go through a short per-instance cache so every API call does not pay
 * for a Firestore read. Read failures fail open: the last good value is kept,
 * or the defaults (no maintenance, nothing disabled) are used.
 */

export const PLATFORM_FEATURES = [
  'add_semester',
  'extract_slip',
  'share_code',
  'edit_profile',
  'ai_insights',
  'ai_forecast',
  'ai_whatif',
  'transcript_pdf',
  'transcript_share',
] as const;
export type PlatformFeature = typeof PLATFORM_FEATURES[number];

export interface PlatformSettings {
  maintenanceMode: boolean;
  disabledFeatures: PlatformFeature[];
  announcementBanner: string | null;
  ageGate: { enforceUnknown: boolean };
}

export const PLATFORM_SETTINGS_CACHE_MS = 30_000;
export const MAINTENANCE_MESSAGE = 'AcadeGrade is down for maintenance. Please try again soon.';
export const FEATURE_DISABLED_MESSAGE = 'This feature is temporarily unavailable. Please try again later.';

const featureSet = new Set<string>(PLATFORM_FEATURES);

export function normalizePlatformSettings(data: unknown): PlatformSettings {
  const value = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const ageGate = value.ageGate && typeof value.ageGate === 'object' ? value.ageGate as Record<string, unknown> : {};
  return {
    maintenanceMode: value.maintenanceMode === true,
    disabledFeatures: Array.isArray(value.disabledFeatures)
      ? [...new Set(value.disabledFeatures.filter((item): item is PlatformFeature => typeof item === 'string' && featureSet.has(item)))]
      : [],
    announcementBanner: typeof value.announcementBanner === 'string' && value.announcementBanner.trim() ? value.announcementBanner : null,
    // Default true: unknown-age accounts must confirm before using AI.
    ageGate: { enforceUnknown: typeof ageGate.enforceUnknown === 'boolean' ? ageGate.enforceUnknown : true },
  };
}

let cached: { value: PlatformSettings; expiresAt: number } | null = null;
let lastGood: PlatformSettings | null = null;

/** Drop the cached copy, e.g. right after an admin saves settings on this instance. */
export function invalidatePlatformSettingsCache() {
  cached = null;
  lastGood = null;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  try {
    const snapshot = await adminDb.collection('config').doc('settings').get();
    const value = normalizePlatformSettings(snapshot.exists === false ? undefined : snapshot.data());
    cached = { value, expiresAt: now + PLATFORM_SETTINGS_CACHE_MS };
    lastGood = value;
    return value;
  } catch {
    console.warn('[platform settings] read failed; failing open');
    const value = lastGood ?? normalizePlatformSettings(undefined);
    // Retry soon rather than hammering a failing backend on every request.
    cached = { value, expiresAt: now + 5_000 };
    return value;
  }
}

/** True when the email is in `config/admins.emails` (case-insensitive). Errors mean "not admin". */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  try {
    const admins = (await adminDb.collection('config').doc('admins').get()).data()?.emails;
    return Array.isArray(admins) && admins.some((value) => String(value).toLowerCase() === normalized);
  } catch {
    return false;
  }
}

const noStore = { 'Cache-Control': 'no-store' };

export function maintenanceResponse() {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE, code: 'MAINTENANCE' }, { status: 503, headers: noStore });
}

export function featureDisabledResponse(feature: PlatformFeature) {
  return NextResponse.json({ error: FEATURE_DISABLED_MESSAGE, code: 'FEATURE_DISABLED', feature }, { status: 503, headers: noStore });
}

/**
 * Returns a 503 response when the request must be refused, otherwise null.
 * - Maintenance blocks everyone except admins (looked up only when maintenance is on).
 * - A disabled feature blocks everyone, admins included.
 */
export async function checkPlatformAccess(options: {
  feature?: PlatformFeature;
  email?: string | null;
  isAdmin?: boolean;
  maintenance?: boolean;
}): Promise<NextResponse | null> {
  const settings = await getPlatformSettings();
  if (options.maintenance !== false && settings.maintenanceMode) {
    const admin = options.isAdmin ?? await isAdminEmail(options.email);
    if (!admin) return maintenanceResponse();
  }
  if (options.feature && settings.disabledFeatures.includes(options.feature)) {
    return featureDisabledResponse(options.feature);
  }
  return null;
}
