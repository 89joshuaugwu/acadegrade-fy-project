import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { encryptSecret } from '@/lib/ai/secrets';
import { getEmailDeliveryCredentialWithSource, type EmailCredentialKind } from '@/lib/email/managed-credentials';

const noStore = { 'Cache-Control': 'private, no-store' };
const REJECTED_LOGIN_MESSAGE = 'Gmail rejected this login. Check the account and its App Password.';

const toIso = (value: unknown): string | null => {
  const withToDate = value as { toDate?: () => Date } | null;
  let date: Date | null = null;
  if (withToDate && typeof withToDate.toDate === 'function') date = withToDate.toDate();
  else if (value instanceof Date) date = value;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

/** The last verification of an account (`_email_status/{kind}`), without any secret. */
function statusFrom(data: Record<string, unknown> | undefined) {
  if (!data || typeof data.ok !== 'boolean') return null;
  return {
    ok: data.ok,
    verifiedAt: toIso(data.verifiedAt),
    checkedAt: toIso(data.checkedAt),
    source: typeof data.source === 'string' ? data.source : null,
    ...(typeof data.error === 'string' && data.error ? { error: data.error } : {}),
  };
}
const kinds: EmailCredentialKind[] = ['general', 'otp'];
const isKind = (value: unknown): value is EmailCredentialKind => kinds.includes(value as EmailCredentialKind);

function failure(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
  return NextResponse.json({ error: 'Unable to manage email credentials.' }, { status: 500, headers: noStore });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const accounts = await Promise.all(kinds.map(async (kind) => {
      const [snapshot, statusSnapshot] = await Promise.all([
        adminDb.collection('_email_secrets').doc(`email-${kind}`).get(),
        adminDb.collection('_email_status').doc(kind).get(),
      ]);
      const email = snapshot.exists ? snapshot.data()?.email : null;
      return {
        kind, configured: typeof email === 'string' && !!email, email: typeof email === 'string' ? email : null,
        // Additive: null until the account has been checked with Verify login.
        status: statusSnapshot.exists ? statusFrom(statusSnapshot.data()) : null,
      };
    }));
    return NextResponse.json({ accounts }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    if (!isKind(body.kind)) return NextResponse.json({ error: 'Choose General or OTP email.' }, { status: 400, headers: noStore });
    if (body.operation === 'save') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const appPassword = typeof body.appPassword === 'string' ? body.appPassword.replace(/\s/g, '') : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || appPassword.length < 8 || appPassword.length > 128) {
        return NextResponse.json({ error: 'Enter a valid sender email and Gmail App Password.' }, { status: 400, headers: noStore });
      }
      const secretId = `email-${body.kind}`;
      const ref = adminDb.collection('_email_secrets').doc(secretId);
      const existing = await ref.get();
      const previous = existing.exists ? existing.data()?.email : undefined;
      await ref.set({
        email, ...encryptSecret(appPassword, { secretId, providerId: 'smtp' }), updatedAt: new Date(),
      });
      // A new login has not been checked yet, so the old result no longer applies.
      await adminDb.collection('_email_status').doc(body.kind).delete();
      // Sender address only; the app password never enters the audit log.
      await writeAdminAudit({
        actorUid: actor?.uid, actorEmail: actor?.email ?? '', action: 'email.save', target: `_email_secrets/${secretId}`,
        before: typeof previous === 'string' ? { email: previous } : null, after: { email },
      });
      return NextResponse.json({ account: { kind: body.kind, email, configured: true } }, { headers: noStore });
    }
    if (body.operation === 'verify') {
      const account = await getEmailDeliveryCredentialWithSource(body.kind);
      if (!account) return NextResponse.json({ error: 'No email credentials are configured.' }, { status: 400, headers: noStore });

      let verified = true;
      try {
        await nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: account.user, pass: account.pass } }).verify();
      } catch {
        verified = false;
      }

      // Record the result (login address and source only, never the password) so the admin
      // page can show "Verified <date>" or the problem next time.
      const now = new Date();
      await adminDb.collection('_email_status').doc(body.kind).set({
        ok: verified, checkedAt: now, ...(verified ? { verifiedAt: now } : { error: REJECTED_LOGIN_MESSAGE }),
        email: account.user, source: account.source,
      });
      await writeAdminAudit({
        actorUid: actor?.uid, actorEmail: actor?.email ?? '', action: 'email.verify', target: `_email_status/${body.kind}`,
        after: { ok: verified, email: account.user, source: account.source },
      });
      if (!verified) return NextResponse.json({ error: REJECTED_LOGIN_MESSAGE }, { status: 400, headers: noStore });
      return NextResponse.json({ verified: true, email: account.user, source: account.source }, { headers: noStore });
    }
    return NextResponse.json({ error: 'Invalid email operation.' }, { status: 400, headers: noStore });
  } catch (error) { return failure(error); }
}
