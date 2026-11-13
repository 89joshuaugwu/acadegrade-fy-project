/**
 * Client handling of the server's AI gate codes (403 age/consent, 503
 * maintenance/feature switch) and of `GET /api/ai/usage`'s `age` field.
 * Plain data so pages, the What-if calculator and tests share one mapping.
 */
export type AiFeature = 'insights' | 'forecast' | 'whatif';

export type AiBlockKind = 'age-restricted' | 'requirements' | 'maintenance' | 'feature-disabled';

export interface AiBlock {
  kind: AiBlockKind;
  message: string;
}

export const AGE_RESTRICTED_NOTICE = 'AI features and result scanning are for users 18 and over. You can still track your results.';
export const REQUIREMENTS_NOTICE = 'Finish setting up to use AI features: confirm your age and choose whether AI can process your results. Your results and calculations still work.';
export const MAINTENANCE_NOTICE = 'AI features are paused for maintenance. Your results and calculations still work. Please try again soon.';
export const FEATURE_DISABLED_NOTICE = 'This AI feature is switched off for now. Your results and calculations still work. Please try again later.';

const BLOCKS: Record<string, AiBlock> = {
  AGE_RESTRICTED: { kind: 'age-restricted', message: AGE_RESTRICTED_NOTICE },
  AGE_CONFIRMATION_REQUIRED: { kind: 'requirements', message: REQUIREMENTS_NOTICE },
  AI_CONSENT_REQUIRED: { kind: 'requirements', message: REQUIREMENTS_NOTICE },
  MAINTENANCE: { kind: 'maintenance', message: MAINTENANCE_NOTICE },
  FEATURE_DISABLED: { kind: 'feature-disabled', message: FEATURE_DISABLED_NOTICE },
};

function codeOf(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** A known gate response, or null for anything the caller handles itself (429, 5xx, ...). */
export function classifyAiFailure(status: number, body: unknown): AiBlock | null {
  if (status !== 403 && status !== 503) return null;
  const block = BLOCKS[codeOf(body) ?? ''];
  if (!block) return null;
  if (status === 403 && block.kind !== 'age-restricted' && block.kind !== 'requirements') return null;
  if (status === 503 && block.kind !== 'maintenance' && block.kind !== 'feature-disabled') return null;
  return block;
}

/** Reads a failed fetch Response's JSON body (if any) and classifies it. */
export async function classifyAiResponse(response: Response): Promise<{ block: AiBlock | null; body: Record<string, unknown> }> {
  const body = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  return { block: classifyAiFailure(response.status, body), body };
}

/**
 * The block implied by `GET /api/ai/usage` → `age: { status, aiAllowed, aiConsent }`.
 * A summary without `age` (older server) does not block; the routes still enforce.
 */
export function blockFromUsage(summary: unknown): AiBlock | null {
  const age = summary && typeof summary === 'object' ? (summary as { age?: unknown }).age : undefined;
  if (!age || typeof age !== 'object') return null;
  const { status, aiAllowed } = age as { status?: unknown; aiAllowed?: unknown };
  if (aiAllowed !== false) return null;
  return status === 'minor' ? BLOCKS.AGE_RESTRICTED : BLOCKS.AI_CONSENT_REQUIRED;
}
