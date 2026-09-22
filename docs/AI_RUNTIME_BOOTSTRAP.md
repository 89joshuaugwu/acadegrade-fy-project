# Managed AI Runtime

The managed runtime lets administrators change approved providers, models,
routing modes, and provider keys without changing source code or regular
deployment environment variables.

## One-time bootstrap

Set `AI_CONFIG_MASTER_KEY` once in the server deployment. It must be a unique,
high-entropy 32-byte base64 value. It encrypts provider credentials before they
are written to the private `_ai_secrets` collection. Never expose it to the
browser, commit it to the repository, or place it in Firebase client config.

Environment provider keys remain only as a bootstrap fallback until a managed
routing revision is saved and activated.

## Operator workflow

1. Open **Admin > AI Operations**.
2. Add or rotate a provider key. The server encrypts it; the page never
   reloads plaintext, ciphertext, or a pre-filled credential.
3. Choose the mode, approved model, and active credential for each feature.
4. Select **Save and activate routing**. The server rejects a route whose
   credential is missing, inactive, or belongs to a different provider.
5. To temporarily stop a provider, use the emergency disable procedure below.

## Emergency disable

Disable the provider credential or set the affected feature to **Disabled**,
then save the new routing revision.

## Rotation and recovery

Saving a new value for a provider's credential ID replaces its encrypted value.
Keep the previous value only in your approved secret-management system until
the rotation is verified. A routing save uses an expected revision; if another
operator saves first, reload the page and review their revision before retrying.

## Security boundaries

Do not store provider keys in config/settings. That document is public for
application settings. Managed routing, encrypted provider credentials, and
audit records live in private Firestore collections denied to client SDK
callers. The server returns masked metadata only and never returns plaintext
credentials, ciphertext, encryption context, or provider request bodies.

Use the fixed provider/model registry. Do not add arbitrary provider base URLs:
that would allow unreviewed destinations to receive student records or result
documents.
