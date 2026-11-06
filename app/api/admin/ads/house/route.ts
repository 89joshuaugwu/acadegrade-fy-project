import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { HouseConfigError, parseHouseConfig, safeHouseConfig } from '@/lib/ads/house';

const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  const authStatus = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403) ? error.status : null;
  const status = authStatus ?? (error instanceof HouseConfigError || error instanceof SyntaxError ? 400 : 500);
  return NextResponse.json({ error: status === 500 ? 'Unable to manage Android house promotions.' : error instanceof Error ? error.message : 'Invalid request.' }, { status, headers });
}
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('config').doc('mobileHouseAds').get();
    return NextResponse.json({ config: safeHouseConfig(snapshot.data()) }, { headers });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('config' in body)) throw new HouseConfigError('Expected only config.');
    const config = parseHouseConfig(body.config);
    await adminDb.collection('config').doc('mobileHouseAds').set(config);
    return NextResponse.json({ config }, { headers });
  } catch (error) { return failure(error); }
}
