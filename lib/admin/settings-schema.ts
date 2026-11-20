import { parseAdsConfig } from '@/lib/ads/config';

export const ADMIN_SETTING_FIELDS = [
  'aiSystemPrompt',
  'announcementBanner',
  'maintenanceMode',
  'disableSignups',
  'disabledFeatures',
  'gradeScale',
  'advertBanners',
  'adsConfig',
  'mobileAppLinks',
  // Server-side gate for unknown age / missing AI consent (lib/user/age.ts).
  'ageGate',
  // Source of the AdMob line in /app-ads.txt.
  'admobAndroidAppId',
] as const;

type AdminSettingField = typeof ADMIN_SETTING_FIELDS[number];

const ALLOWED_FEATURES = new Set([
  'add_semester',
  'extract_slip',
  'share_code',
  'edit_profile',
  'ai_insights',
  // Enforced by the API routes (lib/platform/settings-server.ts).
  'ai_forecast',
  'ai_whatif',
  'transcript_pdf',
  'transcript_share',
  // Support requests (/api/support/tickets); stays open during maintenance.
  'support',
  // T1 timetables: client-written (users/{uid}/timetables), so the website and
  // the app hide the screens; no route enforces it.
  'timetable',
]);

const ABOUT_FIELDS = [
  'headline',
  'platformDescription',
  'mission',
  'trustStatement',
  'contactEmail',
] as const;

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, message = 'Request body must be an object') {
  if (!isRecord(value)) throw new SettingsValidationError(message);
  return value;
}

function assertExactKeys(data: Record<string, unknown>, allowed: readonly string[], label: string) {
  const unsupported = Object.keys(data).find((key) => !allowed.includes(key));
  if (unsupported) throw new SettingsValidationError(`Unsupported ${label} field: ${unsupported}`);
}

function requireString(value: unknown, field: string, maxLength: number, allowEmpty = true) {
  if (typeof value !== 'string') throw new SettingsValidationError(`${field} must be a string`);
  const normalized = value.trim();
  if (!allowEmpty && !normalized) throw new SettingsValidationError(`${field} is required`);
  if (normalized.length > maxLength) throw new SettingsValidationError(`${field} is too long`);
  return normalized;
}

function requireHttpsUrl(value: unknown, field: string) {
  const normalized = requireString(value, field, 2048);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') throw new Error('unsupported protocol');
    return url.toString();
  } catch {
    throw new SettingsValidationError(`${field} must be an HTTPS URL`);
  }
}

/** APK size shown on the Android page: a whole number of MB from 1 to 500, or null (unknown). */
function parseAndroidSizeMb(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 500) {
    throw new SettingsValidationError('androidSizeMb must be a whole number from 1 to 500');
  }
  return value;
}

/** Google Play listing link, or '' when not listed yet. */
function requirePlayUrl(value: unknown): string {
  const normalized = requireString(value ?? '', 'playUrl', 2048);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || url.hostname !== 'play.google.com') throw new Error('not play');
    return url.toString();
  } catch {
    throw new SettingsValidationError('playUrl must be an HTTPS link on play.google.com');
  }
}

function parseGradeScale(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new SettingsValidationError('gradeScale must contain between 1 and 12 rows');
  }

  const rows = value.map((item, index) => {
    const row = requireRecord(item, `gradeScale row ${index + 1} must be an object`);
    assertExactKeys(row, ['grade', 'min', 'max', 'points'], 'grade-scale');
    const grade = requireString(row.grade, `gradeScale row ${index + 1} grade`, 4, false).toUpperCase();
    const min = row.min;
    const max = row.max;
    const points = row.points;
    if (![min, max, points].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
      throw new SettingsValidationError(`gradeScale row ${index + 1} must use numeric ranges and points`);
    }
    if ((min as number) < 0 || (max as number) > 100 || (min as number) > (max as number)) {
      throw new SettingsValidationError(`gradeScale row ${index + 1} has an invalid score range`);
    }
    if ((points as number) < 0 || (points as number) > 5) {
      throw new SettingsValidationError(`gradeScale row ${index + 1} points must be between 0 and 5`);
    }
    return { grade, min: min as number, max: max as number, points: points as number };
  });

  const ascending = [...rows].sort((a, b) => a.min - b.min);
  const complete = ascending[0].min === 0
    && ascending.at(-1)?.max === 100
    && ascending.every((row, index) => index === 0 || row.min === ascending[index - 1].max + 1);
  if (!complete) {
    throw new SettingsValidationError('Grade scale must cover every score from 0 to 100 exactly once');
  }
  if (new Set(rows.map((row) => row.grade)).size !== rows.length) {
    throw new SettingsValidationError('Grade labels must be unique');
  }
  return rows;
}

