import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const CODE = /^[A-Z0-9]{6}$/;
const DEFAULT_PAGE = 50;
const MAX_PAGE = 50;
const REASON_MIN = 3;
const REASON_MAX = 200;

const toIso = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
  return null;
};

interface Course { code: string; title: string; units: number }
function courseRows(value: unknown): Course[] {
  if (!Array.isArray(value)) return [];
  const rows: Course[] = [];
  for (const row of value.slice(0, 100)) {
    const { code, title, units } = (row ?? {}) as Record<string, unknown>;
    if (typeof code !== 'string' || !code.trim()) continue;
    const count = Number(units);
    rows.push({
      code: code.trim().toUpperCase().slice(0, 16),
      title: typeof title === 'string' ? title.trim().slice(0, 140) : '',
      units: Number.isInteger(count) && count >= 0 && count <= 6 ? count : 0,
    });
  }
  return rows;
}

/** The admin view. authorId is shown here and nowhere else (admins can find the account in Users). */
function adminView(id: string, data: Record<string, unknown>) {
  const courses = courseRows(data.courses);
  return {
    code: id,
    useCount: Number.isFinite(Number(data.useCount)) ? Number(data.useCount) : 0,
    disabled: data.disabled === true,
    disabledReason: typeof data.disabledReason === 'string' ? data.disabledReason : null,
    disabledAt: toIso(data.disabledAt),
    promotedAt: toIso(data.promotedAt),
    createdAt: toIso(data.createdAt),
    authorId: typeof data.authorId === 'string' ? data.authorId : null,
    courseCount: courses.length,
    courses,
  };
}

const errorResponse = (error: unknown) => {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error('Admin share-codes route failed');
  return NextResponse.json({ error: 'Share codes could not be updated.' }, { status: 500, headers });
};

/** GET /api/admin/share-codes?limit=50&cursor=<CODE> -> { codes, nextCursor }, most used first. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const requested = Number.parseInt(params.get('limit') ?? '', 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_PAGE) : DEFAULT_PAGE;
    const collection = adminDb.collection('shareCodes');
    let query = collection.orderBy('useCount', 'desc');
    const cursor = (params.get('cursor') ?? '').trim().toUpperCase();
    if (cursor) {
      if (!CODE.test(cursor)) return NextResponse.json({ error: 'Unknown cursor' }, { status: 400, headers });
      const cursorDoc = await collection.doc(cursor).get();
      if (!cursorDoc.exists) return NextResponse.json({ error: 'Unknown cursor' }, { status: 400, headers });
      query = query.startAfter(cursorDoc);
    }
    const page = await query.limit(limit).get();
    return NextResponse.json({
      codes: page.docs.map((doc) => adminView(doc.id, doc.data())),
      nextCursor: page.size === limit ? page.docs[page.docs.length - 1].id : null,
    }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

const bad = (message: string) => NextResponse.json({ error: message }, { status: 400, headers });

/**
 * POST /api/admin/share-codes
 *   { action: 'disable' | 'enable', code, reason }
 *   { action: 'promote', code, reason, department, level: 100..900 (step 100), semester: 1|2, courseCodes?: string[] }
 * disable hides the list from /c/<code> and from the import (rules deny the read); enable restores it.
 * promote copies reviewed rows into `courseCatalog`, skipping rows already there. Audited as `share_codes.<action>`.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action;
    if (action !== 'disable' && action !== 'enable' && action !== 'promote') return bad('Invalid action.');
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!CODE.test(code)) return bad('Enter a valid 6-character code.');
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) return bad(`Give a reason of ${REASON_MIN} to ${REASON_MAX} characters.`);

    let department = '';
    let level = 0;
    let semester = 0;
    let onlyCodes: Set<string> | null = null;
    if (action === 'promote') {
      department = typeof body?.department === 'string' ? body.department.trim() : '';
      level = Number(body?.level);
      semester = Number(body?.semester);
      if (!department || department.length > 80) return bad('Enter the department (up to 80 characters).');
      if (!Number.isInteger(level) || level < 100 || level > 900 || level % 100 !== 0) return bad('Level must be 100, 200, 300 and so on.');
      if (semester !== 1 && semester !== 2) return bad('Semester must be 1 or 2.');
      if (Array.isArray(body?.courseCodes)) {
        onlyCodes = new Set((body.courseCodes as unknown[]).filter((value): value is string => typeof value === 'string').map((value) => value.trim().toUpperCase()));
      }
    }

    const ref = adminDb.collection('shareCodes').doc(code);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'That code does not exist.' }, { status: 404, headers });
    const data = snapshot.data() as Record<string, unknown>;
    const now = new Date();
    const actor = { actorUid: admin.uid, actorEmail: admin.email };
    const target = `shareCodes/${code}`;

    if (action === 'disable' || action === 'enable') {
      const patch = action === 'disable'
        ? { disabled: true, disabledReason: reason, disabledAt: now, disabledBy: admin.email }
        : { disabled: false, disabledReason: null, enabledAt: now, enabledBy: admin.email };
      await ref.update(patch);
      await writeAdminAudit({
        ...actor, action: `share_codes.${action}`, target, summary: reason,
        before: { disabled: data.disabled === true }, after: { disabled: action === 'disable' },
      });
      return NextResponse.json({ ok: true, code: adminView(code, { ...data, ...patch }) }, { headers });
    }

    const rows = courseRows(data.courses).filter((row) => !onlyCodes || onlyCodes.has(row.code));
    const catalogue = adminDb.collection('courseCatalog');
    const batch = adminDb.batch();
    let promoted = 0;
    let skipped = 0;
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.code)) { skipped += 1; continue; }
      seen.add(row.code);
      const existing = await catalogue.where('code', '==', row.code).get();
      const duplicate = existing.docs.some((doc) => {
        const item = doc.data();
        return item.department === department && Number(item.level) === level && Number(item.semester) === semester;
      });
      if (duplicate) { skipped += 1; continue; }
      batch.set(catalogue.doc(), { code: row.code, title: row.title, units: row.units, department, level, semester, createdAt: now, source: 'share_code' });
      promoted += 1;
    }
    if (promoted > 0) await batch.commit();
    await ref.update({ promotedAt: now, promotedBy: admin.email });
    await writeAdminAudit({
      ...actor, action: 'share_codes.promote', target, summary: reason,
      after: { department, level, semester, promoted, skipped },
    });
    return NextResponse.json({ ok: true, promoted, skipped }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
