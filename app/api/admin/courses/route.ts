import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Admin Course Catalog CRUD
 * GET    — List all courses
 * POST   — Add a new course
 * PUT    — Update a course
 * DELETE — Delete a course
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
    const snap = await adminDb.collection('courseCatalog').orderBy('code', 'asc').get();
    const courses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ courses });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const { code, title, units, department, level, semester } = body;

    if (!code || !title || !units) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const docRef = await adminDb.collection('courseCatalog').add({
      code: code.toUpperCase(),
      title,
      units: Number(units),
      department: department || '',
      level: Number(level) || 100,
      semester: Number(semester) || 1,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: docRef.id, message: 'Course added.' });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const { id, code, title, units, department, level, semester } = body;

    if (!id) return NextResponse.json({ error: 'Missing course id' }, { status: 400 });

    await adminDb.collection('courseCatalog').doc(id).update({
      code: code?.toUpperCase(),
      title,
      units: Number(units),
      department: department || '',
      level: Number(level) || 100,
      semester: Number(semester) || 1,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'Course updated.' });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing course id' }, { status: 400 });

    await adminDb.collection('courseCatalog').doc(id).delete();
    return NextResponse.json({ message: 'Course deleted.' });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
