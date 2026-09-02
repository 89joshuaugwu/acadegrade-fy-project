import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export interface VerifiedApiUser {
  uid: string;
  token: string;
}

/** Verify a Firebase bearer token for an API route. Returns null for missing/invalid tokens. */
export async function getVerifiedApiUser(request: NextRequest): Promise<VerifiedApiUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, token };
  } catch {
    return null;
  }
}
