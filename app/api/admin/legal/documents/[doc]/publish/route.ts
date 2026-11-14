import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb } from '@/lib/firebase/admin';
import { validateLegalDraft } from '@/lib/legal/draft';
import { LEGAL_VERSION_FIELD, isLegalDocumentId, nextLegalVersion } from '@/lib/legal/versions';
import { isValidLegalVersion, readLegalVersions } from '@/lib/user/requirements';
import { legalFailure } from '@/lib/legal/http';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const PUBLIC_PATH = { terms: '/terms', privacy: '/privacy' } as const;

class PublishError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly issues?: string[]) { super(message); }
}

/**
 * POST { expectedCurrentVersion }: turns the saved draft into a new immutable version,
 * moves `config/legal` to it and clears the draft, all in one transaction. Every user is
 * then asked to agree again, because their accepted version no longer matches.
 */
export async function POST(request: Request, context: { params: Promise<{ doc: string }> }) {
  try {
    const actor = await requireAdmin(request);
    const { doc } = await context.params;
    if (!isLegalDocumentId(doc)) return NextResponse.json({ error: 'Unknown document.' }, { status: 404, headers });

    const body = await request.json() as Record<string, unknown> | null;
    if (!body || !isValidLegalVersion(body.expectedCurrentVersion)) {
      return NextResponse.json({ error: 'Send expectedCurrentVersion.' }, { status: 400, headers });
    }
    const expected = body.expectedCurrentVersion;
    const field = LEGAL_VERSION_FIELD[doc];
    const configRef = adminDb.collection('config').doc('legal');
    const documentRef = adminDb.collection('legal_documents').doc(doc);
    const now = new Date();

    const result = await adminDb.runTransaction(async (transaction) => {
      const [configSnap, documentSnap] = await Promise.all([transaction.get(configRef), transaction.get(documentRef)]);
      const current = readLegalVersions(configSnap.data())[field];
      if (current !== expected) {
        throw new PublishError('The current version changed since you opened this page. Reload and review before publishing.', 409, 'VERSION_MISMATCH');
      }
      const draft = documentSnap.data()?.draft;
      if (!draft) throw new PublishError('There is no saved draft to publish. Save a draft first.', 409, 'NO_DRAFT');

      // Re-check the saved text: it is public and every student is about to be asked to agree to it.
      const checked = validateLegalDraft({ title: draft.title, summary: draft.summary ?? '', effectiveDate: draft.effectiveDate, body: draft.body, changeNote: draft.changeNote ?? '' }, 0);
      if (!checked.ok && checked.issues) throw new PublishError(checked.error, 400, 'INVALID_LEGAL_DRAFT', checked.issues);

      const next = nextLegalVersion(current, now);
      transaction.create(documentRef.collection('versions').doc(next), {
        version: next, title: draft.title, summary: draft.summary ?? '', effectiveDate: draft.effectiveDate,
        body: draft.body, changeNote: draft.changeNote ?? '', publishedAt: now, publishedBy: actor.email,
      });
      transaction.set(configRef, { [field]: next, updatedAt: now }, { merge: true });
      transaction.set(documentRef, { draft: null }, { merge: true });
      return { previous: current, next, title: draft.title as string };
    });

    revalidatePath(PUBLIC_PATH[doc]);
    await writeAdminAudit({
      actorUid: actor.uid, actorEmail: actor.email, action: 'legal.publish', target: `legal_documents/${doc}`,
      summary: `Published ${doc} version ${result.next} ("${result.title}"). Every user is asked to agree again.`,
      before: { version: result.previous }, after: { version: result.next },
    });
    return NextResponse.json({ version: result.next }, { headers });
  } catch (error) {
    if (error instanceof PublishError) {
      return NextResponse.json({ error: error.message, code: error.code, ...(error.issues ? { issues: error.issues } : {}) }, { status: error.status, headers });
    }
    return legalFailure(error);
  }
}
