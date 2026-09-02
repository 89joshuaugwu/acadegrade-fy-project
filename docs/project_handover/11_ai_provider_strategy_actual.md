# AcadeGrade: Actual AI Provider Strategy (Corrects Docs 6, 7 & 10)

> **Why this file exists:** Docs `6_tech_stack_and_env.md`, `7_packages.md`, and
> `10_rate_limiting_and_abuse_prevention.md` describe a "DeepSeek + Groq + Gemini"
> strategy. That's no longer accurate — DeepSeek was dropped after reliability
> issues and replaced with OpenRouter. This file documents what `lib/ai/manager.ts`
> actually does today. Treat this file as the source of truth for AI provider logic;
> the older docs are historical only.

## 1. What Changed

DeepSeek's API was unreliable enough in production that it was replaced with
**OpenRouter**, which auto-routes to whichever free-tier model is currently
available (commonly Llama 3.3 70B or similar), with a hard fallback to Gemini
if OpenRouter fails entirely. The `openai` npm package is still a dependency —
it's just pointed at OpenRouter's OpenAI-compatible endpoint
(`https://openrouter.ai/api/v1`), not DeepSeek's.

## 2. The Real Provider Map

| Feature | Function | Provider Chain |
|---|---|---|
| Written Analysis (`/api/ai/insights`) | `generateDeepInsightJSON()` | OpenRouter `openrouter/free` → OpenRouter `meta-llama/llama-3.3-70b-instruct:free` → Gemini `gemini-3.1-flash-lite` (final fallback) |
| Forecast trend label (`/api/ai/forecast`) | `generateDeepInsight()` | Same 3-tier cascade as above |
| What-If feasibility note (`/api/ai/whatif`) | `generateFastResponse()` | Groq `llama-3.3-70b-versatile` only (no fallback — Groq is fast/cheap enough that a cascade isn't needed) |
| Result Slip OCR (`/api/results/extract`) | `generateMultimodalGeminiContent()` | Gemini `gemini-3.1-flash-lite` (multimodal) only |

**Note on naming:** the function is called `generateDeepInsight*` for historical
reasons (it used to call DeepSeek). It does not call DeepSeek anymore — don't
be misled by the name if you're grepping the codebase later.

## 3. Multi-Key Rotation System

`lib/ai/manager.ts` maintains its own in-memory round-robin index per provider
and rotates to the next key whenever a call returns HTTP 429:

```env
GROQ_API_KEY_1=...
GROQ_API_KEY_2=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
GEMINI_API_KEY_2=...
INSIGHT_GEMINI_KEY=...   # optional dedicated fallback key for the insight cascade
```

- Keys are loaded into arrays (`GROQ_KEYS`, `OPENROUTER_KEYS`, `GEMINI_KEYS`),
  filtering out any that are unset.
- `withKeyRotation()` wraps every provider call: on a 429 it advances the
  index and retries with the next key, up to `keys.length` attempts. Any
  non-429 error throws immediately (no retry).
- If **all** keys for a provider are rate-limited, it throws
  `"[Provider] All API keys exhausted their rate limits (429)."` — this is
  what ultimately triggers the 429 responses the frontend cooldown logic
  (in `insights/page.tsx`) catches and displays as "AI quota temporarily reached."
- The rotation index is process-global (module-level `let`), not per-request —
  so on Vercel it resets per cold serverless instance, not per user request.

## 4. Practical Implications

- **Adding a new key** for any provider is just adding another
  `PROVIDER_KEY_N` env var and adding it to the relevant array in
  `manager.ts` — no other code changes needed.
- **If OpenRouter's free tier gets throttled platform-wide** (not just your
  key), the code still has a Gemini fallback baked in for insights/forecast,
  so those features degrade gracefully rather than fully failing.
- **What-If has no fallback** — if all Groq keys are exhausted, that specific
  feature will error out with no secondary provider. Worth keeping an eye on
  via `/admin/api-analytics` if What-If usage grows.
