import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type SupportedProviderId = 'groq' | 'openrouter' | 'gemini';

export type SecretContext = {
  secretId: string;
  providerId: SupportedProviderId;
};

export type EncryptedSecret = {
  version: 1;
  ciphertext: string;
  iv: string;
  tag: string;
};

const DECRYPTION_ERROR = 'Unable to decrypt AI secret';
const deploymentMasterKey = () => process.env.AI_CONFIG_MASTER_KEY ?? process.env.AI_SECRETS_MASTER_KEY;

function parseMasterKey(encodedKey: string | undefined): Buffer {
  if (!encodedKey || encodedKey.trim() !== encodedKey) {
    throw new Error('AI_CONFIG_MASTER_KEY must be a base64-encoded 32-byte value');
  }

  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encodedKey) {
    throw new Error('AI_CONFIG_MASTER_KEY must be a base64-encoded 32-byte value');
  }

  return key;
}

function serializeContext(context: SecretContext): Buffer {
  if (!context.secretId || !context.providerId) {
    throw new Error(DECRYPTION_ERROR);
  }

  return Buffer.from(JSON.stringify({ secretId: context.secretId, providerId: context.providerId }));
}

export function encryptSecret(
  plaintext: string,
  context: SecretContext,
  encodedKey = deploymentMasterKey()
): EncryptedSecret {
  if (!plaintext) {
    throw new Error('AI secret value must not be empty');
  }

  const key = parseMasterKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(serializeContext(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return {
    version: 1,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(
  record: EncryptedSecret,
  context: SecretContext,
  encodedKey = deploymentMasterKey()
): string {
  try {
    if (record.version !== 1) throw new Error('Unsupported secret version');

    const decipher = createDecipheriv('aes-256-gcm', parseMasterKey(encodedKey), Buffer.from(record.iv, 'base64'));
    decipher.setAAD(serializeContext(context));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error(DECRYPTION_ERROR);
  }
}

export function maskSecret(value: string): string {
  if (!value) return '••••';
  return `••••${value.slice(-4)}`;
}
