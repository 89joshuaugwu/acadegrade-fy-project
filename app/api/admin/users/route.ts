import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/admin/users — List all users with profile data
 * POST /api/admin/users — Disable/enable a user account
 */

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminsDoc = await adminDb.collection('config').doc('admins').get();
    const adminEmails: string[] = adminsDoc.data()?.emails || [];
    if (!adminEmails.includes(decodedToken.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const usersSnap = await adminDb.collection('users').get();
    const users = [];

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // Count semesters
      const semSnap = await adminDb.collection(`users/${doc.id}/semesters`).get();
      let totalCredits = 0;
      let totalPoints = 0;
      let totalPIPoints = 0;

      for (const semDoc of semSnap.docs) {
        const semData = semDoc.data();
        if (semData.isComplete) {
          const credits = semData.creditLoaded || 0;
          totalCredits += credits;
          totalPoints += (semData.gpa || 0) * credits;
          totalPIPoints += (semData.pi || 0) * credits;
        }
      }

      const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
      const pi = totalCredits > 0 ? totalPIPoints / totalCredits : 0;

      users.push({
        uid: doc.id,
        fullName: data.fullName || 'Unknown',
        email: data.email || '',
        matric: data.matric || 'N/A',
        department: data.department || 'N/A',
        currentLevel: data.currentLevel || 100,
        cgpa,
        pi,
        semesterCount: semSnap.size,
        disabled: data.disabled || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      });
    }

    // Sort by creation date (newest first)
    users.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminsDoc = await adminDb.collection('config').doc('admins').get();
    const adminEmails: string[] = adminsDoc.data()?.emails || [];
    if (!adminEmails.includes(decodedToken.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, uid } = body;

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (action === 'disable') {
      await adminAuth.updateUser(uid, { disabled: true });
      await adminDb.collection('users').doc(uid).update({ disabled: true });
      return NextResponse.json({ success: true, message: 'User disabled.' });
    }

    if (action === 'enable') {
      await adminAuth.updateUser(uid, { disabled: false });
      await adminDb.collection('users').doc(uid).update({ disabled: false });
      return NextResponse.json({ success: true, message: 'User enabled.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
