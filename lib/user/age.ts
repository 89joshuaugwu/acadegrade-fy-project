import 'server-only';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getPlatformSettings } from '@/lib/platform/settings-server';
import { readAiConsent } from '@/lib/user/requirements';

/**
 * Self-declared age status on `users/{uid}`:
 *   ageStatus: 'adult' | 'minor' (absent = unknown)
 *   ageDeclaredAt: Date of the first declaration
 *   ageUpgradedAt: Date a minor declared they turned 18
 * Clients cannot write these fields (firestore.rules); only `/api/user/age`,
 * `/api/user/requirements`, registration finalize and admin support tooling can.
 * AI consent lives in `consents.ai` (see lib/user/requirements.ts).
 */
export type AgeStatus = 'adult' | 'minor';
export type AgeView = AgeStatus | 'unknown';
export type AgeBlockCode = 'AGE_RESTRICTED' | 'AGE_CONFIRMATION_REQUIRED' | 'AI_CONSENT_REQUIRED';
export type AiEligibility =
  | { status: AgeView; aiAllowed: true; aiConsent: boolean | null }
  | { status: AgeView; aiAllowed: false; aiConsent: boolean | null; code: AgeBlockCode };

export const AGE_STATUSES: readonly AgeStatus[] = ['adult', 'minor'];
export const AGE_RESTRICTED_MESSAGE = 'AI features and result scanning are available only to users aged 18 or over.';
export const AGE_CONFIRMATION_MESSAGE = 'Confirm your age in AcadeGrade to use AI features';
export const AI_CONSENT_MESSAGE = 'Allow AI processing in AcadeGrade to use AI features';

export function isAgeStatus(value: unknown): value is AgeStatus {
  return value === 'adult' || value === 'minor';
}

export function readAgeStatus(data: unknown): AgeStatus | null {
  const value = data && typeof data === 'object' ? (data as Record<string, unknown>).ageStatus : undefined;
  return isAgeStatus(value) ? value : null;
}

export type AgeTransition = { ok: true; changed: boolean; upgrade: boolean } | { ok: false };

/** Unknown -> either; minor -> adult (one-way upgrade); adult -> minor needs support. */
export function resolveAgeTransition(current: AgeStatus | null, next: AgeStatus): AgeTransition {
  if (current === next) return { ok: true, changed: false, upgrade: false };
  if (current === null) return { ok: true, changed: true, upgrade: false };
  if (current === 'minor' && next === 'adult') return { ok: true, changed: true, upgrade: true };
  return { ok: false };
}

/**
 * AI needs an adult who opted in to AI processing.
 * Explicit minors and an explicit `aiConsent: false` are always blocked.
 * Unknown age and a missing consent answer are blocked only while
 * `config/settings.ageGate.enforceUnknown` is true (the default).
 */
export function eligibilityFor(status: AgeStatus | null, aiConsent: boolean | null, enforceUnknown: boolean): AiEligibility {
  const view: AgeView = status ?? 'unknown';
  if (status === 'minor') return { status: view, aiAllowed: false, aiConsent, code: 'AGE_RESTRICTED' };
  if (aiConsent === false) return { status: view, aiAllowed: false, aiConsent, code: 'AI_CONSENT_REQUIRED' };
  if (enforceUnknown && status === null) return { status: view, aiAllowed: false, aiConsent, code: 'AGE_CONFIRMATION_REQUIRED' };
  if (enforceUnknown && aiConsent === null) return { status: view, aiAllowed: false, aiConsent, code: 'AI_CONSENT_REQUIRED' };
  return { status: view, aiAllowed: true, aiConsent };
}

/** One user-doc read (not cached) plus the cached platform settings. */
export async function getAiEligibility(uid: string): Promise<AiEligibility> {
  const [snapshot, settings] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    getPlatformSettings(),
  ]);
  const data = snapshot.data();
  return eligibilityFor(readAgeStatus(data), readAiConsent(data), settings.ageGate.enforceUnknown);
}

export function ageBlockResponse(eligibility: Extract<AiEligibility, { aiAllowed: false }>) {
  const error = eligibility.code === 'AGE_RESTRICTED' ? AGE_RESTRICTED_MESSAGE
    : eligibility.code === 'AI_CONSENT_REQUIRED' ? AI_CONSENT_MESSAGE : AGE_CONFIRMATION_MESSAGE;
  return NextResponse.json({ error, code: eligibility.code }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

/** Convenience for routes: a 403 response when AI is not allowed, otherwise null. */
export async function aiAgeGate(uid: string): Promise<NextResponse | null> {
  const eligibility = await getAiEligibility(uid);
  return eligibility.aiAllowed ? null : ageBlockResponse(eligibility);
}
