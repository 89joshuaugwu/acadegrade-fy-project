import { NextResponse } from 'next/server';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb } from '@/lib/firebase/admin';
import { isValidLegalVersion, readLegalVersions } from '@/lib/user/requirements';

const headers = { 'Cache-Control': 'private, no-store' };

function failure(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers });
  return NextResponse.json({ error: 'Unable to manage legal versions.' }, { status: 500, headers });
}

/** GET /api/admin/legal -> { termsVersion, privacyVersion } (defaults when unset). */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(readLegalVersions((await adminDb.collection('config').doc('legal').get()).data()), { headers });
  } catch (error) { return failure(error); }
}

/**
 * PUT /api/admin/legal { termsVersion, privacyVersion }
 * Bumping either version re-prompts every user for that document.
 */
export async function PUT(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const keys = Object.keys(body ?? {});
    if (!body || keys.some((key) => key !== 'termsVersion' && key !== 'privacyVersion')
      || !isValidLegalVersion(body.termsVersion) || !isValidLegalVersion(body.privacyVersion)) {
      return NextResponse.json({ error: 'Versions must be 1-40 letters, digits, dots, dashes or underscores.' }, { status: 400, headers });
    }
    const ref = adminDb.collection('config').doc('legal');
    const before = readLegalVersions((await ref.get()).data());
    const after = { termsVersion: body.termsVersion, privacyVersion: body.privacyVersion };
    await ref.set({ ...after, updatedAt: new Date() }, { merge: true });
    await writeAdminAudit({ actorUid: actor.uid, actorEmail: actor.email, action: 'legal.update', target: 'config/legal', summary: 'Updated legal document versions', before, after });
    return NextResponse.json(after, { headers });
  } catch (error) { return failure(error); }
}
