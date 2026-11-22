import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { adminDb, adminRtdb } from '@/lib/firebase/admin';
import { assignTypedName, parseAssignInput } from '@/lib/academic-catalog/assign-server';
import { assignErrorResponse } from '@/lib/academic-catalog/route-errors';
import { invalidateTypedNamesCache } from '@/lib/academic-catalog/typed-names';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * POST /api/admin/academic-catalog/assign (admin)
 * { suggestionId } | { kind, name }, plus { entryId, departmentEntryId?, updateAll? = true }
 * -> 200 { assignmentId, entryName, departmentName, changedCount, aliasAdded, aliasNote, truncated }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const input = parseAssignInput(await request.json());
    const result = await assignTypedName(adminDb, adminRtdb, actor.uid, input);
    invalidateTypedNamesCache();
    await writeAdminAudit({
      actorUid: actor.uid, actorEmail: actor.email, action: 'academic-catalog.assign',
      target: `config/academicCatalog#${input.entryId}`,
      summary: `Assigned the ${result.kind} “${result.typed}” to ${result.entryName}${result.departmentName ? ` (department ${result.departmentName})` : ''}; ${result.changedCount} profile(s) updated`,
      before: { typed: result.typed, kind: result.kind },
      // `changes` (uid -> old values) is the undo data; it is a map, so the audit keeps every row.
      after: {
        assignmentId: result.assignmentId, entryId: input.entryId, entryName: result.entryName,
        departmentEntryId: input.departmentEntryId ?? null, departmentName: result.departmentName,
        aliasAdded: result.aliasAdded, suggestionIds: result.suggestionIds, updateAll: input.updateAll,
        changedCount: result.changedCount, changes: result.changes,
      },
    });
    const { changes: _changes, suggestionIds: _ids, ...body } = result;
    return NextResponse.json(body, { headers });
  } catch (error) {
    return assignErrorResponse(error, 'Unable to assign this name.');
  }
}
