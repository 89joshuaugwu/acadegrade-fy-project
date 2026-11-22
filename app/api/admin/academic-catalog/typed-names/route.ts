import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb } from '@/lib/firebase/admin';
import { AssignError, SUGGESTIONS } from '@/lib/academic-catalog/assign-server';
import { checkedName, normalizeCatalogName, type CatalogKind } from '@/lib/academic-catalog/model';
import { assignErrorResponse } from '@/lib/academic-catalog/route-errors';
import { ignoredSuggestionId, invalidateTypedNamesCache, loadTypedNames, studentsWhoTyped } from '@/lib/academic-catalog/typed-names';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const KINDS: CatalogKind[] = ['university', 'department', 'programme'];

function parseKindAndName(kind: unknown, name: unknown): { kind: CatalogKind; name: string } {
  if (!KINDS.includes(kind as CatalogKind) || typeof name !== 'string') throw new AssignError('Invalid request.');
  try {
    return { kind: kind as CatalogKind, name: checkedName(name) };
  } catch {
    throw new AssignError('Invalid request.');
  }
}

/**
 * GET (admin) -> { rows: [{ kind, name, normalizedName, count }], scanned, truncated, generatedAt }
 * GET ?kind=&name= (admin) -> { students: [{ uid, displayName }], total }  (no emails)
 * Server-side scan of users (capped, cached for a minute).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    if (url.searchParams.has('kind') || url.searchParams.has('name')) {
      const { kind, name } = parseKindAndName(url.searchParams.get('kind'), url.searchParams.get('name'));
      return NextResponse.json(await studentsWhoTyped(adminDb, kind, name), { headers });
    }
    return NextResponse.json(await loadTypedNames(adminDb), { headers });
  } catch (error) {
    return assignErrorResponse(error, 'Unable to load names typed by students.');
  }
}

/** POST (admin) { action: 'ignore', kind, name }: hide a typed name from the table. */
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    if (!body || body.action !== 'ignore') throw new AssignError('Invalid request.');
    const { kind, name } = parseKindAndName(body.kind, body.name);
    const normalizedName = normalizeCatalogName(name);
    const id = ignoredSuggestionId(kind, normalizedName);
    await adminDb.collection(SUGGESTIONS).doc(id).set({
      uid: null, kind, name, normalizedName, status: 'ignored', source: 'typed-names',
      reviewedBy: actor.uid, reviewedAt: new Date(), createdAt: new Date(),
    });
    invalidateTypedNamesCache();
    await writeAdminAudit({
      actorUid: actor.uid, actorEmail: actor.email, action: 'academic-catalog.typed-name.ignore',
      target: `${SUGGESTIONS}/${id}`, summary: `Ignored the typed ${kind} “${name}”`, after: { kind, name },
    });
    return NextResponse.json({ status: 'ignored' }, { headers });
  } catch (error) {
    return assignErrorResponse(error, 'Unable to ignore this name.');
  }
}
