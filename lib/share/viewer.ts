import { SHARE_PIN_HEADER } from './options';

/**
 * Client for the public share viewer. The PIN travels only in the `X-Share-Pin`
 * header: never in the URL, never in a body, never in storage.
 */

export type SharedTranscriptResult<T = Record<string, unknown>> =
  | { status: 'ok'; transcript: T; expiresAt: string | null }
  | { status: 'pin-required' }
  | { status: 'pin-incorrect' }
  | { status: 'locked'; retryAfterSeconds: number }
  /**
   * Expired (410) or unknown (404, which includes a revoked link). The public page shows
   * both the same way, as before; the owner's preview may say which.
   */
  | { status: 'unavailable'; reason?: 'expired' | 'not-found' }
  | { status: 'error' };

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function fetchSharedTranscript<T = Record<string, unknown>>(
  shareId: string,
  pin?: string | null,
): Promise<SharedTranscriptResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/transcript/share?id=${encodeURIComponent(shareId)}`, {
      cache: 'no-store',
      headers: pin ? { [SHARE_PIN_HEADER]: pin } : undefined,
    });
  } catch {
    return { status: 'error' };
  }

  const body = await readJson(response);
  if (response.ok) {
    if (!body.transcript || typeof body.transcript !== 'object') return { status: 'error' };
    return { status: 'ok', transcript: body.transcript as T, expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null };
  }
  if (response.status === 401 && body.code === 'PIN_REQUIRED') return { status: 'pin-required' };
  if (response.status === 401 && body.code === 'PIN_INCORRECT') return { status: 'pin-incorrect' };
  if (response.status === 429 && body.code === 'PIN_LOCKED') {
    const header = Number(response.headers?.get?.('Retry-After'));
    const seconds = typeof body.retryAfterSeconds === 'number' ? body.retryAfterSeconds : header;
    return { status: 'locked', retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 3600 };
  }
  if (response.status === 410) return { status: 'unavailable', reason: 'expired' };
  if (response.status === 404) return { status: 'unavailable', reason: 'not-found' };
  return { status: 'error' };
}
