import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { encryptSecret } from '@/lib/ai/secrets';
import { getEmailDeliveryCredential, type EmailCredentialKind } from '@/lib/email/managed-credentials';

const noStore = { 'Cache-Control': 'private, no-store' };
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
      const snapshot = await adminDb.collection('_email_secrets').doc(`email-${kind}`).get();
      const email = snapshot.exists ? snapshot.data()?.email : null;
      return { kind, configured: typeof email === 'string' && !!email, email: typeof email === 'string' ? email : null };
    }));
    return NextResponse.json({ accounts }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    if (!isKind(body.kind)) return NextResponse.json({ error: 'Choose General or OTP email.' }, { status: 400, headers: noStore });
    if (body.operation === 'save') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const appPassword = typeof body.appPassword === 'string' ? body.appPassword.replace(/\s/g, '') : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || appPassword.length < 8 || appPassword.length > 128) {
        return NextResponse.json({ error: 'Enter a valid sender email and Gmail App Password.' }, { status: 400, headers: noStore });
      }
      const secretId = `email-${body.kind}`;
      await adminDb.collection('_email_secrets').doc(secretId).set({
        email, ...encryptSecret(appPassword, { secretId, providerId: 'smtp' }), updatedAt: new Date(),
      });
      return NextResponse.json({ account: { kind: body.kind, email, configured: true } }, { headers: noStore });
    }
    if (body.operation === 'verify') {
      const account = await getEmailDeliveryCredential(body.kind);
      if (!account) return NextResponse.json({ error: 'No email credentials are configured.' }, { status: 400, headers: noStore });
      try {
        await nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: account }).verify();
      } catch {
        return NextResponse.json({ error: 'Gmail rejected this login. Check the account and its App Password.' }, { status: 400, headers: noStore });
      }
      return NextResponse.json({ verified: true, email: account.user }, { headers: noStore });
    }
    return NextResponse.json({ error: 'Invalid email operation.' }, { status: 400, headers: noStore });
  } catch (error) { return failure(error); }
}
