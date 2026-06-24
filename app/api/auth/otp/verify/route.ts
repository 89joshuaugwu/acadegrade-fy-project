import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';

export async function POST(request: NextRequest) {
  try {
    const timer = apiTimer();
    const { email, type, code } = await request.json();

    if (!email || !type || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpId = `${normalizedEmail}_${type}`;
    const otpRef = adminDb.collection('otps').doc(otpId);
    
    const doc = await otpRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    const data = doc.data()!;
    
    // Check if used
    if (data.used) {
      return NextResponse.json({ error: 'OTP Already Used' }, { status: 400 });
    }

    // Check expiry
    const now = Date.now();
    const expiresAt = data.expiresAt.toMillis();
    
    if (now > expiresAt) {
      // It's expired. Keep it as void, we will let a cron or TTL policy delete it later, 
      // or we just leave it and overwrite it when they request a new one.
      return NextResponse.json({ error: 'OTP Expired' }, { status: 400 });
    }

    // Check attempts to prevent brute force
    if (data.attempts >= 5) {
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Check code match
    if (data.code !== code) {
      await otpRef.update({ attempts: data.attempts + 1 });
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Valid! Mark as used
    await otpRef.update({ used: true, verifiedAt: new Date() });

    logApiCall({ endpoint: '/api/auth/otp/verify', category: 'otp', uid: null, status: 200, durationMs: timer() });
    return NextResponse.json({ success: true, message: 'OTP verified successfully' });

  } catch (error) {
    console.error('OTP Verify Error:', error);
    logApiCall({ endpoint: '/api/auth/otp/verify', category: 'otp', uid: null, status: 500, durationMs: 0, error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
