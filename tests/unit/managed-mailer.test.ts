import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn(), credential: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock('@/lib/email/managed-credentials', () => ({ getEmailDeliveryCredential: mocks.credential }));

import { sendEmail, sendOtpEmail } from '@/lib/email/mailer';

describe('managed Gmail delivery', () => {
  beforeEach(() => {
    mocks.createTransport.mockClear().mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({});
    mocks.credential.mockImplementation(async (kind: string) => kind === 'otp'
      ? { user: 'otp@example.com', pass: 'otp-private' }
      : { user: 'general@example.com', pass: 'general-private' });
  });

  it('sends general email using the saved general account', async () => {
    await sendEmail('student@example.com', 'Hello', '<p>Hello</p>');
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: 'general@example.com', pass: 'general-private' } }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"AcadeGrade" <general@example.com>' }));
  });

  it('sends OTP email using the separately saved OTP account', async () => {
    await sendOtpEmail('student@example.com', 'Code', '<p>123456</p>');
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: 'otp@example.com', pass: 'otp-private' } }));
  });
});
