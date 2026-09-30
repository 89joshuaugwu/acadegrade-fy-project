import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AdsConfigValidationError } from '@/lib/ads/config';
import { parseProviderConfig, safeParseProviderConfig } from '@/lib/ads/providers';

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
  const admins = await adminDb.collection('config').doc('admins').get();
  if (!Array.isArray(admins.data()?.emails) || !admins.data()?.emails.includes(decoded.email?.toLowerCase())) throw new Error('Forbidden');
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const status = error instanceof AdsConfigValidationError ? 400 : message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
  return NextResponse.json({ error: status === 500 ? 'Unable to manage providers.' : message }, { status });
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    const settings = await adminDb.collection('config').doc('settings').get();
    return NextResponse.json({ config: safeParseProviderConfig(settings.data()?.adsProviderConfig) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('config' in body)) throw new AdsConfigValidationError('Expected only config');
    const config = parseProviderConfig(body.config);
    await adminDb.collection('config').doc('settings').set({ adsProviderConfig: config, updatedAt: new Date() }, { merge: true });
    return NextResponse.json({ config });
  } catch (error) { return failure(error); }
}
