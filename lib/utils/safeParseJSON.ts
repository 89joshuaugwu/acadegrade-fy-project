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
  const start = raw.indexOf('{');
  if (start === -1) {
    return { ok: false, error: 'No opening brace found', rawPreview: raw.slice(0, 200), rawLength: raw.length };
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let end = -1;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Truncated — never closed. Try trimming to the last complete field and closing braces manually,
    // or just fail cleanly here.
    return { ok: false, error: 'Unterminated JSON object (likely truncated by max_tokens)', rawPreview: raw.slice(0, 200), rawLength: raw.length };
  }

  const candidate = raw.slice(start, end + 1);
  try {
    return { ok: true, value: JSON.parse(candidate) as T };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return { ok: false, error: msg, rawPreview: candidate.slice(0, 1000), rawLength: candidate.length };
  }
}

