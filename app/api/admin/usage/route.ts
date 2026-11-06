import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { adminDb } from '@/lib/firebase/admin';
import { parseUsagePolicy } from '@/lib/usage/policy';
import { getUsagePolicy } from '@/lib/usage/server';

const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  const status = error instanceof AdminAuthorizationError ? error.status
    : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
  const message = status === 400 ? 'Daily limits must be whole numbers from 0 to 1000 for all four features. No other settings are supported.'
    : status === 500 ? 'Unable to manage usage policy.' : error instanceof Error ? error.message : 'Unauthorized';
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await getUsagePolicy(), { headers });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const policy = parseUsagePolicy(await request.json());
    await adminDb.collection('config').doc('usage').set(policy);
    return NextResponse.json(policy, { headers });
  } catch (error) { return errorResponse(error); }
}
