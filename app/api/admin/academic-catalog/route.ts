import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/api/admin-auth';
import { DEFAULT_CATALOG } from '@/lib/academic-catalog/defaults';
import { createInitialCatalog, mutateCatalog, type CatalogMutation, type CatalogSnapshot } from '@/lib/academic-catalog/model';

const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
    ? error.status : error instanceof SyntaxError || error instanceof TypeError || error instanceof Error && /name|catalog entry|already exists|invalid/i.test(error.message)
      ? 400 : 500;
  return NextResponse.json({ error: status === 500 ? 'Unable to manage academic catalog.' : error instanceof Error ? error.message : 'Invalid request.' }, { status, headers });
}

function parseMutation(body: unknown): CatalogMutation {
  if (!body || typeof body !== 'object') throw new TypeError('Invalid mutation.');
  const value = body as Record<string, unknown>;
  if (value.action === 'add' && (value.kind === 'university' || value.kind === 'department' || value.kind === 'programme') && typeof value.name === 'string') {
    return { action: 'add', kind: value.kind, name: value.name };
  }
  if (value.action === 'edit' && typeof value.id === 'string' && typeof value.name === 'string') {
    return { action: 'edit', id: value.id, name: value.name };
  }
  if ((value.action === 'archive' || value.action === 'restore') && typeof value.id === 'string') {
    return { action: value.action, id: value.id };
  }
  throw new TypeError('Invalid mutation.');
}

function catalogFromDocument(document: { exists: boolean; data(): FirebaseFirestore.DocumentData | undefined }): CatalogSnapshot {
  const data = document.exists ? document.data() : undefined;
  return data && Number.isSafeInteger(data.revision) && Array.isArray(data.entries)
    ? { revision: data.revision, entries: data.entries }
    : createInitialCatalog(DEFAULT_CATALOG);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const document = await adminDb.collection('config').doc('academicCatalog').get();
    return NextResponse.json(catalogFromDocument(document), { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const mutation = parseMutation(await request.json());
    const reference = adminDb.collection('config').doc('academicCatalog');
    const updated = await adminDb.runTransaction(async (transaction) => {
      const document = await transaction.get(reference);
      const next = mutateCatalog(catalogFromDocument(document), mutation);
      transaction.set(reference, next);
      return next;
    });
    return NextResponse.json(updated, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
