import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_ABOUT_CONTENT, normalizeAboutContent } from '@/lib/about/content';

/**
 * GET /api/about — Public endpoint to fetch the "About" page content.
 * Reads from Firestore config/about document.
 */
export async function GET() {
  try {
    const doc = await adminDb.collection('config').doc('about').get();

    return NextResponse.json({
      about: doc.exists ? normalizeAboutContent(doc.data()) : DEFAULT_ABOUT_CONTENT,
    });
  } catch (error: any) {
    console.error('About GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
