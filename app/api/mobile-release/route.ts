import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { defaultMobileRelease, parseMobileRelease } from '@/lib/mobile-release/config';

export async function GET() {
  try {
    const document = await adminDb.collection('config').doc('mobileRelease').get();
    const release = document.exists ? parseMobileRelease(document.data()) : defaultMobileRelease();
    return NextResponse.json(release, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json(defaultMobileRelease(), { headers: { 'Cache-Control': 'no-store' } });
  }
}
