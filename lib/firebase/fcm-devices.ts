/**
 * `users/{uid}.fcmDevices` helpers (E4 privacy and security centre).
 *
 * Shape (client-written, alongside `fcmTokens`; Android mirrors it):
 *   fcmDevices: { [sha256(token).slice(0, 16)]: { platform: 'web'|'android', label: string (<= 60),
 *                 appVersion?: string, addedAt: epoch ms, lastSeenAt: epoch ms } }
 * The device id is the first 16 hex characters of sha256(FCM token); the server derives the same id.
 */

export const DEVICE_LABEL_MAX = 60;

export async function deviceIdFor(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** A short, human label such as "Chrome on Windows". Never the full user agent. */
export function deviceLabel(userAgent: string | undefined | null): string {
  const ua = userAgent ?? '';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /CrOS/.test(ua) ? 'ChromeOS'
            : /Linux/.test(ua) ? 'Linux' : '';
  return (os ? `${browser} on ${os}` : browser).slice(0, DEVICE_LABEL_MAX);
}

export interface WebDeviceRecord { platform: 'web'; label: string; addedAt: number; lastSeenAt: number }

export function buildWebDevice(label: string, now: number, existingAddedAt?: unknown): WebDeviceRecord {
  const addedAt = typeof existingAddedAt === 'number' && Number.isFinite(existingAddedAt) ? existingAddedAt : now;
  return { platform: 'web', label: label.slice(0, DEVICE_LABEL_MAX), addedAt, lastSeenAt: now };
}
