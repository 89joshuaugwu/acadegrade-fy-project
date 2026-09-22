# Free Firestore AI Control Plane Design

## Goal

Allow authorized AcadeGrade administrators to manage supported AI provider keys, models, routing, modes, and rotations at runtime without future application code or provider-key environment-variable changes. The solution must use only the existing hosting environment and Firebase/Firestore stack.

## Constraints

- The solution must not require Google Cloud Secret Manager, Cloud KMS, a new paid service, or a new Google Cloud billing account.
- `AI_SECRETS_MASTER_KEY` is the only new deployment environment value. It is a random, base64-encoded 32-byte key set once during bootstrap and never stored in Firestore or returned by an API.
- Provider API keys must be AES-256-GCM encrypted before persistence and decrypted only by server-side code.
- Browser and mobile clients must never read private AI configuration, ciphertext, key metadata beyond masked admin projections, or plaintext credentials.
- `config/settings` remains the public settings document and must not contain any AI credential, ciphertext, secret reference, internal provider endpoint, or private routing data.
- Existing mobile routes, HTTP methods, required payloads, response fields, error status semantics, and rate-limit headers remain compatible.
- Supported provider endpoint definitions remain code-owned. Administrators may select from supported provider/model options but cannot submit arbitrary provider URLs.
- Existing `GROQ_*`, `OPENROUTER_*`, and `GEMINI_*` environment configuration remains only as a bootstrap fallback. Once a managed configuration is activated, runtime provider-key environment variables are ignored.

## Architecture

### Server-only modules

`lib/ai/secrets.ts` owns AES-256-GCM encryption and decryption. Ciphertext records contain a random IV, authentication tag, encrypted payload, encryption version, and key identifier. Decryption binds authenticated additional data to the secret ID and provider ID, so a ciphertext cannot be moved to another provider record and decrypted successfully.

`lib/ai/runtime-config.ts` owns the private Firestore configuration schema, supported provider/model registry, read validation, masked projections, and active-route resolution. It receives Firebase Admin dependencies only and is not imported by client components.

`lib/api/admin-auth.ts` owns server-side administrator verification. It verifies Firebase ID tokens with revocation checking and checks the decoded, normalized email against `config/admins.emails`. Secret and routing mutations record the decoded actor identity in audit records.

### Private documents

```
_ai_runtime/config
_ai_secrets/{secretId}
_ai_audit/{eventId}
```

`_ai_runtime/config` stores a monotonically increasing `revision`, `source` (`bootstrap` or `managed`), a global enabled state, and per-feature routing. Each feature uses one of `disabled`, `local-only`, `single`, or `fallback-chain`; its ordered route entries reference a provider ID, supported model ID, and active secret IDs.

`_ai_secrets/{secretId}` stores only encrypted key material plus provider ID, suffix, state (`staged`, `active`, `retiring`, or `disabled`), timestamps, and actor metadata. The ciphertext itself is never returned by an API.

`_ai_audit/{eventId}` records actor UID/email, action, resource ID, safe before/after metadata, and timestamp. It excludes plaintext, ciphertext, IVs, tags, and request bodies.

Firestore rules explicitly deny client reads and writes to all `_ai_*` paths. Firebase Admin remains the only intended reader/writer.

### Admin API and UI

`/api/admin/ai` supplies masked read projections and validated mutations. It has distinct operations for upserting a key, changing routing, activating/retiring a key, and retrieving status. A submitted secret is write-only and is never echoed back. Mutations require an expected configuration revision to prevent silent concurrent overwrites.

`/admin/ai` provides a compact control plane for the existing email-allowlisted admins. It lets them configure a provider/model chain for each feature and submit or rotate keys. It makes a managed configuration active only after the referenced active keys and supported models validate structurally. It does not perform remote provider health checks or send student data during administration.

### Runtime resolution

The existing AI manager delegates provider selection to the resolver. Before managed activation, it preserves the present environment-driven routes. After activation, it loads the private configuration and selects active encrypted keys only. It decrypts the selected key in server memory immediately before constructing a provider client.

The resolver returns provider/model metadata for accurate API logging. It does not log secrets, prompts, documents, raw provider exceptions, IVs, tags, or ciphertext.

### Cache and fallback behavior

Managed configuration revision becomes part of the insights and forecast cache signatures. A routing/model/prompt change therefore produces a cache miss without changing the mobile API contract.

Insights retain their saved stale-result behavior. What-if retains deterministic local fallback. Forecast uses its deterministic numerical projection and a safe local trend label if generation is unavailable. OCR fails with its compatible error response when no configured multimodal provider is available.

Key selection tries only configured entries. Retry/fallback is restricted to retryable failures such as rate limiting or transient provider availability failures; invalid credentials and malformed requests do not trigger uncontrolled cascades.

## Bootstrap and migration

1. An operator generates and sets `AI_SECRETS_MASTER_KEY` in the existing deployment environment.
2. The deployment exposes the admin AI control plane while current provider environment variables continue to power production.
3. An administrator adds encrypted provider keys and configures valid routes through `/admin/ai`.
4. Activating the managed configuration atomically changes `source` to `managed`.
5. Subsequent AI requests ignore provider-key environment variables. Existing values may be removed later from the hosting dashboard, but removal is not required for route correctness.

If the master key is absent after managed activation, AI generation fails closed or uses the already-defined local/stale behavior. It must not fall back to old environment provider keys.

## Testing

- Unit-test AES-256-GCM round trips, tamper detection, wrong-secret/provider binding failure, invalid root-key configuration, and key masking.
- Unit-test runtime schema validation, provider/model allowlists, managed activation, bootstrap fallback, disabled routes, and cache-revision inputs.
- Route-test admin authorization, revoked token handling, write-only key responses, ciphertext exclusion, revision conflicts, and audit entries.
- Route-test AI routes for managed provider selection, retry classification, local/stale fallback behavior, and sanitized errors.
- Add mobile contract fixtures covering the current AI/OCR request payloads, response fields, statuses, and rate-limit headers.
- Add Firestore emulator or rule-focused tests proving `_ai_*` records cannot be read or written by browser credentials.

## Out of scope

- Arbitrary external provider URLs or automatic provider model discovery.
- Secret Manager, Cloud KMS, external health-check services, or paid monitoring.
- Automatic external provider-key revocation.
- Changes to the mobile app or required mobile API contracts.
