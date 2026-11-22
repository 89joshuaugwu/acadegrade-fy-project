import { NextResponse } from 'next/server';
import { AssignError } from './assign-server';

const headers = { 'Cache-Control': 'private, no-store' };

/** 401/403 from requireAdmin, 400 for AssignError or bad JSON, otherwise 500 with `fallback`. */
export function assignErrorResponse(error: unknown, fallback: string) {
  const status = error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
    ? error.status : error instanceof AssignError || error instanceof SyntaxError ? 400 : 500;
  const message = status === 500 ? fallback : error instanceof SyntaxError ? 'Invalid request.' : error instanceof Error ? error.message : 'Invalid request.';
  return NextResponse.json({ error: message }, { status, headers });
}
