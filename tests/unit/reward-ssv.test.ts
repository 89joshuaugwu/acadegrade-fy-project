import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createSsvVerifier } from '@/lib/ads/reward/ssv';

const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const raw = 'ad_network=5450213213286189855&ad_unit=5224354917&custom_data=session%2Bdata&reward_amount=10&reward_item=coins&timestamp=1790812800000&transaction_id=abc123&user_id=user%20one';
function signed(query = raw, keyId = '123') {
  return `https://example.com/api/ads/rewards/ssv?${query}&signature=${sign('sha256', Buffer.from(query), pair.privateKey).toString('base64url')}&key_id=${keyId}`;
}
function verifier() {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ keys: [{ keyId: 123, pem }] })));
  return { verify: createSsvVerifier(fetcher), fetcher };
}
describe('Google rewarded ECDSA SSV', () => {
  it('verifies exact raw bytes and decodes custom data only afterwards', async () => {
    const { verify, fetcher } = verifier();
    expect(await verify(signed())).toMatchObject({ customData: 'session+data', userId: 'user one', rewardAmount: 10, adUnit: '5224354917' });
    await verify(signed());
    expect(fetcher.mock.calls[0][0]).toBe('https://www.gstatic.com/admob/reward/verifier-keys.json');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects tampering, re-encoding, and unknown keys', async () => {
    const { verify } = verifier();
    await expect(verify(signed().replace('reward_amount=10', 'reward_amount=1'))).rejects.toThrow();
    await expect(verify(signed().replace('user%20one', 'user+one'))).rejects.toThrow();
    await expect(verify(signed(raw, '999'))).rejects.toThrow();
  });
  it('rejects duplicate signed fields and unsigned appended fields', async () => {
    const { verify } = verifier();
    await expect(verify(signed(`${raw}&user_id=other`))).rejects.toThrow();
    await expect(verify(`${signed()}&custom_data=other`)).rejects.toThrow();
    await expect(verify(signed().replace('&signature=', '&%73ignature='))).rejects.toThrow();
  });
  it('fails closed on key server failure', async () => {
    await expect(createSsvVerifier(vi.fn().mockResolvedValue(new Response('', { status: 503 })))(signed())).rejects.toThrow();
  });
});
