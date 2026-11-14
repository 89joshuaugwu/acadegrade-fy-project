import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { decryptSecret, type EncryptedSecret } from '@/lib/ai/secrets';

export type EmailCredentialKind = 'general' | 'otp';
type StoredEmailCredential = EncryptedSecret & { email: string };

async function savedCredential(kind: EmailCredentialKind): Promise<{ user: string; pass: string } | null> {
  const secretId = `email-${kind}`;
  const snapshot = await adminDb.collection('_email_secrets').doc(secretId).get();
  if (!snapshot.exists) return null;
  const value = snapshot.data() as StoredEmailCredential | undefined;
  if (!value?.email || !value.ciphertext || !value.iv || !value.tag || value.version !== 1) {
    throw new Error('Saved email credential is invalid');
  }
  return { user: value.email, pass: decryptSecret(value, { secretId, providerId: 'smtp' }) };
}

/** Where a delivery login comes from: the account saved for this kind, the saved General account (OTP only), or server environment variables. */
export type EmailCredentialSource = 'saved' | 'fallback-general' | 'env';

/** The login used to send email, plus where it came from (never shown with the password). */
export async function getEmailDeliveryCredentialWithSource(kind: EmailCredentialKind): Promise<{ user: string; pass: string; source: EmailCredentialSource } | null> {
  const managed = await savedCredential(kind);
  if (managed) return { ...managed, source: 'saved' };
  if (kind === 'otp') {
    const managedGeneral = await savedCredential('general');
    if (managedGeneral) return { ...managedGeneral, source: 'fallback-general' };
    const user = process.env.OTP_GMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS;
    return user && pass ? { user, pass, source: 'env' } : null;
  }
  return process.env.GMAIL_USER && process.env.GMAIL_PASS
    ? { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS, source: 'env' }
    : null;
}

export async function getEmailDeliveryCredential(kind: EmailCredentialKind): Promise<{ user: string; pass: string } | null> {
  const credential = await getEmailDeliveryCredentialWithSource(kind);
  return credential ? { user: credential.user, pass: credential.pass } : null;
}
