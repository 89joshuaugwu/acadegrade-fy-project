import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_CATALOG } from '@/lib/academic-catalog/defaults';
import { createInitialCatalog, publicCatalog, type CatalogSnapshot } from '@/lib/academic-catalog/model';

export async function GET() {
  try {
    const document = await adminDb.collection('config').doc('academicCatalog').get();
    const stored = document.exists ? document.data() : null;
    const snapshot: CatalogSnapshot = stored && Number.isSafeInteger(stored.revision) && Array.isArray(stored.entries)
      ? { revision: stored.revision, entries: stored.entries }
      : createInitialCatalog(DEFAULT_CATALOG);
    return NextResponse.json(publicCatalog(snapshot), {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Academic catalog unavailable.' }, { status: 503 });
  }
}
