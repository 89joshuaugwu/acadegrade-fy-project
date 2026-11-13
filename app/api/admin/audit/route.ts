import { NextResponse } from 'next/server';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/admin/audit?limit=50&action=settings.update&actor=admin@example.com&cursor=<createdAtMs>
 * -> { entries: [{ id, actorUid, actorEmail, action, target, summary, before, after, createdAt, createdAtMs }], nextCursor }
 * Newest first. Filters need composite indexes on _admin_audit:
 * (action ASC, createdAtMs DESC), (actorEmail ASC, createdAtMs DESC), and
 * (action ASC, actorEmail ASC, createdAtMs DESC) for both together.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') ?? '50', 10) || 50));
    const action = params.get('action');
    const cursorParam = params.get('cursor');
    const actorParam = params.get('actor');
    const actor = actorParam === null ? null : actorParam.trim().toLowerCase();
    if (actor !== null && (actor.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor))) {
      return NextResponse.json({ error: 'Invalid actor filter.' }, { status: 400, headers });
    }
    if (action !== null && !/^[a-z0-9._-]{1,64}$/.test(action)) {
      return NextResponse.json({ error: 'Invalid action filter.' }, { status: 400, headers });
    }
    const cursor = cursorParam === null ? null : Number(cursorParam);
    if (cursor !== null && !Number.isSafeInteger(cursor)) {
      return NextResponse.json({ error: 'Invalid cursor.' }, { status: 400, headers });
    }

    let query: FirebaseFirestore.Query = adminDb.collection('_admin_audit');
    if (action) query = query.where('action', '==', action);
    // actorEmail is stored lowercase by writeAdminAudit.
    if (actor) query = query.where('actorEmail', '==', actor);
    query = query.orderBy('createdAtMs', 'desc');
    if (cursor !== null) query = query.startAfter(cursor);
    const snapshot = await query.limit(limit + 1).get();
    const page = snapshot.docs.slice(0, limit);
    const entries = page.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? data.createdAt ?? null;
      return { id: doc.id, ...data, createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt };
    });
    const nextCursor = snapshot.docs.length > limit ? (page.at(-1)?.data().createdAtMs ?? null) : null;
    return NextResponse.json({ entries, nextCursor }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Admin audit read failed');
    return NextResponse.json({ error: 'Unable to load the audit log.' }, { status: 500, headers });
  }
}
