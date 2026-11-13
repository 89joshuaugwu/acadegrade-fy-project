import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { computeCumulativeCGPA, roundCgpa } from '@/lib/cgpa/academicRules';

import crypto from 'crypto';

/** Profile text as plain text: no markup or control characters, single-spaced, bounded. */
function plainText(value: unknown, max = 180): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * POST /api/transcript/share — Create a shareable transcript snapshot.
 * Saves a read-only copy of the user's transcript data to `shared_transcripts/{shareId}`.
 * Returns the share ID and URL.
 *
 * GET /api/transcript/share?id=<shareId> — Fetch a shared transcript (public, no auth).
 */

export async function POST(request: NextRequest) {
  try {
    const timer = apiTimer();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    // Creating links is gated; reading an existing share (GET) stays public.
    const blocked = await checkPlatformAccess({ feature: 'transcript_share', email: decoded.email });
    if (blocked) return blocked;

    // Parse optional body for showPhoto preference
    let showPhoto = true;
    try {
      const body = await request.json();
      showPhoto = body.showPhoto !== false;
    } catch {
      // No body or invalid JSON — default to showing photo
    }

    // Fetch user profile
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const profile = userDoc.data() || {};

    // Fetch all completed semesters with courses
    const semSnap = await adminDb.collection(`users/${uid}/semesters`).get();
    const semesters: any[] = [];

    for (const semDoc of semSnap.docs) {
      const semData = semDoc.data();
      if (!semData.isComplete) continue;

      const courseSnap = await adminDb
        .collection(`users/${uid}/semesters/${semDoc.id}/courses`)
        .get();

      const courses = courseSnap.docs.map(c => ({ id: c.id, ...c.data() }));

      semesters.push({
        id: semDoc.id,
        ...semData,
        courses,
      });
    }

    // Sort by level then semester
    semesters.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.semester - b.semester;
    });

    // Transcript rule (same as the PDF): CGPA over completed semesters only,
    // and `semesters` above already holds only completed ones.
    const cumulative = computeCumulativeCGPA(semesters);

    // Generate a short share ID
    const shareId = crypto.randomBytes(6).toString('hex'); // 12 char hex

    // Save snapshot
    await adminDb.collection('shared_transcripts').doc(shareId).set({
      uid,
      studentName: profile.fullName || 'Student',
      matric: profile.matric || '',
      department: profile.department || '',
      programme: profile.programme || '',
      // Shown by the public share page as "as entered by the student".
      university: plainText(profile.university),
      cgpa: roundCgpa(cumulative.cgpa),
      pi: roundCgpa(cumulative.pi),
      totalCredits: cumulative.totalCredits,
      currentLevel: profile.currentLevel || '',
      avatarUrl: showPhoto ? (profile.avatarUrl || null) : null,
      showPhoto,
      semesters,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const origin = request.nextUrl.origin;
    const shareUrl = `${origin}/share/${shareId}`;

    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid, status: 200, durationMs: timer() });
    return NextResponse.json({ shareId, shareUrl });
  } catch (error: any) {
    console.error('Share transcript error:', error);
    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 500, durationMs: 0, error: error?.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const timer = apiTimer();
    const { searchParams } = request.nextUrl;
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'Missing share ID' }, { status: 400 });
    }

    const doc = await adminDb.collection('shared_transcripts').doc(shareId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Transcript not found or expired' }, { status: 404 });
    }

    const data = doc.data()!;

    // Check expiry
    const expiresAt = data.expiresAt?.toDate?.() || data.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This shared transcript has expired' }, { status: 410 });
    }

    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 200, durationMs: timer() });
    return NextResponse.json({ transcript: data });
  } catch (error: any) {
    console.error('Get shared transcript error:', error);
    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 500, durationMs: 0, error: error?.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
