import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mailSpies = vi.hoisted(() => ({
  generalSend: vi.fn(),
  otpSend: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn((options: { auth: { user: string } }) => ({
      sendMail: options.auth.user.startsWith('otp@') ? mailSpies.otpSend : mailSpies.generalSend,
    })),
  },
}));

vi.mock('@/lib/email/managed-credentials', () => ({
  getEmailDeliveryCredential: async (kind: 'general' | 'otp') => {
    const user = kind === 'otp' ? process.env.OTP_GMAIL_USER || process.env.GMAIL_USER : process.env.GMAIL_USER;
    const pass = kind === 'otp' ? process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS : process.env.GMAIL_PASS;
    return user && pass ? { user, pass } : null;
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
import { htmlToPlainText } from '@/lib/email/templates';

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

  it('semester email colour follows resolveDegreeClass', () => {
    const GOLD = '#F4B544';
    const SUCCESS = '#46C98B';
    const PRIMARY_SOFT = '#B0AAFF';
    const DANGER = '#FF6B6B';
    const colourOf = (gpa: number) => {
      const html = semesterSavedEmail('Ada', gpa, 'First Semester');
      const match = /Semester GPA<\/p><p style="[^"]*?color:(#[0-9A-Fa-f]{6})/.exec(html);
      return [SUCCESS, PRIMARY_SOFT, GOLD, DANGER].find((colour) => colour === match?.[1]);
    };
    expect(colourOf(2.45)).toBe(GOLD);      // 2:2 starts at 2.40, not 2.50
    expect(colourOf(2.4)).toBe(GOLD);
    expect(colourOf(4.495)).toBe(SUCCESS);  // rounds to 4.50: First Class
    expect(colourOf(3.5)).toBe(PRIMARY_SOFT);
    expect(colourOf(2.39)).toBe(DANGER);    // Third Class and below stay red
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
      expect(html).toContain('<html lang="en"');
      expect(html).toContain('<meta name="color-scheme" content="light dark">');
      expect(html).toContain('data-email-preheader');
      expect(html).toContain('role="presentation"');
      expect(html).toContain('alt="AcadeGrade"');
      expect(html).toContain('Acade<span');
      expect(html).toContain('@media only screen and (max-width: 620px)');
      expect(html).toContain('You received this because');
      expect(html).not.toMatch(/\u00e2|\u00c2|\u00f0\u0178|\ufffd/u);
      // No emoji anywhere in the markup.
      expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('links Privacy, Terms and Support in every footer from the configured origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.acadegrade.com/';

    for (const html of [welcomeEmail('Ada'), registrationOtpEmail('123456'), adminNewUserEmail('Ada', 'CSC/1')]) {
      expect(html).toContain('href="https://app.acadegrade.com/privacy"');
      expect(html).toContain('href="https://app.acadegrade.com/terms"');
      expect(html).toContain('href="https://app.acadegrade.com/support"');
    }
  });

  it('shows the unofficial-records line only on academic emails', () => {
    const notice = 'AcadeGrade records are unofficial and self-reported.';

    expect(welcomeEmail('Ada')).toContain(notice);
    expect(semesterSavedEmail('Ada', 3.2, 'First Semester')).toContain(notice);
    expect(degreeClassEmail('Ada', 'First Class')).toContain(notice);
    expect(registrationOtpEmail('123456')).not.toContain(notice);
    expect(adminNewUserEmail('Ada', 'CSC/1')).not.toContain(notice);
  });

  it('never prints an email address or mailto link that was not passed in', () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'help@acadegrade.test';
    process.env.GMAIL_USER = 'sender@acadegrade.test';
    const addressPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

    const templates = [
      welcomeEmail('Ada'),
      semesterSavedEmail('Ada', 4.12, 'First Semester'),
      degreeClassEmail('Ada', 'First Class'),
      adminNewUserEmail('Ada', 'CSC/1'),
      registrationOtpEmail('482916'),
      resetPasswordOtpEmail('482916'),
    ];

    for (const html of templates) {
      expect(html).not.toMatch(addressPattern);
      expect(html).not.toContain('mailto:');
    }
  });

  it('escapes the preheader and every name-bearing template', () => {
    const hostile = '<script>alert("x")</script>';

    for (const html of [
      welcomeEmail(hostile),
      semesterSavedEmail(hostile, 3, hostile),
      degreeClassEmail(hostile, hostile),
      adminNewUserEmail(hostile, hostile),
    ]) {
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    }

    const preheader = /<div data-email-preheader[^>]*>([^<]*)/.exec(welcomeEmail('Ada & <b>Co</b>'))?.[1];
    expect(preheader).toContain('Welcome Ada &amp; &lt;b&gt;Co&lt;/b&gt;. Your AcadeGrade account is ready.');
  });

  it('puts the GPA and semester in the semester email preheader, with a fallback for a blank semester', () => {
    expect(semesterSavedEmail('Ada', 4.12, 'First Semester')).toContain('First Semester is saved. Semester GPA: 4.12.');

    const blank = semesterSavedEmail('Ada', 4.12, '   ');
    expect(blank).toContain('Your latest semester is saved. Semester GPA: 4.12.');
    expect(blank).toContain('Latest semester');
    expect(blank).toContain('href="https://acadegrade.vercel.app/insights"');
  });

  it('keeps button destinations in the plain-text alternative', () => {
    const text = htmlToPlainText(semesterSavedEmail('Ada', 4.12, 'First Semester'));

    expect(text).toContain('Review your insights (https://acadegrade.vercel.app/insights)');
    expect(text).toContain('Support (https://acadegrade.vercel.app/support)');
    expect(text).toContain('AcadeGrade');
    expect(text).not.toContain('Acade Grade');
    expect(text).not.toMatch(/<[a-z!/]/i);
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

  it('renders one OTP as a single selectable piece of text with no web copy button', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://acadegrade.com';

    const html = registrationOtpEmail('120934');

    expect(html.match(/data-otp-code/g)).toHaveLength(1);
    const codeElement = /<p data-otp-code[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    // One text node: press-and-hold selects all six digits at once.
    expect(codeElement).toBe('120934');
    expect(html).toMatch(/data-otp-code[^>]*user-select:all/);
    expect(html).toContain('press and hold it, then tap Copy');
    // An email cannot write to the clipboard, so there is no button that opens a web page.
    expect(html).not.toContain('copy-code');
    expect(html).not.toContain('Copy code on this device');
    expect(html).not.toContain('Legacy fallback');
    expect(html).toContain('This code expires in 5 minutes.');
    expect(html).toContain('Never share this code.');
  });

  it('keeps the reset OTP code in the plain text exactly once and never leaks the copy link', () => {
    const text = htmlToPlainText(resetPasswordOtpEmail('482916'));

    expect(text.match(/482916/g)).toHaveLength(1);
    expect(text).not.toContain('copy-code');
    expect(text).toContain('Reset your password');
    expect(text).toContain('This code expires in 5 minutes.');
  });

  it('escapes a hostile OTP value', () => {
    const html = registrationOtpEmail('<b>1</b>');

    expect(html).not.toContain('<b>1</b>');
    expect(html).toContain('&lt;b&gt;1&lt;/b&gt;');
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
