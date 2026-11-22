import { NextResponse } from 'next/server';
import { adminDb, adminRtdb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import {
  SUPPORT_MAX_REPLIES, SUPPORT_PURGE_AFTER_MS, SUPPORT_REPLY_MAX, toIsoTime, type SupportStatus,
} from '@/lib/support/tickets';
import { SUPPORT_PAGE_PATH } from '@/lib/site/contact-email';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const STATUSES: readonly SupportStatus[] = ['open', 'waiting', 'closed'];
const DEFAULT_PAGE = 25;
const MAX_PAGE = 50;
const REPLY_TITLE = 'Reply from AcadeGrade support';

function adminTicketView(id: string, data: Record<string, unknown>) {
  const replies = Array.isArray(data.replies) ? data.replies as Record<string, unknown>[] : [];
  return {
    id,
    uid: data.uid ?? null,
    // 'public': sent from the public Support form without signing in (no uid; email reply only).
    source: data.source === 'public' ? 'public' : 'account',
    email: data.email ?? null,
    name: data.name ?? null,
    category: data.category,
    message: data.message,
    platform: data.platform,
    appVersion: data.appVersion ?? null,
    route: data.route ?? null,
    status: data.status,
    createdAt: toIsoTime(data.createdAt),
    updatedAt: toIsoTime(data.updatedAt),
    closedAt: toIsoTime(data.closedAt),
    purgeAt: toIsoTime(data.purgeAt),
    replies: replies.map((reply) => ({ message: reply.message, at: toIsoTime(reply.at), actorEmail: reply.actorEmail ?? null })),
  };
}

const errorResponse = (error: unknown) => {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error('Admin support route failed');
  return NextResponse.json({ error: 'The support inbox could not be updated.' }, { status: 500, headers });
};

/** GET /api/admin/support?status=open|waiting|closed&cursor=<ticketId>&limit=25 -> { tickets, nextCursor } (newest first). */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    if (status && !STATUSES.includes(status as SupportStatus)) return NextResponse.json({ error: 'Unknown status' }, { status: 400, headers });
    const requested = Number.parseInt(params.get('limit') ?? '', 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_PAGE) : DEFAULT_PAGE;

    const collection = adminDb.collection('support_tickets');
    let query = status ? collection.where('status', '==', status).orderBy('createdAt', 'desc') : collection.orderBy('createdAt', 'desc');
    const cursor = (params.get('cursor') ?? '').trim();
    if (cursor) {
      const cursorDoc = await collection.doc(cursor.slice(0, 128)).get();
      if (!cursorDoc.exists) return NextResponse.json({ error: 'Unknown cursor' }, { status: 400, headers });
      query = query.startAfter(cursorDoc);
    }
    const page = await query.limit(limit).get();
    return NextResponse.json({
      tickets: page.docs.map((doc) => adminTicketView(doc.id, doc.data())),
      nextCursor: page.size === limit ? page.docs[page.docs.length - 1].id : null,
    }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/admin/support { action: 'reply'|'close'|'reopen', ticketId, message? }
 * reply: inbox item + unread count + email, status `waiting`. close: purge in 180 days.
 * Audited as `support.<action>`.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action;
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId.trim() : '';
    if (action !== 'reply' && action !== 'close' && action !== 'reopen') return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    if (!ticketId || ticketId.length > 128 || ticketId.includes('/')) return NextResponse.json({ error: 'Missing ticketId' }, { status: 400, headers });

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (action === 'reply' && (!message || message.length > SUPPORT_REPLY_MAX)) {
      return NextResponse.json({ error: `Write a reply of 1 to ${SUPPORT_REPLY_MAX} characters.` }, { status: 400, headers });
    }

    const ref = adminDb.collection('support_tickets').doc(ticketId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Ticket not found' }, { status: 404, headers });
    const ticket = snapshot.data() as Record<string, unknown>;
    const now = new Date();
    const actor = { actorEmail: admin.email, actorUid: admin.uid };
    const target = `support_tickets/${ticketId}`;

    if (action === 'close' || action === 'reopen') {
      const update = action === 'close'
        ? { status: 'closed', closedAt: now, purgeAt: new Date(now.getTime() + SUPPORT_PURGE_AFTER_MS), updatedAt: now }
        : { status: 'open', closedAt: null, purgeAt: null, updatedAt: now };
      await ref.set(update, { merge: true });
      await writeAdminAudit({
        ...actor, action: `support.${action}`, target, summary: action === 'close' ? 'Closed support request' : 'Reopened support request',
        before: { status: ticket.status ?? null }, after: { status: update.status },
      });
      return NextResponse.json({ success: true, ticket: adminTicketView(ticketId, { ...ticket, ...update }) }, { headers });
    }

    const replies = Array.isArray(ticket.replies) ? ticket.replies as Record<string, unknown>[] : [];
    if (replies.length >= SUPPORT_MAX_REPLIES) {
      return NextResponse.json({ error: 'This request has the maximum number of replies. Ask the student to open a new one.', code: 'REPLY_LIMIT' }, { status: 409, headers });
    }
    const nextReplies = [...replies, { message, at: now, actorEmail: admin.email }];
    const update = { replies: nextReplies, status: 'waiting', closedAt: null, purgeAt: null, updatedAt: now };
    await ref.set(update, { merge: true });

    const uid = typeof ticket.uid === 'string' ? ticket.uid : '';
    if (uid) {
      // Same shape the app inboxes already read (notifications/{uid}/items).
      await adminDb.collection(`notifications/${uid}/items`).doc().set({
        title: REPLY_TITLE, message, type: 'system', read: false, createdAt: now, actionUrl: SUPPORT_PAGE_PATH,
      });
      await adminRtdb.ref(`notif_counts/${uid}/unread`).transaction((current: number | null) => (current || 0) + 1).catch(() => undefined);
    }

    let emailSent = false;
    const email = typeof ticket.email === 'string' ? ticket.email : '';
    if (email) {
      try {
        const { sendEmail, supportReplyEmail } = await import('@/lib/email/mailer');
        await sendEmail(email, REPLY_TITLE, supportReplyEmail(typeof ticket.name === 'string' ? ticket.name : '', message, { publicRequest: ticket.source === 'public' }));
        emailSent = true;
      } catch {
        console.warn('[support] reply email failed');
      }
    }

    await writeAdminAudit({
      ...actor, action: 'support.reply', target, summary: `Replied to a support request (${message.length} characters)`,
      before: { status: ticket.status ?? null }, after: { status: 'waiting', replies: nextReplies.length, emailSent },
    });
    return NextResponse.json({ success: true, emailSent, ticket: adminTicketView(ticketId, { ...ticket, ...update }) }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
