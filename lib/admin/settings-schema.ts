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
] as const;

type AdminSettingField = typeof ADMIN_SETTING_FIELDS[number];

const ALLOWED_FEATURES = new Set([
  'add_semester',
  'extract_slip',
  'share_code',
  'edit_profile',
  'ai_insights',
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
      assertExactKeys(links, ['androidUrl', 'iosUrl'], 'mobile-app link');
      return {
        androidUrl: requireHttpsUrl(links.androidUrl ?? '', 'androidUrl'),
        iosUrl: requireHttpsUrl(links.iosUrl ?? '', 'iosUrl'),
      };
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
  }
}

function parseAboutData(value: unknown) {
  const data = requireRecord(value, 'About data must be an object');
  assertExactKeys(data, ABOUT_FIELDS, 'about');
  const contactEmail = requireString(data.contactEmail, 'contactEmail', 254, false).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
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
