import 'server-only';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

export class AdminAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? 'Unauthorized' : 'Forbidden');
  }
}

export type AdminActor = { uid: string; email: string };

export async function requireAdmin(request: Request): Promise<AdminActor> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new AdminAuthorizationError(401);

  let decoded: { uid?: string; email?: string };
  try {
    decoded = await adminAuth.verifyIdToken(authorization.slice('Bearer '.length), true);
  } catch {
    throw new AdminAuthorizationError(401);
  }

  const email = decoded.email?.trim().toLowerCase();
  if (!decoded.uid || !email) throw new AdminAuthorizationError(403);
  const admins = await adminDb.collection('config').doc('admins').get();
  const allowedEmails = admins.data()?.emails;
  if (!Array.isArray(allowedEmails) || !allowedEmails.some((value) => String(value).toLowerCase() === email)) {
    throw new AdminAuthorizationError(403);
  }
  return { uid: decoded.uid, email };
}
