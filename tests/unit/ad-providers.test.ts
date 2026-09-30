import { describe, expect, it } from 'vitest';
import { createDefaultProviderConfig, parseProviderConfig, providerStatus } from '@/lib/ads/providers';

describe('web provider config', () => {
  it('defaults both providers off', () => {
    expect(providerStatus(createDefaultProviderConfig())).toEqual({ adsense: 'unconfigured', adsterra: 'unconfigured' });
  });

  it('separates configured from enabled without implying provider approval', () => {
    const config = parseProviderConfig({ version: 1, adsense: { enabled: false, publisherId: 'ca-pub-1234567890123456', slotId: '1234567890' }, adsterra: { enabled: true, smartLinkUrl: 'https://example.com/path' } });
    expect(providerStatus(config)).toEqual({ adsense: 'configured', adsterra: 'enabled' });
  });

  it.each([
    { adsense: { enabled: true, publisherId: '', slotId: '' }, adsterra: { enabled: false, smartLinkUrl: '' } },
    { adsense: { enabled: false, publisherId: 'ca-pub-x', slotId: '123' }, adsterra: { enabled: false, smartLinkUrl: '' } },
    { adsense: { enabled: false, publisherId: '', slotId: '' }, adsterra: { enabled: true, smartLinkUrl: 'javascript:alert(1)' } },
  ])('rejects invalid or incomplete activation', (providers) => {
    expect(() => parseProviderConfig({ version: 1, ...providers })).toThrow();
  });
});
