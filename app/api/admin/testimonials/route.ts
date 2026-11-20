import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import {
  MIN_APPROVED_TO_SHOW, PROOF_CONFIG_PATH, PUBLIC_TESTIMONIALS_COLLECTION, TestimonialValidationError,
  adminTestimonialView, parseCountThreshold, parseTestimonialInput, readCountThreshold,
} from '@/lib/testimonials/testimonials';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const LIST_LIMIT = 200;
const ACTIONS = ['create', 'update', 'approve', 'hide', 'delete', 'threshold'] as const;
type Action = typeof ACTIONS[number];

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers });

const errorResponse = (error: unknown) => {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof TestimonialValidationError) return bad(error.message);
  console.error('Admin testimonials route failed');
  return NextResponse.json({ error: 'Testimonials could not be updated.' }, { status: 500, headers });
};

/** GET /api/admin/testimonials -> { testimonials, countThreshold, minimumToShow } (newest first). */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [list, config] = await Promise.all([
      adminDb.collection(PUBLIC_TESTIMONIALS_COLLECTION).orderBy('createdAt', 'desc').limit(LIST_LIMIT).get(),
      adminDb.collection(PROOF_CONFIG_PATH.collection).doc(PROOF_CONFIG_PATH.doc).get(),
    ]);
    return NextResponse.json({
      testimonials: list.docs.map((doc) => adminTestimonialView(doc.id, doc.data())),
      countThreshold: readCountThreshold(config.data()),
      minimumToShow: MIN_APPROVED_TO_SHOW,
    }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/admin/testimonials
 *   { action: 'create', data }            new quote, saved as a draft
 *   { action: 'update', id, data }        edit; an approved quote stays approved
 *   { action: 'approve' | 'hide', id }    show on the public site / take it off
 *   { action: 'delete', id }              remove (for example when consent is withdrawn)
 *   { action: 'threshold', value }        CountLine threshold in config/proof
 * Every action is audited as `testimonials.<action>`.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action as Action;
    if (!ACTIONS.includes(action)) return bad('Invalid action');
    const actor = { actorEmail: admin.email, actorUid: admin.uid };
    const now = new Date();

    if (action === 'threshold') {
      const value = parseCountThreshold(body?.value);
      const ref = adminDb.collection(PROOF_CONFIG_PATH.collection).doc(PROOF_CONFIG_PATH.doc);
      const before = readCountThreshold((await ref.get()).data());
      await ref.set({ countThreshold: value, updatedAt: now, updatedBy: admin.email }, { merge: true });
      await writeAdminAudit({
        ...actor, action: 'testimonials.threshold', target: 'config/proof.countThreshold',
        summary: `Set the student-count threshold to ${value}`, before: { countThreshold: before }, after: { countThreshold: value },
      });
      return NextResponse.json({ success: true, countThreshold: value }, { headers });
    }

    const collection = adminDb.collection(PUBLIC_TESTIMONIALS_COLLECTION);

    if (action === 'create') {
      const input = parseTestimonialInput(body?.data);
      const ref = collection.doc();
      const data = { ...input, status: 'draft', createdAt: now, updatedAt: now, approvedAt: null, createdBy: admin.email, updatedBy: admin.email };
      await ref.set(data);
      await writeAdminAudit({
        ...actor, action: 'testimonials.create', target: `${PUBLIC_TESTIMONIALS_COLLECTION}/${ref.id}`,
        summary: `Added a quote from ${input.firstName} as a draft`, after: input,
      });
      return NextResponse.json({ success: true, testimonial: adminTestimonialView(ref.id, data) }, { status: 201, headers });
    }

    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id || id.length > 128 || id.includes('/')) return bad('Missing id');
    const ref = collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return bad('Testimonial not found', 404);
    const current = snapshot.data() as Record<string, unknown>;
    const target = `${PUBLIC_TESTIMONIALS_COLLECTION}/${id}`;

    if (action === 'delete') {
      await ref.delete();
      await writeAdminAudit({
        ...actor, action: 'testimonials.delete', target, summary: 'Deleted a quote',
        before: adminTestimonialView(id, current),
      });
      return NextResponse.json({ success: true }, { headers });
    }

    let update: Record<string, unknown>;
    let summary: string;
    if (action === 'update') {
      const input = parseTestimonialInput(body?.data);
      update = { ...input, updatedAt: now, updatedBy: admin.email };
      summary = 'Edited a quote';
    } else if (action === 'approve') {
      // Re-validate the stored text so nothing invalid is ever approved.
      parseTestimonialInput(current);
      update = { status: 'approved', approvedAt: now, updatedAt: now, updatedBy: admin.email };
      summary = 'Approved a quote for the public site';
    } else {
      update = { status: 'hidden', updatedAt: now, updatedBy: admin.email };
      summary = 'Hid a quote from the public site';
    }
    await ref.set(update, { merge: true });
    const next = { ...current, ...update };
    await writeAdminAudit({
      ...actor, action: `testimonials.${action}`, target, summary,
      before: adminTestimonialView(id, current), after: adminTestimonialView(id, next),
    });
    return NextResponse.json({ success: true, testimonial: adminTestimonialView(id, next) }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
