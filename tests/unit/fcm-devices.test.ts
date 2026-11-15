import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildWebDevice, deviceIdFor, deviceLabel } from '@/lib/firebase/fcm-devices';

describe('fcmDevices helpers', () => {
  it('derives the same 16-hex id the server uses', async () => {
    const token = 'fcm-token-example:APA91b';
    expect(await deviceIdFor(token)).toBe(createHash('sha256').update(token).digest('hex').slice(0, 16));
    expect(await deviceIdFor(token)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('labels a browser and system, never the raw user agent', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')).toBe('Chrome on Windows');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0')).toBe('Edge on Windows');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')).toBe('Chrome on Android');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe('Safari on iOS');
    expect(deviceLabel('')).toBe('Browser');
    expect(deviceLabel(undefined)).toBe('Browser');
  });

  it('keeps addedAt when the device already exists and bounds the label', () => {
    expect(buildWebDevice('Chrome on Windows', 200, 100)).toEqual({ platform: 'web', label: 'Chrome on Windows', addedAt: 100, lastSeenAt: 200 });
    expect(buildWebDevice('x'.repeat(100), 200).label).toHaveLength(60);
    expect(buildWebDevice('A', 200, 'bad').addedAt).toBe(200);
  });
});
