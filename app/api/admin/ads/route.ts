import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { parseAdminAdsMutation } from '@/lib/ads/admin-schema';
import {
  AdsConfigValidationError,
  createDefaultAdsConfig,
  safeParseAdsConfig,
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
    const config = safeParseAdsConfig(settings?.adsConfig) ?? createDefaultAdsConfig();
    const legacyBannerCount = Array.isArray(settings?.advertBanners)
      ? settings.advertBanners.length
      : 0;

    return NextResponse.json(
      { config, legacyBannerCount },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin(request);
    const config = parseAdminAdsMutation(await request.json());
    await adminDb.collection('config').doc('settings').set(
      { adsConfig: config, updatedAt: new Date() },
      { merge: true }
    );
    return NextResponse.json({ config });
  } catch (error) {
    return errorResponse(error);
  }
}
