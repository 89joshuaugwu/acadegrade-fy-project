import { NextResponse } from 'next/server';
import { getMobileAppLinks } from '@/lib/mobile-app-links';

export const dynamic = 'force-dynamic';

/** Stable public Android URL; the admin-managed APK destination can change freely. */
export async function GET() {
  const { androidUrl } = await getMobileAppLinks();
  return NextResponse.redirect(androidUrl, { status: 307 });
}
