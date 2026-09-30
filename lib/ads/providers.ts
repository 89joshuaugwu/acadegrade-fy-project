import { AdsConfigValidationError } from './config';

export interface ProviderConfig {
  version: 1;
  adsense: { enabled: boolean; publisherId: string; slotId: string };
  adsterra: { enabled: boolean; smartLinkUrl: string };
}

export function createDefaultProviderConfig(): ProviderConfig {
  return { version: 1, adsense: { enabled: false, publisherId: '', slotId: '' }, adsterra: { enabled: false, smartLinkUrl: '' } };
}

function record(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AdsConfigValidationError(`${label} must be an object`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key)) || keys.some((key) => !(key in result))) {
    throw new AdsConfigValidationError(`${label} has missing or unsupported fields`);
  }
  return result;
}

function string(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || value.length > max) throw new AdsConfigValidationError(`${label} must be a string of at most ${max} characters`);
  return value.trim();
}

function enabled(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new AdsConfigValidationError(`${label} must be a boolean`);
  return value;
}

export function parseProviderConfig(value: unknown): ProviderConfig {
  const config = record(value, ['version', 'adsense', 'adsterra'], 'Provider settings');
  if (config.version !== 1) throw new AdsConfigValidationError('Provider settings version must be 1');
  const adsense = record(config.adsense, ['enabled', 'publisherId', 'slotId'], 'AdSense');
  const adsterra = record(config.adsterra, ['enabled', 'smartLinkUrl'], 'Adsterra');
  const publisherId = string(adsense.publisherId, 'Publisher ID', 23);
  const slotId = string(adsense.slotId, 'Slot ID', 20);
  const smartLinkUrl = string(adsterra.smartLinkUrl, 'SmartLink URL', 2048);
  if (publisherId && !/^ca-pub-[0-9]{16}$/.test(publisherId)) throw new AdsConfigValidationError('Publisher ID must be ca-pub- followed by 16 digits');
  if (slotId && !/^[0-9]{1,20}$/.test(slotId)) throw new AdsConfigValidationError('Slot ID must contain only digits');
  if (smartLinkUrl) {
    try {
      const url = new URL(smartLinkUrl);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error();
    } catch { throw new AdsConfigValidationError('SmartLink must be an HTTPS URL without embedded credentials'); }
  }
  const result: ProviderConfig = {
    version: 1,
    adsense: { enabled: enabled(adsense.enabled, 'AdSense enabled'), publisherId, slotId },
    adsterra: { enabled: enabled(adsterra.enabled, 'Adsterra enabled'), smartLinkUrl },
  };
  if (result.adsense.enabled && (!publisherId || !slotId)) throw new AdsConfigValidationError('AdSense needs a publisher ID and slot ID before enabling');
  if (result.adsterra.enabled && !smartLinkUrl) throw new AdsConfigValidationError('Adsterra needs a SmartLink URL before enabling');
  return result;
}

export function safeParseProviderConfig(value: unknown) {
  try { return parseProviderConfig(value); } catch { return createDefaultProviderConfig(); }
}

export function providerStatus(config: ProviderConfig) {
  return {
    adsense: config.adsense.enabled && config.adsense.publisherId && config.adsense.slotId ? 'enabled' : config.adsense.publisherId && config.adsense.slotId ? 'configured' : 'unconfigured',
    adsterra: config.adsterra.enabled && config.adsterra.smartLinkUrl ? 'enabled' : config.adsterra.smartLinkUrl ? 'configured' : 'unconfigured',
  } as const;
}
