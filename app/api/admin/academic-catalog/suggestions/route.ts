import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_CATALOG } from '@/lib/academic-catalog/defaults';
import { shortDisplayName } from '@/lib/academic-catalog/assign-server';
import { invalidateTypedNamesCache } from '@/lib/academic-catalog/typed-names';
import { createInitialCatalog, mutateCatalog, normalizeCatalogName, type CatalogKind, type CatalogSnapshot } from '@/lib/academic-catalog/model';

const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
    ? error.status : error instanceof Error && /invalid|not found|already reviewed/i.test(error.message) ? 400 : 500;
  return NextResponse.json({ error: status === 500 ? 'Unable to review academic suggestions.' : error instanceof Error ? error.message : 'Invalid request.' }, { status, headers });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('_academic_catalog_suggestions').where('status', '==', 'pending').limit(100).get();
    const suggestions = snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as Record<string, unknown> & { id: string }));
    // "Suggested by Chidi O.": short display names only (never emails). Fails open to null.
    const uids = [...new Set(suggestions.map((item) => item.uid).filter((uid): uid is string => typeof uid === 'string' && uid.length > 0))];
    const names = new Map<string, string>();
    try {
      const profiles = uids.length ? await adminDb.getAll(...uids.map((uid) => adminDb.collection('users').doc(uid))) : [];
      profiles.forEach((profile, index) => names.set(uids[index], shortDisplayName(profile.exists ? profile.data() : undefined)));
    } catch {
      names.clear();
    }
    return NextResponse.json({
      suggestions: suggestions.map((item) => ({ ...item, suggestedBy: typeof item.uid === 'string' ? names.get(item.uid) ?? null : null })),
    }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    if (!body || typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.id) || !['approve', 'reject'].includes(body.action)) {
      throw new Error('Invalid review request.');
    }
    const suggestionRef = adminDb.collection('_academic_catalog_suggestions').doc(body.id);
    const catalogRef = adminDb.collection('config').doc('academicCatalog');
    const result = await adminDb.runTransaction(async (transaction) => {
      const suggestionDocument = await transaction.get(suggestionRef);
      if (!suggestionDocument.exists) throw new Error('Suggestion not found.');
      const suggestion = suggestionDocument.data();
      if (suggestion?.status !== 'pending') throw new Error('Suggestion already reviewed.');
      const review = { reviewedBy: actor.uid, reviewedAt: new Date() };
      if (body.action === 'reject') {
        transaction.set(suggestionRef, { ...review, status: 'rejected' }, { merge: true });
        return { status: 'rejected' };
      }

      const catalogDocument = await transaction.get(catalogRef);
      const stored = catalogDocument.exists ? catalogDocument.data() : undefined;
      const catalog: CatalogSnapshot = stored && Number.isSafeInteger(stored.revision) && Array.isArray(stored.entries)
        ? { revision: stored.revision, entries: stored.entries }
        : createInitialCatalog(DEFAULT_CATALOG);
      const kind = suggestion.kind as CatalogKind;
      if (!['university', 'department', 'programme'].includes(kind) || typeof suggestion.name !== 'string') throw new Error('Invalid suggestion.');
      const matched = catalog.entries.find((entry) => entry.kind === kind && normalizeCatalogName(entry.name) === normalizeCatalogName(suggestion.name));
      if (matched) {
        transaction.set(suggestionRef, { ...review, status: 'merged', matchedEntryId: matched.id }, { merge: true });
        return { status: 'merged' };
      }
      const updated = mutateCatalog(catalog, { action: 'add', kind, name: suggestion.name });
      transaction.set(catalogRef, updated);
      transaction.set(suggestionRef, { ...review, status: 'approved' }, { merge: true });
      return { status: 'approved' };
    });
    invalidateTypedNamesCache();
    await writeAdminAudit({
      actorUid: actor?.uid, actorEmail: actor?.email ?? '', action: `academic-catalog.suggestion.${body.action}`,
      target: `_academic_catalog_suggestions/${body.id}`, after: result,
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
