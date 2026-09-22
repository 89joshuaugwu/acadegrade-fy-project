import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/ai/secrets';

const key = Buffer.alloc(32, 7).toString('base64');
const context = { secretId: 'groq-primary', providerId: 'groq' as const };

describe('AI secret encryption', () => {
  it('round-trips a secret without storing plaintext', () => {
    const encrypted = encryptSecret('gsk_secret_value', context, key);

    expect(JSON.stringify(encrypted)).not.toContain('gsk_secret_value');
    expect(decryptSecret(encrypted, context, key)).toBe('gsk_secret_value');
  });

  it('rejects ciphertext moved to another secret or provider', () => {
    const encrypted = encryptSecret('secret', context, key);

    expect(() => decryptSecret(encrypted, { ...context, secretId: 'other' }, key))
      .toThrow('Unable to decrypt AI secret');
  });

  it('masks a key without exposing more than its suffix', () => {
    expect(maskSecret('abcdefgh')).toBe('••••efgh');
  });
});
