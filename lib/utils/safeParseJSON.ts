export type SafeParseResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: string; rawPreview: string; rawLength: number };

/**
 * Tries to JSON.parse raw. On failure returns an object describing the error and a preview of the raw string.
 * Does NOT throw.
 */
export function safeParseJSON<T = unknown>(raw: string, label = 'payload'): SafeParseResult<T> {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const preview = raw.length > 1000 ? raw.slice(0, 1000) + '...[truncated]' : raw;
    // Use your app logger instead of console.error if available
    console.error(`[JSON PARSE ERROR] ${label} length=${raw.length} error=${msg}`);
    console.error(`[JSON PARSE ERROR] ${label} preview: ${preview}`);
    return { ok: false, error: msg, rawPreview: preview, rawLength: raw.length };
  }
}

/**
 * Heuristic: try to extract the first {...} object from the raw string and parse that.
 * This is a fallback and may mask upstream bugs; use only for diagnostic/rescue attempts.
 */
export function extractJsonObjectAndParse<T = unknown>(raw: string, label = 'payload-extract'): SafeParseResult<T> {
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    return { ok: false, error: 'No JSON object braces found', rawPreview: raw.slice(0, 200), rawLength: raw.length };
  }
  const candidate = raw.slice(first, last + 1);
  try {
    return { ok: true, value: JSON.parse(candidate) as T };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const preview = candidate.length > 1000 ? candidate.slice(0, 1000) + '...[truncated]' : candidate;
    console.error(`[JSON PARSE ERROR - extract] ${label} error=${msg}`);
    console.error(preview);
    return { ok: false, error: msg, rawPreview: preview, rawLength: candidate.length };
  }
}
