import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { encryptSecret, type SupportedProviderId } from '@/lib/ai/secrets';
import { createManagedRuntimeConfig, SUPPORTED_PROVIDERS, toMaskedAdminProjection, type StoredAiSecret } from '@/lib/ai/runtime-config';

const noStore = { 'Cache-Control': 'private, no-store' };
class RevisionConflictError extends Error {}
class InvalidAiConfigurationError extends Error {}

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
  if (error instanceof RevisionConflictError) return NextResponse.json({ error: 'AI configuration changed. Refresh and try again.' }, { status: 409, headers: noStore });
  if (error instanceof InvalidAiConfigurationError) return NextResponse.json({ error: error.message }, { status: 400, headers: noStore });
  return NextResponse.json({ error: 'Unable to manage AI configuration.' }, { status: 500, headers: noStore });
}

function isProviderId(value: unknown): value is SupportedProviderId {
  return typeof value === 'string' && value in SUPPORTED_PROVIDERS;
}

function isStoredSecret(value: unknown): value is StoredAiSecret {
  if (!value || typeof value !== 'object') return false;
  const secret = value as Record<string, unknown>;
  return typeof secret.secretId === 'string'
    && isProviderId(secret.providerId)
    && ['active', 'inactive', 'retired'].includes(String(secret.state))
    && secret.version === 1
    && typeof secret.ciphertext === 'string'
    && typeof secret.iv === 'string'
    && typeof secret.tag === 'string';
}

async function writeAudit(actor: { uid: string; email: string }, operation: string, resourceId: string) {
  await adminDb.collection('_ai_audit').doc(`${Date.now()}-${Math.random().toString(36).slice(2)}`).set({
    actorUid: actor.uid, actorEmail: actor.email, operation, resourceId, createdAt: new Date(),
  });
}

async function assertActiveRoutingSecrets(routing: unknown, providerModels: unknown, revision: number) {
  let config;
  try {
    config = createManagedRuntimeConfig({ source: 'managed', revision, routes: routing, providerModels });
  } catch (error) {
    throw new InvalidAiConfigurationError(error instanceof Error ? error.message : 'Invalid AI routing configuration.');
  }

  const targets = Object.values(config.routes).flatMap((route) => route?.chain ?? []);
  const uniqueSecretIds = [...new Set(targets.map((target) => target.secretId))];
  const records = await Promise.all(uniqueSecretIds.map(async (secretId) => ({
    secretId,
    snapshot: await adminDb.collection('_ai_secrets').doc(secretId!).get(),
  })));
  for (const { secretId, snapshot } of records) {
    const matchingTargets = targets.filter((item) => item.secretId === secretId);
    const secret = snapshot.exists ? snapshot.data() : null;
    if (!isStoredSecret(secret) || secret.state !== 'active' || matchingTargets.some((target) => target.providerId !== secret.providerId)) {
      throw new InvalidAiConfigurationError(`Routing credential ${secretId} is unavailable or inactive.`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    if ((body.operation === 'upsert-secret' || body.operation === 'rotate-secret') && isProviderId(body.providerId) && typeof body.secretId === 'string' && typeof body.value === 'string') {
      const secretId = body.secretId.trim();
      if (!new RegExp(`^${body.providerId}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(secretId) || secretId.length > 80 || !body.value.trim() || body.value.length > 4096) {
        throw new InvalidAiConfigurationError('Use a provider-prefixed credential ID and a nonempty key.');
      }
      const hasConnectionDetails = ['label', 'modelId', 'priority', 'purpose'].some((field) => body[field] !== undefined);
      if (hasConnectionDetails && (
        typeof body.label !== 'string' || !body.label.trim() || body.label.length > 80
        || typeof body.modelId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,127}$/.test(body.modelId) || body.modelId.includes('://')
        || !Number.isInteger(body.priority) || Number(body.priority) < 1 || Number(body.priority) > 12
        || !['general', 'ocr', 'fallback'].includes(String(body.purpose))
        || (body.providerId !== 'gemini' && body.purpose !== 'general')
      )) throw new InvalidAiConfigurationError('Connection label, model, priority, or purpose is invalid.');
      const existing = await adminDb.collection('_ai_secrets').doc(secretId).get();
      if (existing.exists && existing.data()?.providerId !== body.providerId) throw new InvalidAiConfigurationError('Credential ID belongs to a different provider.');
      const encrypted = encryptSecret(body.value, { secretId, providerId: body.providerId });
      const connectionDetails = hasConnectionDetails ? {
        label: (body.label as string).trim(),
        modelId: body.modelId as string,
        priority: body.priority as number,
        purpose: body.purpose as 'general' | 'ocr' | 'fallback',
      } : {};
      const secret = { secretId, providerId: body.providerId, state: 'active' as const, ...encrypted, updatedAt: new Date(),
        ...connectionDetails,
      };
      await adminDb.collection('_ai_secrets').doc(secretId).set(secret, { merge: true });
      await writeAudit(actor, body.operation, secretId);
      return NextResponse.json({ secret: toMaskedAdminProjection(secret) }, { headers: noStore });
    }
    if (body.operation === 'set-secret-state' && typeof body.secretId === 'string' && ['active', 'inactive', 'retired'].includes(String(body.state))) {
      const existing = await adminDb.collection('_ai_secrets').doc(body.secretId).get();
      if (!existing.exists || !isStoredSecret(existing.data())) throw new InvalidAiConfigurationError('Credential was not found.');
      if (existing.data()?.state === 'retired') throw new InvalidAiConfigurationError('Retired credentials cannot be reactivated.');
      await adminDb.collection('_ai_secrets').doc(body.secretId).set({ state: body.state, updatedAt: new Date() }, { merge: true });
      await writeAudit(actor, 'set-secret-state', body.secretId);
      return NextResponse.json({ secretId: body.secretId, state: body.state }, { headers: noStore });
    }
    if ((body.operation === 'save-routing' || body.operation === 'activate-managed') && Number.isSafeInteger(body.expectedRevision)) {
      if (body.operation === 'save-routing') {
        await assertActiveRoutingSecrets(body.routing, body.providerModels, Number(body.expectedRevision) + 1);
      }
      const configRef = adminDb.collection('_ai_runtime').doc('config');
      const result = await adminDb.runTransaction(async (transaction) => {
        const current = await transaction.get(configRef);
        const data = current.exists ? current.data() as Record<string, unknown> : { revision: 0, routes: {} };
        if (data.revision !== body.expectedRevision) throw new RevisionConflictError();
        const candidate = body.operation === 'save-routing'
          ? createManagedRuntimeConfig({ source: 'managed', revision: Number(body.expectedRevision) + 1, routes: body.routing, providerModels: body.providerModels })
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
    const maskedSecrets = secrets.docs
      .map((item) => item.data())
      .filter(isStoredSecret)
      .map(toMaskedAdminProjection);
    const storedConfig = config.exists ? config.data() : null;
    const providers = Object.fromEntries(Object.entries(SUPPORTED_PROVIDERS).map(([id, provider]) => [id, {
      ...provider, models: storedConfig?.providerModels?.[id] ?? provider.models,
    }]));
    return NextResponse.json({ providers, config: storedConfig, secrets: maskedSecrets }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
