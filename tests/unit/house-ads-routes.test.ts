import { beforeEach, expect, it, vi } from 'vitest';
import { defaultHouseConfig } from '@/lib/ads/house';
const state = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.auth }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: (collection: string) => ({ doc: (id: string) => ({ get: () => state.read(collection, id), set: (value: unknown) => state.write(collection, id, value) }) }) } }));
import { GET, PUT } from '@/app/api/admin/ads/house/route';
import { GET as publicGet } from '@/app/api/ads/house/route';
const request = (body?: unknown) => new Request('https://example.com/api/admin/ads/house', body === undefined ? {} : { method: 'PUT', body: JSON.stringify(body) });
beforeEach(() => {
  state.auth.mockReset().mockResolvedValue({ uid: 'admin' });
  state.read.mockReset().mockResolvedValue({ data: () => undefined });
  state.write.mockReset().mockResolvedValue(undefined);
});
it('requires authenticated admin for reads and writes', async () => {
  for (const status of [401, 403]) {
    state.auth.mockRejectedValue(Object.assign(new Error('Denied'), { status }));
    expect((await GET(request())).status).toBe(status);
    expect((await PUT(request({ config: defaultHouseConfig() }))).status).toBe(status);
  }
  expect(state.read).not.toHaveBeenCalled(); expect(state.write).not.toHaveBeenCalled();
});
it('defaults off and writes only the independent document', async () => {
  expect(await (await GET(request())).json()).toEqual({ config: defaultHouseConfig() });
  const config = { ...defaultHouseConfig(), enabled: true };
  expect((await PUT(request({ config }))).status).toBe(200);
  expect(state.write).toHaveBeenCalledExactlyOnceWith('config', 'mobileHouseAds', config);
});
it('rejects malformed payloads without writing', async () => {
  for (const body of [{ config: {} }, { config: defaultHouseConfig(), adsConfig: {} }, null]) expect((await PUT(request(body))).status).toBe(400);
  expect((await PUT(new Request('https://example.com', { method: 'PUT', body: '{' }))).status).toBe(400);
  expect(state.write).not.toHaveBeenCalled();
});
it('serves public data fail-closed without auth, and never exposes storage errors', async () => {
  state.read.mockRejectedValue(new Error('private database details'));
  const response = await publicGet();
  expect(await response.json()).toMatchObject({ enabled: false, campaigns: [], legacyCampaigns: [] });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(state.auth).not.toHaveBeenCalled();
});
it('does not read website settings until Android opts in', async () => {
  await publicGet();
  expect(state.read.mock.calls).toEqual([['config', 'mobileHouseAds']]);
  state.read.mockClear().mockImplementation(async (_collection, id) => ({ data: () => id === 'mobileHouseAds' ? { ...defaultHouseConfig(), enabled: true } : { secret: 'hidden', advertBanners: [{ id: 'sponsor', isActive: true, imageUrl: 'https://example.com/a.png' }] } }));
  const body = await (await publicGet()).json();
  expect(body.legacyCampaigns).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain('hidden');
});
