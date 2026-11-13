import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { readAgeStatusFrom, readAiConsent } from '@/lib/user/requirements';

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
        // Read from the profile already loaded: no extra reads.
        ageStatus: readAgeStatusFrom(data) ?? 'unknown',
        aiConsent: readAiConsent(data),
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

    const actor = { actorUid: decodedToken.uid, actorEmail: decodedToken.email ?? '' };
    const userRef = adminDb.collection('users').doc(String(uid));

    if (action === 'disable' || action === 'enable') {
      const disabled = action === 'disable';
      const before = (await userRef.get()).data()?.disabled === true;
      await adminAuth.updateUser(uid, { disabled });
      await userRef.update({ disabled });
      await writeAdminAudit({
        ...actor, action: `users.${action}`, target: `users/${uid}`, summary: disabled ? 'Disabled account' : 'Enabled account',
        before: { disabled: before }, after: { disabled },
      });
      return NextResponse.json({ success: true, message: disabled ? 'User disabled.' : 'User enabled.' });
    }

    // Support-only age correction (for example an "adult" who is under 18).
    // Students cannot go adult -> minor themselves; see /api/user/age.
    if (action === 'set-age') {
      if (body.ageStatus !== 'adult' && body.ageStatus !== 'minor') {
        return NextResponse.json({ error: "ageStatus must be 'adult' or 'minor'" }, { status: 400 });
      }
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason || reason.length > 300) {
        return NextResponse.json({ error: 'Give a reason for the correction (up to 300 characters).' }, { status: 400 });
      }
      const current = (await userRef.get()).data();
      if (!current) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const now = new Date();
      await userRef.set({
        ageStatus: body.ageStatus,
        ...(current.ageDeclaredAt ? {} : { ageDeclaredAt: now }),
        ageCorrectedAt: now,
        ageCorrectedBy: actor.actorEmail.toLowerCase(),
      }, { merge: true });
      await writeAdminAudit({
        ...actor, action: 'users.set-age', target: `users/${uid}`, summary: `Support age correction: ${reason}`,
        before: { ageStatus: current.ageStatus ?? null }, after: { ageStatus: body.ageStatus },
      });
      return NextResponse.json({ success: true, ageStatus: body.ageStatus });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
