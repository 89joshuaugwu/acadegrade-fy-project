import nodemailer from 'nodemailer';

/** Main transporter — used for general notifications (welcome, semester saved, etc.) */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App Password
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

const BACKGROUND = '#07090F';
const PRIMARY = '#4F46E5';
const TEXT = '#F3F4F6';

const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: ${BACKGROUND}; color: ${TEXT}; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0E121B; border: 1px solid #1F2937; border-radius: 12px; overflow: hidden; }
    .header { background-color: ${PRIMARY}; padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #1F2937; }
    .btn { display: inline-block; background-color: ${PRIMARY}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      AcadeGrade &copy; ${new Date().getFullYear()} — Premium Grade Calculator &amp; Academic Advisor
    </div>
  </div>
</body>
</html>
`;

export const welcomeEmail = (name: string) => baseTemplate(
  'Welcome to AcadeGrade',
  `
    <h2>Hello ${name},</h2>
    <p>Welcome to AcadeGrade! Your ultimate tool for tracking, predicting, and optimizing your academic journey.</p>
    <p>We've successfully set up your profile. You can now start adding your semesters, visualizing your CGPA trajectory, and getting AI-powered academic insights.</p>
    <center>
      <a href="https://acadegrade.com/dashboard" class="btn">Go to Dashboard</a>
    </center>
  `
);

export const semesterSavedEmail = (name: string, gpa: number, semester: string) => baseTemplate(
  'Semester Results Saved',
  `
    <h2>Hi ${name},</h2>
    <p>Your results for <strong>${semester}</strong> have been successfully and securely saved to your AcadeGrade profile.</p>
    <p><strong>Semester GPA: ${gpa.toFixed(2)}</strong></p>
    <p>Check out your Insights page to see how this affects your overall CGPA trajectory and degree class outlook.</p>
    <center>
      <a href="https://acadegrade.com/insights" class="btn">View Insights</a>
    </center>
  `
);

export const degreeClassEmail = (name: string, degreeClass: string) => baseTemplate(
  'Degree Class Achievement! 🎓',
  `
    <h2>Congratulations ${name}!</h2>
    <p>We noticed an incredible achievement in your academic records. Your current CGPA trajectory has officially pushed you into the <strong>${degreeClass}</strong> category!</p>
    <p>Keep up the excellent work. The sky is the limit.</p>
    <center>
      <a href="https://acadegrade.com/dashboard" class="btn">View Dashboard</a>
    </center>
  `
);

export const adminNewUserEmail = (name: string, matric: string) => baseTemplate(
  'New User Registration',
  `
    <h2>New Student Joined</h2>
    <p>A new student has registered on the platform:</p>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Matric:</strong> ${matric}</li>
    </ul>
  `
);

export const registrationOtpEmail = (otp: string) => baseTemplate(
  'Verify your AcadeGrade Registration',
  `
    <h2>Hello,</h2>
    <p>Thank you for starting your registration at AcadeGrade. To securely verify your email address and proceed with your account creation, please use the following One-Time Password (OTP):</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: ${PRIMARY}; background-color: #1F2937; padding: 12px 24px; border-radius: 8px;">${otp}</span>
    </div>
    <p>This code will expire in <strong>5 minutes</strong>.</p>
    <p style="color: #6B7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
  `
);

export const resetPasswordOtpEmail = (otp: string) => baseTemplate(
  'Reset Your AcadeGrade Password',
  `
    <h2>Hello,</h2>
    <p>We received a request to reset the password for your AcadeGrade account. Please use the following One-Time Password (OTP) to verify your identity:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: ${PRIMARY}; background-color: #1F2937; padding: 12px 24px; border-radius: 8px;">${otp}</span>
    </div>
    <p>This code will expire in <strong>5 minutes</strong>.</p>
    <p style="color: #6B7280; font-size: 14px;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
  `
);

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
  try {
    const otpUser = process.env.OTP_GMAIL_USER || process.env.GMAIL_USER;
    const otpPass = process.env.OTP_GMAIL_PASS || process.env.GMAIL_PASS;
    if (!otpUser || !otpPass) {
      console.warn('OTP email credentials missing. Skipping OTP email send to:', to);
      return;
    }
    await otpTransporter.sendMail({
      from: '"AcadeGrade Auth" <' + otpUser + '>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
  }
}
