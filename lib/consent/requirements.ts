/**
 * Client side of the server-owned account requirements
 * (`/api/user/requirements`, `/api/user/age`). Everything here FAILS OPEN:
 * a missing endpoint, an error or no network never blocks the student.
 */

export type RequirementBlocking = 'app' | 'ai' | 'none';

export interface RequirementItem {
  id: string;
  blocking: RequirementBlocking;
  version?: string;
  title: string;
  description: string;
}

export interface RequirementAnswers {
  age?: 'adult' | 'minor';
  terms?: { version: string };
  privacy?: { version: string };
  aiConsent?: boolean;
  marketingConsent?: boolean;
}

export type AgeStatus = 'adult' | 'minor';

/** Recheck on focus once this much time has passed since the last check. */
export const RECHECK_MS = 6 * 60 * 60 * 1000;
/** "Skip for now" on the AI steps lasts this long on this device. */
export const AI_SKIP_MS = 7 * 24 * 60 * 60 * 1000;

export const KNOWN_REQUIREMENT_IDS = ['age', 'terms', 'privacy', 'ai_consent', 'marketing_consent'] as const;

/** The consent question shown to students (owner wording). */
export const AI_CONSENT_QUESTION =
  'Allow AcadeGrade to send your results and scanned slips to AI providers (Google Gemini, Groq, OpenRouter) to generate analysis and scans?';

export const MINOR_NOTICE =
  "AI features and result scanning are for users 18 and over. You can still track your results. If you're under 18, please make sure a parent or guardian knows you use AcadeGrade.";

const OPEN_EVENT = 'acadegrade:open-requirements';

export interface OpenRequirementsDetail { focus?: 'ai' }

/**
 * Opens the "Finish setting up" steps. Call it when an AI route answers 403
 * AGE_RESTRICTED, AGE_CONFIRMATION_REQUIRED or AI_CONSENT_REQUIRED.
 */
export function openRequirements(focus?: 'ai'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OpenRequirementsDetail>(OPEN_EVENT, { detail: { focus } }));
}

export function onOpenRequirements(listener: (detail: OpenRequirementsDetail) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<OpenRequirementsDetail>).detail ?? {});
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

function isItem(value: unknown): value is RequirementItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && (item.blocking === 'app' || item.blocking === 'ai' || item.blocking === 'none')
    && typeof item.title === 'string'
    && typeof item.description === 'string'
    && (item.version === undefined || typeof item.version === 'string');
}

