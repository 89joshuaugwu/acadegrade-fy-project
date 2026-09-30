import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { createDefaultMobileAdsConfig, parseMobileAdsConfig, safeMobileAdsConfig } from '@/lib/ads/mobile';

const headers = { 'Cache-Control': 'private, no-store' };

function failure(error: unknown) {
  const authStatus = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403) ? error.status : null;
  const status = authStatus ?? (error instanceof SyntaxError || error instanceof Error && /Android|banner|unit|switch|version|unsupported|missing|production/i.test(error.message) ? 400 : 500);
  return NextResponse.json({ error: status === 500 ? 'Unable to manage Android ads.' : error instanceof Error ? error.message : 'Invalid request.' }, { status, headers });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('config').doc('mobileAds').get();
    return NextResponse.json({ config: snapshot.exists ? safeMobileAdsConfig(snapshot.data()) : createDefaultMobileAdsConfig() }, { headers });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('config' in body)) {
      return NextResponse.json({ error: 'Expected only config.' }, { status: 400, headers });
    }
    const config = parseMobileAdsConfig(body.config);
    await adminDb.collection('config').doc('mobileAds').set(config);
    return NextResponse.json({ config }, { headers });
  } catch (error) { return failure(error); }
}
