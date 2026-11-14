import { NextResponse } from 'next/server';
import { AdminAuthorizationError } from '@/lib/api/admin-auth';

export const LEGAL_HEADERS = { 'Cache-Control': 'private, no-store' };

/** Shared error responses for the admin legal-document routes. */
export function legalFailure(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: LEGAL_HEADERS });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers: LEGAL_HEADERS });
  return NextResponse.json({ error: 'Unable to manage the legal documents.' }, { status: 500, headers: LEGAL_HEADERS });
}
