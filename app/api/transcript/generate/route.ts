import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
// import { buildTranscript } from '@/lib/pdf/transcript';
import type { User } from '@/types/user';
import type { SemesterWithCourses } from '@/types/semester';
import type { CourseWithId } from '@/types/course';

export async function POST(req: Request) {
  try {
    const timer = apiTimer();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Parse request body for showPhoto preference
    let showPhoto = true;
    try {
      const body = await req.json();
      showPhoto = body.showPhoto !== false;
    } catch {
      // No body — default to showing photo
    }

    // Fetch user
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data() as User;

    // Fetch semesters
    const semestersSnapshot = await adminDb.collection(`users/${uid}/semesters`).get();
    const semesters: SemesterWithCourses[] = [];

    for (const doc of semestersSnapshot.docs) {
      const semData = doc.data() as any;
      const coursesSnapshot = await adminDb.collection(`users/${uid}/semesters/${doc.id}/courses`).get();
      const courses = coursesSnapshot.docs.map(c => ({ id: c.id, ...c.data() } as CourseWithId));
      
      semesters.push({
        id: doc.id,
        ...semData,
        courses
      });
    }

    // Fetch analytics for forecast/insights
    const analyticsDoc = await adminDb.collection('analytics').doc(uid).get();
    const analytics = analyticsDoc.exists ? analyticsDoc.data() : null;

    // Optionally fetch user avatar as base64 for PDF embedding
    let avatarBase64: string | null = null;
    if (showPhoto && userData.avatarUrl) {
      try {
        const imgRes = await fetch(userData.avatarUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          avatarBase64 = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (imgErr) {
        console.warn('Failed to fetch avatar for PDF:', imgErr);
      }
    }

    let doc;
    try {
      const { buildTranscript } = await import('@/lib/pdf/transcript');
      doc = buildTranscript(userData, semesters, analytics as any, { showPhoto, avatarBase64 });
    } catch (pdfError: any) {
      console.error('jsPDF generation failed on server:', pdfError);
      return NextResponse.json({ 
        error: 'Server-side PDF generation failed. This usually requires client-side generation.',
        details: pdfError.message 
      }, { status: 500 });
    }

    // Get array buffer
    const arrayBuffer = doc.output('arraybuffer');

    logApiCall({ endpoint: '/api/transcript/generate', category: 'transcript', uid, status: 200, durationMs: timer() });
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="transcript.pdf"'
      }
    });

  } catch (error: any) {
    console.error('Transcript API Error:', error);
    logApiCall({ endpoint: '/api/transcript/generate', category: 'transcript', uid: null, status: 500, durationMs: 0, error: error?.message });
    return NextResponse.json({ error: 'Failed to generate transcript' }, { status: 500 });
  }
}
