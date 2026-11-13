import { NextResponse } from 'next/server';
import { CONTACT_EMAIL_REVALIDATE_SECONDS, getContactEmail } from '@/lib/site/contact';

export const revalidate = 300;

/**
 * GET /api/site/contact → { email: string | null }
 * Public, cached contact address for client-only components (the public footer
 * on client-rendered pages). null means "link to /support instead".
 */
export async function GET() {
  const email = await getContactEmail();
  return NextResponse.json(
    { email },
    { headers: { 'Cache-Control': `public, max-age=60, s-maxage=${CONTACT_EMAIL_REVALIDATE_SECONDS}, stale-while-revalidate=600` } }
  );
}
