import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { adminDb } from '@/lib/firebase/admin';
import { checkedName, normalizeCatalogName, type CatalogKind } from '@/lib/academic-catalog/model';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function POST(request: NextRequest) {
  const user = await getVerifiedApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });

  let kind: CatalogKind;
  let name: string;
  try {
    const body = await request.json();
    if (!body || !['university', 'department', 'programme'].includes(body.kind) || typeof body.name !== 'string') {
      throw new Error('Invalid suggestion.');
    }
    kind = body.kind;
    name = checkedName(body.name);
  } catch {
    return NextResponse.json({ error: 'Enter a valid academic name.' }, { status: 400, headers: noStore });
  }

  try {
    const limit = await checkRateLimit(user.uid, 'academic-catalog-suggestion', [
      { name: 'daily', limit: 5, windowMs: 24 * 60 * 60 * 1000 },
    ]);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Suggestion limit reached. Please try again later.', retryAfterSeconds: limit.retryAfterSeconds }, { status: 429, headers: { ...noStore, 'Retry-After': String(limit.retryAfterSeconds) } });
    }

    const id = createHash('sha256').update(`${user.uid}:${kind}:${normalizeCatalogName(name)}`).digest('hex');
    await adminDb.collection('_academic_catalog_suggestions').doc(id).create({
      uid: user.uid, kind, name, normalizedName: normalizeCatalogName(name), status: 'pending', createdAt: new Date(),
    });
    return NextResponse.json({ status: 'pending' }, { status: 202, headers: noStore });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error.code === 6 || error.code === 'already-exists')) {
      return NextResponse.json({ status: 'already-submitted' }, { status: 200, headers: noStore });
    }
    return NextResponse.json({ error: 'Unable to submit suggestion.' }, { status: 503, headers: noStore });
  }
}
