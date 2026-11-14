import { formatCgpa, resolveDegreeClass } from '@/lib/cgpa/academicRules';
import { SUPPORT_PAGE_PATH } from '@/lib/site/contact-email';

const FALLBACK_SITE_URL = 'https://acadegrade.vercel.app';

/**
 * Light-first palette: a white letter on a cool tinted ground, with the
 * brand's navy reserved for the masthead and the academic "record" panels.
 * Light designs survive Gmail and Outlook auto-inversion far better than
 * dark ones; Apple Mail gets a deliberate dark palette via the dark-mode block.
 */
const COLORS = {
  // Brand navy (masthead, record panels) and accents used on navy.
  void: '#080B16', deep: '#0C1120', surface: '#101626', border: '#293249',
  primary: '#7C74FF', primarySoft: '#B0AAFF', gold: '#F4B544',
  success: '#46C98B', danger: '#FF6B6B', text: '#F7F8FC',
  textMuted: '#A7B0C4', textFaint: '#8E99AE',
  // Light letter.
  ground: '#EEF0F6', paper: '#FFFFFF', tint: '#F4F5FA', otpTint: '#F1F0FF',
  warnTint: '#FFF5E1', warnInk: '#5C3D06',
  ink: '#12162B', body: '#3A4157', muted: '#5D6479',
  action: '#5047DB', link: '#4A41D1',
} as const;

/** Dark-mode values for clients that honour prefers-color-scheme (Apple Mail, iOS Mail). */
const DARK = {
  ground: '#080B16', mast: '#0C1120', paper: '#111729', tint: '#182039', record: '#080B16',
  warnTint: '#2A2110', warnInk: '#F4D79B', ink: '#F2F4FA', body: '#C9CEDB', muted: '#A7B0C4', link: '#B0AAFF',
} as const;

const FONT = {
  sans: `'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`,
  display: `'Bricolage Grotesque','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`,
  mono: `ui-monospace,SFMono-Regular,Menlo,Consolas,'Roboto Mono','Liberation Mono','Courier New',monospace`,
} as const;

const OTP_EXPIRY_TEXT = 'This code expires in 5 minutes.';

type ShellOptions = {
  preheader: string;
  /** The "you received this because..." line in the footer. */
  reason: string;
  /** Adds the unofficial, self-reported records line to the footer. */
  recordsNotice?: boolean;
};

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

// ---------------------------------------------------------------------------
// Building blocks. Every block is a self-contained, inline-styled table or
// paragraph so it renders the same in Gmail, Yahoo, Outlook and Apple Mail.
// ---------------------------------------------------------------------------

const TABLE_ATTRS = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

const text = (size: number, lineHeight: number, color: string, extra = '') =>
  `margin:0;font-family:${FONT.sans};font-size:${size}px;line-height:${lineHeight}px;color:${color};${extra}`;

function spacer(height: number): string {
  return `<table ${TABLE_ATTRS} width="100%"><tr><td height="${height}" style="height:${height}px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
}

function heading(content: string): string {
  return `<h1 class="em-ink em-h1" style="margin:0 0 14px;font-family:${FONT.display};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${COLORS.ink};">${content}</h1>`;
}

function paragraph(content: string, options: { last?: boolean; muted?: boolean; align?: 'left' | 'center' } = {}): string {
  const color = options.muted ? COLORS.muted : COLORS.body;
  const size = options.muted ? 14 : 16;
  const lineHeight = options.muted ? 22 : 26;
  const align = options.align === 'center' ? 'text-align:center;' : '';
  return `<p class="${options.muted ? 'em-muted' : 'em-body'}" style="${text(size, lineHeight, color, `margin:0 0 ${options.last ? 0 : 16}px;${align}`)}">${content}</p>`;
}

const strong = (content: string) => `<strong class="em-ink" style="font-weight:600;color:${COLORS.ink};">${content}</strong>`;

/**
 * Bulletproof button: the cell carries the fill (so Outlook paints it via
 * bgcolor and mso-padding-alt), the link carries the padding everywhere else.
 * `plainText` adds the URL to the plain-text alternative.
 */
function button(label: string, href: string, options: { align?: 'left' | 'center'; plainText?: boolean } = {}): string {
  const align = options.align === 'center' ? ' align="center"' : '';
  const plain = options.plainText === false ? '' : ' data-plain-href';
  return `<table ${TABLE_ATTRS}${align} class="em-btn-wrap"><tr><td align="center" bgcolor="${COLORS.action}" class="em-btn-cell" style="border-radius:999px;background-color:${COLORS.action};mso-padding-alt:14px 30px;"><a href="${href}"${plain} class="em-btn" style="display:inline-block;padding:14px 30px;font-family:${FONT.sans};font-size:16px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
}

