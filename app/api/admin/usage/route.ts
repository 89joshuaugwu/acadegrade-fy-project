import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { parseUsagePolicy, type UsagePolicy } from '@/lib/usage/policy';
import { inspectStoredUsagePolicy } from '@/lib/usage/server';

const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  const status = error instanceof AdminAuthorizationError ? error.status
    : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
  const field = error instanceof ZodError ? error.issues[0]?.path.join('.') : '';
  const message = status === 400
    ? error instanceof SyntaxError ? 'Invalid JSON.' : `Invalid usage policy${field ? ` at ${field}` : ''}. Daily limits must be whole numbers from 0 to 1000; coin settings must be complete whole numbers within their ranges. No other settings are supported.`
    : status === 500 ? 'Unable to manage usage policy.' : error instanceof Error ? error.message : 'Unauthorized';
  return NextResponse.json({ error: message }, { status, headers });
}

/** `{ policy, source, fallbacks }`: source is 'stored' only when every field came from config/usage. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await inspectStoredUsagePolicy(), { headers });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const submitted = parseUsagePolicy(await request.json());
    const before = (await inspectStoredUsagePolicy()).policy;
    // Omitted coin settings keep the stored (or default) coin policy.
    const policy: UsagePolicy = { dailyLimits: submitted.dailyLimits, coins: submitted.coins ?? before.coins };
    await adminDb.collection('config').doc('usage').set(policy);
    await writeAdminAudit({ actorUid: actor.uid, actorEmail: actor.email, action: 'usage.update', target: 'config/usage', before, after: policy });
    return NextResponse.json({ policy, source: 'stored', fallbacks: [] }, { headers });
  } catch (error) { return errorResponse(error); }
}
