/**
 * Gmail SMTP email client via nodemailer.
 * SERVER-SIDE ONLY — used in app/api/ routes.
 * 
 * Credentials from environment variables:
 * - GMAIL_USER: Gmail address
 * - GMAIL_PASS: Gmail App Password (16-character)
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/**
 * Send an email via Gmail SMTP.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: `"AcadeGrade" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

/**
 * Welcome email template — sent on registration.
 */
export function welcomeEmail(name: string): string {
  return `
    <div style="background-color:#07090F;color:#E8EDFF;padding:40px;font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#6366F1;font-size:28px;margin:0;">AcadeGrade</h1>
      </div>
      <h2 style="color:#E8EDFF;font-size:22px;">Welcome, ${name}! 🎓</h2>
      <p style="color:#8892B0;font-size:16px;line-height:1.6;">
        Your AcadeGrade account is ready. Start tracking your academic performance 
        with AI-powered insights and dual-metric analysis.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://acadegrade.vercel.app/dashboard" 
           style="background-color:#6366F1;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Go to Dashboard
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #1F2B47;margin:24px 0;" />
      <p style="color:#4A5580;font-size:12px;text-align:center;">
        Built by Joshuazaza · ESUT Computer Science 2026 · CSC 499
      </p>
    </div>
  `;
}

/**
 * Semester saved notification email.
 */
export function semesterSavedEmail(
  name: string,
  gpa: number,
  semester: string
): string {
  return `
    <div style="background-color:#07090F;color:#E8EDFF;padding:40px;font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
      <h1 style="color:#6366F1;font-size:24px;text-align:center;">AcadeGrade</h1>
      <h2 style="color:#E8EDFF;">Semester Saved 📊</h2>
      <p style="color:#8892B0;line-height:1.6;">
        Hi ${name}, your <strong style="color:#E8EDFF;">${semester}</strong> results have been saved.
      </p>
      <div style="background-color:#0E1322;border:1px solid #1F2B47;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
        <p style="color:#8892B0;margin:0 0 8px;">Semester GPA</p>
        <p style="color:#6366F1;font-size:36px;font-weight:700;margin:0;">${gpa.toFixed(2)}</p>
      </div>
      <hr style="border:none;border-top:1px solid #1F2B47;margin:24px 0;" />
      <p style="color:#4A5580;font-size:12px;text-align:center;">
        Built by Joshuazaza · ESUT Computer Science 2026
      </p>
    </div>
  `;
}

/**
 * Degree class change notification email.
 */
export function degreeClassEmail(name: string, degreeClass: string): string {
  return `
    <div style="background-color:#07090F;color:#E8EDFF;padding:40px;font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
      <h1 style="color:#6366F1;font-size:24px;text-align:center;">AcadeGrade</h1>
      <h2 style="color:#22C55E;">You've hit ${degreeClass}! 🏆</h2>
      <p style="color:#8892B0;line-height:1.6;">
        Congratulations ${name}! Your cumulative performance has reached 
        <strong style="color:#E8EDFF;">${degreeClass}</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://acadegrade.vercel.app/insights" 
           style="background-color:#6366F1;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          View Your Insights
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #1F2B47;margin:24px 0;" />
      <p style="color:#4A5580;font-size:12px;text-align:center;">
        Built by Joshuazaza · ESUT Computer Science 2026
      </p>
    </div>
  `;
}

/**
 * Admin notification — new user registered.
 */
export function adminNewUserEmail(name: string, matric: string): string {
  return `
    <div style="background-color:#07090F;color:#E8EDFF;padding:40px;font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
      <h1 style="color:#6366F1;font-size:24px;text-align:center;">AcadeGrade Admin</h1>
      <h2 style="color:#E8EDFF;">New User Signup 📬</h2>
      <p style="color:#8892B0;line-height:1.6;">
        <strong style="color:#E8EDFF;">${name}</strong> (${matric}) just registered on AcadeGrade.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://acadegrade.vercel.app/admin/users" 
           style="background-color:#6366F1;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          View Users
        </a>
      </div>
    </div>
  `;
}
