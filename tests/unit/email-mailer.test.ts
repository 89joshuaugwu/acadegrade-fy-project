import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mailSpies = vi.hoisted(() => ({
  generalSend: vi.fn(),
  otpSend: vi.fn(),
  transportCount: 0,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => {
      const sendMail = mailSpies.transportCount === 0 ? mailSpies.generalSend : mailSpies.otpSend;
      mailSpies.transportCount += 1;
      return { sendMail };
    }),
  },
}));

import {
  adminNewUserEmail,
  degreeClassEmail,
  registrationOtpEmail,
  resetPasswordOtpEmail,
  semesterSavedEmail,
  sendEmail,
  sendOtpEmail,
  welcomeEmail,
} from '@/lib/email/mailer';

const originalEnvironment = { ...process.env };

describe('transactional email templates', () => {
  beforeEach(() => {
    process.env = { ...originalEnvironment };
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_PASS;
    delete process.env.OTP_GMAIL_USER;
    delete process.env.OTP_GMAIL_PASS;
    mailSpies.generalSend.mockReset();
    mailSpies.otpSend.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('renders every existing template through the responsive branded shell', () => {
    const templates = [
      welcomeEmail('Ada'),
      semesterSavedEmail('Ada', 4.25, '2025/2026 First Semester'),
      degreeClassEmail('Ada', 'Second Class Upper'),
      adminNewUserEmail('Ada', 'CSC/2025/001'),
      registrationOtpEmail('123456'),
      resetPasswordOtpEmail('654321'),
    ];

    for (const html of templates) {
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('data-email-preheader');
      expect(html).toContain('role="presentation"');
      expect(html).toContain('alt="AcadeGrade"');
      expect(html).toContain('Acade<span');
      expect(html).toContain('@media only screen and (max-width: 620px)');
      expect(html).not.toMatch(/\u00e2|\u00f0\u0178|\ufffd/u);
    }
  });

  it('uses the configured site origin and removes a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.acadegrade.com/';

    const html = welcomeEmail('Ada');

    expect(html).toContain('href="https://app.acadegrade.com/dashboard"');
    expect(html).toContain('src="https://app.acadegrade.com/logo.png"');
    expect(html).not.toContain('https://app.acadegrade.com//');
  });

  it('falls back to the production AcadeGrade origin when no URL is configured', () => {
    expect(welcomeEmail('Ada')).toContain('href="https://acadegrade.vercel.app/dashboard"');
  });

  it('renders one visible OTP and keeps quick-copy data in the URL fragment', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://acadegrade.com';

    const html = registrationOtpEmail('120934');

    expect(html.match(/data-otp-code/g)).toHaveLength(1);
    expect(html).toContain('>120934</');
    expect(html).toContain('href="https://acadegrade.com/copy-code#code=120934"');
    expect(html).not.toContain('/copy-code?code=');
    expect(html).not.toContain('Legacy fallback');
  });

  it('escapes user-controlled values before adding them to HTML', () => {
    const html = adminNewUserEmail('<img src=x onerror=alert(1)>', 'CSC&001');

    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('CSC&amp;001');
  });
});

describe('transactional email delivery contracts', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      GMAIL_USER: 'notifications@example.test',
      GMAIL_PASS: 'test-password',
      OTP_GMAIL_USER: 'otp@example.test',
      OTP_GMAIL_PASS: 'test-otp-password',
    };
    mailSpies.generalSend.mockReset();
    mailSpies.otpSend.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('keeps sendEmail compatible and supplies an accessible plain-text alternative', async () => {
    await sendEmail('student@example.test', 'Welcome', welcomeEmail('Ada'));

    expect(mailSpies.generalSend).toHaveBeenCalledOnce();
    expect(mailSpies.generalSend).toHaveBeenCalledWith(expect.objectContaining({
      from: '"AcadeGrade" <notifications@example.test>',
      to: 'student@example.test',
      subject: 'Welcome',
      html: expect.stringContaining('Welcome, Ada'),
      text: expect.stringContaining('Welcome, Ada'),
    }));
  });

  it('keeps normal notification delivery non-fatal', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mailSpies.generalSend.mockRejectedValueOnce(new Error('SMTP unavailable'));

    await expect(sendEmail('student@example.test', 'Welcome', welcomeEmail('Ada'))).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('keeps OTP delivery failures fatal and includes the OTP in plain text', async () => {
    mailSpies.otpSend.mockRejectedValueOnce(new Error('SMTP unavailable'));

    await expect(
      sendOtpEmail('student@example.test', 'Verify', registrationOtpEmail('120934')),
    ).rejects.toThrow('SMTP unavailable');

    expect(mailSpies.otpSend).toHaveBeenCalledWith(expect.objectContaining({
      from: '"AcadeGrade Auth" <otp@example.test>',
      text: expect.stringContaining('120934'),
    }));

    const sentMessage = mailSpies.otpSend.mock.calls[0]?.[0] as { text: string };
    expect(sentMessage.text.match(/120934/g)).toHaveLength(1);
  });

  it('still rejects OTP delivery when no credentials are configured', async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_PASS;
    delete process.env.OTP_GMAIL_USER;
    delete process.env.OTP_GMAIL_PASS;

    await expect(
      sendOtpEmail('student@example.test', 'Verify', registrationOtpEmail('120934')),
    ).rejects.toThrow('OTP email credentials are not configured');
  });
});
