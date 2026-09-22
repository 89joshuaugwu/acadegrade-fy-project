import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { encryptSecret, type SupportedProviderId } from '@/lib/ai/secrets';
import { SUPPORTED_PROVIDERS, toMaskedAdminProjection } from '@/lib/ai/runtime-config';

const noStore = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
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
    if (body.operation !== 'upsert-secret' || !isProviderId(body.providerId) || typeof body.secretId !== 'string' || typeof body.value !== 'string') {
      return NextResponse.json({ error: 'Invalid AI configuration request.' }, { status: 400, headers: noStore });
    }
    const secretId = body.secretId.trim();
    if (!secretId || !body.value.trim()) return NextResponse.json({ error: 'Invalid AI configuration request.' }, { status: 400, headers: noStore });

    const encrypted = encryptSecret(body.value, { secretId, providerId: body.providerId });
    const secret = { secretId, providerId: body.providerId, state: 'active' as const, ...encrypted, updatedAt: new Date() };
    await adminDb.collection('_ai_secrets').doc(secretId).set(secret, { merge: true });
    await writeAudit(actor, 'upsert-secret', secretId);
    return NextResponse.json({ secret: toMaskedAdminProjection(secret) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ providers: SUPPORTED_PROVIDERS }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
