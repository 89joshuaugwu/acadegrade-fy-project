import {
  AD_PLACEMENT_IDS,
  type AdCampaign,
  type AdDeliveryMode,
  type AdPlacementConfig,
  type AdPlacementId,
  type AdsConfig,
} from './types';

export class AdsConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdsConfigValidationError';
  }
}

export const PLACEMENT_NAMES: Record<AdPlacementId, string> = {
  'dashboard.overview': 'Dashboard overview',
  'results.overview': 'Results overview',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) throw new AdsConfigValidationError(`${label} must be an object`);
  return value;
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const unsupported = Object.keys(value).find((key) => !allowed.includes(key));
  if (unsupported) throw new AdsConfigValidationError(`Unsupported ${label} field: ${unsupported}`);
}

function requireString(value: unknown, label: string, maxLength: number, allowEmpty = false) {
  if (typeof value !== 'string') throw new AdsConfigValidationError(`${label} must be a string`);
  const normalized = value.trim();
  if (!allowEmpty && !normalized) throw new AdsConfigValidationError(`${label} is required`);
  if (normalized.length > maxLength) throw new AdsConfigValidationError(`${label} is too long`);
  return normalized;
}

function requireBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new AdsConfigValidationError(`${label} must be a boolean`);
  return value;
}

function requireInteger(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new AdsConfigValidationError(`${label} must be between ${min} and ${max}`);
  }
  return value as number;
}

function requireHttpsUrl(value: unknown, label: string, allowEmpty = false) {
  const normalized = requireString(value, label, 2_048, allowEmpty);
  if (!normalized && allowEmpty) return '';
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new AdsConfigValidationError(`${label} must be an HTTPS URL`);
  }
  if (url.protocol !== 'https:') throw new AdsConfigValidationError(`${label} must be an HTTPS URL`);
  // Android rejects credentialed URLs; keep both validators in agreement.
  if (url.username || url.password) {
    throw new AdsConfigValidationError(`${label} must not include a username or password`);
  }
  return url.toString();
}

/** Plain-language problem with an optional campaign URL, for inline form errors. */
export function describeCampaignUrlProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Enter a full URL that starts with https://.';
  }
  if (url.protocol !== 'https:') return 'The URL must start with https://.';
  if (url.username || url.password) return 'Remove the username and password from this URL.';
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  imageUrl: 'image URL',
  linkUrl: 'destination URL',
  startsAt: 'start time',
  endsAt: 'end time',
  maxImpressions: 'max views',
  windowHours: 'cap window (hours)',
  altText: 'image alternative text',
  ctaLabel: 'call-to-action label',
};

/** Rewrites validation messages to use the editor's field names. */
export function describeAdsConfigError(message: string): string {
  return message.replace(/\b(imageUrl|linkUrl|startsAt|endsAt|maxImpressions|windowHours|altText|ctaLabel)\b/g, (field) => FIELD_LABELS[field]);
}

function parseNullableDate(value: unknown, label: string) {
  if (value === null) return null;
  const dateValue = requireString(value, label, 40);
  const timestamp = Date.parse(dateValue);
  if (!Number.isFinite(timestamp)) throw new AdsConfigValidationError(`${label} must be a valid ISO date`);
  return new Date(timestamp).toISOString();
}

function parsePlacement(value: unknown, index: number): AdPlacementConfig {
  const label = `Placement ${index + 1}`;
  const placement = requireRecord(value, label);
  assertExactKeys(placement, ['id', 'name', 'enabled'], 'placement');
  const id = requireString(placement.id, `${label} id`, 80) as AdPlacementId;
  if (!AD_PLACEMENT_IDS.includes(id)) {
    throw new AdsConfigValidationError(`${label} uses an unsupported placement id`);
  }
  return {
    id,
    name: requireString(placement.name, `${label} name`, 80),
    enabled: requireBoolean(placement.enabled, `${label} enabled`),
  };
}

