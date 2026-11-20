import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { getContactEmail } from '@/lib/site/contact';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support/tickets';
import { PublicSupportValidationError, parsePublicSupportRequest } from '@/lib/support/public-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const IP_WINDOWS = [
  { name: 'hourly', limit: 3, windowMs: HOUR },
  { name: 'daily', limit: 10, windowMs: DAY },
];
const EMAIL_WINDOWS = [{ name: 'daily', limit: 3, windowMs: DAY }];
const BUSY = 'You have sent several requests already. Please wait before sending another.';

/** Rate-limit keys are hashes: the raw address and email are never stored there. */
const hashKey = (kind: string, value: string) => `public-${kind}-${createHash('sha256').update(`support-public:${kind}:${value}`).digest('hex').slice(0, 40)}`;

/** Vercel sets x-forwarded-for; its first entry is the client. */
function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * POST /api/support/public (no sign-in), for people who cannot sign in.
 *   { name?: ≤ 80, email, category: 'account'|'privacy'|'other', message: 10-2000, route?: '/path', website?: honeypot }
 *   -> 201 { ok: true } | 400 { error } | 429 (per address 3/hour and 10/day; per email 3/day)
 *      | 503 { code: 'FEATURE_DISABLED', feature: 'support' }
 * Open during maintenance. Stored in `support_tickets` with `uid: null`, `source: 'public'`;
 * the admin inbox replies by email only. A filled honeypot gets the same 201 and nothing is stored.
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = await checkPlatformAccess({ feature: 'support', maintenance: false });
    if (blocked) return blocked;

    let input;
    try {
      input = parsePublicSupportRequest(await request.json().catch(() => null));
    } catch (error) {
      if (error instanceof PublicSupportValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
      throw error;
    }
    if (input.honeypot) return NextResponse.json({ ok: true }, { status: 201, headers });

    const byAddress = await checkRateLimit(hashKey('ip', clientAddress(request)), 'support_public', IP_WINDOWS);
    if (!byAddress.allowed) return rateLimitResponse(byAddress, BUSY);
    const byEmail = await checkRateLimit(hashKey('email', input.email), 'support_public', EMAIL_WINDOWS);
    if (!byEmail.allowed) return rateLimitResponse(byEmail, BUSY);

    const now = new Date();
    await adminDb.collection('support_tickets').doc().set({
      uid: null,
      email: input.email,
      name: input.name,
      category: input.category,
      message: input.message,
      platform: 'web',
      appVersion: null,
      route: input.route,
      source: 'public',
      status: 'open',
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      purgeAt: null,
      replies: [],
    });

    // Optional heads-up to the published contact address. Never fails the request.
    try {
      const contact = await getContactEmail();
      if (contact) {
        const { sendEmail, adminSupportRequestEmail } = await import('@/lib/email/mailer');
        await sendEmail(contact, 'New support request (not signed in)', adminSupportRequestEmail(SUPPORT_CATEGORY_LABELS[input.category], input.email));
      }
    } catch {
      console.warn('[support public] notification email failed');
    }

    return NextResponse.json({ ok: true }, { status: 201, headers });
  } catch {
    console.error('Public support request failed');
    return NextResponse.json({ error: 'Your request could not be sent. Please try again.' }, { status: 500, headers });
  }
}
