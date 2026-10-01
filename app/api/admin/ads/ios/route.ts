import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { createDefaultMobileAdsConfig, parseMobileAdsConfig, safeMobileAdsConfig } from '@/lib/ads/mobile';

const headers = { 'Cache-Control': 'private, no-store' };

function failure(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403) ? error.status : 500;
  return NextResponse.json({ error: status === 500 ? 'Unable to manage iOS ads.' : error instanceof Error ? error.message : 'Unauthorized.' }, { status, headers });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('config').doc('iosAds').get();
    return NextResponse.json({ config: snapshot.exists ? safeMobileAdsConfig(snapshot.data()) : createDefaultMobileAdsConfig() }, { headers });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    let config;
    try {
      const body = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('config' in body)) throw new Error('Expected only config.');
      config = parseMobileAdsConfig(body.config);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message.replace(/Android/g, 'iOS') : 'Invalid iOS configuration.' }, { status: 400, headers });
    }
    await adminDb.collection('config').doc('iosAds').set(config);
    return NextResponse.json({ config }, { headers });
  } catch (error) { return failure(error); }
}
