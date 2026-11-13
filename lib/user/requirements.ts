import { z } from 'zod';

/**
 * Server-owned "requirements": things every account must answer once (or again
 * after a version bump). Pure functions only, so routes, registration and tests
 * share one set of rules. Storage on `users/{uid}`:
 *
 *   ageStatus: 'adult' | 'minor'                (absent = unknown)
 *   ageDeclaredAt, ageUpgradedAt: Date
 *   consents.terms     = { version, at }
 *   consents.privacy   = { version, at }
 *   consents.ai        = { granted: boolean, version, at }
 *   consents.marketing = { granted: boolean, at }
 *
 * Clients cannot write any of these (firestore.rules).
 */

export const DEFAULT_LEGAL_VERSION = '2026-11-13';
/** Version of the AI-processing consent text below. Bump it only with new wording. */
export const AI_CONSENT_VERSION = '2026-11-13';

export type RequirementId = 'age' | 'terms' | 'privacy' | 'ai_consent' | 'marketing_consent';
export type RequirementBlocking = 'app' | 'ai' | 'none';
export interface RequirementItem {
  id: RequirementId | (string & {});
  blocking: RequirementBlocking;
  version?: string;
  title: string;
  description: string;
}
export interface LegalVersions { termsVersion: string; privacyVersion: string }

export type AgeStatus = 'adult' | 'minor';
type Record_ = Record<string, unknown>;

export class RequirementError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = 'RequirementError';
  }
}

const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const isRecord = (value: unknown): value is Record_ => !!value && typeof value === 'object' && !Array.isArray(value);

export function isValidLegalVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION_PATTERN.test(value);
}

export function readLegalVersions(data: unknown): LegalVersions {
  const value = isRecord(data) ? data : {};
  return {
    termsVersion: isValidLegalVersion(value.termsVersion) ? value.termsVersion : DEFAULT_LEGAL_VERSION,
    privacyVersion: isValidLegalVersion(value.privacyVersion) ? value.privacyVersion : DEFAULT_LEGAL_VERSION,
  };
}

export function readAgeStatusFrom(data: unknown): AgeStatus | null {
  const value = isRecord(data) ? data.ageStatus : undefined;
  return value === 'adult' || value === 'minor' ? value : null;
}

function consents(data: unknown): Record_ {
  return isRecord(data) && isRecord(data.consents) ? data.consents : {};
}

/** true / false when answered, null when never answered. */
export function readAiConsent(data: unknown): boolean | null {
  const ai = consents(data).ai;
  return isRecord(ai) && typeof ai.granted === 'boolean' ? ai.granted : null;
}

function acceptedVersion(data: unknown, key: 'terms' | 'privacy'): string | null {
  const entry = consents(data)[key];
  return isRecord(entry) && typeof entry.version === 'string' ? entry.version : null;
}

export interface CurrentAnswers {
  ageStatus: AgeStatus | 'unknown';
  aiConsent: boolean | null;
  marketingConsent: boolean | null;
  /** Accepted versions; omitted when never accepted. */
  termsVersion?: string;
  privacyVersion?: string;
}

/** The user's recorded answers, for settings screens ("Privacy & AI choices"). */
export function currentAnswers(userData: unknown): CurrentAnswers {
  const marketing = consents(userData).marketing;
  const termsVersion = acceptedVersion(userData, 'terms');
  const privacyVersion = acceptedVersion(userData, 'privacy');
  return {
    ageStatus: readAgeStatusFrom(userData) ?? 'unknown',
    aiConsent: readAiConsent(userData),
    marketingConsent: isRecord(marketing) && typeof marketing.granted === 'boolean' ? marketing.granted : null,
    ...(termsVersion ? { termsVersion } : {}),
    ...(privacyVersion ? { privacyVersion } : {}),
  };
}

export const AI_CONSENT_TEXT = 'To use Written Analysis, Forecast trend labels, What-if notes and result scanning, '
  + 'AcadeGrade sends your academic records, and any result slips you scan, to third-party AI providers: '
  + 'Google Gemini, Groq and OpenRouter. They may process this data outside Nigeria. '
  + 'AcadeGrade does not send your name, email or matric number in its prompts, but a scanned slip may show them. '
  + 'This is optional, and you can withdraw it at any time in Settings.';

