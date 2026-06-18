import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { sendEmail, registrationOtpEmail, resetPasswordOtpEmail } from '@/lib/email/mailer';

// 60 seconds cooldown
const COOLDOWN_MS = 60 * 1000;
// 5 minutes expiry
const EXPIRY_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    if (!email || !type || !['registration', 'reset'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if the user already exists for registration
    if (type === 'registration') {
      try {
        await adminAuth.getUserByEmail(normalizedEmail);
        // If we get here, user exists
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      } catch (e: any) {
        if (e.code !== 'auth/user-not-found') {
          return NextResponse.json({ error: 'Error checking email' }, { status: 500 });
        }
      }
    }

    // Check if the user exists for reset
    if (type === 'reset') {
      try {
        await adminAuth.getUserByEmail(normalizedEmail);
      } catch (e: any) {
        // To prevent email enumeration, we still pretend we sent it, but we won't actually send it.
        // But for better UX, maybe we should tell them. Let's return error.
        if (e.code === 'auth/user-not-found') {
          return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Error checking email' }, { status: 500 });
      }
    }

    const otpId = `${normalizedEmail}_${type}`;
    const otpRef = adminDb.collection('otps').doc(otpId);
    
    // Check rate limit
    const doc = await otpRef.get();
    if (doc.exists) {
      const data = doc.data();
      const lastRequested = data?.createdAt?.toMillis() || 0;
      const now = Date.now();
      if (now - lastRequested < COOLDOWN_MS) {
        return NextResponse.json({ 
          error: 'Please wait before requesting another OTP.',
          cooldownRemaining: Math.ceil((COOLDOWN_MS - (now - lastRequested)) / 1000)
        }, { status: 429 });
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + EXPIRY_MS);

    // Save to Firestore
    await otpRef.set({
      email: normalizedEmail,
      code,
      type,
      createdAt: new Date(),
      expiresAt,
      used: false,
      attempts: 0
    });

    // Send Email
    const subject = type === 'registration' ? 'Verify your Registration' : 'Reset your Password';
    const htmlBody = type === 'registration' ? registrationOtpEmail(code) : resetPasswordOtpEmail(code);
    
    await sendEmail(normalizedEmail, subject, htmlBody);

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error('OTP Send Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
