import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), verify: vi.fn(), requireAdmin: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: mocks.requireAdmin, AdminAuthorizationError: class extends Error { status = 401; } }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: () => ({ get: mocks.get, set: mocks.set }) }) } }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ verify: mocks.verify }) } }));

import { GET, POST } from '@/app/api/admin/email/route';

const request = (body: unknown) => new Request('http://localhost/api/admin/email', { method: 'POST', body: JSON.stringify(body) });

describe('admin email credentials', () => {
  beforeEach(() => {
    mocks.requireAdmin.mockResolvedValue({ uid: 'admin', email: 'admin@example.com' });
    mocks.get.mockResolvedValue({ exists: false });
    mocks.set.mockResolvedValue(undefined);
    mocks.verify.mockResolvedValue(true);
    process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 4).toString('base64');
  });

  it('encrypts an OTP app password and never returns it to the browser', async () => {
    const response = await POST(request({ operation: 'save', kind: 'otp', email: 'otp@example.com', appPassword: 'PRIVATE_APP_PASSWORD' }));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain('PRIVATE_APP_PASSWORD');
    const saved = mocks.set.mock.calls.at(-1)?.[0];
    expect(saved).toMatchObject({ email: 'otp@example.com', ciphertext: expect.any(String) });
    expect(JSON.stringify(saved)).not.toContain('PRIVATE_APP_PASSWORD');
  });

  it('returns only account metadata when loading settings', async () => {
    mocks.get.mockResolvedValue({ exists: true, data: () => ({ email: 'mail@example.com', ciphertext: 'SECRET_CIPHERTEXT', iv: 'PRIVATE_IV', tag: 'PRIVATE_TAG' }) });
    const response = await GET(new Request('http://localhost/api/admin/email'));
    expect(response.status).toBe(200);
    const body = JSON.stringify(await response.json());
    expect(body).toContain('mail@example.com');
    expect(body).not.toContain('SECRET_CIPHERTEXT');
    expect(body).not.toContain('PRIVATE_IV');
  });
});
