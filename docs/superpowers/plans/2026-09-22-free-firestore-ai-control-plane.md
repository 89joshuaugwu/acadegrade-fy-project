# Free Firestore AI Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a zero-new-service, server-only encrypted Firestore control plane that lets authorized administrators manage supported AI providers, models, modes, keys, and routing at runtime.

**Architecture:** A server-only AES-256-GCM module encrypts provider keys using one deployment root key. Private Firestore documents hold encrypted secrets, routing metadata, and audit events; a server-owned registry constrains provider endpoints and models. Existing AI routes resolve managed configuration after activation, while their existing mobile contracts remain unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Node `crypto`, Firebase Admin/Firestore, Firebase ID tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-free-firestore-ai-control-plane-design.md`

## Global Constraints

- Set exactly one new deployment secret, `AI_SECRETS_MASTER_KEY`, as a base64-encoded 32-byte value before activating managed routing.
- Never persist, log, return, or prefill plaintext provider keys, AES-GCM ciphertext, IVs, authentication tags, or the root key.
- Keep `config/settings` public and free of private AI routing/secrets; use only `_ai_runtime`, `_ai_secrets`, and `_ai_audit` for private control-plane records.
- Do not add Google Cloud Secret Manager, KMS, paid services, arbitrary provider URLs, or remote provider health checks.
- Support only Groq, OpenRouter, and Gemini endpoint/model registry entries defined in server code.
- Preserve `/api/ai/insights`, `/api/ai/forecast`, `/api/ai/whatif`, and `/api/results/extract` paths, required request/response fields, status behavior, and rate-limit headers consumed by mobile.
- Managed activation must make existing provider-key environment variables ineligible for runtime fallback.
- Use test-first development: each production behavior begins with a focused failing Vitest test.

## Review Focus

- A valid ciphertext copied from one secret/provider document to another must fail authentication rather than decrypt.
- Missing, malformed, or wrongly sized `AI_SECRETS_MASTER_KEY` must prevent managed remote generation and must not trigger environment-key fallback.
- A stale administrator update must return a conflict rather than overwriting a newer routing revision.
- A browser/mobile caller must be denied access to all `_ai_*` paths even though `config/settings` remains publicly readable.
- A managed routing/model/prompt revision must invalidate only relevant insights/forecast cache entries without changing mobile response shapes.

---

### Task 1: Add server-only AES-GCM secret primitives

**Files:**
- Create: `lib/ai/secrets.ts`
- Test: `tests/unit/ai-secrets.test.ts`

**Interfaces:**
- Produces `EncryptedSecret`, `encryptSecret(plaintext, context, masterKey?)`, `decryptSecret(record, context, masterKey?)`, and `maskSecret(value)`.
- `context` is `{ secretId: string; providerId: SupportedProviderId }`; it is serialized as AES-GCM additional authenticated data.
- `EncryptedSecret` contains `{ version: 1; ciphertext: string; iv: string; tag: string }` and never contains plaintext.

- [ ] **Step 1: Write failing encryption and masking tests**

```ts
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/ai/secrets';

const key = Buffer.alloc(32, 7).toString('base64');
const context = { secretId: 'groq-primary', providerId: 'groq' as const };

it('round-trips a secret without storing plaintext', () => {
  const encrypted = encryptSecret('gsk_secret_value', context, key);
  expect(JSON.stringify(encrypted)).not.toContain('gsk_secret_value');
  expect(decryptSecret(encrypted, context, key)).toBe('gsk_secret_value');
});

it('rejects ciphertext moved to another secret or provider', () => {
  const encrypted = encryptSecret('secret', context, key);
  expect(() => decryptSecret(encrypted, { ...context, secretId: 'other' }, key)).toThrow('Unable to decrypt AI secret');
});

