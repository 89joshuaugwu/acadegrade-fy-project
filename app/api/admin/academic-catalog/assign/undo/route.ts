import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb, adminRtdb } from '@/lib/firebase/admin';
import { AssignError, undoAssignment } from '@/lib/academic-catalog/assign-server';
import { assignErrorResponse } from '@/lib/academic-catalog/route-errors';
import { invalidateTypedNamesCache } from '@/lib/academic-catalog/typed-names';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/academic-catalog/assign/undo (admin) { assignmentId }
 * Puts back each profile that still holds the assigned name, removes the alias
 * and inbox items the Assign added, and reopens its suggestions.
 * -> 200 { assignmentId, restoredCount, keptCount, aliasRemoved }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json();
    if (!body || typeof body.assignmentId !== 'string') throw new AssignError('Invalid undo request.');
    const { record, ...result } = await undoAssignment(adminDb, adminRtdb, actor.uid, body.assignmentId);
    invalidateTypedNamesCache();
    await writeAdminAudit({
      actorUid: actor.uid, actorEmail: actor.email, action: 'academic-catalog.assign.undo',
      target: `config/academicCatalog#${String(record.entryId)}`,
      summary: `Undid assigning “${String(record.typed)}” to ${String(record.entryName)}; ${result.restoredCount} restored, ${result.keptCount} kept (changed since)`,
      after: result,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return assignErrorResponse(error, 'Unable to undo this change.');
  }
}
