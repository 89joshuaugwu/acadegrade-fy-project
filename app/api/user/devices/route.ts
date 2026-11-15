import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const WINDOWS = [
  { name: 'hourly', limit: 20, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 60, windowMs: 24 * 60 * 60 * 1000 },
];
const DEVICE_ID = /^[0-9a-f]{16}$/;
/** Same id the apps use for `users/{uid}.fcmDevices`: first 16 hex characters of sha256(token). */
const deviceIdFor = (token: string) => createHash('sha256').update(token).digest('hex').slice(0, 16);

const EFFECT = 'Other devices are signed out within an hour. Until then, a device that is already open may keep working.';

/**
 * POST /api/user/devices (signed in)
 *   { action: 'remove', deviceId }   removes that device's push token and its fcmDevices entry
 *   { action: 'sign-out-all' }       revokes every refresh token and clears all tokens and devices
 * -> { ok: true, effect? }
 * Revoking refresh tokens does not end an ID token that is already issued, so sign-out-all
 * takes full effect "within an hour"; the copy must say so. Not blocked by maintenance mode.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    const input = body && typeof body === 'object' ? body as { action?: unknown; deviceId?: unknown } : {};
    const action = input.action;
    if (action !== 'remove' && action !== 'sign-out-all') {
      return NextResponse.json({ error: 'Choose remove or sign-out-all.' }, { status: 400, headers });
    }
    const deviceId = typeof input.deviceId === 'string' ? input.deviceId : '';
    if (action === 'remove' && !DEVICE_ID.test(deviceId)) {
      return NextResponse.json({ error: 'Unknown device.' }, { status: 400, headers });
    }

    const limit = await checkRateLimit(user.uid, 'user_devices', WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'Too many device changes. Please try again later.');

    const ref = adminDb.collection('users').doc(user.uid);

    if (action === 'sign-out-all') {
      await adminAuth.revokeRefreshTokens(user.uid);
      const snapshot = await ref.get();
      if (snapshot.exists) await ref.update({ fcmTokens: [], fcmDevices: {}, ...(snapshot.data()?.fcmToken ? { fcmToken: null } : {}) });
      return NextResponse.json({ ok: true, effect: EFFECT }, { headers });
    }

    {
      const snapshot = await ref.get();
      const data = snapshot.data() ?? {};
      const tokens: string[] = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter((value: unknown): value is string => typeof value === 'string') : [];
      const devices = data.fcmDevices && typeof data.fcmDevices === 'object' ? { ...data.fcmDevices as Record<string, unknown> } : {};
      delete devices[deviceId];
      const patch: Record<string, unknown> = { fcmTokens: tokens.filter((token) => deviceIdFor(token) !== deviceId), fcmDevices: devices };
      if (typeof data.fcmToken === 'string' && deviceIdFor(data.fcmToken) === deviceId) patch.fcmToken = null;
      if (snapshot.exists) await ref.update(patch);
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    console.error('Device update failed');
    return NextResponse.json({ error: 'Unable to update your devices. Please try again.' }, { status: 500, headers });
  }
}
