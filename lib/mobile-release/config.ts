export interface MobileReleaseConfig {
  enabled: boolean;
  latestVersion: string;
  latestBuild: number;
  minSupportedBuild: number;
  allowIgnore: boolean;
  headline: string;
  message: string;
  imageUrl: string;
  downloadUrl: string;
}

export function defaultMobileRelease(): MobileReleaseConfig {
  return {
    enabled: false,
    latestVersion: '',
    latestBuild: 0,
    minSupportedBuild: 0,
    allowIgnore: true,
    headline: 'A new AcadeGrade update is available',
    message: 'Download the latest Android app to get the newest improvements.',
    imageUrl: '',
    downloadUrl: '',
  };
}

function checkedHttps(value: string, field: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || value.length > 2048) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${field} must be an HTTPS URL.`);
  }
}

export function parseMobileRelease(value: unknown): MobileReleaseConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Android release settings.');
  const data = value as Record<string, unknown>;
  const keys = Object.keys(defaultMobileRelease());
  if (Object.keys(data).some((key) => !keys.includes(key))) throw new Error('Invalid Android release field.');
  if (typeof data.enabled !== 'boolean' || typeof data.allowIgnore !== 'boolean') throw new Error('Invalid Android release switches.');
  if (!Number.isSafeInteger(data.latestBuild) || (data.latestBuild as number) < 0) throw new Error('Invalid Android build number.');
  const minSupportedBuild = data.minSupportedBuild === undefined ? 0 : data.minSupportedBuild;
  if (!Number.isSafeInteger(minSupportedBuild) || (minSupportedBuild as number) < 0) throw new Error('Invalid minimum supported build.');
  for (const field of ['latestVersion', 'headline', 'message', 'imageUrl', 'downloadUrl'] as const) {
    if (typeof data[field] !== 'string') throw new Error(`Invalid ${field}.`);
  }
  const latestVersion = (data.latestVersion as string).trim();
  const headline = (data.headline as string).trim();
  const message = (data.message as string).trim();
  if (latestVersion.length > 40 || headline.length > 100 || message.length > 400) throw new Error('Android release text is too long.');
  const imageUrl = checkedHttps((data.imageUrl as string).trim(), 'Image URL');
  const downloadUrl = checkedHttps((data.downloadUrl as string).trim(), 'Download URL');
  if (data.enabled && (!/^\d+\.\d+\.\d+$/.test(latestVersion) || !data.latestBuild || !downloadUrl || !headline)) {
    throw new Error('Enabled release requires a version, build number, headline, and HTTPS download URL.');
  }
  if (data.enabled && (minSupportedBuild as number) > (data.latestBuild as number)) throw new Error('Minimum supported build cannot exceed the latest build.');
  return { enabled: data.enabled, latestVersion, latestBuild: data.latestBuild as number, minSupportedBuild: minSupportedBuild as number, allowIgnore: data.allowIgnore, headline, message, imageUrl, downloadUrl };
}
