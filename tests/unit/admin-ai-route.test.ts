import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  adminsGet: vi.fn(),
  secretSet: vi.fn(),
  auditSet: vi.fn(),
  configGet: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifyIdToken: firebase.verifyIdToken },
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: name === 'config' ? firebase.adminsGet : firebase.configGet,
        set: name === '_ai_secrets' ? firebase.secretSet : firebase.auditSet,
      }),
    }),
  },
}));

import { POST } from '@/app/api/admin/ai/route';

function adminRequest(body: unknown) {
  return new Request('https://app.test/api/admin/ai', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/admin/ai', () => {
  beforeEach(() => {
    process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 3).toString('base64');
    firebase.verifyIdToken.mockResolvedValue({ uid: 'admin-1', email: 'admin@acadegrade.example' });
    firebase.adminsGet.mockResolvedValue({ data: () => ({ emails: ['admin@acadegrade.example'] }) });
    firebase.configGet.mockResolvedValue({ exists: false, data: () => undefined });
    firebase.secretSet.mockResolvedValue(undefined);
    firebase.auditSet.mockResolvedValue(undefined);
  });

  it('rejects a missing administrator token', async () => {
    const response = await POST(new Request('https://app.test/api/admin/ai', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(firebase.verifyIdToken).not.toHaveBeenCalled();
  });

  it('stores ciphertext and returns only masked metadata after a key write', async () => {
    const response = await POST(adminRequest({
      operation: 'upsert-secret', providerId: 'groq', secretId: 'groq-primary', value: 'gsk_value',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('gsk_value');
    expect(firebase.secretSet).toHaveBeenCalledWith(expect.objectContaining({ ciphertext: expect.any(String) }), { merge: true });
  });
});