/** Returns the parsed items, or null when the body is not a requirements response. */
export function parseRequirementItems(body: unknown): RequirementItem[] | null {
  if (!body || typeof body !== 'object') return null;
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  return items.filter(isItem);
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Reads `current` (the recorded answers) from a requirements response; null when absent. */
export function parseCurrentState(body: unknown): PrivacyState | null {
  if (!body || typeof body !== 'object') return null;
  const current = (body as { current?: unknown }).current;
  if (!current || typeof current !== 'object') return null;
  const value = current as Record<string, unknown>;
  const flag = (input: unknown) => (typeof input === 'boolean' ? input : null);
  return {
    ageStatus: value.ageStatus === 'adult' || value.ageStatus === 'minor' ? value.ageStatus : null,
    aiConsent: flag(value.aiConsent),
    marketingConsent: flag(value.marketingConsent),
  };
}

/** GET items and recorded answers together. null on any failure (fail open). */
export async function fetchRequirementsState(token: string, fetcher: typeof fetch = fetch):
  Promise<{ items: RequirementItem[]; current: PrivacyState | null } | null> {
  try {
    const response = await fetcher('/api/user/requirements', { headers: authHeaders(token), cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json();
    const items = parseRequirementItems(body);
    return items ? { items, current: parseCurrentState(body) } : null;
  } catch {
    return null;
  }
}

/** GET the pending items. null on any failure (fail open). */
export async function fetchRequirements(token: string, fetcher: typeof fetch = fetch): Promise<RequirementItem[] | null> {
  try {
    const response = await fetcher('/api/user/requirements', { headers: authHeaders(token), cache: 'no-store' });
    if (!response.ok) return null;
    return parseRequirementItems(await response.json());
  } catch {
    return null;
  }
}

export type SubmitResult =
  | { ok: true; items: RequirementItem[] | null; current: PrivacyState | null }
  | { ok: false; status: number; code?: string; message: string };

async function readError(response: Response, fallback: string): Promise<{ code?: string; message: string }> {
  try {
    const body = await response.json() as { error?: unknown; code?: unknown };
    return {
      code: typeof body.code === 'string' ? body.code : undefined,
      message: typeof body.error === 'string' && body.error ? body.error : fallback,
    };
  } catch {
    return { message: fallback };
  }
}

const SAVE_FAILED = 'Your answer could not be saved. Check your connection and try again.';

/** POST answers. status 0 means the request never reached the server. */
export async function submitRequirementAnswers(token: string, answers: RequirementAnswers, fetcher: typeof fetch = fetch): Promise<SubmitResult> {
  try {
    const response = await fetcher('/api/user/requirements', {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) return { ok: false, status: response.status, ...(await readError(response, SAVE_FAILED)) };
    let body: unknown = null;
    try { body = await response.json(); } catch { body = null; }
    return { ok: true, items: parseRequirementItems(body), current: parseCurrentState(body) };
  } catch {
    return { ok: false, status: 0, message: SAVE_FAILED };
  }
}

/** POST /api/user/age. Used by Settings for "I've turned 18". */
export async function submitAgeStatus(token: string, status: AgeStatus, fetcher: typeof fetch = fetch):
  Promise<{ ok: true; ageStatus: AgeStatus | null; aiAllowed: boolean } | { ok: false; status: number; code?: string; message: string }> {
  try {
    const response = await fetcher('/api/user/age', {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return { ok: false, status: response.status, ...(await readError(response, SAVE_FAILED)) };
    const body = await response.json() as { ageStatus?: unknown; aiAllowed?: unknown };
    return {
      ok: true,
      ageStatus: body.ageStatus === 'adult' || body.ageStatus === 'minor' ? body.ageStatus : null,
      aiAllowed: body.aiAllowed === true,
    };
  } catch {
    return { ok: false, status: 0, message: SAVE_FAILED };
  }
}

/* ---- Profile readers (users/{uid} is readable by its owner; writes are server-only) ---- */

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export interface PrivacyState {
  ageStatus: AgeStatus | null;
  /** true / false when answered, null when never answered. */
  aiConsent: boolean | null;
  marketingConsent: boolean | null;
}

export function readPrivacyState(profile: unknown): PrivacyState {
  const data = asRecord(profile);
  const consents = asRecord(data.consents);
  const ai = asRecord(consents.ai);
  const marketing = asRecord(consents.marketing);
  return {
    ageStatus: data.ageStatus === 'adult' || data.ageStatus === 'minor' ? data.ageStatus : null,
    aiConsent: typeof ai.granted === 'boolean' ? ai.granted : null,
    marketingConsent: typeof marketing.granted === 'boolean' ? marketing.granted : null,
  };
}

/* ---- Skip memory (localStorage, never throws) ---- */

export const aiSkipKey = (uid: string) => `acadegrade:requirements:ai-skip:v1:${uid}`;

export function isAiSkipActive(uid: string, now = Date.now()): boolean {
  try {
    const value = Number(window.localStorage.getItem(aiSkipKey(uid)));
    return Number.isFinite(value) && value > 0 && now - value < AI_SKIP_MS;
  } catch {
    return false;
  }
}

export function rememberAiSkip(uid: string, now = Date.now()): void {
  try {
    window.localStorage.setItem(aiSkipKey(uid), String(now));
  } catch {
    // Storage blocked: the skip lasts for this page view only.
  }
}

export function clearAiSkip(uid: string): void {
  try {
    window.localStorage.removeItem(aiSkipKey(uid));
  } catch {
    // Nothing to clear.
  }
}

/* ---- Planning ---- */

/** Steps for the "Finish setting up" dialog, in order: age, AI consent, other AI items, then optional items. */
export function flowSteps(items: readonly RequirementItem[]): RequirementItem[] {
  const ai = items.filter((item) => item.blocking === 'ai');
  const rank = (item: RequirementItem) => (item.id === 'age' ? 0 : item.id === 'ai_consent' ? 1 : 2);
  return [
    ...[...ai].sort((a, b) => rank(a) - rank(b)),
    ...items.filter((item) => item.blocking === 'none'),
  ];
}

export function appItems(items: readonly RequirementItem[]): RequirementItem[] {
  return items.filter((item) => item.blocking === 'app');
}

/** The synthetic consent step offered on demand when the student previously declined. */
export function consentStep(): RequirementItem {
  return { id: 'ai_consent', blocking: 'ai', title: 'Allow AI processing?', description: '' };
}

/* ---- AI eligibility (from /api/ai/usage) ---- */

export interface AiEligibilityView {
  status: 'adult' | 'minor' | 'unknown';
  aiAllowed: boolean;
  aiConsent: boolean | null;
}

/** Reads `age` from `/api/ai/usage`. null when unavailable, so callers fail open. */
export async function fetchAiEligibility(token: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<AiEligibilityView | null> {
  try {
    const response = await fetcher('/api/ai/usage', { headers: authHeaders(token), cache: 'no-store', signal });
    if (!response.ok) return null;
    const age = ((await response.json()) as { age?: Record<string, unknown> }).age;
    if (!age || typeof age.aiAllowed !== 'boolean') return null;
    return {
      status: age.status === 'adult' || age.status === 'minor' ? age.status : 'unknown',
      aiAllowed: age.aiAllowed,
      aiConsent: typeof age.aiConsent === 'boolean' ? age.aiConsent : null,
    };
  } catch {
    return null;
  }
}