it('masks a key without exposing more than its suffix', () => {
  expect(maskSecret('abcdefgh')).toBe('••••efgh');
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/ai-secrets.test.ts`

Expected: FAIL because `@/lib/ai/secrets` does not exist.

- [ ] **Step 3: Implement minimal server-only crypto**

```ts
import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function encryptSecret(plaintext: string, context: SecretContext, encodedKey = process.env.AI_SECRETS_MASTER_KEY): EncryptedSecret {
  const key = parseMasterKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(context)));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { version: 1, ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
```

Implement matching decryption, strict base64/32-byte root-key validation, non-empty secret validation, constant public error `Unable to decrypt AI secret`, and suffix-only masking.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/ai-secrets.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/secrets.ts tests/unit/ai-secrets.test.ts
git commit -m "feat: encrypt runtime AI secrets"
```

### Task 2: Define and validate private AI routing configuration

**Files:**
- Create: `lib/ai/runtime-config.ts`
- Test: `tests/unit/ai-runtime-config.test.ts`

**Interfaces:**
- Consumes `EncryptedSecret` from Task 1 and `adminDb` only through injected Firestore-shaped dependencies.
- Produces `SUPPORTED_PROVIDERS`, `AiRuntimeConfig`, `parseAiRuntimeConfig`, `createBootstrapRuntimeConfig`, `createManagedRuntimeConfig`, `toMaskedAdminProjection`, and `getAiRuntimeConfig`.
- Defines `AiFeature` as `insights | forecast | whatif | extract`; `AiMode` as `disabled | local-only | single | fallback-chain`.

- [ ] **Step 1: Write failing configuration tests**

```ts
it('rejects an arbitrary endpoint, provider, or model', () => {
  expect(() => parseAiRuntimeConfig({
    source: 'managed', revision: 1,
    routes: { insights: { mode: 'single', chain: [{ providerId: 'custom', modelId: 'http://127.0.0.1' }] } },
  })).toThrow('Unsupported AI provider');
});

it('marks only supported, active secret references as activatable', () => {
  const config = createManagedRuntimeConfig(validManagedInput);
  expect(config.source).toBe('managed');
  expect(config.revision).toBe(1);
});

it('returns masked key metadata only', () => {
  expect(toMaskedAdminProjection(secretRecord)).not.toHaveProperty('ciphertext');
  expect(toMaskedAdminProjection(secretRecord)).not.toHaveProperty('iv');
  expect(toMaskedAdminProjection(secretRecord)).not.toHaveProperty('tag');
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/ai-runtime-config.test.ts`

Expected: FAIL because `@/lib/ai/runtime-config` does not exist.

- [ ] **Step 3: Implement registry, schema, and Firestore repository**

Implement a fixed registry containing current supported models:

```ts
export const SUPPORTED_PROVIDERS = {
  groq: { models: ['llama-3.3-70b-versatile'], capabilities: ['text'] },
  openrouter: { models: ['openrouter/free', 'google/gemma-4-31b-it:free'], capabilities: ['text'] },
  gemini: { models: ['gemini-3.1-flash-lite'], capabilities: ['text', 'multimodal'] },
} as const;
```

Validate feature capabilities, mode/chain cardinality, unique secret IDs, active-secret state, and positive integer revisions. Store/retrieve the configuration at `_ai_runtime/config`; store secret documents at `_ai_secrets/{secretId}`. Return bootstrap configuration only while private config is absent or explicitly `source: 'bootstrap'`.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/ai-runtime-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/runtime-config.ts tests/unit/ai-runtime-config.test.ts
git commit -m "feat: validate managed AI routing"
```

### Task 3: Add centralized admin authorization and private control-plane API

**Files:**
- Create: `lib/api/admin-auth.ts`
- Create: `app/api/admin/ai/route.ts`
- Test: `tests/unit/admin-ai-route.test.ts`

**Interfaces:**
- Consumes routing/secrets APIs from Tasks 1–2.
- Produces `requireAdmin(request)` and API operations `GET`, `POST`.
- `POST` operations are `upsert-secret`, `save-routing`, `activate-managed`, and `set-secret-state`.

- [ ] **Step 1: Write failing route tests**

```ts
it('rejects a missing or revoked administrator token', async () => {
  const response = await POST(new Request('https://app.test/api/admin/ai', { method: 'POST' }));
  expect(response.status).toBe(401);
  expect(firebase.verifyIdToken).not.toHaveBeenCalled();
});

it('stores ciphertext and returns only masked metadata after a key write', async () => {
  const response = await POST(adminRequest({ operation: 'upsert-secret', providerId: 'groq', secretId: 'groq-primary', value: 'gsk_value' }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(JSON.stringify(body)).not.toContain('gsk_value');
  expect(firebase.secretSet).toHaveBeenCalledWith(expect.objectContaining({ ciphertext: expect.any(String) }), { merge: true });
});

it('rejects a stale expected revision', async () => {
  const response = await POST(adminRequest({ operation: 'save-routing', expectedRevision: 1, routing: validRouting }));
  expect(response.status).toBe(409);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/admin-ai-route.test.ts`

Expected: FAIL because the API route and centralized authorization helper do not exist.

- [ ] **Step 3: Implement auth and write-only API behavior**

Use `adminAuth.verifyIdToken(token, true)`, normalize the verified email, and compare it to `config/admins.emails`. Implement Firestore transactions for revision-checked routing updates and activation. Add one `_ai_audit` document per mutation with actor UID/email, operation, resource ID, safe state transition, and timestamp.

Return `Cache-Control: private, no-store` from GET and POST. Map unauthorized to 401, non-admin to 403, bad mutation to 400, revision conflict to 409, and unexpected errors to a generic 500 response. Never return raw provider, crypto, or Firestore exception messages.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/admin-ai-route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin-auth.ts app/api/admin/ai/route.ts tests/unit/admin-ai-route.test.ts
git commit -m "feat: add encrypted AI admin API"
```

### Task 4: Deny client access to private AI documents

**Files:**
- Modify: `firestore.rules:75-89`
- Create: `tests/unit/firestore-ai-rules.test.ts`

**Interfaces:**
- Produces explicit denied rules for `_ai_runtime`, `_ai_secrets`, and `_ai_audit`.

- [ ] **Step 1: Write failing rule-focused test**

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('explicitly denies browser access to every private AI collection', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  for (const collection of ['_ai_runtime', '_ai_secrets', '_ai_audit']) {
    expect(rules).toContain(`match /${collection}/{document=**} {`);
  }
  expect(rules.match(/match \/_ai_(runtime|secrets|audit)\/\{document=\*\*\} \{\s*allow read, write: if false;/gs)).toHaveLength(3);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/firestore-ai-rules.test.ts`

Expected: FAIL because explicit private AI collection rules do not exist.

- [ ] **Step 3: Add explicit Firestore denies**

```rules
match /_ai_runtime/{document=**} {
  allow read, write: if false;
}
match /_ai_secrets/{document=**} {
  allow read, write: if false;
}
match /_ai_audit/{document=**} {
  allow read, write: if false;
}
```

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/firestore-ai-rules.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/unit/firestore-ai-rules.test.ts
git commit -m "fix: deny client access to AI control plane"
```

### Task 5: Resolve managed configuration in the AI manager

**Files:**
- Modify: `lib/ai/manager.ts:1-228`
- Test: `tests/unit/ai-manager.test.ts`

**Interfaces:**
- Consumes `getAiRuntimeConfig`, encrypted-secret retrieval, and `decryptSecret` from Tasks 1–2.
- Preserves exported `generateFastResponse`, `generateDeepInsight`, `generateDeepInsightJSON`, and `generateMultimodalGeminiContent` signatures.
- Produces structured `AiGenerationResult` internally with provider/model/config revision for logging.

- [ ] **Step 1: Write failing manager behavior tests**

```ts
it('uses managed Groq credentials after activation and ignores environment keys', async () => {
  runtime.getAiRuntimeConfig.mockResolvedValue(managedGroqRuntime);
  providers.groq.mockResolvedValue('managed response');
  process.env.GROQ_API_KEY_1 = 'old-env-key';

  await expect(generateFastResponse('hello')).resolves.toBe('managed response');
  expect(providers.groq).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'managed-key' }));
});

it('does not cascade an invalid credential error to another provider', async () => {
  runtime.getAiRuntimeConfig.mockResolvedValue(managedInsightRuntime);
  providers.openrouter.mockRejectedValue({ status: 401 });

  await expect(generateDeepInsight('hello')).rejects.toThrow('AI provider authentication failed');
  expect(providers.gemini).not.toHaveBeenCalled();
});

it('tries the next configured provider after a retryable rate limit', async () => {
  providers.openrouter.mockRejectedValueOnce({ status: 429 }).mockResolvedValueOnce('fallback response');
  await expect(generateDeepInsight('hello')).resolves.toBe('fallback response');
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/ai-manager.test.ts`

Expected: FAIL because managed resolver behavior is absent.

- [ ] **Step 3: Refactor manager through provider adapters**

Keep current provider SDKs, hardcode the OpenRouter base URL, and add a small adapter per supported provider. Resolve `bootstrap` routes from the current environment arrays only before activation. Resolve `managed` routes from private Firestore and decrypt only selected active secret records. Retry only status 429 and transient 5xx/network errors; stop immediately for 400/401/403. Replace `deepseek` terminology with actual provider/model metadata and sanitize thrown errors.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/ai-manager.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/manager.ts tests/unit/ai-manager.test.ts
git commit -m "feat: resolve managed AI providers"
```

### Task 6: Preserve AI route contracts while adding revision-aware caching and safe degradation

**Files:**
- Modify: `app/api/ai/insights/route.ts:24-138`
- Modify: `app/api/ai/forecast/route.ts:23-135`
- Modify: `app/api/ai/whatif/route.ts:20-104`
- Modify: `app/api/results/extract/route.ts:27-111`
- Test: `tests/unit/ai-routes.test.ts`

**Interfaces:**
- Consumes manager generation metadata and current resolver revision.
- Preserves existing route methods, required request fields, required response fields, and rate-limit headers.

- [ ] **Step 1: Write failing route-contract tests**

```ts
it('invalidates an insight cache hit when managed configuration revision changes', async () => {
  resolver.revision.mockResolvedValue(9);
  const response = await insights.POST(authenticatedInsightRequest());
  expect(response.headers.get('X-AI-Cache')).toBe('MISS');
});

it('returns the existing forecast shape with a safe local label when managed generation is unavailable', async () => {
  manager.generateDeepInsight.mockRejectedValue(new Error('AI provider unavailable'));
  const response = await forecast.POST(authenticatedForecastRequest());
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ projected: expect.any(Array), trendLabel: expect.any(String) });
});

it('does not expose an upstream error message from OCR', async () => {
  manager.generateMultimodalGeminiContent.mockRejectedValue(new Error('provider token rejected: secret'));
  const response = await extract.POST(authenticatedExtractRequest());
  expect(JSON.stringify(await response.json())).not.toContain('secret');
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/ai-routes.test.ts`

Expected: FAIL because cache signatures omit configuration revision and routes leak/propagate current provider behavior.

- [ ] **Step 3: Implement additive route behavior**

Append resolver revision to insight and forecast input signatures. Keep all existing required response properties unchanged. Add a deterministic local forecast label only when provider generation fails; preserve what-if local behavior; keep OCR failure shape generic. Log actual generation metadata and public error codes, not raw errors. Do not add a required request field or remove a response field.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/ai-routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai app/api/results/extract/route.ts tests/unit/ai-routes.test.ts
git commit -m "feat: make AI routes revision aware"
```

### Task 7: Add the administrator AI control-plane screen

**Files:**
- Create: `app/(admin)/admin/ai/page.tsx`
- Modify: `lib/ui/route-meta.ts:30-80`
- Test: `tests/unit/admin-ai-page.test.tsx`

**Interfaces:**
- Consumes masked `/api/admin/ai` GET response and write-only POST operations.
- Produces a new `/admin/ai` admin destination without exposing secret values.

- [ ] **Step 1: Write failing admin-page tests**

```tsx
it('renders masked secret state but never renders submitted plaintext after saving', async () => {
  render(<AdminAiPage />);
  await user.type(screen.getByLabelText('Groq API key'), 'gsk_real_key');
  await user.click(screen.getByRole('button', { name: 'Save key' }));
  expect(screen.queryByDisplayValue('gsk_real_key')).not.toBeInTheDocument();
  expect(await screen.findByText('••••_key')).toBeInTheDocument();
});

it('does not permit an arbitrary provider endpoint field', () => {
  render(<AdminAiPage />);
  expect(screen.queryByLabelText(/endpoint url/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/admin-ai-page.test.tsx`

Expected: FAIL because the page and route metadata do not exist.

- [ ] **Step 3: Implement the compact control-plane UI**

Fetch masked state with a bearer token, render supported provider/model selects, per-feature mode/selectable ordered routes, state badges, and write-only password inputs. Clear key input state after every submit regardless of response. Require a deliberate Activate Managed Configuration action that supplies the displayed revision. Add `/admin/ai` to the admin navigation metadata.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm.cmd run test:unit -- tests/unit/admin-ai-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/admin/ai/page.tsx lib/ui/route-meta.ts tests/unit/admin-ai-page.test.tsx
git commit -m "feat: add AI control plane UI"
```

### Task 8: Run integration verification and update operator documentation

**Files:**
- Modify: `docs/project_handover/11_ai_provider_strategy_actual.md`
- Modify: `docs/project_handover/6_tech_stack_and_env.md`
- Create: `docs/AI_RUNTIME_BOOTSTRAP.md`

**Interfaces:**
- Documents `AI_SECRETS_MASTER_KEY` generation/storage, bootstrap migration, managed activation, rotation, rollback, and mobile compatibility constraints.

- [ ] **Step 1: Write a failing documentation/source-contract test**

```ts
it('documents the required root key and the managed activation boundary', () => {
  const guide = readFileSync('docs/AI_RUNTIME_BOOTSTRAP.md', 'utf8');
  expect(guide).toContain('AI_SECRETS_MASTER_KEY');
  expect(guide).toContain('managed');
  expect(guide).toContain('Do not store provider keys in config/settings');
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm.cmd run test:unit -- tests/unit/ai-runtime-docs.test.ts`

Expected: FAIL because the bootstrap guide does not exist.

- [ ] **Step 3: Document bootstrap and replace stale provider claims**

Document a PowerShell command that generates a root key without printing provider secrets, the one-time hosting dashboard step, the safe migration sequence, key rotation states, rollback behavior, and warning that activation ignores old provider-key environment variables. Update the provider map to reflect actual OpenRouter/Gemini/Groq behavior and link to the new runtime guide.

- [ ] **Step 4: Run focused tests, static checks, and complete suite**

Run:

```bash
npm.cmd run test:unit -- tests/unit/ai-secrets.test.ts tests/unit/ai-runtime-config.test.ts tests/unit/admin-ai-route.test.ts tests/unit/firestore-ai-rules.test.ts tests/unit/ai-manager.test.ts tests/unit/ai-routes.test.ts tests/unit/admin-ai-page.test.tsx tests/unit/ai-runtime-docs.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit
```

Expected: all commands PASS. Report any pre-existing failure by its test or command name.

- [ ] **Step 5: Commit**

```bash
git add docs tests/unit/ai-runtime-docs.test.ts
git commit -m "docs: explain managed AI bootstrap"
```
