import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb } from '@/lib/firebase/admin';
import { validateLegalDraft } from '@/lib/legal/draft';
import { legalFailure } from '@/lib/legal/http';
import { getPublishedLegal } from '@/lib/legal/server';
import { LEGAL_VERSION_FIELD, isLegalDocumentId } from '@/lib/legal/versions';
import { readLegalVersions } from '@/lib/user/requirements';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
type Context = { params: Promise<{ doc: string }> };

const toIso = (value: unknown): string | null => {
  const withToDate = value as { toDate?: () => Date } | null;
  let date: Date | null = null;
  if (withToDate && typeof withToDate.toDate === 'function') date = withToDate.toDate();
  else if (value instanceof Date) date = value;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

/**
 * GET: the live text, the saved draft and the version history for `terms` or `privacy`.
 * Everything here comes from server-only collections; the text is public anyway.
 */
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { doc } = await context.params;
    if (!isLegalDocumentId(doc)) return NextResponse.json({ error: 'Unknown document.' }, { status: 404, headers });

    const documentRef = adminDb.collection('legal_documents').doc(doc);
    const [current, config, documentSnap, versionsSnap] = await Promise.all([
      getPublishedLegal(doc),
      adminDb.collection('config').doc('legal').get(),
      documentRef.get(),
      documentRef.collection('versions').orderBy('publishedAt', 'desc').limit(20).get(),
    ]);

    const draft = documentSnap.data()?.draft;
    return NextResponse.json({
      current,
      configVersion: readLegalVersions(config.data())[LEGAL_VERSION_FIELD[doc]],
      draft: draft ? {
        title: draft.title, summary: draft.summary ?? '', effectiveDate: draft.effectiveDate, body: draft.body,
        changeNote: draft.changeNote ?? '', updatedAt: toIso(draft.updatedAt), updatedBy: draft.updatedBy ?? null,
      } : null,
      versions: versionsSnap.docs.map((snapshot) => {
        const data = snapshot.data();
        return { version: data.version ?? snapshot.id, publishedAt: toIso(data.publishedAt), publishedBy: data.publishedBy ?? null, changeNote: data.changeNote ?? '' };
      }),
    }, { headers });
  } catch (error) { return legalFailure(error); }
}

/** PUT: saves the draft. It is validated (including the markup) but not published. */
export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireAdmin(request);
    const { doc } = await context.params;
    if (!isLegalDocumentId(doc)) return NextResponse.json({ error: 'Unknown document.' }, { status: 404, headers });

    const result = validateLegalDraft(await request.json());
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: 'INVALID_LEGAL_DRAFT', ...(result.issues ? { issues: result.issues } : {}) }, { status: 400, headers });
    }

    const draft = { ...result.draft, updatedAt: new Date(), updatedBy: actor.email };
    await adminDb.collection('legal_documents').doc(doc).set({ draft }, { merge: true });
    // The audit entry never carries the text itself, only what changed in general terms.
    await writeAdminAudit({
      actorUid: actor.uid, actorEmail: actor.email, action: 'legal.draft.save', target: `legal_documents/${doc}`,
      summary: `Saved ${doc} draft "${draft.title}" (effective ${draft.effectiveDate}, ${draft.body.length} characters)`,
    });
    return NextResponse.json({ ok: true, savedAt: draft.updatedAt.toISOString() }, { headers });
  } catch (error) { return legalFailure(error); }
}