function parseCampaign(value: unknown, index: number, placementIds: Set<AdPlacementId>): AdCampaign {
  const label = `Campaign ${index + 1}`;
  const campaign = requireRecord(value, label);
  assertExactKeys(campaign, [
    'id',
    'name',
    'placementIds',
    'deliveryMode',
    'active',
    'schedule',
    'weight',
    'frequencyCap',
    'creative',
    'linkUrl',
  ], 'campaign');

  const id = requireString(campaign.id, `${label} id`, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new AdsConfigValidationError(`${label} id must use lowercase letters, numbers, and hyphens`);
  }

  if (!Array.isArray(campaign.placementIds) || campaign.placementIds.length === 0) {
    throw new AdsConfigValidationError(`${label} must target at least one placement`);
  }
  const campaignPlacementIds = [...new Set(campaign.placementIds.map((placementId) => {
    if (typeof placementId !== 'string' || !AD_PLACEMENT_IDS.includes(placementId as AdPlacementId)) {
      throw new AdsConfigValidationError(`${label} uses an unsupported placement id`);
    }
    if (!placementIds.has(placementId as AdPlacementId)) {
      throw new AdsConfigValidationError(`${label} references a disabled or missing placement`);
    }
    return placementId as AdPlacementId;
  }))];

  const deliveryMode = campaign.deliveryMode;
  if (!['house', 'rewarded', 'third-party'].includes(deliveryMode as string)) {
    throw new AdsConfigValidationError(`${label} uses an unsupported delivery mode`);
  }
  const active = requireBoolean(campaign.active, `${label} active`);
  if (active && deliveryMode !== 'house') {
    throw new AdsConfigValidationError('Only house campaigns can be enabled');
  }

  const schedule = requireRecord(campaign.schedule, `${label} schedule`);
  assertExactKeys(schedule, ['startsAt', 'endsAt'], 'schedule');
  const startsAt = parseNullableDate(schedule.startsAt, `${label} startsAt`);
  const endsAt = parseNullableDate(schedule.endsAt, `${label} endsAt`);
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new AdsConfigValidationError(`${label} must end after it starts`);
  }

  const frequencyCap = requireRecord(campaign.frequencyCap, `${label} frequencyCap`);
  assertExactKeys(frequencyCap, ['maxImpressions', 'windowHours'], 'frequency-cap');

  const creative = requireRecord(campaign.creative, `${label} creative`);
  assertExactKeys(creative, ['imageUrl', 'altText', 'headline', 'body', 'ctaLabel'], 'creative');
  const imageUrl = requireHttpsUrl(creative.imageUrl, `${label} imageUrl`, true);
  const headline = requireString(creative.headline, `${label} headline`, 100, true);
  if (!imageUrl && !headline) {
    throw new AdsConfigValidationError(`${label} needs an image or headline`);
  }

  return {
    id,
    name: requireString(campaign.name, `${label} name`, 100),
    placementIds: campaignPlacementIds,
    deliveryMode: deliveryMode as AdDeliveryMode,
    active,
    schedule: { startsAt, endsAt },
    weight: requireInteger(campaign.weight, `${label} weight`, 1, 100),
    frequencyCap: {
      maxImpressions: requireInteger(
        frequencyCap.maxImpressions,
        `${label} maxImpressions`,
        1,
        100
      ),
      windowHours: requireInteger(frequencyCap.windowHours, `${label} windowHours`, 1, 720),
    },
    creative: {
      imageUrl,
      altText: requireString(creative.altText, `${label} altText`, 180, true),
      headline,
      body: requireString(creative.body, `${label} body`, 280, true),
      ctaLabel: requireString(creative.ctaLabel, `${label} ctaLabel`, 40, true),
    },
    linkUrl: requireHttpsUrl(campaign.linkUrl, `${label} linkUrl`, true),
  };
}

export function createDefaultAdsConfig(): AdsConfig {
  return {
    version: 1,
    enabled: false,
    deliveryModes: { house: true, rewarded: false, thirdParty: false },
    placements: AD_PLACEMENT_IDS.map((id) => ({
      id,
      name: PLACEMENT_NAMES[id],
      enabled: id === 'dashboard.overview',
    })),
    campaigns: [],
  };
}

/**
 * Lists every mounted placement for editing. Placements absent from an older
 * saved configuration are added switched off, matching how delivery treats a
 * missing placement, so the saved meaning never changes.
 */
export function withKnownPlacements(config: AdsConfig): AdsConfig {
  const saved = new Map(config.placements.map((placement) => [placement.id, placement]));
  if (AD_PLACEMENT_IDS.every((id) => saved.has(id))) return config;
  return {
    ...config,
    placements: AD_PLACEMENT_IDS.map((id) => saved.get(id) ?? { id, name: PLACEMENT_NAMES[id], enabled: false }),
  };
}

