import 'server-only';

import { createHash } from 'node:crypto';
import { CLOUDINARY_CLOUD_NAME } from '@/lib/utils/constants';

/**
 * Server-side Cloudinary deletes (account deletion).
 * Needs CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET; CLOUDINARY_CLOUD_NAME
 * falls back to the cloud the apps upload to. Without credentials every call
 * is a quiet no-op ('skipped').
 */
export type CloudinaryDeleteResult = 'deleted' | 'skipped' | 'failed';

const TRANSFORMATION = /^[a-z]{1,4}_[^/]*$|,/;

/** Public id from a res.cloudinary.com delivery URL of the given cloud, or null. */
export function cloudinaryPublicId(url: string, cloudName: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
  const prefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  const segments = decodeURIComponent(parsed.pathname.slice(prefix.length)).split('/').filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  let rest = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  if (versionIndex < 0) {
    while (rest.length > 1 && TRANSFORMATION.test(rest[0])) rest = rest.slice(1);
  }
  if (!rest.length) return null;
  const last = rest[rest.length - 1].replace(/\.[A-Za-z0-9]+$/, '');
  const publicId = [...rest.slice(0, -1), last].join('/');
  return publicId || null;
}

export async function destroyCloudinaryAvatar(url: string | null | undefined): Promise<CloudinaryDeleteResult> {
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || CLOUDINARY_CLOUD_NAME;
  if (!url || !apiKey || !apiSecret) return 'skipped';
  const publicId = cloudinaryPublicId(url, cloudName);
  if (!publicId) return 'skipped';

  const timestamp = String(Math.floor(Date.now() / 1000));
  // Cloudinary signs the alphabetically sorted parameters followed by the secret.
  const signature = createHash('sha1').update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  const body = new URLSearchParams({ public_id: publicId, invalidate: 'true', timestamp, api_key: apiKey, signature });
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return 'failed';
    const result = await response.json().catch(() => null) as { result?: string } | null;
    return result?.result === 'ok' || result?.result === 'not found' ? 'deleted' : 'failed';
  } catch {
    return 'failed';
  }
}
