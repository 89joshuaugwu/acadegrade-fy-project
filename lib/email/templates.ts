const FALLBACK_SITE_URL = 'https://acadegrade.vercel.app';

const COLORS = {
  void: '#080B16', deep: '#0C1120', surface: '#101626', border: '#293249',
  primary: '#7C74FF', primarySoft: '#B0AAFF', gold: '#F4B544',
  success: '#46C98B', danger: '#FF6B6B', text: '#F7F8FC',
  textMuted: '#A7B0C4', textFaint: '#8E99AE',
} as const;

type ShellOptions = { preheader: string; showProductLinks?: boolean };

function normalizeSiteUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function getEmailSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
    ?? normalizeSiteUrl(process.env.SITE_URL)
    ?? normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
    ?? normalizeSiteUrl(process.env.VERCEL_URL)
    ?? FALLBACK_SITE_URL;
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const heading = (text: string) => `<h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;font-weight:800;letter-spacing:-0.6px;color:${COLORS.text};">${text}</h1>`;
const eyebrow = (text: string) => `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${COLORS.primarySoft};">${text}</p>`;
const paragraph = (text: string, last = false) => `<p style="margin:0 0 ${last ? '0' : '18px'};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${COLORS.textMuted};">${text}</p>`;
const divider = () => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td height="1" style="height:1px;background-color:${COLORS.border};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;

function button(label: string, href: string, tone: 'primary' | 'gold' = 'primary'): string {
  const background = tone === 'gold' ? COLORS.gold : COLORS.primary;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:26px 0 4px;"><tr><td align="center" bgcolor="${background}" style="border-radius:12px;background-color:${background};"><a href="${href}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:800;color:${COLORS.void};text-decoration:none;border-radius:12px;">${label}</a></td></tr></table>`;
}

function infoBox(text: string, tone: 'primary' | 'gold' = 'primary'): string {
  const accent = tone === 'gold' ? COLORS.gold : COLORS.primary;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:22px 0 0;"><tr><td style="padding:14px 16px;border-left:3px solid ${accent};border-radius:0 10px 10px 0;background-color:${COLORS.surface};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${COLORS.textMuted};">${text}</td></tr></table>`;
}

function metric(label: string, value: string, color: string): string {
  return `<td class="metric-cell" width="50%" valign="top" style="padding:7px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td align="center" style="padding:18px 12px;border:1px solid ${COLORS.border};border-radius:12px;background-color:${COLORS.surface};"><p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:${COLORS.textFaint};">${label}</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:800;color:${color};font-variant-numeric:tabular-nums;">${value}</p></td></tr></table></td>`;
}

function feature(label: string, detail: string): string {
  return `<tr><td width="32" valign="top" style="padding:11px 0;color:${COLORS.primarySoft};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;">&#10003;</td><td valign="top" style="padding:11px 0;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${COLORS.text};"><strong>${label}</strong><br><span style="color:${COLORS.textMuted};">${detail}</span></td></tr>`;
}

