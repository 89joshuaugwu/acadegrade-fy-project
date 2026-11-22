/**
 * UI preview (dev only): answers same-origin /api/* calls from preview/fixtures/api in the browser.
 * Nothing under /api reaches the server while preview is on. Unknown GETs answer 404 and log a warning
 * naming the endpoint, so a missing fixture is easy to spot; unknown writes answer { ok: true }.
 */
import { PREVIEW, PREVIEW_ROLE, previewDelay } from './runtime';
import { API_FIXTURES, type ApiContext, type ApiReply } from './fixtures/api';

declare global {
  interface Window {
    __agPreviewFetch?: boolean;
  }
}

function toResponse(reply: ApiReply | unknown): Response {
  const tagged = reply && typeof reply === 'object' && '__reply' in reply ? (reply as ApiReply) : null;
  const status = tagged ? tagged.status : 200;
  const body = tagged ? tagged.body : reply;
  if (tagged?.raw !== undefined) return new Response(tagged.raw, { status, headers: { 'Content-Type': tagged.contentType ?? 'text/plain' } });
  return new Response(JSON.stringify(body ?? {}), { status, headers: { 'Content-Type': 'application/json' } });
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

if (PREVIEW && typeof window !== 'undefined' && !window.__agPreviewFetch) {
  window.__agPreviewFetch = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const ctx: ApiContext = { url, method, body: parseBody(init?.body), role: PREVIEW_ROLE ?? 'student', headers: new Headers(init?.headers) };
    const hit = API_FIXTURES.find(
      (f) => (f.method === '*' || f.method === method) && (typeof f.path === 'string' ? f.path === url.pathname : f.path.test(url.pathname)),
    );
    await previewDelay();
    if (hit) return toResponse(await hit.respond(ctx));
    if (method === 'GET') {
      console.warn(`[ag-preview] no fixture for GET ${url.pathname}. Add one in preview/fixtures/api.`);
      return toResponse({ __reply: true, status: 404, body: { error: 'No preview fixture for this endpoint.' } });
    }
    console.info(`[ag-preview] ${method} ${url.pathname} answered { ok: true } (not sent).`);
    return toResponse({ ok: true, success: true });
  };
}

export {};