/** A quiet tinted panel for secondary information (no borders, no accent bars). */
function note(content: string, tone: 'neutral' | 'warning' = 'neutral'): string {
  const background = tone === 'warning' ? COLORS.warnTint : COLORS.tint;
  const color = tone === 'warning' ? COLORS.warnInk : COLORS.body;
  const classes = tone === 'warning' ? 'em-warn' : 'em-tint';
  const textClass = tone === 'warning' ? 'em-warn-ink' : 'em-body';
  return `<table ${TABLE_ATTRS} width="100%" bgcolor="${background}" class="${classes}" style="background-color:${background};border-radius:12px;"><tr><td class="${textClass}" style="padding:16px 20px;font-family:${FONT.sans};font-size:14px;line-height:22px;color:${color};">${content}</td></tr></table>`;
}

const recordLabel = (label: string, align: 'left' | 'center' = 'left') =>
  `<p style="${text(14, 20, COLORS.textMuted, `margin:0 0 6px;text-align:${align};`)}">${label}</p>`;

/** Navy panel that echoes the app's dashboard: the one place academic figures are shown. */
function recordPanel(cells: string): string {
  return `<table ${TABLE_ATTRS} width="100%" bgcolor="${COLORS.deep}" class="em-record" style="background-color:${COLORS.deep};border-radius:16px;"><tr>${cells}</tr></table>`;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

const PREHEADER_FILLER = '&#847;&zwnj;&nbsp;'.repeat(40);

function footerLink(label: string, href: string): string {
  return `<a href="${href}" data-plain-href class="em-link" style="color:${COLORS.link};font-weight:600;text-decoration:none;">${label}</a>`;
}

function renderEmail(title: string, content: string, options: ShellOptions): string {
  const siteUrl = getEmailSiteUrl();
  const logoUrl = `${siteUrl}/logo.png`;
  const footerText = (extra = '') => text(13, 20, COLORS.muted, `margin:0 0 10px;${extra}`);
  const links = [
    footerLink('Privacy', `${siteUrl}/privacy`),
    footerLink('Terms', `${siteUrl}/terms`),
    footerLink('Support', `${siteUrl}${SUPPORT_PAGE_PATH}`),
  ].join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  return `<!doctype html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeEmailHtml(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&amp;family=DM+Sans:wght@400;600&amp;display=swap" rel="stylesheet"><!--<![endif]-->
  <style>
    :root{color-scheme:light dark;supported-color-schemes:light dark}
    html,body{margin:0!important;padding:0!important;width:100%!important}
    table,td{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    a{text-decoration:none}
    @media only screen and (max-width: 620px){
      .em-outer{padding:24px 12px 32px!important}
      .em-pad{padding-left:24px!important;padding-right:24px!important}
      .em-content{padding-top:32px!important;padding-bottom:32px!important}
      .em-h1{font-size:24px!important;line-height:30px!important}
      .em-stack{display:block!important;width:100%!important;box-sizing:border-box!important;padding:22px 24px 6px!important}
      .em-stack-last{padding:10px 24px 22px!important}
      .em-btn-wrap{width:100%!important}
      .em-btn{display:block!important;padding-left:16px!important;padding-right:16px!important}
      .em-code{font-size:34px!important;line-height:42px!important}
      .em-class{font-size:24px!important;line-height:30px!important}
    }
  </style>
  <style>
    @media (prefers-color-scheme: dark){
      .em-ground{background-color:${DARK.ground}!important}
      .em-mast{background-color:${DARK.mast}!important}
      .em-paper{background-color:${DARK.paper}!important}
      .em-tint,.em-otp{background-color:${DARK.tint}!important}
      .em-record{background-color:${DARK.record}!important}
      .em-warn{background-color:${DARK.warnTint}!important}
      .em-warn-ink{color:${DARK.warnInk}!important}
      .em-ink,.em-code{color:${DARK.ink}!important}
      .em-body{color:${DARK.body}!important}
      .em-muted{color:${DARK.muted}!important}
      .em-link{color:${DARK.link}!important}
    }
  </style>
  <!--[if mso]><style>body,table,td,a,h1,p,span,strong{font-family:'Segoe UI',Arial,Helvetica,sans-serif!important}.em-code,.em-code span{font-family:Consolas,'Courier New',monospace!important}</style><![endif]-->
</head>
<body class="em-ground" style="margin:0;padding:0;background-color:${COLORS.ground};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div data-email-preheader style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${escapeEmailHtml(options.preheader)}${PREHEADER_FILLER}</div>
  <table ${TABLE_ATTRS} width="100%" bgcolor="${COLORS.ground}" class="em-ground" style="width:100%;background-color:${COLORS.ground};"><tr><td align="center" class="em-outer" style="padding:40px 16px 48px;">
    <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table ${TABLE_ATTRS} width="100%" class="em-shell" style="width:100%;max-width:600px;">
      <tr><td bgcolor="${COLORS.deep}" class="em-mast em-pad" style="padding:22px 40px;background-color:${COLORS.deep};border-radius:16px 16px 0 0;">
        <table ${TABLE_ATTRS}><tr>
          <td width="40" valign="middle" style="width:40px;"><a href="${siteUrl}"><img src="${logoUrl}" width="36" height="36" alt="AcadeGrade" style="display:block;width:36px;height:36px;"></a></td>
          <td valign="middle" style="padding-left:12px;font-family:${FONT.display};font-size:21px;line-height:26px;font-weight:700;letter-spacing:-0.4px;"><a href="${siteUrl}" style="color:${COLORS.text};text-decoration:none;">Acade<span style="color:${COLORS.gold};">Grade</span></a></td>
        </tr></table>
      </td></tr>
      <tr><td bgcolor="${COLORS.paper}" class="em-paper em-pad em-content" style="padding:40px 40px 44px;background-color:${COLORS.paper};border-radius:0 0 16px 16px;">${content}</td></tr>
      <tr><td class="em-pad" style="padding:28px 40px 0;">
        <p class="em-muted" style="${footerText('margin-bottom:14px;')}">${links}</p>
        <p class="em-muted" style="${footerText()}">${options.reason}</p>
        ${options.recordsNotice ? `<p class="em-muted" style="${footerText()}">AcadeGrade records are unofficial and self-reported. Your institution&#039;s result and transcript remain the official record.</p>` : ''}
        <p class="em-muted" style="${footerText('margin-bottom:0;')}">Sent by AcadeGrade &middot; &copy; ${new Date().getFullYear()} AcadeGrade</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------------

const otpCopyUrl = (code: string) => `${getEmailSiteUrl()}/copy-code#code=${encodeURIComponent(code)}`;

/**
 * Six-digit codes are shown as two groups of three. The gap is padding, not a
 * character, so copying or long-pressing the code still yields "482916".
 */
function groupedCode(code: string): string {
  const safe = (value: string) => escapeEmailHtml(value);
  if (code.length < 6) return `<span>${safe(code)}</span>`;
  const split = Math.ceil(code.length / 2);
  return `<span>${safe(code.slice(0, split))}</span><span style="padding-left:14px;">${safe(code.slice(split))}</span>`;
}

function otpPanel(code: string, variant: 'registration' | 'reset'): string {
  const label = variant === 'registration' ? 'Your verification code' : 'Your password reset code';
  const background = variant === 'registration' ? COLORS.otpTint : COLORS.tint;
  return `<table ${TABLE_ATTRS} width="100%" bgcolor="${background}" class="em-otp" style="background-color:${background};border-radius:16px;"><tr><td align="center" style="padding:26px 20px 24px;">`
    + `<p class="em-muted" style="${text(14, 20, COLORS.muted, 'margin:0 0 10px;text-align:center;')}">${label}</p>`
    + `<p data-otp-code class="em-code" style="margin:0;padding-left:6px;font-family:${FONT.mono};font-size:42px;line-height:50px;font-weight:700;letter-spacing:6px;color:${COLORS.ink};text-align:center;font-variant-numeric:tabular-nums;">${groupedCode(code)}</p>`
    + `<p class="em-muted" style="${text(14, 20, COLORS.muted, 'margin:10px 0 0;text-align:center;')}">${OTP_EXPIRY_TEXT}</p>`
    + `</td></tr></table>`
    + spacer(24)
    + button('Copy code on this device', otpCopyUrl(code), { align: 'center', plainText: false })
    + spacer(10)
    + paragraph('Opens AcadeGrade&#039;s copy screen. Tap once there, then return to the app.', { muted: true, last: true, align: 'center' });
}

function otpEmail(code: string, variant: 'registration' | 'reset'): string {
  const registration = variant === 'registration';
  const content = heading(registration ? 'Verify your email' : 'Reset your password')
    + paragraph(registration
      ? 'Enter this code in AcadeGrade to finish creating your account.'
      : 'Enter this code in AcadeGrade to confirm it is you, then choose a new password.')
    + spacer(8)
    + otpPanel(code, variant)
    + spacer(28)
    + note(`${strong('Never share this code.')} Anyone who has it can ${registration ? 'create an account with your email address' : 'change your password'}. AcadeGrade will never ask you for it.`, 'warning')
    + spacer(20)
    + paragraph(registration
      ? 'If you did not request this code, you can ignore this email. No account will be created.'
      : 'If you did not ask to reset your password, you can ignore this email. Your current password stays the same.', { muted: true, last: true });

  return renderEmail(registration ? 'Verify your email - AcadeGrade' : 'Reset your password - AcadeGrade', content, {
    preheader: registration
      ? `Your AcadeGrade verification code is ${code}. It expires in 5 minutes.`
      : `Your AcadeGrade password reset code is ${code}. It expires in 5 minutes.`,
    reason: registration
      ? 'You received this because this email address was used to start creating an AcadeGrade account.'
      : 'You received this because a password reset was requested for the AcadeGrade account that uses this email address.',
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function startStep(title: string, detail: string, last = false): string {
  return `<tr><td style="padding:0 0 ${last ? 0 : 18}px;"><p class="em-ink" style="${text(16, 24, COLORS.ink, 'margin:0 0 2px;font-weight:600;')}">${title}</p><p class="em-body" style="${text(15, 23, COLORS.body)}">${detail}</p></td></tr>`;
}

export function welcomeEmail(name: string): string {
  const safeName = escapeEmailHtml(name);
  const siteUrl = getEmailSiteUrl();
  const steps = startStep('Add your current semester', 'Enter each course with its credit units and grade, or scan your result sheet and check it before saving.')
    + startStep('Bring in earlier semesters', 'Your CGPA is only as complete as the record behind it. Add past results when you have them to hand.')
    + startStep('Follow your outlook', 'Your dashboard shows your CGPA trend and the degree class your saved results point to.', true);

  const content = heading(`Welcome, ${safeName}`)
    + paragraph('Your AcadeGrade account is ready. It keeps your semester results in one place and works out your GPA, CGPA and degree-class outlook as you go.', { last: true })
    + spacer(24)
    + `<table ${TABLE_ATTRS} width="100%" bgcolor="${COLORS.tint}" class="em-tint" style="background-color:${COLORS.tint};border-radius:16px;"><tr><td style="padding:24px 24px 24px;"><table ${TABLE_ATTRS} width="100%">${steps}</table></td></tr></table>`
    + spacer(28)
    + button('Open your dashboard', `${siteUrl}/dashboard`);

  return renderEmail('Welcome to AcadeGrade', content, {
    preheader: `Welcome ${name}. Your AcadeGrade account is ready.`,
    reason: 'You received this because an AcadeGrade account was created with this email address.',
    recordsNotice: true,
  });
}

export function semesterSavedEmail(name: string, gpa: number, semester: string): string {
  const safeName = escapeEmailHtml(name);
  const semesterName = `${semester ?? ''}`.trim();
  const safeSemester = semesterName ? escapeEmailHtml(semesterName) : 'Latest semester';
  const formattedGpa = Number.isFinite(gpa) ? formatCgpa(gpa) : '0.00';
  // Same bands and rounding as the app: 1st success, 2:1 primary, 2:2 gold, lower danger.
  const classColors: Record<string, string> = { '1st': COLORS.success, '2:1': COLORS.primarySoft, '2:2': COLORS.gold };
  const gpaColor = classColors[resolveDegreeClass(gpa).shortLabel] ?? COLORS.danger;

  const panel = recordPanel(
    `<td class="em-stack" width="50%" valign="top" style="padding:24px 12px 24px 28px;">${recordLabel('Semester GPA')}<p style="margin:0;font-family:${FONT.display};font-size:44px;line-height:48px;font-weight:700;letter-spacing:-1px;color:${gpaColor};font-variant-numeric:tabular-nums;">${formattedGpa}</p></td>`
    + `<td class="em-stack em-stack-last" width="50%" valign="top" style="padding:24px 28px 24px 12px;">${recordLabel('Semester')}<p style="${text(17, 25, COLORS.text, 'font-weight:600;')}">${safeSemester}</p></td>`,
  );

  const content = heading('Your semester is saved')
    + paragraph(`Hi ${safeName}, your results for ${strong(safeSemester)} are now part of your AcadeGrade record.`, { last: true })
    + spacer(24)
    + panel
    + spacer(24)
    + paragraph('Your CGPA and degree-class outlook have been recalculated to include this semester. Insights shows how they moved.', { last: true })
    + spacer(28)
    + button('Review your insights', `${getEmailSiteUrl()}/insights`);

  return renderEmail('Semester results saved', content, {
    preheader: `${semesterName || 'Your latest semester'} is saved. Semester GPA: ${formattedGpa}.`,
    reason: 'You received this because you saved semester results in AcadeGrade.',
    recordsNotice: true,
  });
}

export function degreeClassEmail(name: string, degreeClass: string): string {
  const safeName = escapeEmailHtml(name);
  const className = `${degreeClass ?? ''}`.trim();
  const safeClass = className ? escapeEmailHtml(className) : 'Not available yet';

  const panel = recordPanel(
    `<td align="center" style="padding:28px 24px 30px;">${recordLabel('Projected degree class', 'center')}<p class="em-class" style="margin:0;font-family:${FONT.display};font-size:30px;line-height:36px;font-weight:700;letter-spacing:-0.5px;color:${COLORS.gold};text-align:center;">${safeClass}</p></td>`,
  );

  const content = heading('Your degree-class outlook has changed')
    + paragraph(`Hi ${safeName}, based on the results you have saved so far, your outlook is now:`, { last: true })
    + spacer(24)
    + panel
    + spacer(24)
    + paragraph('This is a projection, not an official classification. It moves with every semester you add, so keep your record complete and accurate.', { last: true })
    + spacer(28)
    + button('View your dashboard', `${getEmailSiteUrl()}/dashboard`);

  return renderEmail('Degree-class outlook updated', content, {
    preheader: className ? `Your projected degree class is now ${className}.` : 'Your projected degree class has changed.',
    reason: 'You received this because your saved results changed your projected degree class.',
    recordsNotice: true,
  });
}

export function adminNewUserEmail(name: string, matric: string): string {
  const safeName = escapeEmailHtml(name);
  const safeMatric = escapeEmailHtml(matric);
  const row = (label: string, value: string, padding: string, extra = '') =>
    `<tr><td style="padding:${padding};"><p class="em-muted" style="${text(14, 20, COLORS.muted, 'margin:0 0 2px;')}">${label}</p><p class="em-ink" style="${text(17, 25, COLORS.ink, `font-weight:600;${extra}`)}">${value}</p></td></tr>`;

  const content = heading('A new student joined AcadeGrade')
    + paragraph('A student has completed registration.', { last: true })
    + spacer(24)
    + `<table ${TABLE_ATTRS} width="100%" bgcolor="${COLORS.tint}" class="em-tint" style="background-color:${COLORS.tint};border-radius:16px;">`
    + row('Student name', safeName, '22px 24px 10px')
    + row('Matric number', safeMatric, '10px 24px 22px', 'font-variant-numeric:tabular-nums;')
    + `</table>`
    + spacer(28)
    + button('Open user management', `${getEmailSiteUrl()}/admin/users`);

  return renderEmail('New student registration', content, {
    preheader: `${name} completed AcadeGrade registration.`,
    reason: 'You received this because you are an AcadeGrade administrator.',
  });
}

export function registrationOtpEmail(otp: string): string {
  return otpEmail(otp, 'registration');
}

export function resetPasswordOtpEmail(otp: string): string {
  return otpEmail(otp, 'reset');
}

// ---------------------------------------------------------------------------
// Plain-text alternative
// ---------------------------------------------------------------------------

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', middot: '·', ndash: '–', mdash: '—', copy: '©', zwnj: '' };
  return value.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<div[^>]*data-email-preheader[^>]*>[\s\S]*?<\/div>/gi, ' ')
    // Keep a grouped one-time code contiguous: "482916", never "482 916".
    .replace(/(<p\b[^>]*data-otp-code[^>]*>)([\s\S]*?)(<\/p>)/gi, (_, open: string, inner: string, close: string) => `${open}${inner.replace(/<[^>]+>/g, '')}${close}`)
    // Links marked data-plain-href keep their destination; others (logo, OTP copy link) keep only their label.
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '');
      const href = /\bdata-plain-href\b/.test(attrs) ? /\bhref="([^"]*)"/.exec(attrs)?.[1] : undefined;
      return href ? `${label} (${href})` : label;
    })
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(h[1-6]|p|div|td|tr|table)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
