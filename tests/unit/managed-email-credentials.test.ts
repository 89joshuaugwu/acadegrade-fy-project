import { describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: (id: string) => ({ get: () => database.get(id) }) }) } }));

import { getEmailDeliveryCredential } from '@/lib/email/managed-credentials';

describe('email delivery credentials', () => {
  it('prefers a saved general credential over environment credentials', async () => {
    process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 4).toString('base64');
    process.env.GMAIL_USER = 'old@example.com';
    process.env.GMAIL_PASS = 'old-password';
    const { encryptSecret } = await import('@/lib/ai/secrets');
    database.get.mockResolvedValue({ exists: true, data: () => ({ email: 'new@example.com', ...encryptSecret('new-password', { secretId: 'email-general', providerId: 'smtp' }) }) });

    await expect(getEmailDeliveryCredential('general')).resolves.toEqual({ user: 'new@example.com', pass: 'new-password' });
  });
});