function renderEmail(title: string, content: string, options: ShellOptions): string {
  const siteUrl = getEmailSiteUrl();
  const logoUrl = `${siteUrl}/logo.png`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark"><title>${escapeEmailHtml(title)}</title>
  <style>
    html,body{margin:0!important;padding:0!important;width:100%!important;background:#080B16!important}
    table,td{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}a{text-decoration:none}
    @media only screen and (max-width: 620px){
      .email-outer{padding:20px 10px!important}.email-shell{width:100%!important;max-width:100%!important}
      .email-content{padding:28px 20px!important}.email-header{padding:22px 20px!important}.email-footer{padding:24px 16px 8px!important}
      .metric-cell{display:block!important;width:100%!important;padding:6px 0!important}.otp-cell{padding:22px 12px!important}
      .otp-code{font-size:34px!important;line-height:42px!important;letter-spacing:6px!important}
      .otp-action-cell,.otp-action{display:block!important;width:100%!important;box-sizing:border-box!important}
    }
  </style>
  <!--[if mso]><style>body,table,td,a,h1,p{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.void};">
  <div data-email-preheader style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeEmailHtml(options.preheader)}&#847; &zwnj;&nbsp;&#847; &zwnj;&nbsp;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.void}" class="email-outer" style="width:100%;background-color:${COLORS.void};"><tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-shell" style="width:100%;max-width:600px;">
      <tr><td class="email-header" style="padding:24px 30px;border:1px solid ${COLORS.border};border-bottom:0;border-radius:18px 18px 0 0;background-color:${COLORS.deep};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="50" valign="middle"><a href="${siteUrl}" aria-label="Visit AcadeGrade"><img src="${logoUrl}" width="42" height="42" alt="AcadeGrade" style="display:block;width:42px;height:42px;border-radius:12px;background-color:${COLORS.surface};"></a></td>
          <td valign="middle" style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:26px;font-weight:800;letter-spacing:-0.4px;"><a href="${siteUrl}" style="color:${COLORS.text};">Acade<span style="color:${COLORS.gold};">Grade</span></a><br><span style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:${COLORS.textFaint};">Academic clarity, built in</span></td>
        </tr></table>
      </td></tr>
      <tr><td height="4" bgcolor="${COLORS.primary}" style="height:4px;background-color:${COLORS.primary};font-size:1px;line-height:1px;">&nbsp;</td></tr>
      <tr><td class="email-content" style="padding:40px 38px;border:1px solid ${COLORS.border};border-top:0;border-radius:0 0 18px 18px;background-color:${COLORS.deep};">${content}</td></tr>
      <tr><td class="email-footer" align="center" style="padding:28px 16px 8px;font-family:Arial,Helvetica,sans-serif;color:${COLORS.textFaint};">
        ${options.showProductLinks === false ? '' : `<p style="margin:0 0 14px;font-size:12px;line-height:18px;"><a href="${siteUrl}/dashboard" style="color:${COLORS.textMuted};">Dashboard</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${siteUrl}/insights" style="color:${COLORS.textMuted};">Insights</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${siteUrl}/transcript" style="color:${COLORS.textMuted};">Transcript</a></p>`}
        <p style="margin:0 0 6px;font-size:12px;line-height:18px;">&copy; ${new Date().getFullYear()} AcadeGrade. Academic progress, made clear.</p>
        <p style="margin:0;font-size:11px;line-height:17px;">This is an automated service email. Never share passwords or verification codes by reply.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

const otpCopyUrl = (code: string) => `${getEmailSiteUrl()}/copy-code#code=${encodeURIComponent(code)}`;

function otpPanel(code: string, variant: 'registration' | 'reset'): string {
  const accent = variant === 'registration' ? COLORS.primarySoft : COLORS.gold;
  const label = variant === 'registration' ? 'Email verification code' : 'Password reset code';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 18px;"><tr><td class="otp-cell" align="center" style="padding:26px 18px;border:1px solid ${accent};border-radius:14px;background-color:${COLORS.surface};"><p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.textFaint};">${label}</p><p data-otp-code class="otp-code" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:40px;line-height:48px;font-weight:800;letter-spacing:8px;color:${accent};font-variant-numeric:tabular-nums;">${escapeEmailHtml(code)}</p><p style="margin:11px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${COLORS.textMuted};">Expires in 5 minutes. Never share this code.</p></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;"><tr><td class="otp-action-cell" align="center" bgcolor="${COLORS.primary}" style="border-radius:12px;background-color:${COLORS.primary};"><a class="otp-action" href="${otpCopyUrl(code)}" style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:800;color:${COLORS.void};text-decoration:none;border-radius:12px;">Copy code on this device</a></td></tr></table><p style="margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:${COLORS.textFaint};">Opens AcadeGrade's secure copy screen. Tap once there, then return to the app.</p>`;
}

export function welcomeEmail(name: string): string {
  const safeName = escapeEmailHtml(name);
  return renderEmail('Welcome to AcadeGrade', `${eyebrow('Your workspace is ready')}${heading(`Welcome, ${safeName}`)}${paragraph('Turn semester results into a clear academic record, useful forecasts, and practical next steps.')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${feature('Track every result', 'Keep scores, grades, credit units, and semester context together.')}${feature('Scan instead of typing', 'Use OCR to capture result sheets, then review before saving.')}${feature('Understand what comes next', 'Use CGPA trends, AI insights, and what-if planning responsibly.')}</table>${divider()}${paragraph('Begin with your current semester or bring in earlier results when you are ready.', true)}${button('Open your dashboard', `${getEmailSiteUrl()}/dashboard`)}`, { preheader: `Welcome ${name}. Your AcadeGrade workspace is ready.` });
}

export function semesterSavedEmail(name: string, gpa: number, semester: string): string {
  const safeName = escapeEmailHtml(name);
  const safeSemester = escapeEmailHtml(semester);
  const formattedGpa = Number.isFinite(gpa) ? gpa.toFixed(2) : '0.00';
  const gpaColor = gpa >= 4.5 ? COLORS.success : gpa >= 3.5 ? COLORS.primarySoft : gpa >= 2.5 ? COLORS.gold : COLORS.danger;
  return renderEmail('Semester results saved', `${eyebrow('Academic record updated')}${heading('Your semester is safely recorded')}${paragraph(`Hi ${safeName}, your results for <strong style="color:${COLORS.text};">${safeSemester}</strong> are now part of your AcadeGrade record.`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 24px;"><tr>${metric('Semester GPA', formattedGpa, gpaColor)}${metric('Semester', safeSemester, COLORS.text)}</tr></table>${paragraph('Your CGPA trend and degree-class outlook have been recalculated from the saved record.', true)}${button('Review your insights', `${getEmailSiteUrl()}/insights`)}${infoBox('Always compare AcadeGrade with your institution\'s official result and transcript.')}`, { preheader: `${semester} is saved. Semester GPA: ${formattedGpa}.` });
}

export function degreeClassEmail(name: string, degreeClass: string): string {
  const safeName = escapeEmailHtml(name);
  const safeClass = escapeEmailHtml(degreeClass);
  return renderEmail('Degree-class outlook updated', `${eyebrow('Milestone update')}${heading(`Strong progress, ${safeName}`)}${paragraph('Your latest saved results place your current AcadeGrade outlook in:')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td align="center" style="padding:20px;border:1px solid ${COLORS.gold};border-radius:14px;background-color:${COLORS.surface};font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:30px;font-weight:800;color:${COLORS.gold};">${safeClass}</td></tr></table>${paragraph('Keep recording complete, accurate results so your outlook reflects your real academic position.', true)}${button('View your dashboard', `${getEmailSiteUrl()}/dashboard`, 'gold')}`, { preheader: `Your current degree-class outlook is ${degreeClass}.` });
}

export function adminNewUserEmail(name: string, matric: string): string {
  const safeName = escapeEmailHtml(name);
  const safeMatric = escapeEmailHtml(matric);
  return renderEmail('New student registration', `${eyebrow('Admin notification')}${heading('A new student joined AcadeGrade')}${paragraph('A student has completed registration and is ready to use the platform.')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${COLORS.border};border-radius:12px;background-color:${COLORS.surface};"><tr><td style="padding:16px 18px;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;"><span style="font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${COLORS.textFaint};">Student name</span><br><span style="font-size:15px;line-height:23px;font-weight:700;color:${COLORS.text};">${safeName}</span></td></tr><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;"><span style="font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${COLORS.textFaint};">Matric number</span><br><span style="font-size:15px;line-height:23px;font-weight:700;color:${COLORS.text};font-variant-numeric:tabular-nums;">${safeMatric}</span></td></tr></table>${button('Open user management', `${getEmailSiteUrl()}/admin/users`)}`, { preheader: `${name} completed AcadeGrade registration.`, showProductLinks: false });
}

export function registrationOtpEmail(otp: string): string {
  return renderEmail('Verify your email - AcadeGrade', `${eyebrow('Secure registration')}${heading('Verify your email')}${paragraph('Enter this one-time code in AcadeGrade to continue creating your account.')}${otpPanel(otp, 'registration')}${infoBox('If you did not request this code, ignore this email. No account will be created.')}`, { preheader: `Your AcadeGrade verification code is ${otp}. It expires in 5 minutes.`, showProductLinks: false });
}

export function resetPasswordOtpEmail(otp: string): string {
  return renderEmail('Reset your password - AcadeGrade', `${eyebrow('Account security')}${heading('Reset your password')}${paragraph('Enter this one-time code in AcadeGrade to verify your identity and choose a new password.')}${otpPanel(otp, 'reset')}${infoBox('If you did not request a password reset, ignore this email. Your current password remains unchanged.', 'gold')}`, { preheader: `Your AcadeGrade password reset code is ${otp}. It expires in 5 minutes.`, showProductLinks: false });
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', middot: '·', ndash: '–', mdash: '—', copy: '©', zwnj: '' };
  return value.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<div[^>]*data-email-preheader[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(h[1-6]|p|div|td|tr|table)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