function parseConfig(value: unknown, mode: 'strict' | 'stored') {
  const config = requireRecord(value, 'Ads configuration');
  assertExactKeys(
    config,
    ['version', 'enabled', 'deliveryModes', 'placements', 'campaigns'],
    'ads configuration'
  );
  if (config.version !== 1) throw new AdsConfigValidationError('Ads configuration version must be 1');

  const deliveryModes = requireRecord(config.deliveryModes, 'deliveryModes');
  assertExactKeys(deliveryModes, ['house', 'rewarded', 'thirdParty'], 'deliveryModes');
  const house = requireBoolean(deliveryModes.house, 'House delivery');
  const rewarded = requireBoolean(deliveryModes.rewarded, 'Rewarded delivery');
  const thirdParty = requireBoolean(deliveryModes.thirdParty, 'Third-party delivery');
  if (rewarded) throw new AdsConfigValidationError('Rewarded delivery is not available yet');
  if (thirdParty) throw new AdsConfigValidationError('Third-party delivery is not available yet');

  if (!Array.isArray(config.placements) || config.placements.length > AD_PLACEMENT_IDS.length) {
    throw new AdsConfigValidationError(`placements must contain at most ${AD_PLACEMENT_IDS.length} entries`);
  }
  const placements = config.placements.map(parsePlacement);
  if (new Set(placements.map((placement) => placement.id)).size !== placements.length) {
    throw new AdsConfigValidationError('Placement IDs must be unique');
  }

  if (!Array.isArray(config.campaigns) || config.campaigns.length > 24) {
    throw new AdsConfigValidationError('campaigns must be an array with at most 24 entries');
  }
  const placementIds = new Set(placements.map((placement) => placement.id));
  const campaigns: AdCampaign[] = [];
  const skipped: string[] = [];
  for (const [index, candidate] of config.campaigns.entries()) {
    let campaign: AdCampaign;
    try {
      campaign = parseCampaign(candidate, index, placementIds);
    } catch (error) {
      // Stored data is read campaign by campaign so one bad record cannot blank a slot.
      if (mode === 'strict' || !(error instanceof AdsConfigValidationError)) throw error;
      const name = isRecord(candidate) && typeof candidate.name === 'string' && candidate.name.trim() ? ` (${candidate.name.trim().slice(0, 100)})` : '';
      skipped.push(`Campaign ${index + 1}${name} is not served: ${error.message}.`);
      continue;
    }
    if (campaigns.some((existing) => existing.id === campaign.id)) {
      if (mode === 'strict') throw new AdsConfigValidationError('Campaign IDs must be unique');
      skipped.push(`Campaign ${index + 1} (${campaign.name}) is not served: duplicate campaign ID ${campaign.id}.`);
      continue;
    }
    campaigns.push(campaign);
  }

  return {
    config: {
      version: 1 as const,
      enabled: requireBoolean(config.enabled, 'Ads enabled'),
      deliveryModes: { house, rewarded: false as const, thirdParty: false as const },
      placements,
      campaigns,
    },
    skipped,
  };
}

/** Validates an administrator's write. Any invalid campaign rejects the save. */
export function parseAdsConfig(value: unknown): AdsConfig {
  return parseConfig(value, 'strict').config;
}

/**
 * Reads stored configuration for delivery and admin display. A campaign that
 * no longer passes validation (for example one saved before a rule tightened)
 * is skipped individually and reported, rather than hiding every campaign.
 */
export function parseStoredAdsConfig(value: unknown): { config: AdsConfig; skipped: string[] } {
  return parseConfig(value, 'stored');
}

export function safeParseAdsConfig(value: unknown): AdsConfig | null {
  try {
    return parseStoredAdsConfig(value).config;
  } catch {
    return null;
  }
}

/**
 * Keeps pre-control-plane banner data visible without preserving the old
 * interruptive modal. Invalid legacy creatives are ignored and delivery
 * remains fail-closed when no safe active banner is available.
 */
export function legacyBannersToAdsConfig(value: unknown): AdsConfig | null {
  if (!Array.isArray(value)) return null;

  const usedIds = new Set<string>();
  const campaigns: AdCampaign[] = [];

  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate) || candidate.isActive !== true) continue;

    let imageUrl: string;
    let linkUrl: string;
    try {
      imageUrl = requireHttpsUrl(candidate.imageUrl, 'Legacy banner imageUrl');
      linkUrl = requireHttpsUrl(candidate.linkUrl ?? '', 'Legacy banner linkUrl', true);
    } catch {
      continue;
    }

    const sourceId = typeof candidate.id === 'string' ? candidate.id : `banner-${index + 1}`;
    const baseId = sourceId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `banner-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    campaigns.push({
      id,
      name: 'Legacy sponsored banner',
      placementIds: ['dashboard.overview'],
      deliveryMode: 'house',
      active: true,
      schedule: { startsAt: null, endsAt: null },
      weight: 1,
      frequencyCap: { maxImpressions: 1, windowHours: 6 },
      creative: {
        imageUrl,
        altText: 'Sponsored offer',
        headline: '',
        body: '',
        ctaLabel: linkUrl ? 'Learn more' : '',
      },
      linkUrl,
    });
  }

  if (campaigns.length === 0) return null;

  const config = createDefaultAdsConfig();
  return {
    ...config,
    enabled: true,
    campaigns,
  };
}
