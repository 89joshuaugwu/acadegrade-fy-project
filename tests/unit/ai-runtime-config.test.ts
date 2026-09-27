import { describe, expect, it } from 'vitest';
import {
  createManagedRuntimeConfig,
  parseAiRuntimeConfig,
  toMaskedAdminProjection,
} from '@/lib/ai/runtime-config';

const validManagedInput = {
  source: 'managed',
  revision: 1,
  routes: {
    insights: { mode: 'single', chain: [{ providerId: 'openrouter', modelId: 'openrouter/free', secretId: 'openrouter-primary' }] },
    forecast: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-primary' }] },
    whatif: { mode: 'single', chain: [{ providerId: 'groq', modelId: 'llama-3.3-70b-versatile', secretId: 'groq-primary' }] },
    extract: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-3.1-flash-lite', secretId: 'gemini-primary' }] },
  },
};

describe('AI runtime configuration', () => {
  it('rejects an arbitrary endpoint, provider, or model', () => {
    expect(() => parseAiRuntimeConfig({
      source: 'managed', revision: 1,
      routes: { insights: { mode: 'single', chain: [{ providerId: 'custom', modelId: 'http://127.0.0.1' }] } },
    })).toThrow('Unsupported AI provider');
  });

  it('marks only supported managed route references as activatable', () => {
    const config = createManagedRuntimeConfig(validManagedInput);

    expect(config.source).toBe('managed');
    expect(config.revision).toBe(1);
    expect(config.routes.extract?.chain[0].providerId).toBe('gemini');
  });

  it('accepts operator-supplied model IDs for known providers and rejects endpoint-like names', () => {
    const providerModels = {
      groq: ['llama-future-1'],
      openrouter: ['vendor/model-next:free'],
      gemini: ['gemini-next-version'],
    };
    const config = createManagedRuntimeConfig({
      ...validManagedInput,
      providerModels,
      routes: {
        ...validManagedInput.routes,
        extract: { mode: 'single', chain: [{ providerId: 'gemini', modelId: 'gemini-next-version', secretId: 'gemini-ocr' }] },
        forecast: { mode: 'disabled', chain: [] },
        whatif: { mode: 'disabled', chain: [] },
        insights: { mode: 'disabled', chain: [] },
      },
    });
    expect(config.routes.extract?.chain[0].modelId).toBe('gemini-next-version');
    expect(() => createManagedRuntimeConfig({ ...config, providerModels: { ...providerModels, gemini: ['https://example.test/model'] } })).toThrow('Invalid gemini model IDs');
  });

  it('returns masked key metadata only', () => {
    const projection = toMaskedAdminProjection({
      secretId: 'groq-primary', providerId: 'groq', state: 'active',
      ciphertext: 'ciphertext', iv: 'iv', tag: 'tag', version: 1,
    });

    expect(projection).not.toHaveProperty('ciphertext');
    expect(projection).not.toHaveProperty('iv');
    expect(projection).not.toHaveProperty('tag');
    expect(projection).toEqual({ secretId: 'groq-primary', providerId: 'groq', state: 'active', version: 1 });
  });
});
