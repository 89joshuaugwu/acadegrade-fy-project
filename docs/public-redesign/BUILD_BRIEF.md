# Build brief for the public redesign (read before writing any code)

The owner approved building everything in this folder and all owner decisions (17 Nov 2026). This brief is binding for every build agent.

## 1. Sources of truth (read in this order)

`../../PRODUCT.md` → `README.md` → `01` → `02` → `03` → `04` → `05-owner-decisions.md` → your page plans in `pages/`.

## 2. Owner decisions, resolved

- Every **bold** recommendation in `05-owner-decisions.md` is approved.
- **Coins:** leave as is (admin toggle). Pages hide coin content while coins are off.
- **AI consent wording:** keep it word for word (legal text).
- **Labels:** the proposed wording in the plans is approved ("Below a Pass", the spill-over definition, "about two minutes", Android 7.0 minimum, "open the app at least once every two weeks", "Help and support" everywhere, "AcadeMind" as the support category, tool order as planned).
- **Founder letter:** use the drafted wording, with **no portrait** for now (keep a slot that appears only when `config/about.founderPhotoUrl` exists).
- **Screens and video not supplied yet:**
  - Build every interface fragment in HTML (`UiFrame`) from the real student components with the example student's data. No screenshots and no placeholders.
  - The showcase uses the slow photograph drift instead of video; video support is wired but only renders when `config/about.scanVideoUrl` exists.
- **Contact route:** build the public request form (`POST /api/support/public`), rate limited, so a locked-out student always has a route even with no contact email set.
- **Privacy notice:** update `lib/legal/builtin.ts` with the corrected facts and write the same text as a ready-to-publish draft in `docs/public-redesign/privacy-notice-v2.md`. Do not publish to Firestore; the owner presses Publish in Admin → Legal documents.
- **Live settings:** no live admin settings or Firestore data are changed by any agent.

## 3. Ownership (only edit what you own; read anything)

| Lane | Owns |
|---|---|
| **Foundation** | `app/(public)/layout.tsx`, `app/(public)/public.css`, `components/public/**` (all shared components and shells), `lib/public/{scales,credits,example-student,proof,usage-public,home-data-types}.ts`, `app/layout.tsx` font changes, `next.config.ts`, `public/brand/**` (logo SVGs), `public/manifest.json`, `app/sitemap.ts` + `lib/seo/site.ts`, `app/robots.ts`, `app/opengraph-image.tsx` and `lib/public/og.tsx` |
| **Imagery** | `public/images/**`, `lib/public/credits-data.ts`, `docs/public-redesign/credits.md` |
| **Server fixes** | `app/api/**` (except routes a page lane is told to own), `lib/user/account-deletion.ts`, `lib/cron/**`, `lib/legal/builtin.ts`, `docs/public-redesign/privacy-notice-v2.md`, `firestore.rules` + rules tests, `firestore.indexes.json`, `lib/settings-schema.ts` / settings server, admin components for new fields (`components/admin/**`), `public_testimonials` admin screen and API, `app/(public)/tools/tool-math.ts` rounding |
| **Home** | `app/(public)/page.tsx`, `components/public/home/**`, `lib/public/home.ts` |
| **Product** | `app/(public)/features/**`, `app/(public)/app/**` (new `/app` page), `app/app/download/**`, `components/public/product/**`, `lib/public/features-*.ts` |
| **Tools** | `app/(public)/calculator/**`, `app/(public)/tools/**` (except `tool-math.ts` rounding, owned by server fixes; coordinate by reading it), `components/public/tools/**` |
| **Company** | `app/(public)/{about,support,privacy,terms,account-deletion}/**`, `components/public/company/**`, `components/marketing/LegalPage.tsx`, `LegalContact.tsx` |
| **Auth** | `app/(public)/{login,register,forgot-password}/**`, `components/auth/**`, `components/public/auth/**`, `lib/public/auth-copy.ts` |
| **System** | `app/(public)/share/**`, `app/(public)/c/**`, `app/maintenance/**`, `app/offline/**`, `app/not-found.tsx`, `components/public/system/**` (the minimal shell lives in Foundation; System may extend it in its own folder) |

Additional rules:

- Shared components needed by a page lane but missing from Foundation are added inside the lane's own `components/public/<lane>/` folder. Report them so Foundation can absorb them later.
- Never edit another lane's files. If you need a change there, describe it in your final report.

## 4. Hard rules

- **Stack:** Next.js 16, React 19, Tailwind 4. Marketing sections are server components; client islands only where interactive.
- **No new dependencies** except where a plan names one. `motion` v12 is installed. Fonts come through `next/font/google` (Hanken Grotesk 400 and 500).
- **Style:** tokens only (`--pg-*`), five type steps, square corners, no gradients, no shadows at rest, no glass, no monospace, no eyebrows or pill badges, no icon-topped cards, no 01/02/03 numbering. Tabular figures for numbers.
- **Keep behaviour:** every existing behaviour, link, data source, kill switch and redirect listed in the page plan is kept. Existing URLs keep working.
- **Testing:**
  - Test first for logic (the sample numbers in each plan are pinned by unit tests against `lib/cgpa/academicRules.ts`).
  - The owner's PC is slow, so run only the test files you touch: `npx.cmd vitest run <file>`.
  - Run one `npx.cmd tsc --noEmit` at the very end. Never run the full suite (the lead does).
  - Update existing tests whose strings or labels changed on purpose; never delete a test to make it pass.
- **Files:**
  - Encoding: never pipe source through PowerShell `Get-Content -Raw | Set-Content`; use the Edit or Write tools. Use `-LiteralPath` for `[brackets]` and `(parens)` in paths.
  - No git commits or pushes, no deploys, no EAS builds, no live Firestore writes.
- **Gate:** before reporting, run `node C:\Users\joshu\.claude\skills\design-taste-frontend\scripts\lint.mjs <your changed files>` and fix every finding. The lead runs `inspect.mjs` on the production build afterwards.

## 5. Report format

- Files created and changed.
- Tests added or updated, with pass counts.
- Deviations from the plan, with reasons.
- Anything you need from another lane.
- Owner items still open.