export function pendingRequirements(userData: unknown, legal: LegalVersions): RequirementItem[] {
  const items: RequirementItem[] = [];
  const age = readAgeStatusFrom(userData);
  if (!age) {
    items.push({
      id: 'age', blocking: 'ai', title: 'How old are you?',
      description: 'AcadeGrade asks this once. Accounts for people under 18 can track results, but AI features and result scanning are turned off.',
    });
  }
  if (acceptedVersion(userData, 'terms') !== legal.termsVersion) {
    items.push({
      id: 'terms', blocking: 'app', version: legal.termsVersion, title: 'Terms of Use',
      description: 'Review and accept the current Terms of Use to keep using AcadeGrade.',
    });
  }
  if (acceptedVersion(userData, 'privacy') !== legal.privacyVersion) {
    items.push({
      id: 'privacy', blocking: 'app', version: legal.privacyVersion, title: 'Privacy Policy',
      description: 'Review the current Privacy Policy, which explains what AcadeGrade stores and who processes it.',
    });
  }
  if (age === 'adult' && readAiConsent(userData) === null) {
    items.push({ id: 'ai_consent', blocking: 'ai', version: AI_CONSENT_VERSION, title: 'Allow AI processing?', description: AI_CONSENT_TEXT });
  }
  const marketing = consents(userData).marketing;
  if (!isRecord(marketing) || typeof marketing.granted !== 'boolean') {
    items.push({
      id: 'marketing_consent', blocking: 'none', title: 'Product news by email',
      description: 'Optional. Get occasional emails about new AcadeGrade features. You will not get them unless you turn this on.',
    });
  }
  return items;
}

const answersSchema = z.object({
  age: z.enum(['adult', 'minor']).optional(),
  terms: z.object({ version: z.string() }).strict().optional(),
  privacy: z.object({ version: z.string() }).strict().optional(),
  aiConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
}).strict();
export type RequirementAnswers = z.infer<typeof answersSchema>;

/** Parses `{ answers: {...} }`. At least one answer is required. */
export function parseAnswers(body: unknown): RequirementAnswers {
  const answers = isRecord(body) ? body.answers : undefined;
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) throw new RequirementError('Check your answers and try again.', 400, 'INVALID_ANSWERS');
  if (Object.keys(parsed.data).length === 0) throw new RequirementError('No answers were provided.', 400, 'INVALID_ANSWERS');
  return parsed.data;
}

/** Optional `answers` (registration): undefined when absent, throws when malformed. */
export function parseOptionalAnswers(value: unknown): RequirementAnswers | undefined {
  if (value === undefined || value === null) return undefined;
  return parseAnswers({ answers: value });
}

/**
 * Validates the answers against the stored user data and returns the fields to
 * merge into `users/{uid}` (empty when nothing changes). `consents`, when
 * present, is the complete merged map so shallow and deep merges agree.
 */
export function computeAnswerUpdate(userData: unknown, answers: RequirementAnswers, legal: LegalVersions, now: Date): Record_ {
  const update: Record_ = {};
  const currentAge = readAgeStatusFrom(userData);
  let resultingAge = currentAge;

  if (answers.age) {
    const next = answers.age;
    if (currentAge === 'adult' && next === 'minor') {
      throw new RequirementError('Your age is already confirmed as 18 or over. Contact support to change it.', 409, 'AGE_CHANGE_REQUIRES_SUPPORT');
    }
    if (currentAge !== next) {
      update.ageStatus = next;
      if (currentAge === null) update.ageDeclaredAt = now;
      else update.ageUpgradedAt = now;
    }
    resultingAge = next;
  }

  const nextConsents: Record_ = { ...consents(userData) };
  let consentsChanged = false;
  for (const key of ['terms', 'privacy'] as const) {
    const answer = answers[key];
    if (!answer) continue;
    const current = key === 'terms' ? legal.termsVersion : legal.privacyVersion;
    if (answer.version !== current) {
      throw new RequirementError(`The ${key === 'terms' ? 'Terms of Use' : 'Privacy Policy'} has changed. Reload and review the current version.`, 409, 'VERSION_MISMATCH');
    }
    if (acceptedVersion(userData, key) !== current) {
      nextConsents[key] = { version: current, at: now };
      consentsChanged = true;
    }
  }
  if (answers.aiConsent !== undefined) {
    if (answers.aiConsent && resultingAge === 'minor') {
      throw new RequirementError('AI features are available only to users aged 18 or over.', 403, 'AGE_RESTRICTED');
    }
    if (readAiConsent(userData) !== answers.aiConsent) {
      nextConsents.ai = { granted: answers.aiConsent, version: AI_CONSENT_VERSION, at: now };
      consentsChanged = true;
    }
  }
  if (answers.marketingConsent !== undefined) {
    const marketing = consents(userData).marketing;
    if (!isRecord(marketing) || marketing.granted !== answers.marketingConsent) {
      nextConsents.marketing = { granted: answers.marketingConsent, at: now };
      consentsChanged = true;
    }
  }
  if (consentsChanged) update.consents = nextConsents;
  return update;
}

/** Applies an update to an in-memory user record (used to compute the remaining items). */
export function withUpdate(userData: unknown, update: Record_): Record_ {
  return { ...(isRecord(userData) ? userData : {}), ...update };
}
