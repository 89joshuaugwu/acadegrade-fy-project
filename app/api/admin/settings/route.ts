import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { parseAdminSettingsMutation, SettingsValidationError } from '@/lib/admin/settings-schema';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

/**
 * GET  /api/admin/settings — Read platform settings
 * POST /api/admin/settings — Update platform settings
 */

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = authHeader.split('Bearer ')[1];
  const decoded = await adminAuth.verifyIdToken(token);
  const adminsDoc = await adminDb.collection('config').doc('admins').get();
  const emails: string[] = adminsDoc.data()?.emails || [];
  if (!emails.includes(decoded.email?.toLowerCase() || '')) throw new Error('Forbidden');
  return decoded;
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    const doc = await adminDb.collection('config').doc('settings').get();
    const data = doc.exists ? doc.data() : {};
    return NextResponse.json({ settings: data });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await verifyAdmin(request);
    const mutation = parseAdminSettingsMutation(await request.json());
    const documentName = mutation.target === 'about' ? 'about' : 'settings';
    const ref = adminDb.collection('config').doc(documentName);
    const stored: Record<string, unknown> = (await ref.get()).data() ?? {};
    const data = mutation.data as Record<string, unknown>;
    const fields = Object.keys(data);
    await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
    // This instance serves the new value at once; others pick it up within the cache window.
    invalidatePlatformSettingsCache();
    await writeAdminAudit(mutation.target === 'about'
      ? {
          actorUid: actor.uid, actorEmail: actor.email ?? '', action: 'settings.about.update', target: 'config/about',
          before: Object.fromEntries(fields.map((key) => [key, stored[key] ?? null])), after: data,
        }
      : {
          actorUid: actor.uid, actorEmail: actor.email ?? '', action: 'settings.update', target: `config/settings.${fields[0]}`,
          before: stored[fields[0]] ?? null, after: data[fields[0]],
        });
    return NextResponse.json({ message: 'Settings updated.' });
  } catch (error: any) {
    if (error instanceof SettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    const message = status === 500 ? 'Unable to update settings.' : error.message;
    return NextResponse.json({ error: message }, { status });
  }
}
