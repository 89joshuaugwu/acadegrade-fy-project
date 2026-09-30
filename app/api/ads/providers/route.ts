import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { safeParseProviderConfig } from '@/lib/ads/providers';

export async function GET() {
  try {
    const settings = await adminDb.collection('config').doc('settings').get();
    return NextResponse.json({ config: safeParseProviderConfig(settings.data()?.adsProviderConfig) }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return NextResponse.json({ error: 'Provider settings unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
