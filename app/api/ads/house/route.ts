import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { buildHouseDelivery, safeHouseConfig } from '@/lib/ads/house';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('config').doc('mobileHouseAds').get();
    const config = safeHouseConfig(snapshot.data());
    const settings = config.enabled ? (await adminDb.collection('config').doc('settings').get()).data() : null;
    return NextResponse.json(buildHouseDelivery(config, settings), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(buildHouseDelivery(null, null), { headers: { 'Cache-Control': 'no-store' } });
  }
}
