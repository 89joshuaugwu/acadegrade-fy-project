import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { defaultMobileRelease, parseMobileRelease } from '@/lib/mobile-release/config';

const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
    ? error.status : error instanceof SyntaxError || error instanceof Error && /invalid|requires|HTTPS|too long/i.test(error.message) ? 400 : 500;
  return NextResponse.json({ error: status === 500 ? 'Unable to manage Android release.' : error instanceof Error ? error.message : 'Invalid request.' }, { status, headers });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const document = await adminDb.collection('config').doc('mobileRelease').get();
    const config = document.exists ? parseMobileRelease(document.data()) : defaultMobileRelease();
    return NextResponse.json(config, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const config = parseMobileRelease(await request.json());
    await adminDb.collection('config').doc('mobileRelease').set(config);
    return NextResponse.json(config, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
