import 'server-only';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getPlatformSettings } from '@/lib/platform/settings-server';
import { eligibilityFor, readAgeStatus } from '@/lib/user/age';
import {
  computeAnswerUpdate,
  currentAnswers,
  pendingRequirements,
  readAiConsent,
  readLegalVersions,
  RequirementError,
  withUpdate,
  type LegalVersions,
  type RequirementAnswers,
} from '@/lib/user/requirements';

export async function readLegal(): Promise<LegalVersions> {
  return readLegalVersions((await adminDb.collection('config').doc('legal').get()).data());
}

/** Validates and records answers in one transaction. Returns the resulting user data. */
export async function applyRequirementAnswers(uid: string, answers: RequirementAnswers) {
  const userRef = adminDb.collection('users').doc(uid);
  const legalRef = adminDb.collection('config').doc('legal');
  return adminDb.runTransaction(async (transaction) => {
    const [userSnapshot, legalSnapshot] = [await transaction.get(userRef), await transaction.get(legalRef)];
    const legal = readLegalVersions(legalSnapshot.data());
    const current = userSnapshot.data();
    const update = computeAnswerUpdate(current, answers, legal, new Date());
    if (Object.keys(update).length) transaction.set(userRef, update, { merge: true });
    return { user: withUpdate(current, update), legal };
  });
}

/** The `{ ageStatus, aiAllowed }` view returned by `/api/user/age`. */
export async function ageSummary(user: unknown) {
  const settings = await getPlatformSettings();
  return {
    ageStatus: readAgeStatus(user),
    aiAllowed: eligibilityFor(readAgeStatus(user), readAiConsent(user), settings.ageGate.enforceUnknown).aiAllowed,
  };
}

export function requirementsBody(user: unknown, legal: LegalVersions) {
  return { items: pendingRequirements(user, legal), current: currentAnswers(user), checkedAt: Date.now() };
}

export const userNoStore = { 'Cache-Control': 'private, no-store' };

export function requirementErrorResponse(error: RequirementError) {
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: userNoStore });
}
