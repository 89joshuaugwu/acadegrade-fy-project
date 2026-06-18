import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword, code } = await request.json();

    if (!email || !newPassword || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpId = `${normalizedEmail}_reset`;
    const otpRef = adminDb.collection('otps').doc(otpId);
    
    const doc = await otpRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Invalid or expired reset session' }, { status: 400 });
    }

    const data = doc.data()!;
    
    // The code must match, and it must be either unused OR recently used (within 15 minutes)
    // Because the frontend might verify the code first, marking it used, and then submit the password.
    if (data.code !== code) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

    const now = Date.now();
    const verifiedAt = data.verifiedAt?.toMillis() || 0;
    
    if (data.used) {
      // If it was used more than 15 minutes ago, it's expired
      if (now - verifiedAt > 15 * 60 * 1000) {
        return NextResponse.json({ error: 'Reset session expired. Please request a new code.' }, { status: 400 });
      }
    } else {
      // If not used yet, check expiry
      const expiresAt = data.expiresAt.toMillis();
      if (now > expiresAt) {
        return NextResponse.json({ error: 'OTP Expired' }, { status: 400 });
      }
    }

    // Get the user
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }

    // Update the password
    await adminAuth.updateUser(userRecord.uid, {
      password: newPassword,
    });

    // Delete or invalidate the OTP so it can't be used again
    await otpRef.delete();

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password Reset Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
