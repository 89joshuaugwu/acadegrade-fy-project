import 'server-only';
import crypto from 'crypto';

/**
 * Share-link PINs are stored only as an scrypt hash with a random per-record salt.
 * The plain PIN is never stored, logged or returned.
 */

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// Node's defaults (N = 2^14, r = 8, p = 1): about 16 MB and tens of milliseconds per check.
const SCRYPT_OPTIONS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };

function scrypt(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pin, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPin(pin: string): Promise<{ pinHash: string; pinSalt: string }> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(pin, salt);
  return { pinHash: key.toString('hex'), pinSalt: salt.toString('hex') };
}

const HEX = /^[0-9a-f]+$/;

/** Constant-time comparison against the stored hash. Any malformed stored value fails closed. */
export async function verifyPin(pin: string, pinHash: unknown, pinSalt: unknown): Promise<boolean> {
  if (typeof pinHash !== 'string' || typeof pinSalt !== 'string') return false;
  if (pinHash.length !== KEY_LENGTH * 2 || !HEX.test(pinHash) || !pinSalt || !HEX.test(pinSalt) || pinSalt.length % 2) return false;
  try {
    const expected = Buffer.from(pinHash, 'hex');
    const actual = await scrypt(pin, Buffer.from(pinSalt, 'hex'));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
