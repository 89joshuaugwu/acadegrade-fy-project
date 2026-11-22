import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { computeCumulativeCGPA, roundCgpa } from '@/lib/cgpa/academicRules';
import { readGradingScaleSetting } from '@/lib/cgpa/scaleSetting';
import { parseShareOptions, SHARE_PIN_HEADER } from '@/lib/share/options';
import { hashPin } from '@/lib/share/pin';
import { decideShareAccess, SHARE_PRIVATE_FIELDS, toMillis, type ShareAccessDecision } from '@/lib/share/access';

import crypto from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Share responses can carry a PIN-protected record: never let a browser or proxy keep them. */
const NO_STORE = { 'Cache-Control': 'no-store, private' };

/** Profile text as plain text: no markup or control characters, single-spaced, bounded. */
function plainText(value: unknown, max = 180): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * POST /api/transcript/share — Create a shareable transcript snapshot.
 * Saves a read-only copy of the user's transcript data to `shared_transcripts/{shareId}`.
 * Returns the share ID and URL.
 *
 * Optional body fields (all additive; `{ showPhoto }` alone keeps the old behaviour):
 *   expiresInDays: 1 | 7 | 30 (default 30)
 *   level: 'full' | 'summary' (default 'full'; summary stores no course rows)
 *   pin: 4-6 ASCII digits, stored only as an scrypt hash plus a random salt
 *
 * GET /api/transcript/share?id=<shareId> — Fetch a shared transcript (public, no auth).
 * A PIN-protected link needs the PIN in the `X-Share-Pin` header (never the URL).
 */

