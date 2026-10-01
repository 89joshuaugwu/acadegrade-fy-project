import 'server-only';
import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { RewardError } from './errors';

const KEY_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
export interface VerifiedRewardCallback {
  adUnit: string;
  customData?: string;
  userId?: string;
  rewardAmount: number;
  rewardItem: string;
  timestamp: number;
  transactionId: string;
}

/** Only this verifier may turn an untrusted callback into reward input.
 * Google signs the exact raw UTF-8 query preceding &signature=, not a
 * URLSearchParams serialization. signature/key_id must be the final fields.
 * https://developers.google.com/admob/android/ssv
 */
export function createSsvVerifier(fetcher: typeof fetch = (...args) => fetch(...args)) {
  let keys = new Map<string, KeyObject>();
  let fetchedAt = 0;
  let pending: Promise<void> | undefined;
  async function refresh() {
    if (!pending) pending = (async () => {
      const response = await fetcher(KEY_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok) throw new RewardError('SSV verification keys unavailable', 503);
      const body = await response.json();
      if (!Array.isArray(body.keys) || !body.keys.length) throw new RewardError('SSV verification keys unavailable', 503);
      const next = new Map<string, KeyObject>();
      for (const entry of body.keys) {
        if (!/^\d+$/.test(String(entry.keyId)) || typeof entry.pem !== 'string') throw new RewardError('Invalid SSV verification keys', 503);
        const key = createPublicKey(entry.pem);
        if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new RewardError('Invalid SSV verification key', 503);
        next.set(String(entry.keyId), key);
      }
      keys = next; fetchedAt = Date.now();
    })().finally(() => { pending = undefined; });
    await pending;
  }
  return async (url: string): Promise<VerifiedRewardCallback> => {
    const question = url.indexOf('?');
    const raw = question < 0 ? '' : url.slice(question + 1);
    if (raw.length > 8192 || raw.includes('#')) throw new RewardError('Invalid SSV query');
    const match = /^(.*)&signature=([A-Za-z0-9_%=-]+)&key_id=(\d+)$/.exec(raw);
    if (!match || !match[1]) throw new RewardError('Invalid SSV signature parameters');
    const params = new URLSearchParams(match[1]);
    const names = new Set<string>();
    for (const [name] of params) {
      if (names.has(name) || name === 'signature' || name === 'key_id') throw new RewardError('Duplicate SSV parameters');
      names.add(name);
    }
    const signature = decodeURIComponent(match[2]);
    if (!/^[A-Za-z0-9_-]+={0,2}$/.test(signature)) throw new RewardError('Invalid SSV signature');
    if (!keys.size || Date.now() - fetchedAt >= 60 * 60 * 1000) await refresh();
    // A newly rotated key triggers an early refresh, bounded to once per minute.
    if (!keys.has(match[3]) && Date.now() - fetchedAt >= 60000) await refresh();
    const key = keys.get(match[3]);
    if (!key || !verify('sha256', Buffer.from(match[1], 'utf8'), key, Buffer.from(signature, 'base64url'))) throw new RewardError('Invalid SSV signature');
    const required = (name: string) => {
      const value = params.get(name);
      if (!value) throw new RewardError(`Missing SSV ${name}`);
      return value;
    };
    const amount = required('reward_amount'); const timestamp = required('timestamp');
    if (!/^\d+$/.test(amount) || !/^\d+$/.test(timestamp)) throw new RewardError('Invalid SSV reward or timestamp');
    const rewardAmount = Number(amount); const timestampMs = Number(timestamp);
    if (!Number.isSafeInteger(rewardAmount) || !Number.isSafeInteger(timestampMs)) throw new RewardError('Invalid SSV number');
    return {
      adUnit: required('ad_unit'), customData: params.get('custom_data') ?? undefined,
      userId: params.get('user_id') ?? undefined, rewardAmount,
      rewardItem: required('reward_item'), timestamp: timestampMs, transactionId: required('transaction_id'),
    };
  };
}

export const verifyRewardCallback = createSsvVerifier();
