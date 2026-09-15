import { AdsConfigValidationError, parseAdsConfig } from './config';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAdminAdsMutation(value: unknown) {
  if (!isRecord(value)) throw new AdsConfigValidationError('Ads request must be an object');
  const unsupported = Object.keys(value).find((key) => key !== 'config');
  if (unsupported) throw new AdsConfigValidationError(`Unsupported ads request field: ${unsupported}`);
  if (!('config' in value)) throw new AdsConfigValidationError('Ads request must include config');
  return parseAdsConfig(value.config);
}
