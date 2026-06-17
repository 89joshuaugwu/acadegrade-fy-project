import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET  /api/admin/settings — Read platform settings
 * POST /api/admin/settings — Update platform settings
 */

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = authHeader.split('Bearer ')[1];
  const decoded = await adminAuth.verifyIdToken(token);
  const adminsDoc = await adminDb.collection('config').doc('admins').get();
  const emails: string[] = adminsDoc.data()?.emails || [];
  if (!emails.includes(decoded.email?.toLowerCase() || '')) throw new Error('Forbidden');
  return decoded;
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    const doc = await adminDb.collection('config').doc('settings').get();
    const data = doc.exists ? doc.data() : {};
    return NextResponse.json({ settings: data });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const { field, value } = body;

    if (!field) {
      return NextResponse.json({ error: 'Missing field name' }, { status: 400 });
    }

    // Update the specific field in config/settings
    await adminDb.collection('config').doc('settings').set(
      { [field]: value, updatedAt: new Date() },
      { merge: true }
    );

    return NextResponse.json({ message: `Setting "${field}" updated.` });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
