import nodemailer from 'nodemailer';

/** Main transporter — used for general notifications (welcome, semester saved, etc.) */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/** OTP transporter — separate Gmail to reduce load on the main notification account.
 *  Falls back to the main GMAIL_USER/GMAIL_PASS if OTP-specific credentials aren't set. */
const otpTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.OTP_GMAIL_USER || process.env.GMAIL_USER,
    pass: process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS,
  },
});

/* ═══════════════════════════════════════════════════════
   AcadeGrade Email Design System
   Matches the dark premium aesthetic of the website
   ═══════════════════════════════════════════════════════ */

const COLORS = {
  void: '#07090F',
  deep: '#0E1322',
  surface: '#141B2E',
  overlay: '#1A243D',
  border: '#1F2B47',
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  primaryGlow: '#818CF8',
  gold: '#F59E0B',
  success: '#22C55E',
  danger: '#EF4444',
  text: '#E8EDFF',
  textMuted: '#8892B0',
  textFaint: '#4A5580',
};

const LOGO_URL = 'https://acadegrade.vercel.app/logo.png';
const SITE_URL = 'https://acadegrade.vercel.app';

/**
 * Premium base email template matching AcadeGrade's dark UI
 */
const baseTemplate = (title: string, content: string, options?: { showFooterCta?: boolean }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-outer { padding: 20px 12px !important; }
      .email-shell { width: 100% !important; }
      .email-content { padding: 30px 20px !important; }
      .email-footer { padding-top: 24px !important; }
      .otp-cell { padding: 20px 14px !important; }
      .otp-code { font-size: 34px !important; letter-spacing: 5px !important; }
      .otp-action { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .otp-action-cell { width: 100% !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.void}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <!-- Outer wrapper -->
  <table role="presentation" class="email-outer" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.void}; padding: 48px 16px 40px;">
    <tr>
      <td align="center">

        <!-- Main container -->
        <table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 0 34px 0;">
              <a href="${SITE_URL}" style="text-decoration: none; display: inline-block;">
                <img src="${LOGO_URL}" alt="AcadeGrade" width="54" height="54" style="display: block; border: 0; border-radius: 15px;" />
              </a>
              <p style="margin: 13px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.7px;">
                <span style="background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Acade</span><span style="color: ${COLORS.gold};">Grade</span>
              </p>
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color: ${COLORS.deep}; border: 1px solid ${COLORS.border}; border-radius: 18px; overflow: hidden;">

              <!-- Gradient accent bar -->
              <div style="height: 4px; background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryGlow}, ${COLORS.gold});"></div>

              <!-- Content -->
              <div class="email-content" style="padding: 42px 40px;">
                ${content}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding: 30px 0 0 0; text-align: center;">
              ${options?.showFooterCta !== false ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="${SITE_URL}/dashboard" style="color: ${COLORS.textFaint}; font-size: 12px; text-decoration: none;">Dashboard</a>
                  </td>
                  <td style="color: ${COLORS.border}; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="${SITE_URL}/insights" style="color: ${COLORS.textFaint}; font-size: 12px; text-decoration: none;">Insights</a>
                  </td>
                  <td style="color: ${COLORS.border}; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="${SITE_URL}/transcript" style="color: ${COLORS.textFaint}; font-size: 12px; text-decoration: none;">Transcript</a>
                  </td>
                  <td style="color: ${COLORS.border}; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="${SITE_URL}/settings" style="color: ${COLORS.textFaint}; font-size: 12px; text-decoration: none;">Settings</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin: 0 0 6px 0; font-size: 12px; color: ${COLORS.textFaint};">
                &copy; ${new Date().getFullYear()} AcadeGrade — Premium Academic Tracker
              </p>
              <p style="margin: 0; font-size: 11px; color: ${COLORS.textFaint};">
                Built with 💜 by <a href="https://github.com/joshuazaza" style="color: ${COLORS.primaryGlow}; text-decoration: none;">joshuazaza</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

/* ═══════════════════════════════════════════
   Reusable email components
   ═══════════════════════════════════════════ */

const heading = (text: string) =>
  `<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${COLORS.text}; letter-spacing: -0.3px; line-height: 1.3;">${text}</h2>`;

const paragraph = (text: string) =>
  `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: ${COLORS.textMuted};">${text}</p>`;

const primaryButton = (text: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td style="background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover}); border-radius: 10px; box-shadow: 0 4px 16px rgba(99,102,241,0.3);">
        <a href="${url}" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;

const goldButton = (text: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td style="background: linear-gradient(135deg, ${COLORS.gold}, #D97706); border-radius: 10px; box-shadow: 0 4px 16px rgba(245,158,11,0.3);">
        <a href="${url}" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: ${COLORS.void}; text-decoration: none; letter-spacing: 0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;

const statCard = (label: string, value: string, color: string) =>
  `<td style="background-color: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 16px 20px; text-align: center; width: 50%;">
    <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.textFaint};">${label}</p>
    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${color}; font-variant-numeric: tabular-nums;">${value}</p>
  </td>`;

const divider = () =>
  `<div style="height: 1px; background: linear-gradient(90deg, transparent, ${COLORS.border}, transparent); margin: 24px 0;"></div>`;

const infoBox = (text: string) =>
  `<div style="background-color: ${COLORS.surface}; border-left: 3px solid ${COLORS.primary}; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted}; line-height: 1.5;">${text}</p>
  </div>`;

/** Email clients block clipboard JavaScript. The action below opens AcadeGrade's
 * first-party copy page, where the recipient can tap once to copy the code.
 * Keeping the code in the URL fragment means it is not sent to the server. */
const otpCopyUrl = (otp: string) => `${SITE_URL}/copy-code#code=${encodeURIComponent(otp)}`;

const otpPanel = (otp: string, variant: 'registration' | 'reset') => {
  const accent = variant === 'registration' ? COLORS.primaryGlow : COLORS.gold;
  const label = variant === 'registration' ? 'Your verification code' : 'Your password reset code';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 18px;">
      <tr>
        <td class="otp-cell" align="center" style="padding: 26px 20px; background-color: ${COLORS.surface}; border: 2px solid ${accent}; border-radius: 16px; box-shadow: 0 12px 28px rgba(4,7,18,0.28);">
          <p style="margin: 0 0 12px; font-size: 10px; line-height: 14px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase; color: ${COLORS.textFaint};">${label}</p>
          <p class="otp-code" style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 42px; line-height: 48px; font-weight: 800; letter-spacing: 9px; color: ${accent}; font-variant-numeric: tabular-nums;">${otp}</p>
          <p style="margin: 14px 0 0; font-size: 12px; line-height: 18px; color: ${COLORS.textMuted};">Valid for 5 minutes. Never share this code.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px;">
      <tr>
        <td class="otp-action-cell" align="center" style="background-color: ${COLORS.primary}; border-radius: 12px;">
          <a class="otp-action" href="${otpCopyUrl(otp)}" style="display: inline-block; padding: 15px 24px; font-size: 14px; line-height: 18px; font-weight: 800; color: #ffffff; text-decoration: none;">Copy code on this device</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 11px; line-height: 16px; text-align: center; color: ${COLORS.textFaint};">Tap once to copy, then return to AcadeGrade and paste your code.</p>
  `;
};

/* ═══════════════════════════════════════════
   Email Templates
   ═══════════════════════════════════════════ */

export const welcomeEmail = (name: string) => baseTemplate(
  'Welcome to AcadeGrade',
  `
    ${heading(`Welcome, ${name}! 🎓`)}
    ${paragraph(`Your academic command center is ready. AcadeGrade gives you powerful tools to track every semester, predict your trajectory, and optimize your path to academic excellence.`)}

    ${divider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 8px 0;">
      <tr>
        <td style="padding-right: 8px;" width="33%">
          <div style="background-color: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 22px;">📊</p>
            <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted}; font-weight: 500;">Live CGPA Tracking</p>
          </div>
        </td>
        <td style="padding: 0 4px;" width="33%">
          <div style="background-color: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 22px;">🤖</p>
            <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted}; font-weight: 500;">AI-Powered Insights</p>
          </div>
        </td>
        <td style="padding-left: 8px;" width="33%">
          <div style="background-color: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 16px; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 22px;">📈</p>
            <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted}; font-weight: 500;">Grade Predictions</p>
          </div>
        </td>
      </tr>
    </table>

    ${divider()}
    ${paragraph(`Start by adding your first semester's results. Every grade you enter brings you closer to a complete picture of your academic journey.`)}
    ${primaryButton('Open Dashboard →', `${SITE_URL}/dashboard`)}
  `
);

export const semesterSavedEmail = (name: string, gpa: number, semester: string) => baseTemplate(
  'Semester Results Saved',
  `
    ${heading(`Results Saved! 📚`)}
    ${paragraph(`Hey ${name}, your results for <strong style="color: ${COLORS.text};">${semester}</strong> have been securely saved to your AcadeGrade profile.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin: 20px 0;">
      <tr>
        ${statCard('Semester GPA', gpa.toFixed(2), gpa >= 4.5 ? COLORS.success : gpa >= 3.5 ? COLORS.primary : gpa >= 2.5 ? COLORS.gold : COLORS.danger)}
        ${statCard('Semester', semester, COLORS.text)}
      </tr>
    </table>

    ${paragraph(`Your CGPA trajectory and degree class outlook have been updated. Check your Insights page for AI-powered analysis of your academic performance.`)}
    ${primaryButton('View Insights →', `${SITE_URL}/insights`)}
    ${infoBox('💡 Tip: Enable push notifications in Settings to get instant updates when your degree class changes.')}
  `
);

export const degreeClassEmail = (name: string, degreeClass: string) => baseTemplate(
  'Degree Class Achievement! 🎓',
  `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; font-size: 48px; line-height: 1;">🏆</div>
    </div>

    ${heading(`Congratulations, ${name}!`)}
    ${paragraph(`Your academic performance has been nothing short of impressive. Your current CGPA trajectory has officially placed you in the:`)}

    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: linear-gradient(135deg, ${COLORS.gold}, #D97706); padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 24px rgba(245,158,11,0.3);">
        <p style="margin: 0; font-size: 22px; font-weight: 700; color: ${COLORS.void}; letter-spacing: -0.3px;">${degreeClass}</p>
      </div>
    </div>

    ${paragraph(`Keep pushing — every grade counts. Your dedication is paying off, and the sky is truly the limit.`)}
    ${divider()}
    ${goldButton('View Your Dashboard →', `${SITE_URL}/dashboard`)}
  `
);

export const adminNewUserEmail = (name: string, matric: string) => baseTemplate(
  'New User Registration',
  `
    ${heading('New Student Joined 👋')}
    ${paragraph('A new student has registered on the AcadeGrade platform:')}

    <div style="background-color: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 20px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0;">
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.textFaint};">Name</span><br />
            <span style="font-size: 15px; font-weight: 600; color: ${COLORS.text};">${name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid ${COLORS.border};">
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.textFaint};">Matric Number</span><br />
            <span style="font-size: 15px; font-weight: 600; color: ${COLORS.text}; font-variant-numeric: tabular-nums;">${matric}</span>
          </td>
        </tr>
      </table>
    </div>

    ${primaryButton('View in Admin Panel →', `${SITE_URL}/admin/users`)}
  `,
  { showFooterCta: false }
);

export const registrationOtpEmail = (otp: string) => baseTemplate(
  'Verify Your Email — AcadeGrade',
  `
    <div style="text-align: center; margin-bottom: 8px;">
      <div style="display: inline-block; font-size: 40px; line-height: 1;">🔐</div>
    </div>

    ${heading('Verify Your Email')}
    ${paragraph('One final step: confirm that this email belongs to you. Use the secure code below in AcadeGrade to complete your registration.')}

    ${otpPanel(otp, 'registration')}

    <!-- Legacy fallback retained but hidden in HTML email clients. -->
    <div style="display: none;">
      <div style="display: inline-block; background-color: ${COLORS.surface}; border: 2px solid ${COLORS.primary}; border-radius: 14px; padding: 20px 36px; box-shadow: 0 0 30px rgba(99,102,241,0.15);">
        <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${COLORS.primaryGlow}; font-variant-numeric: tabular-nums;">${otp}</p>
      </div>
    </div>

    <div style="text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textFaint};">
        ⏱ This code expires in <strong style="color: ${COLORS.gold};">5 minutes</strong>
      </p>
    </div>

    ${divider()}
    ${infoBox('If you did not request this code, you can safely ignore this email. No account will be created.')}
  `,
  { showFooterCta: false }
);

export const resetPasswordOtpEmail = (otp: string) => baseTemplate(
  'Reset Your Password — AcadeGrade',
  `
    <div style="text-align: center; margin-bottom: 8px;">
      <div style="display: inline-block; font-size: 40px; line-height: 1;">🔑</div>
    </div>

    ${heading('Reset Your Password')}
    ${paragraph('We received a request to reset your AcadeGrade password. Use this secure code in the app to verify your identity and choose a new password.')}

    ${otpPanel(otp, 'reset')}

    <!-- Legacy fallback retained but hidden in HTML email clients. -->
    <div style="display: none;">
      <div style="display: inline-block; background-color: ${COLORS.surface}; border: 2px solid ${COLORS.gold}; border-radius: 14px; padding: 20px 36px; box-shadow: 0 0 30px rgba(245,158,11,0.15);">
        <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${COLORS.gold}; font-variant-numeric: tabular-nums;">${otp}</p>
      </div>
    </div>

    <div style="text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textFaint};">
        ⏱ This code expires in <strong style="color: ${COLORS.gold};">5 minutes</strong>
      </p>
    </div>

    ${divider()}
    ${infoBox('If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.')}
  `,
  { showFooterCta: false }
);

/* ═══════════════════════════════════════════
   Email Sending Functions
   ═══════════════════════════════════════════ */

/** Send a general notification email (welcome, semester saved, degree class, etc.) */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.warn('Email credentials missing. Skipping email send to:', to);
      return;
    }
    await transporter.sendMail({
      from: '"AcadeGrade" <' + process.env.GMAIL_USER + '>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/** Send an OTP email using the dedicated OTP transporter.
 *  Uses OTP_GMAIL_USER/OTP_GMAIL_PASS if set, otherwise falls back to GMAIL_USER/GMAIL_PASS. */
export async function sendOtpEmail(to: string, subject: string, html: string) {
  const otpUser = process.env.OTP_GMAIL_USER || process.env.GMAIL_USER;
  const otpPass = process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS;
  if (!otpUser || !otpPass) {
    throw new Error('OTP email credentials are not configured');
  }

  // Delivery failures must reach the API route. Otherwise the UI reports a
  // successful send even though no message left the server.
  await otpTransporter.sendMail({
    from: '"AcadeGrade Auth" <' + otpUser + '>',
    to,
    subject,
    html,
  });
}