export async function POST(request: NextRequest) {
  try {
    const timer = apiTimer();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    // Creating links is gated; reading an existing share (GET) stays public.
    const blocked = await checkPlatformAccess({ feature: 'transcript_share', email: decoded.email });
    if (blocked) return blocked;

    // Optional body. No body or invalid JSON keeps the old default (photo on, 30 days, full).
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
    const parsed = parseShareOptions(body);
    if (!parsed.ok) {
      logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid, status: 400, durationMs: timer(), error: parsed.code });
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: 400 });
    }
    const { showPhoto, expiresInDays, level, pin } = parsed.value;

    // Fetch user profile
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const profile = userDoc.data() || {};

    // Fetch all completed semesters with courses
    const semSnap = await adminDb.collection(`users/${uid}/semesters`).get();
    const semesters: any[] = [];

    for (const semDoc of semSnap.docs) {
      const semData = semDoc.data();
      if (!semData.isComplete) continue;

      const courseSnap = await adminDb
        .collection(`users/${uid}/semesters/${semDoc.id}/courses`)
        .get();

      const courses = courseSnap.docs.map(c => ({ id: c.id, ...c.data() }));

      semesters.push({
        id: semDoc.id,
        ...semData,
        // A summary link keeps the semester totals but stores no course rows at all.
        courses: level === 'summary' ? [] : courses,
      });
    }

    // Sort by level then semester
    semesters.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.semester - b.semester;
    });

    // Transcript rule (same as the PDF): CGPA over completed semesters only,
    // and `semesters` above already holds only completed ones. Semester totals are
    // kept on summary links, so the figures match a full link exactly.
    const cumulative = computeCumulativeCGPA(semesters);

    // Generate a short share ID
    const shareId = crypto.randomBytes(6).toString('hex'); // 12 char hex
    const expiresAt = new Date(Date.now() + expiresInDays * DAY_MS);
    const pinFields = pin ? await hashPin(pin) : {};

    // Save snapshot
    await adminDb.collection('shared_transcripts').doc(shareId).set({
      uid,
      studentName: profile.fullName || 'Student',
      matric: profile.matric || '',
      department: profile.department || '',
      programme: profile.programme || '',
      // Shown by the public share page as "as entered by the student".
      university: plainText(profile.university),
      cgpa: roundCgpa(cumulative.cgpa),
      pi: roundCgpa(cumulative.pi),
      totalCredits: cumulative.totalCredits,
      currentLevel: profile.currentLevel || '',
      avatarUrl: showPhoto ? (profile.avatarUrl || null) : null,
      showPhoto,
      semesters,
      shareLevel: level,
      // Additive: the student's grading scale, so the record names it (absent on the default scale).
      ...(readGradingScaleSetting(profile.gradingScale) ? { gradingScale: readGradingScaleSetting(profile.gradingScale) } : {}),
      expiresInDays,
      ...pinFields,
      createdAt: new Date(),
      expiresAt,
    });

    const origin = request.nextUrl.origin;
    const shareUrl = `${origin}/share/${shareId}`;

    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid, status: 200, durationMs: timer() });
    // `shareId` and `shareUrl` are what installed apps read; the rest is additive.
    return NextResponse.json({ shareId, shareUrl, expiresAt: expiresAt.toISOString(), expiresInDays, level, hasPin: Boolean(pin) });
  } catch (error: any) {
    console.error('Share transcript error:', error);
    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 500, durationMs: 0, error: error?.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const timer = apiTimer();
    const { searchParams } = request.nextUrl;
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'Missing share ID' }, { status: 400 });
    }

    const ref = adminDb.collection('shared_transcripts').doc(shareId);
    const doc = await ref.get();

    // Unknown and expired links answer exactly as before, PIN or not.
    if (!doc.exists) {
      return NextResponse.json({ error: 'Transcript not found or expired' }, { status: 404 });
    }
    if (isExpired(doc.data()!)) {
      return NextResponse.json({ error: 'This shared transcript has expired' }, { status: 410 });
    }

    // Header only: a PIN in the query string is ignored, so it never lands in URLs or access logs.
    const pinHeader = request.headers.get(SHARE_PIN_HEADER);
    let decision: ShareAccessDecision;
    let data: Record<string, unknown>;

    if (doc.data()!.pinHash) {
      // Read, check and count inside one transaction so parallel guesses cannot pass the limit.
      const outcome = await adminDb.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists || isExpired(fresh.data()!)) return null;
        const record = fresh.data()!;
        const result = await decideShareAccess(record, pinHeader, Date.now());
        if (result.update) tx.set(ref, result.update, { merge: true });
        return { result, record };
      });
      if (!outcome) {
        return NextResponse.json({ error: 'Transcript not found or expired' }, { status: 404 });
      }
      decision = outcome.result;
      data = outcome.record;
    } else {
      data = doc.data()!;
      decision = await decideShareAccess(data, pinHeader, Date.now());
      if (decision.update) {
        // A missed view count must never block the transcript.
        try {
          await ref.set(decision.update, { merge: true });
        } catch (error) {
          console.error('Share view count failed:', error instanceof Error ? error.message : 'unknown');
        }
      }
    }

    if (decision.kind === 'pin-required') {
      logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 401, durationMs: timer(), error: 'PIN_REQUIRED' });
      return NextResponse.json({ error: 'This link needs a PIN.', code: 'PIN_REQUIRED' }, { status: 401, headers: NO_STORE });
    }
    if (decision.kind === 'pin-incorrect') {
      logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 401, durationMs: timer(), error: 'PIN_INCORRECT' });
      return NextResponse.json({ error: 'That PIN is not right.', code: 'PIN_INCORRECT' }, { status: 401, headers: NO_STORE });
    }
    if (decision.kind === 'locked') {
      logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 429, durationMs: timer(), error: 'PIN_LOCKED' });
      return NextResponse.json(
        { error: 'Too many wrong PINs. Try again later.', code: 'PIN_LOCKED', retryAfterSeconds: decision.retryAfterSeconds },
        { status: 429, headers: { ...NO_STORE, 'Retry-After': String(decision.retryAfterSeconds) } },
      );
    }

    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 200, durationMs: timer() });
    // The link is public: never expose the owner's id, the PIN hash or the counters.
    const transcript: Record<string, unknown> = { ...data };
    for (const field of SHARE_PRIVATE_FIELDS) delete transcript[field];
    const expiresAtMs = toMillis(data.expiresAt);
    return NextResponse.json(
      { transcript, expiresAt: expiresAtMs === null ? null : new Date(expiresAtMs).toISOString() },
      { headers: NO_STORE },
    );
  } catch (error: any) {
    console.error('Get shared transcript error:', error?.message ?? 'unknown');
    logApiCall({ endpoint: '/api/transcript/share', category: 'transcript', uid: null, status: 500, durationMs: 0, error: error?.message });
    return NextResponse.json({ error: 'Could not load this shared transcript.' }, { status: 500 });
  }
}

/** Same rule as before: expired when `expiresAt` is set and already in the past (server time). */
function isExpired(data: Record<string, unknown>): boolean {
  const expiresAt = toMillis(data.expiresAt);
  return expiresAt !== null && expiresAt < Date.now();
}
