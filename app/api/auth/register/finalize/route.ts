import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { verifyRegistrationTicket } from '@/lib/auth/registration-ticket';
import {
  buildAcademicSlots,
  graduationSession,
  parseAcademicSession,
} from '@/lib/academic/timeline';
import { sendEmail, welcomeEmail } from '@/lib/email/mailer';
import { apiTimer, logApiCall } from '@/lib/api/logger';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import {
  computeAnswerUpdate,
  parseOptionalAnswers,
  readLegalVersions,
  RequirementError,
  type RequirementAnswers,
} from '@/lib/user/requirements';

const sessionSchema = z.string().trim().refine(
  (value) => parseAcademicSession(value) !== null,
  'Use consecutive years, for example 2022/2023'
);

const levelSchema = z.number().int().min(100).max(1000).refine(
  (value) => value % 100 === 0,
  'Level must be in 100-level increments'
);

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  matric: z.string().trim().min(4).max(64).regex(
    /^[A-Za-z0-9/._-]+(?:\s+[A-Za-z0-9/._-]+)*$/,
    'Matric number contains unsupported characters'
  ),
  email: z.string().trim().toLowerCase().email(),
  university: z.string().trim().min(2).max(180),
  department: z.string().trim().min(2).max(140),
  programme: z.string().trim().min(2).max(140),
  courseDuration: z.number().int().min(1).max(10),
  currentLevel: levelSchema,
  entrySession: sessionSchema,
  // A5, additive: old clients omit both. Direct entry starts at 200 or 300 level.
  entryLevel: z.union([z.literal(100), z.literal(200), z.literal(300)]).optional(),
  spilloverSemesters: z.number().int().min(0).max(4).optional(),
  recordMode: z.enum(['fromScratch', 'complete']),
  semestersCompleted: z.number().int().min(0).max(20).optional(),
});

const pastSemesterSchema = z.object({
  level: levelSchema,
  semester: z.union([z.literal(1), z.literal(2)]),
  session: sessionSchema,
  label: z.string().trim().max(80).optional(),
});

const finalizeSchema = z.object({
  authMethod: z.enum(['email', 'google']),
  verificationToken: z.string().min(40).optional(),
  password: z.string().min(8).max(128).optional(),
  // Phase 2, additive: old clients omit it and get today's tertiary account.
  recordType: z.literal('tertiary').optional(),
  profile: profileSchema,
  pastSemesters: z.array(pastSemesterSchema).max(20).default([]),
  // Optional, additive: old clients omit both and the account stays "unknown".
  ageStatus: z.enum(['adult', 'minor']).optional(),
  answers: z.unknown().optional(),
}).superRefine((data, context) => {
  if (data.authMethod === 'email') {
    if (!data.verificationToken) {
      context.addIssue({ code: 'custom', path: ['verificationToken'], message: 'Verify your email again to continue' });
    }
    if (!data.password) {
      context.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
    }
  }

  if (data.profile.currentLevel > data.profile.courseDuration * 100) {
    context.addIssue({ code: 'custom', path: ['profile', 'currentLevel'], message: 'Current level exceeds the programme duration' });
  }

  const entryLevel = data.profile.entryLevel ?? 100;
  if (data.profile.currentLevel < entryLevel) {
    context.addIssue({ code: 'custom', path: ['profile', 'currentLevel'], message: 'Current level cannot be below your entry level' });
  }

  const completed = data.profile.recordMode === 'complete'
    ? data.profile.semestersCompleted ?? 0
    : 0;
  const programmeYears = Math.max(1, data.profile.courseDuration - (entryLevel / 100 - 1));
  const maximumCompleted = Math.max(0, Math.min(
    programmeYears * 2,
    ((data.profile.currentLevel - entryLevel) / 100 + 1) * 2
  ));

  if (data.profile.recordMode === 'complete' && (completed < 1 || completed > maximumCompleted)) {
    context.addIssue({
      code: 'custom',
      path: ['profile', 'semestersCompleted'],
      message: `Completed semesters must be between 1 and ${maximumCompleted}`,
    });
  }

  if (data.profile.recordMode === 'complete' && data.pastSemesters.length !== completed) {
    context.addIssue({ code: 'custom', path: ['pastSemesters'], message: 'Confirm every completed semester before continuing' });
  }
});

/**
 * WAEC/NECO (olevel) and JAMB (admission) accounts (GRADING_AND_PROFILES_PLAN.md, Phase 2):
 * a name and email only. No matric, university or timeline, so no matric reservation and
 * no past semesters.
 */
