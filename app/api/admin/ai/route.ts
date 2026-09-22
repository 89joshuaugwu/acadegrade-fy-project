import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { encryptSecret, type SupportedProviderId } from '@/lib/ai/secrets';
import { createManagedRuntimeConfig, SUPPORTED_PROVIDERS, toMaskedAdminProjection } from '@/lib/ai/runtime-config';

const noStore = { 'Cache-Control': 'private, no-store' };
class RevisionConflictError extends Error {}

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
  if (error instanceof RevisionConflictError) return NextResponse.json({ error: 'AI configuration changed. Refresh and try again.' }, { status: 409, headers: noStore });
  return NextResponse.json({ error: 'Unable to manage AI configuration.' }, { status: 500, headers: noStore });
}

function isProviderId(value: unknown): value is SupportedProviderId {
  return typeof value === 'string' && value in SUPPORTED_PROVIDERS;
}

async function writeAudit(actor: { uid: string; email: string }, operation: string, resourceId: string) {
  await adminDb.collection('_ai_audit').doc(`${Date.now()}-${Math.random().toString(36).slice(2)}`).set({
    actorUid: actor.uid, actorEmail: actor.email, operation, resourceId, createdAt: new Date(),
  });
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    if ((body.operation === 'upsert-secret' || body.operation === 'rotate-secret') && isProviderId(body.providerId) && typeof body.secretId === 'string' && typeof body.value === 'string') {
      const secretId = body.secretId.trim();
      if (!secretId || !body.value.trim()) return NextResponse.json({ error: 'Invalid AI configuration request.' }, { status: 400, headers: noStore });
      const encrypted = encryptSecret(body.value, { secretId, providerId: body.providerId });
      const secret = { secretId, providerId: body.providerId, state: 'active' as const, ...encrypted, updatedAt: new Date() };
      await adminDb.collection('_ai_secrets').doc(secretId).set(secret, { merge: true });
      await writeAudit(actor, body.operation, secretId);
      return NextResponse.json({ secret: toMaskedAdminProjection(secret) }, { headers: noStore });
    }
    if (body.operation === 'set-secret-state' && typeof body.secretId === 'string' && ['active', 'inactive', 'retired'].includes(String(body.state))) {
      await adminDb.collection('_ai_secrets').doc(body.secretId).set({ state: body.state, updatedAt: new Date() }, { merge: true });
      await writeAudit(actor, 'set-secret-state', body.secretId);
      return NextResponse.json({ secretId: body.secretId, state: body.state }, { headers: noStore });
    }
    if ((body.operation === 'save-routing' || body.operation === 'activate-managed') && Number.isSafeInteger(body.expectedRevision)) {
      const configRef = adminDb.collection('_ai_runtime').doc('config');
      const result = await adminDb.runTransaction(async (transaction) => {
        const current = await transaction.get(configRef);
        const data = current.exists ? current.data() as Record<string, unknown> : { revision: 0, routes: {} };
        if (data.revision !== body.expectedRevision) throw new RevisionConflictError();
        const candidate = body.operation === 'save-routing'
          ? createManagedRuntimeConfig({ source: 'managed', revision: Number(body.expectedRevision) + 1, routes: body.routing })
          : createManagedRuntimeConfig({ ...data, source: 'managed', revision: Number(body.expectedRevision) + 1 });
        transaction.set(configRef, { ...candidate, updatedAt: new Date() });
        return candidate;
      });
      await writeAudit(actor, body.operation, 'config');
      return NextResponse.json({ config: result }, { headers: noStore });
    }
    return NextResponse.json({ error: 'Invalid AI configuration request.' }, { status: 400, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [config, secrets] = await Promise.all([
      adminDb.collection('_ai_runtime').doc('config').get(),
      adminDb.collection('_ai_secrets').get(),
    ]);
    return NextResponse.json({ providers: SUPPORTED_PROVIDERS, config: config.exists ? config.data() : null, secrets: secrets.docs.map((item) => toMaskedAdminProjection(item.data())) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