function parseSettingValue(field: AdminSettingField, value: unknown) {
  switch (field) {
    case 'aiSystemPrompt':
      return requireString(value, field, 30_000);
    case 'announcementBanner':
      return value === null ? null : requireString(value, field, 500);
    case 'maintenanceMode':
    case 'disableSignups':
      if (typeof value !== 'boolean') throw new SettingsValidationError(`${field} must be a boolean`);
      return value;
    case 'disabledFeatures': {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && ALLOWED_FEATURES.has(item))) {
        throw new SettingsValidationError('disabledFeatures contains an unsupported feature');
      }
      return [...new Set(value)];
    }
    case 'gradeScale':
      return parseGradeScale(value);
    case 'mobileAppLinks': {
      const links = requireRecord(value, 'mobileAppLinks must be an object');
      assertExactKeys(links, ['androidUrl', 'iosUrl', 'androidSizeMb', 'playUrl'], 'mobile-app link');
      const parsed: Record<string, unknown> = {
        androidUrl: requireHttpsUrl(links.androidUrl ?? '', 'androidUrl'),
        iosUrl: requireHttpsUrl(links.iosUrl ?? '', 'iosUrl'),
      };
      // Optional (android-app.md): included only when sent, so the merge write keeps
      // stored values when an older panel saves just the two links.
      if ('androidSizeMb' in links) parsed.androidSizeMb = parseAndroidSizeMb(links.androidSizeMb);
      if ('playUrl' in links) parsed.playUrl = requirePlayUrl(links.playUrl);
      return parsed;
    }
    case 'advertBanners': {
      if (!Array.isArray(value) || value.length > 12) {
        throw new SettingsValidationError('advertBanners must be an array with at most 12 entries');
      }
      return value.map((item, index) => {
        const banner = requireRecord(item, `Advert banner ${index + 1} must be an object`);
        assertExactKeys(banner, ['id', 'imageUrl', 'linkUrl', 'isActive'], 'advert-banner');
        if (typeof banner.isActive !== 'boolean') {
          throw new SettingsValidationError(`Advert banner ${index + 1} isActive must be a boolean`);
        }
        return {
          id: requireString(banner.id, `Advert banner ${index + 1} id`, 80, false),
          imageUrl: requireHttpsUrl(banner.imageUrl, `Advert banner ${index + 1} imageUrl`),
          linkUrl: requireHttpsUrl(banner.linkUrl, `Advert banner ${index + 1} linkUrl`),
          isActive: banner.isActive,
        };
      });
    }
    case 'adsConfig':
      return parseAdsConfig(value);
    case 'ageGate': {
      const gate = requireRecord(value, 'ageGate must be an object');
      const unsupported = Object.keys(gate).find((key) => key !== 'enforceUnknown');
      if (unsupported) throw new SettingsValidationError(`Unsupported ageGate field: ${unsupported}`);
      if (typeof gate.enforceUnknown !== 'boolean') throw new SettingsValidationError('ageGate.enforceUnknown must be a boolean');
      return { enforceUnknown: gate.enforceUnknown };
    }
    case 'admobAndroidAppId': {
      const appId = requireString(value, field, 64);
      if (appId && !/^ca-app-pub-\d{16}~\d{10}$/.test(appId)) {
        throw new SettingsValidationError('admobAndroidAppId must look like ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY');
      }
      return appId;
    }
  }
}

function parseAboutData(value: unknown) {
  const data = requireRecord(value, 'About data must be an object');
  assertExactKeys(data, ABOUT_FIELDS, 'about');
  // Empty means "no public address": public pages then link to /support instead.
  const contactEmail = requireString(data.contactEmail, 'contactEmail', 254).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new SettingsValidationError('contactEmail must be a valid email address');
  }
  return {
    headline: requireString(data.headline, 'headline', 100, false),
    platformDescription: requireString(data.platformDescription, 'platformDescription', 400, false),
    mission: requireString(data.mission, 'mission', 600, false),
    trustStatement: requireString(data.trustStatement, 'trustStatement', 600, false),
    contactEmail,
  };
}

export function parseAdminSettingsMutation(input: unknown) {
  const body = requireRecord(input);

  if (body.target === 'about') {
    assertExactKeys(body, ['target', 'data'], 'request');
    return { target: 'about' as const, data: parseAboutData(body.data) };
  }

  if ('collection' in body || 'doc' in body || 'data' in body) {
    throw new SettingsValidationError('Unsupported settings operation');
  }

  assertExactKeys(body, ['field', 'value'], 'request');
  if (typeof body.field !== 'string' || !ADMIN_SETTING_FIELDS.includes(body.field as AdminSettingField)) {
    throw new SettingsValidationError('Unsupported setting field');
  }
  const field = body.field as AdminSettingField;
  return { target: 'settings' as const, data: { [field]: parseSettingValue(field, body.value) } };
}
