import nodemailer from 'nodemailer';
import { getEmailDeliveryCredential } from './managed-credentials';
import { EMAIL_MARK_CID, EMAIL_MARK_PNG_BASE64 } from './brand-mark';

import {
  adminNewUserEmail,
  adminSupportRequestEmail,
  degreeClassEmail,
  htmlToPlainText,
  registrationOtpEmail,
  resetPasswordOtpEmail,
  semesterSavedEmail,
  supportReplyEmail,
  welcomeEmail,
} from './templates';

// Preserve the public template API used by web routes and the mobile-facing APIs.
export {
  adminNewUserEmail,
  adminSupportRequestEmail,
  degreeClassEmail,
  registrationOtpEmail,
  resetPasswordOtpEmail,
  semesterSavedEmail,
  supportReplyEmail,
  welcomeEmail,
};

function transport(account: { user: string; pass: string }) {
  return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: account });
}

/**
 * The masthead logo travels with the message as an inline (Content-ID) image, so it shows
 * even when the site URL is local or remote images are blocked. Only attached when used.
 */
export function inlineAssets(html: string) {
  if (!html.includes(`cid:${EMAIL_MARK_CID}`)) return [];
  return [{
    filename: 'acadegrade.png',
    content: Buffer.from(EMAIL_MARK_PNG_BASE64, 'base64'),
    contentType: 'image/png',
    cid: EMAIL_MARK_CID,
    contentDisposition: 'inline' as const,
  }];
}

/**
 * Send a general notification email.
 *
 * This remains non-fatal so an email outage never rolls back an otherwise
 * successful academic action.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const account = await getEmailDeliveryCredential('general');
    if (!account) {
      console.warn('General email credentials missing. Skipping email send.');
      return;
    }

    await transport(account).sendMail({
      from: `"AcadeGrade" <${account.user}>`,
      to,
      subject,
      html,
      text: htmlToPlainText(html),
      attachments: inlineAssets(html),
    });
  } catch (error) {
    console.error('Failed to send general email:', error instanceof Error ? error.name : 'Delivery error');
  }
}

/**
 * Send an OTP email using dedicated credentials when configured.
 *
 * Delivery failures intentionally propagate to the API so mobile and web
 * clients never receive a false success response when no OTP was sent.
 */
export async function sendOtpEmail(to: string, subject: string, html: string) {
  const account = await getEmailDeliveryCredential('otp');
  if (!account) {
    throw new Error('OTP email credentials are not configured');
  }

  await transport(account).sendMail({
    from: `"AcadeGrade Auth" <${account.user}>`,
    to,
    subject,
    html,
    text: htmlToPlainText(html),
    attachments: inlineAssets(html),
  });
}
