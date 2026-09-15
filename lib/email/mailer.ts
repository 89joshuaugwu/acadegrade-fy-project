import nodemailer from 'nodemailer';

import {
  adminNewUserEmail,
  degreeClassEmail,
  htmlToPlainText,
  registrationOtpEmail,
  resetPasswordOtpEmail,
  semesterSavedEmail,
  welcomeEmail,
} from './templates';

// Preserve the public template API used by web routes and the mobile-facing APIs.
export {
  adminNewUserEmail,
  degreeClassEmail,
  registrationOtpEmail,
  resetPasswordOtpEmail,
  semesterSavedEmail,
  welcomeEmail,
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const otpTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.OTP_GMAIL_USER || process.env.GMAIL_USER,
    pass: process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS,
  },
});

/**
 * Send a general notification email.
 *
 * This remains non-fatal so an email outage never rolls back an otherwise
 * successful academic action.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.warn('Email credentials missing. Skipping email send to:', to);
      return;
    }

    await transporter.sendMail({
      from: `"AcadeGrade" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: htmlToPlainText(html),
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Send an OTP email using dedicated credentials when configured.
 *
 * Delivery failures intentionally propagate to the API so mobile and web
 * clients never receive a false success response when no OTP was sent.
 */
export async function sendOtpEmail(to: string, subject: string, html: string) {
  const otpUser = process.env.OTP_GMAIL_USER || process.env.GMAIL_USER;
  const otpPass = process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS;
  if (!otpUser || !otpPass) {
    throw new Error('OTP email credentials are not configured');
  }

  await otpTransporter.sendMail({
    from: `"AcadeGrade Auth" <${otpUser}>`,
    to,
    subject,
    html,
    text: htmlToPlainText(html),
  });
}