const schoolFinalizeSchema = z.object({
  authMethod: z.enum(['email', 'google']),
  verificationToken: z.string().min(40).optional(),
  password: z.string().min(8).max(128).optional(),
  recordType: z.enum(['olevel', 'admission']),
  profile: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
  }),
  ageStatus: z.enum(['adult', 'minor']).optional(),
  answers: z.unknown().optional(),
}).superRefine((data, context) => {
  if (data.authMethod === 'email') {
    if (!data.verificationToken) {
      context.addIssue({ code: 'custom', path: ['verificationToken'], message: 'Verify your email again to continue' });
    }
    if (!data.password) {
      context.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
    }
  }
});

type TertiaryFinalize = z.infer<typeof finalizeSchema>;
type SchoolFinalize = z.infer<typeof schoolFinalizeSchema>;

const RECORD_TYPE_NEEDS_UPDATE_MESSAGE =
  'This account tracks WAEC or JAMB results. Update AcadeGrade from the website to open it, or sign in on the website.';

class RegistrationError extends Error {
  constructor(message: string, readonly status = 400, readonly code = 'registration-error') {
    super(message);
  }
}

/**
 * Older apps (no recordType) send a tertiary finalize with merge: false, which would wipe
 * an O-level or admission account. They get a 409 and the account is left as it is.
 */
function guardRecordType(existing: unknown, requested: SchoolFinalize['recordType'] | TertiaryFinalize['recordType']) {
  const stored = existing && typeof existing === 'object' ? (existing as { recordType?: unknown }).recordType : undefined;
  if (requested === undefined && (stored === 'olevel' || stored === 'admission')) {
    throw new RegistrationError(RECORD_TYPE_NEEDS_UPDATE_MESSAGE, 409, 'RECORD_TYPE_NEEDS_UPDATE');
  }
}

