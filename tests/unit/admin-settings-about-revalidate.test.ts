import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify },
}));
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: state.revalidateTag,
  revalidatePath: state.revalidatePath,
}));

import { POST } from '@/app/api/admin/settings/route';
import { ABOUT_CACHE_TAG } from '@/lib/about/server';
import { CONTACT_EMAIL_CACHE_TAG } from '@/lib/site/contact';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

const req = (body: unknown) =>
  new Request('https://app.test/api/admin/settings', {
    method: 'POST',
    headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const about = {
  headline: 'Academic progress, made clear.',
  platformDescription: 'Track academic performance with clarity.',
  mission: 'Give every student a dependable view of their degree progress.',
  trustStatement: 'Your academic records remain under your control.',
  contactEmail: 'hello@acadegrade.example',
};

beforeEach(() => {
  const store = queryTestDb();
  state.db = store.db;
  invalidatePlatformSettingsCache();
  store.docs.set('config/admins', { emails: ['boss@test.example'] });
  state.verify.mockReset().mockResolvedValue({ uid: 'boss-uid', email: 'boss@test.example' });
  state.revalidateTag.mockReset();
  state.revalidatePath.mockReset();
});

describe('POST /api/admin/settings revalidation', () => {
  it('drops the About and contact email caches and re-renders /about on an About save', async () => {
    expect((await POST(req({ target: 'about', data: about }))).status).toBe(200);
    expect(state.revalidateTag).toHaveBeenCalledWith(ABOUT_CACHE_TAG, { expire: 0 });
    expect(state.revalidateTag).toHaveBeenCalledWith(CONTACT_EMAIL_CACHE_TAG, { expire: 0 });
    expect(ABOUT_CACHE_TAG).toBe('site-about');
    expect(state.revalidatePath).toHaveBeenCalledWith('/about');
  });

  it('leaves those caches alone for other settings', async () => {
    expect((await POST(req({ field: 'maintenanceMode', value: true }))).status).toBe(200);
    expect(state.revalidateTag).not.toHaveBeenCalled();
    expect(state.revalidatePath).not.toHaveBeenCalled();
  });

  it('still saves when revalidation throws', async () => {
    state.revalidateTag.mockImplementation(() => {
      throw new Error('no store');
    });
    expect((await POST(req({ target: 'about', data: about }))).status).toBe(200);
  });
});
