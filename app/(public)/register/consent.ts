import { DEFAULT_LEGAL_VERSION, readLegalVersions, type LegalVersions } from '@/lib/user/requirements';

export type AgeAnswer = 'adult' | 'minor';

export const AGE_QUESTION = 'How old are you?';
export const ADULT_CHOICE = "I'm 18 or older";
export const MINOR_CHOICE = "I'm under 18";
export const AI_CONSENT_LABEL =
  'Allow AcadeGrade to send my results and scanned slips to AI providers (Google Gemini, Groq, OpenRouter) for analysis and scans.';
export const MINOR_NOTICE =
  "AI features and result scanning are for users 18 and over. You can still track your results. If you're under 18, please make sure a parent or guardian knows you use AcadeGrade.";

/** The `answers` object sent with the existing finalize call. */
export interface RegistrationAnswers {
  age: AgeAnswer;
  terms: { version: string };
  privacy: { version: string };
  aiConsent?: boolean;
}

export const FALLBACK_LEGAL_VERSIONS: LegalVersions = {
  termsVersion: DEFAULT_LEGAL_VERSION,
  privacyVersion: DEFAULT_LEGAL_VERSION,
};

/**
 * Builds the registration answers. An AI choice is recorded only for adults, and
 * no marketing choice is sent because the sign-up form never asks it.
 */
export function buildRegistrationAnswers(
  values: { age: AgeAnswer; aiConsent?: boolean },
  legal: LegalVersions
): RegistrationAnswers {
  const answers: RegistrationAnswers = {
    age: values.age,
    terms: { version: legal.termsVersion },
    privacy: { version: legal.privacyVersion },
  };
  if (values.age === 'adult') answers.aiConsent = values.aiConsent === true;
  return answers;
}

/** Reads the public `config/legal` versions; any failure falls back to the current default. */
export async function loadLegalVersions(read: (path: string) => Promise<unknown>): Promise<LegalVersions> {
  try {
    return readLegalVersions(await read('config/legal'));
  } catch {
    return FALLBACK_LEGAL_VERSIONS;
  }
}