function normalizeMatric(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function matricDocumentId(normalizedMatric: string): string {
  return createHash('sha256').update(normalizedMatric).digest('hex');
}

async function ensureLegacyMatricIsAvailable(
  normalizedMatric: string,
  submittedMatric: string,
  uid: string
) {
  const normalizedMatch = await adminDb
    .collection('users')
    .where('matricNormalized', '==', normalizedMatric)
    .limit(2)
    .get();

  if (normalizedMatch.docs.some((document) => document.id !== uid)) {
    throw new RegistrationError('That matric number is already linked to another account.', 409, 'matric-in-use');
  }

  // Profiles created before matricNormalized was introduced generally used an
  // uppercase matric number. This protects those records while the reservation
  // collection provides race-safe uniqueness for all new registrations.
  const legacyVariants = [...new Set([
    submittedMatric.trim(),
    normalizedMatric,
    normalizedMatric.toLowerCase(),
  ])];
  const legacyMatch = await adminDb
    .collection('users')
    .where('matric', legacyVariants.length === 1 ? '==' : 'in', legacyVariants.length === 1 ? legacyVariants[0] : legacyVariants)
    .limit(2)
    .get();
  if (legacyMatch.docs.some((document) => document.id !== uid)) {
    throw new RegistrationError('That matric number is already linked to another account.', 409, 'matric-in-use');
  }
}

export async function POST(request: NextRequest) {
  const timer = apiTimer();
  let createdAuthUid: string | null = null;

  try {
    const blocked = await checkPlatformAccess({});
    if (blocked) return blocked;

    const rawBody: unknown = await request.json();
    const requestedType = rawBody && typeof rawBody === 'object' ? (rawBody as { recordType?: unknown }).recordType : undefined;
    const parsed = requestedType === 'olevel' || requestedType === 'admission'
      ? schoolFinalizeSchema.safeParse(rawBody)
      : finalizeSchema.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join('.');
      return NextResponse.json(
        {
          error: issue?.message || 'Check your registration details.',
          field,
          code: field === 'verificationToken' ? 'verification-expired' : 'invalid-registration-data',
        },
        { status: 400 }
      );
    }

    const { authMethod, password, verificationToken } = parsed.data;
    const recordType = parsed.data.recordType;
    // Tertiary-only details; null for O-level and admission accounts.
    const tertiary: TertiaryFinalize | null = recordType === 'olevel' || recordType === 'admission'
      ? null
      : (parsed.data as TertiaryFinalize);
    const profile = parsed.data.profile;
    const pastSemesters = tertiary?.pastSemesters ?? [];
    const settings = await adminDb.collection('config').doc('settings').get();
    if (settings.data()?.disableSignups === true) {
      throw new RegistrationError('New registrations are currently paused.', 403, 'signups-disabled');
    }

    // Requirements answers (age, terms, privacy, AI and marketing consent).
    const parsedAnswers = parseOptionalAnswers(parsed.data.answers);
    if (parsed.data.ageStatus && parsedAnswers?.age && parsedAnswers.age !== parsed.data.ageStatus) {
      throw new RequirementError('Age answers do not match.', 400, 'INVALID_ANSWERS');
    }
    const answers: RequirementAnswers | undefined = parsed.data.ageStatus || parsedAnswers
      ? { ...parsedAnswers, ...(parsed.data.ageStatus ? { age: parsed.data.ageStatus } : {}) }
      : undefined;
    const legalRef = adminDb.collection('config').doc('legal');
    if (answers) {
      // Validate before touching Firebase Auth (stale versions, AI consent from a minor).
      computeAnswerUpdate({}, answers, readLegalVersions((await legalRef.get()).data()), new Date());
    }

    const normalizedEmail = profile.email.trim().toLowerCase();
    const normalizedMatric = tertiary ? normalizeMatric(tertiary.profile.matric) : null;
    let uid: string;
    let avatarUrl: string | null = null;
    let ticketId: string | null = null;

    if (authMethod === 'email') {
      let ticket;
      try {
        ticket = verifyRegistrationTicket(verificationToken!);
      } catch (error) {
        throw new RegistrationError(
          error instanceof Error ? error.message : 'Email verification has expired.',
          401,
          'verification-expired'
        );
      }
      if (ticket.email !== normalizedEmail) {
        throw new RegistrationError('Email verification does not match this account.', 401, 'verification-mismatch');
      }
      ticketId = ticket.jti;

      const authorization = request.headers.get('authorization');
      if (authorization?.startsWith('Bearer ')) {
        const signedInAccount = await adminAuth.verifyIdToken(authorization.slice(7));
        if (signedInAccount.email?.trim().toLowerCase() !== normalizedEmail) {
          throw new RegistrationError(
            'Sign out before registering a different email address.',
            409,
            'account-mismatch'
          );
        }
      }

      // Check before touching Firebase Auth, then check again inside the final
      // Firestore transaction to prevent replay races.
      const ticketSnapshot = await adminDb.collection('_registration_tickets').doc(ticketId).get();
      const ticketData = ticketSnapshot.data();
      const ticketExpiry = ticketData?.expiresAt?.toMillis?.() ?? 0;
      if (
        !ticketSnapshot.exists ||
        ticketData?.used === true ||
        ticketData?.email !== normalizedEmail ||
        ticketExpiry <= Date.now()
      ) {
        throw new RegistrationError('Email verification expired. Request a new code.', 401, 'verification-expired');
      }

      try {
        const existingAccount = await adminAuth.getUserByEmail(normalizedEmail);
        const existingProfile = await adminDb.collection('users').doc(existingAccount.uid).get();
        // Before anything changes (the password included).
        guardRecordType(existingProfile.data(), recordType);
        if (isStudentProfileComplete(existingProfile.data())) {
          throw new RegistrationError('An account with this email already exists.', 409, 'email-in-use');
        }

        uid = existingAccount.uid;
        await adminAuth.updateUser(uid, {
          password: password!,
          displayName: profile.fullName,
          emailVerified: true,
        });
      } catch (error: unknown) {
        const code = typeof error === 'object' && error && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
        if (error instanceof RegistrationError) throw error;
        if (code !== 'auth/user-not-found') throw error;

        const account = await adminAuth.createUser({
          email: normalizedEmail,
          password: password!,
          displayName: profile.fullName,
          emailVerified: true,
        });
        uid = account.uid;
        createdAuthUid = uid;
      }
    } else {
      const authorization = request.headers.get('authorization');
      if (!authorization?.startsWith('Bearer ')) {
        throw new RegistrationError('Your Google session has expired. Sign in again.', 401, 'google-session-expired');
      }

      const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
      const tokenEmail = decoded.email?.trim().toLowerCase();
      if (!tokenEmail || tokenEmail !== normalizedEmail || decoded.email_verified !== true) {
        throw new RegistrationError('Google account email could not be verified.', 401, 'google-email-mismatch');
      }

      const account = await adminAuth.getUser(decoded.uid);
      const hasGoogleProvider = account.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );
      if (!hasGoogleProvider) {
        throw new RegistrationError('Continue with Google to finish this registration.', 401, 'google-provider-required');
      }

      uid = decoded.uid;
      avatarUrl = account.photoURL || null;
      guardRecordType((await adminDb.collection('users').doc(uid).get()).data(), recordType);
    }

    if (tertiary && normalizedMatric) await ensureLegacyMatricIsAvailable(normalizedMatric, tertiary.profile.matric, uid);

    const expectedSlots = tertiary
      ? buildAcademicSlots(tertiary.profile.entrySession, tertiary.profile.courseDuration, tertiary.profile.entryLevel, tertiary.profile.spilloverSemesters)
        .filter((slot) => slot.level <= tertiary.profile.currentLevel)
        .slice(0, tertiary.profile.recordMode === 'complete' ? tertiary.profile.semestersCompleted : 0)
      : [];

    for (const [index, semester] of pastSemesters.entries()) {
      const expected = expectedSlots[index];
      if (!expected || semester.level !== expected.level || semester.semester !== expected.semester) {
        throw new RegistrationError('The past-semester timeline is inconsistent. Please review it again.', 400, 'invalid-timeline');
      }
    }

    const userRef = adminDb.collection('users').doc(uid);
    const analyticsRef = adminDb.collection('analytics').doc(uid);
    const matricRef = normalizedMatric
      ? adminDb.collection('_matric_numbers').doc(matricDocumentId(normalizedMatric))
      : null;
    const ticketRef = ticketId
      ? adminDb.collection('_registration_tickets').doc(ticketId)
      : null;
    const now = new Date();

    await adminDb.runTransaction(async (transaction) => {
      const refs = [userRef, analyticsRef, legalRef, ...(matricRef ? [matricRef] : []), ...(ticketRef ? [ticketRef] : [])];
      const snapshots = await transaction.getAll(...refs);
      const [userSnapshot, analyticsSnapshot, legalSnapshot] = snapshots;
      const matricSnapshot = matricRef ? snapshots[3] : null;
      const ticketSnapshot = ticketRef ? snapshots[matricRef ? 4 : 3] : null;

      guardRecordType(userSnapshot.data(), recordType);
      if (isStudentProfileComplete(userSnapshot.data())) {
        throw new RegistrationError('This account setup is already complete.', 409, 'setup-complete');
      }

      if (matricSnapshot?.exists && matricSnapshot.data()?.uid !== uid) {
        throw new RegistrationError('That matric number is already linked to another account.', 409, 'matric-in-use');
      }

      if (ticketRef) {
        const ticketData = ticketSnapshot?.data();
        const ticketExpiry = ticketData?.expiresAt?.toMillis?.() ?? 0;
        if (
          !ticketSnapshot?.exists ||
          ticketData?.used === true ||
          ticketData?.email !== normalizedEmail ||
          ticketExpiry <= Date.now()
        ) {
          throw new RegistrationError('Email verification expired. Request a new code.', 401, 'verification-expired');
        }
      }

      const existingUser = userSnapshot.data() || {};
      const preservedProfileFields: Record<string, unknown> = {};
      for (const key of [
        'notificationPreferences',
        'tourCompleted',
        'resultsTourCompleted',
        'mobileOnboardingCompleted',
        'mobileUsageTourVersion',
        'mobileUsageTourCompletedChapters',
        'mobileUsageTourSkipped',
        'mobileUsageTourCompleted',
        // Server-owned requirement answers recorded before setup finished.
        'ageStatus',
        'ageDeclaredAt',
        'ageUpgradedAt',
        'consents',
      ]) {
        if (existingUser[key] !== undefined) preservedProfileFields[key] = existingUser[key];
      }
      const answerFields = answers
        ? computeAnswerUpdate(existingUser, answers, readLegalVersions(legalSnapshot.data()), now)
        : {};

      const common = {
        ...preservedProfileFields,
        fullName: profile.fullName,
        email: normalizedEmail,
        avatarUrl: avatarUrl || existingUser.avatarUrl || null,
        isAdmin: false,
        disabled: existingUser.disabled === true,
        fcmToken: existingUser.fcmToken || null,
        fcmTokens: Array.isArray(existingUser.fcmTokens) ? existingUser.fcmTokens : [],
        setupComplete: true,
        setupCompletedAt: now,
        createdAt: existingUser.createdAt || now,
        updatedAt: now,
        ...answerFields,
      };

      if (tertiary && normalizedMatric && matricRef) {
        const p = tertiary.profile;
        transaction.set(userRef, {
          ...common,
          matric: normalizedMatric,
          matricNormalized: normalizedMatric,
          department: p.department,
          currentLevel: p.currentLevel,
          programme: p.programme,
          university: p.university,
          recordMode: p.recordMode,
          gradeMode: existingUser.gradeMode === 'pi' ? 'pi' : 'cgpa',
          currentSession: p.entrySession,
          entrySession: p.entrySession,
          // Direct entry (200 or 300 level) finishes in fewer years: the programme's years from the entry level.
          graduationSession: graduationSession(
            p.entrySession,
            Math.max(1, p.courseDuration - ((p.entryLevel ?? 100) / 100 - 1))
          ),
          courseDuration: p.courseDuration,
          // Stored only when set, so accounts that never use them keep the same shape.
          ...(p.entryLevel && p.entryLevel > 100 ? { entryLevel: p.entryLevel } : {}),
          ...(p.spilloverSemesters ? { spilloverSemesters: p.spilloverSemesters } : {}),
          semestersCompleted: p.recordMode === 'complete' ? p.semestersCompleted : 0,
        }, { merge: false });

        transaction.set(matricRef, {
          uid,
          matric: normalizedMatric,
          createdAt: matricSnapshot?.data()?.createdAt || now,
          updatedAt: now,
        }, { merge: true });
      } else {
        // O-level and admission accounts: no academic fields and no matric reservation.
        transaction.set(userRef, { ...common, recordType }, { merge: false });
      }

      const existingAnalytics = analyticsSnapshot.data() || {};
      transaction.set(analyticsRef, {
          cgpa: 0,
          pi: 0,
          degreeClass: 'Fail',
          totalCredits: 0,
          semesterHistory: [],
          regressionSlope: 0,
          projectedCGPA: 0,
          riskScore: 0,
          ...existingAnalytics,
          createdAt: existingAnalytics.createdAt || now,
          lastUpdated: existingAnalytics.lastUpdated || now,
          updatedAt: now,
        }, { merge: false });

      for (const [index, semester] of pastSemesters.entries()) {
        const expected = expectedSlots[index];
        const semesterRef = userRef.collection('semesters').doc(
          `sem_${expected.level}_${expected.semester}`
        );
        transaction.set(semesterRef, {
          label: expected.label,
          session: semester.session,
          level: expected.level,
          semester: expected.semester,
          gpa: 0,
          pi: 0,
          creditLoaded: 0,
          isComplete: false,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      if (ticketRef) {
        // Deleting is both one-time consumption and automatic cleanup. Any
        // replay sees a missing ticket and is rejected.
        transaction.delete(ticketRef);
      }
    });

    await sendEmail(normalizedEmail, 'Welcome to AcadeGrade', welcomeEmail(profile.fullName));
    logApiCall({ endpoint: '/api/auth/register/finalize', category: 'auth', uid, status: 201, durationMs: timer() });
    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: unknown) {
    if (createdAuthUid) {
      await adminAuth.deleteUser(createdAuthUid).catch((cleanupError) => {
        console.error('Failed to roll back incomplete Firebase account:', cleanupError);
      });
    }

    const firebaseCode = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    const isAuthenticationError = firebaseCode.startsWith('auth/');
    if (error instanceof RequirementError) {
      logApiCall({ endpoint: '/api/auth/register/finalize', category: 'auth', uid: null, status: error.status, durationMs: timer(), error: error.code });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const status = error instanceof RegistrationError
      ? error.status
      : isAuthenticationError
        ? 401
        : 500;
    const message = error instanceof RegistrationError
      ? error.message
      : isAuthenticationError
        ? 'Your authentication session is no longer valid. Please sign in again.'
        : error instanceof Error && error.message.includes('verification')
        ? error.message
        : 'We could not finish creating your account. Please try again.';
    console.error('Registration finalization failed:', error);
    logApiCall({ endpoint: '/api/auth/register/finalize', category: 'auth', uid: null, status, durationMs: timer(), error: String(error) });
    return NextResponse.json(
      { error: message, code: error instanceof RegistrationError ? error.code : 'internal-error' },
      { status }
    );
  }
}
