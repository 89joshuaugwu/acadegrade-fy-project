import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { parseAdminAdsMutation } from '@/lib/ads/admin-schema';
import {
  AdsConfigValidationError,
  createDefaultAdsConfig,
  parseStoredAdsConfig,
} from '@/lib/ads/config';

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Unauthorized');

  const decoded = await adminAuth.verifyIdToken(authorization.slice('Bearer '.length));
  const adminsDocument = await adminDb.collection('config').doc('admins').get();
  const adminEmails = adminsDocument.data()?.emails;
  const normalizedEmail = decoded.email?.toLowerCase() ?? '';
  if (!Array.isArray(adminEmails) || !adminEmails.includes(normalizedEmail)) {
    throw new Error('Forbidden');
  }
  return { uid: decoded.uid, email: normalizedEmail };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to manage ads.';
  if (error instanceof AdsConfigValidationError) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
  return NextResponse.json(
    { error: status === 500 ? 'Unable to manage ads.' : message },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    const settingsDocument = await adminDb.collection('config').doc('settings').get();
    const settings = settingsDocument.exists ? settingsDocument.data() : {};
    let config = createDefaultAdsConfig();
    let warnings: string[] = [];
    if (settings?.adsConfig !== undefined) {
      try {
        ({ config, skipped: warnings } = parseStoredAdsConfig(settings.adsConfig));
      } catch {
        // Never present defaults as if they were the saved campaigns.
        warnings = ['The saved house campaign configuration could not be read, so defaults are shown. Saving replaces the stored configuration.'];
      }
    }
    const legacyBannerCount = Array.isArray(settings?.advertBanners)
      ? settings.advertBanners.length
      : 0;

    return NextResponse.json(
      { config, legacyBannerCount, warnings },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await verifyAdmin(request);
    const config = parseAdminAdsMutation(await request.json());
    const before = (await adminDb.collection('config').doc('settings').get()).data()?.adsConfig ?? null;
    await adminDb.collection('config').doc('settings').set(
      { adsConfig: config, updatedAt: new Date() },
      { merge: true }
    );
    await writeAdminAudit({ actorUid: actor.uid, actorEmail: actor.email, action: 'ads.web-house.update', target: 'config/settings.adsConfig', before, after: config });
    return NextResponse.json({ config });
  } catch (error) {
    return errorResponse(error);
  }
}
