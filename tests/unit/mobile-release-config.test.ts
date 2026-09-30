import { describe, expect, it } from 'vitest';
import { defaultMobileRelease, parseMobileRelease } from '@/lib/mobile-release/config';

describe('Android release configuration', () => {
  it('is inert by default', () => {
    expect(defaultMobileRelease()).toMatchObject({ enabled: false, allowIgnore: true, latestBuild: 0 });
  });

  it('requires a valid build and HTTPS download URL before activation', () => {
    expect(() => parseMobileRelease({ ...defaultMobileRelease(), enabled: true, latestVersion: '1.1.0', latestBuild: 2, downloadUrl: 'http://example.com/app.apk' })).toThrow(/HTTPS/i);
  });

  it('accepts an optional release with an explicit download target', () => {
    expect(parseMobileRelease({ ...defaultMobileRelease(), enabled: true, latestVersion: '1.1.0', latestBuild: 2, downloadUrl: 'https://example.com/app.apk' })).toMatchObject({ enabled: true, allowIgnore: true, latestBuild: 2 });
  });
  it('validates the minimum supported build and accepts legacy stored configs', () => {
    const active = { ...defaultMobileRelease(), enabled: true, latestVersion: '1.1.0', latestBuild: 5, downloadUrl: 'https://example.com/app.apk' };
    expect(parseMobileRelease({ ...active, minSupportedBuild: 3 }).minSupportedBuild).toBe(3);
    expect(() => parseMobileRelease({ ...active, minSupportedBuild: 6 })).toThrow(/minimum supported/i);
    expect(() => parseMobileRelease({ ...active, minSupportedBuild: -1 })).toThrow(/minimum supported/i);
    const { minSupportedBuild: _ignored, ...legacy } = active;
    expect(parseMobileRelease(legacy).minSupportedBuild).toBe(0);
  });
});
