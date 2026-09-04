import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { issueRegistrationTicket } from '@/lib/auth/registration-ticket';

class OtpVerificationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const timer = apiTimer();
    const payload = await request.json();
    // `otp` was sent by the first mobile APK. Keep it as a short-term
    // compatibility alias while all mobile clients move to the web contract.
    const { email, type } = payload;
    const code = payload.code ?? payload.otp;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      !code ||
      !['registration', 'reset'].includes(type)
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedCode = String(code).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json({ error: 'Invalid verification details' }, { status: 400 });
    }
    const otpId = `${normalizedEmail}_${type}`;
    const otpRef = adminDb.collection('otps').doc(otpId);

    const registrationTicket = type === 'registration'
      ? issueRegistrationTicket(normalizedEmail)
      : null;

    const verificationFailure = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(otpRef);
      if (!doc.exists) throw new OtpVerificationError('Invalid OTP');

      const data = doc.data()!;
      if (data.used) throw new OtpVerificationError('OTP already used');

      const expiresAt = data.expiresAt?.toMillis?.() ?? 0;
      if (Date.now() > expiresAt) throw new OtpVerificationError('OTP expired');

      const attempts = Number(data.attempts) || 0;
      if (attempts >= 5) {
        throw new OtpVerificationError('Too many failed attempts. Please request a new OTP.');
      }

      if (String(data.code) !== normalizedCode) {
        transaction.update(otpRef, { attempts: attempts + 1 });
        return 'Invalid OTP';
      }

      const verifiedAt = new Date();
      transaction.update(otpRef, { used: true, verifiedAt });

      if (registrationTicket) {
        const ticketRef = adminDb
          .collection('_registration_tickets')
          .doc(registrationTicket.payload.jti);
        transaction.set(ticketRef, {
          email: normalizedEmail,
          createdAt: verifiedAt,
          expiresAt: new Date(registrationTicket.payload.expiresAt),
          used: false,
        });
      }
      return null;
    });

    if (verificationFailure) {
      throw new OtpVerificationError(verificationFailure);
    }

    logApiCall({ endpoint: '/api/auth/otp/verify', category: 'otp', uid: null, status: 200, durationMs: timer() });
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      ...(registrationTicket ? { verificationToken: registrationTicket.token } : {}),
    });

  } catch (error) {
    console.error('OTP Verify Error:', error);
    const status = error instanceof OtpVerificationError ? error.status : 500;
    logApiCall({ endpoint: '/api/auth/otp/verify', category: 'otp', uid: null, status, durationMs: 0, error: String(error) });
    return NextResponse.json(
      { error: error instanceof OtpVerificationError ? error.message : 'Internal server error' },
      { status }
    );
  }
}
