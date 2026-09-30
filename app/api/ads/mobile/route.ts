import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { deliveryMobileAdsConfig, safeMobileAdsConfig } from '@/lib/ads/mobile';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('config').doc('mobileAds').get();
    const config = deliveryMobileAdsConfig(safeMobileAdsConfig(snapshot.data()));
    return NextResponse.json(config, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return NextResponse.json(deliveryMobileAdsConfig(safeMobileAdsConfig(null)), { headers: { 'Cache-Control': 'no-store' } });
  }
}
