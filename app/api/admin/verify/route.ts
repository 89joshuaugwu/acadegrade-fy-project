import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * POST /api/admin/verify
 * Verifies if the authenticated user's email is in the config/admins.emails list.
 * Returns { isAdmin: boolean }
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isAdmin: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ isAdmin: false, error: 'No email found' }, { status: 403 });
    }

    // Check config/admins document
    const adminsDoc = await adminDb.collection('config').doc('admins').get();
    const adminsData = adminsDoc.data();
    const adminEmails: string[] = adminsData?.emails || [];

    const isAdmin = adminEmails.includes(email.toLowerCase());

    return NextResponse.json({ isAdmin, email });
  } catch (error: any) {
    console.error('Admin verify error:', error);
    return NextResponse.json({ isAdmin: false, error: error.message }, { status: 500 });
  }
}
