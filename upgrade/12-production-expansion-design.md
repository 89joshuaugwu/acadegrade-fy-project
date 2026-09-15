# Production Expansion Design

This document extends the core redesign into the production systems requested after the original upgrade plan: transactional email, controlled advertising, versioned onboarding, public discovery/SEO, and future provider administration. Student-record encryption is explicitly deferred; this work must not rewrite existing student documents.

## Release Boundary

The release may change web presentation and server internals. It must not change the contract already consumed by the shipped mobile application.

### Mobile compatibility lock

The mobile application currently calls these routes through `EXPO_PUBLIC_API_BASE_URL`:

| Route | Method | Compatibility requirement |
|---|---:|---|
| `/api/about` | GET | Preserve current public response fields. |
| `/api/ai/forecast` | POST | Preserve `piHistory`, `cgpaHistory`, `forceRegenerate` input and forecast response fields. |
| `/api/ai/insights` | POST | Preserve `forceRegenerate`, `semesterData`, optional `academicContext` and the four response sections. |
| `/api/ai/whatif` | POST | Preserve all five numeric inputs and the three response fields. |
| `/api/auth/otp/send` | POST | Preserve `{ email, type }`, success/error status semantics, cooldown fields, and unauthenticated access. |
| `/api/auth/otp/verify` | POST | Preserve `{ email, code, type }` and `{ success }`; additional web-only registration ticket fields remain additive. |
| `/api/auth/password/reset` | POST | Preserve reset request and response behavior. |
| `/api/notifications/send` | POST | Preserve bearer auth, payload fields, and `{ success, message }`. |
| `/api/results/extract` | POST | Preserve `{ base64Data, mimeType }`, bearer auth, rate-limit headers, and `{ courses }`. |
| `/api/transcript/generate` | POST | Preserve `{ showPhoto }` and binary PDF response. |
| `/api/transcript/share` | POST | Preserve `{ showPhoto }` and `{ shareId, shareUrl }`. |
| `/api/user/delete-account` | POST | Preserve bearer auth and `{ success }`. |

Rules:

- Do not rename or remove paths, methods, request fields, response fields, HTTP statuses, `Retry-After`, or `retryAfterSeconds` behavior.
- Provider/model/email changes happen behind these handlers.
- New response fields must be optional and additive. A breaking contract requires a new `/api/v2/...` route and a separately scheduled mobile migration.
- Ads are web-only in this release. The mobile app receives no ad payload and needs no change.
- Add contract fixtures for each mobile route before changing its implementation.

## Brand and Experience Direction

AcadeGrade should feel like an academic observatory: precise, encouraging, and legible. Use the Degree Meridian, record-ledger patterns, and quiet calibrated motion. Avoid generic glass panels, giant empty cards, decorative 3D scenes, random particles, and controls that appear available before their backend exists.

Public pages must explain three concrete product advantages:

1. One trustworthy semester-by-semester academic record.
2. OCR result scanning that replaces repetitive manual entry but always includes review before saving.
3. AI insights and what-if planning presented as guidance, not an official university decision.

## Transactional Email

Create one email family rather than isolated HTML strings. Every message includes a hidden preheader, logo/wordmark fallback, concise purpose, accessible primary action, fallback URL, support footer, and plain-text equivalent. Templates must render at 320px and remain readable with remote images blocked and in email-client dark mode.

Required templates: registration OTP, password-reset OTP, welcome, semester saved, degree-class update, admin new-user notice, and security/account notice. OTP messages place the code as selectable text and use a same-site `copy-code#code=...` helper so the secret is not sent in a query string or server log.

Site origin and support address come from server-only configuration with safe production fallbacks. SMTP failures must propagate to the route; no false success response is allowed.

## Advertising Control Plane

Advertising is opt-in at the product level and off by default. The data model is additive to legacy `advertBanners`:

- global enabled switch;
- named placements;
- campaign id, title, image or compact native creative, destination URL;
- active state and start/end schedule;
- positive delivery weight;
- per-user/session frequency cap;
- delivery mode (`house` initially; third-party and rewarded remain unavailable flags);
- audit timestamps and updater identity where the existing admin API can supply them.

Eligibility is determined server-side or by a shared deterministic selector. If configuration is missing, invalid, disabled, outside its schedule, or frequency-capped, the placement renders nothing and leaves no blank shell.

No ad may interrupt authentication, registration, a save, a destructive confirmation, or an error-recovery action. OCR and AI rewarded gates are deferred until there is a documented free quota, consent policy, network SDK, and mobile implementation. This release may use restrained house campaigns on low-risk web surfaces only.

## Versioned Onboarding

Tours are short, contextual, and replayable. Store a version per tour instead of a permanent boolean so a materially changed interface can introduce only the new guidance. Preserve legacy booleans as migration input.

Initial tours:

- Dashboard orientation: standing, metric switch, latest updates, navigation.
- Results workflow: create semester, add/review courses, OCR import, import/export code, save.
- Insights: written analysis, forecast, what-if and the guidance disclaimer.
- Transcript: preview, privacy/photo choice, PDF, share expiry.
- Admin: overview, user/course operations, settings, ads.

Missing targets are skipped, not spotlighted as empty space. Focus stays inside the tour card, Escape/Skip works, focus returns to the launcher, and reduced-motion mode removes scrolling/spring effects. Completion failure must not trap the user.

## Public Pages and SEO

Public navigation remains lean: Product/Features, Calculator, About, Support, Sign in, Get started. Add focused pages for features, result scanner, AI insights, support, privacy, and terms. Auth, student, admin, utility copy-code, and private share states must not be indexed.

Use one site-origin helper for canonical URLs, sitemap, Open Graph, email links, and generated share URLs. Root metadata must describe the production product, not a school project or individual developer. Add Organization, WebSite, SoftwareApplication, and FAQ structured data only where the visible page supports the claim. Sitemap includes canonical public routes only.

## Provider Administration (Prepared, Not Required for This Release)

Future `/admin/integrations` configuration may manage provider/model routing, feature assignment, health, and non-secret metadata. API keys, SMTP passwords, Firebase Admin credentials, signing keys, and root-of-trust values must never be stored as readable Firestore fields or returned to the browser. Use a managed secret store and retain only secret references and masked metadata in Firestore.

This phase does not require that cloud integration and must not replace working environment variables prematurely. Current routes should be wrapped behind server-only provider resolvers later while retaining the mobile compatibility lock above.

## Data Safety

Do not encrypt existing student fields at the application layer in this release. It would break queries, migrations, admin views, mobile reads, and recovery unless a full key-management design existed. Continue relying on Firebase transport/at-rest protection while separately improving rules, least privilege, App Check, logging, and exports. No bulk migration or production write is authorized by this UI release.

## Release Gates

- Mobile contract tests pass for every listed route.
- Registration email and Google journeys still finalize exactly once and incomplete profiles cannot enter the dashboard.
- Ads default to no render and never block a primary task.
- Email previews cover narrow/mobile and images-off fallbacks; SMTP errors remain errors.
- Public canonical/noindex/sitemap behavior is tested.
- Tours can skip, finish, replay, survive missing targets, and honor reduced motion.
- Typecheck, lint, focused unit tests, production build, and responsive light/dark visual review pass.
