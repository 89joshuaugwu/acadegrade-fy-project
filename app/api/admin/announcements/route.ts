import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { AnnouncementValidationError, parseAnnouncementFields } from '@/lib/announcements/shared';
import { announcementView, publishAnnouncement } from '@/lib/announcements/server';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const ACTIONS = ['save', 'publish', 'schedule', 'archive'] as const;
type Action = typeof ACTIONS[number];
const LIST_LIMIT = 50;

const bad = (error: string) => NextResponse.json({ error }, { status: 400, headers });

/** GET /api/admin/announcements -> { announcements (newest 50), topicsBackfill: { completedOnce } } */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [list, backfill] = await Promise.all([
      adminDb.collection('announcements').orderBy('createdAt', 'desc').limit(LIST_LIMIT).get(),
      adminDb.collection('_cron_state').doc('topics').get(),
    ]);
    return NextResponse.json({
      announcements: list.docs.map((doc) => announcementView(doc.id, doc.data())),
      topicsBackfill: { completedOnce: backfill.data()?.completedOnce === true },
    }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Admin announcements GET failed');
    return NextResponse.json({ error: 'Announcements could not be loaded.' }, { status: 500, headers });
  }
}

/**
 * POST /api/admin/announcements { action: 'save'|'publish'|'schedule'|'archive', announcement }
 * `announcement.id` picks an existing one; other fields are merged over it and validated.
 * publish with push sends one FCM condition message. Audited as `announcements.<action>`.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null) as { action?: unknown; announcement?: Record<string, unknown> } | null;
    const action = body?.action as Action;
    if (!ACTIONS.includes(action)) return bad('Invalid action');
    const input = body?.announcement && typeof body.announcement === 'object' ? body.announcement : {};
    const id = typeof input.id === 'string' ? input.id.trim() : '';
    if (id && (id.length > 128 || id.includes('/'))) return bad('Invalid id');

    const now = Date.now();
    const collection = adminDb.collection('announcements');
    const existing = id ? await collection.doc(id).get() : null;
    if (id && !existing?.exists) return NextResponse.json({ error: 'Announcement not found' }, { status: 404, headers });
    const before = (existing?.data() ?? null) as Record<string, unknown> | null;
    const ref = id ? collection.doc(id) : collection.doc();
    const actor = { actorEmail: admin.email, actorUid: admin.uid };
    const target = `announcements/${ref.id}`;

    if (action === 'archive') {
      if (!before) return bad('Choose an announcement to archive');
      await ref.set({ status: 'archived', updatedAt: new Date(now) }, { merge: true });
      await writeAdminAudit({ ...actor, action: 'announcements.archive', target, summary: `Archived: ${String(before.title ?? '')}`, before: { status: before.status ?? null }, after: { status: 'archived' } });
      return NextResponse.json({ announcement: announcementView(ref.id, { ...before, status: 'archived', updatedAt: new Date(now) }) }, { headers });
    }

    // Merge the edit over the stored copy, then validate the whole thing.
    const merged = { ...(before ?? {}), ...input };
    let fields;
    try {
      // Stored Timestamps and submitted ISO strings are both accepted.
      fields = parseAnnouncementFields(merged, now);
    } catch (error) {
      if (error instanceof AnnouncementValidationError) return bad(error.message);
      throw error;
    }
    if (before?.status === 'archived' && action !== 'save') return bad('Archived announcements cannot be published again; make a copy instead');
    if (action === 'schedule' && fields.startsAt.getTime() <= now) return bad('Choose a start time in the future to schedule');

    // publish saves first with the old status, then publishAnnouncement flips it.
    const status = action === 'schedule' ? 'scheduled' : (before?.status ?? 'draft');
    const record = {
      ...fields,
      status,
      sentAt: before?.sentAt ?? null,
      createdBy: before?.createdBy ?? admin.email,
      createdAt: before?.createdAt ?? new Date(now),
      updatedAt: new Date(now),
    };
    await ref.set(record, { merge: true });

    let pushed = false;
    let view = announcementView(ref.id, record);
    if (action === 'publish') {
      const result = await publishAnnouncement(adminDb, adminMessaging, ref.id, now);
      pushed = result.pushed;
      view = announcementView(ref.id, result.data);
    }

    await writeAdminAudit({
      ...actor, action: `announcements.${action}`, target, summary: `${action[0].toUpperCase()}${action.slice(1)}: ${fields.title}`,
      before: before ? { status: before.status ?? null, title: before.title ?? null } : null,
      after: { status: view.status, title: fields.title, audience: fields.audience, push: fields.push, pushed },
    });
    return NextResponse.json({ announcement: view, pushed }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Admin announcements POST failed');
    return NextResponse.json({ error: 'The announcement could not be saved or sent.' }, { status: 500, headers });
  }
}
