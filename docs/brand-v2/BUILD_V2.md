# Brand v2 build guide (for every agent rebuilding a public page)

The owner rejected the "result slip / stationery" look (docs/public-redesign/01–03 visuals are DEAD). The new look is "Gold hour" (docs/brand-v2/DESIGN.md). The finished home page is the reference: `app/(public)/page.tsx` + `components/site/home/*`. Look at it in the browser before you start: http://localhost:3000/ (a dev server is already running; do not start another and do not stop it).

## 1. Analyse first, then build

For each page you own, before writing code:
1. Read the current page source and every component it renders. List every behaviour that must survive: data reads (Firestore, APIs, `config/*`), kill switches, redirects, forms and their validation, client state, URL parameters, metadata, JSON-LD, noindex, tests that cover it.
2. Read its plan in `docs/public-redesign/pages/<page>.md` for **content and behaviour only** (copy, facts, sample numbers that add up, states, SEO). Ignore every visual instruction in those plans (slips, stripes, perforations, paper, "no gradients" etc.).
3. Screenshot the current page at 1440 and 390 (see §6) so you know what you are replacing.
4. Write a short plan for the page in your head: hero (always the dark `PageHero`), then 3–6 sections alternating tones, then the gold `ClosingBand` where a page sells something.

## 2. The kit (use it; do not invent parallel styles)

`components/site/ui.tsx` (server-safe):
- `Container` (`narrow` for reading pages), `Section tone="white|haze|night|gold"` (`tight` for less space), `Heading` (`size xl|lg|md`, `lead`, `onDark`, `as`).
- `PageHero` (dark hero: `title`, `sentence`, `actions`, optional `aside` visual, `trail`): every inner page starts with it.
- `ButtonLink` / `buttonClass(variant, size, block)`: variants `gold` (main action on dark), `night` (main action on light/gold), `violet`, `ghostOnDark`, `ghostOnLight`. Use `<button className={buttonClass('gold')}>` for form submits.
- `TextLinkV2`, `Panel` (rounded-[32px] block), `Chip`, `CheckList`, `Trail`, `FaqList` (+ `faqPageJsonLd` from `components/public/Accordion` for JSON-LD), `ClosingBand`, `PhoneFrame` (flat phone for HTML app screens), `CheckIcon`.
- `components/site/Photo.tsx`: the owner's colour images via `photoFor(slot)` from `lib/public/page-photos.ts` (AVIF/WebP, `sizes` REQUIRED and accurate). Slots with images: `scanner.hero`, `academind.free`, `timetable.reminders`, `about.intro`, `support.fixes`, `auth.login`, `auth.register`, `auth.forgot`, `notfound`, `home.*`. Others return null: design without a photo there.
- `components/site/ArcGauge.tsx`: the logo arc as a CGPA gauge (use on calculator/tools results).
- CSS helpers in `components/site/site.css` (already loaded by the layout): `ag-display` (Bricolage display face, tight tracking), `ag-num` (tabular numbers), `ag-focus` (focus ring), `ag-rise`/`ag-rise-2..4` (load entrance; hero only), `ag-hero-sky` (night gradient), `ag-key` (A–F grade pill radio), `ag-faq`.
- Tailwind 4 colour/font utilities: `bg-ag-night`, `bg-ag-night-2`, `text-ag-violet`, `bg-ag-gold`, `bg-ag-haze`, `text-ag-ink`, `text-ag-mist`, `text-ag-mist-night`, `text-ag-violet-soft`; fonts via `ag-display` class (or `font-[family-name:var(--font-ag-display)]`). Body text font comes from the `.ag-site` wrapper: wrap your page's root in `<div className="ag-site">`.
- The layout already renders the new `SiteHeader`, `SiteFooter` and cookie card for normal pages; auth (`/login`, `/register`, `/forgot-password`) and minimal (`/share/*`, `/c/*`) pages render without them and bring their own shell (see §5).

## 3. Visual rules

- **Palette:** Night `#0E0B2B` (dark grounds), Violet `#6B4EFF` (brand, links on light), Gold `#FFB23F` (main action on dark, First Class, highlights), Haze `#F4F1FF` (light alternate ground), Ink `#17133A` (text), Mist `#6E6A8E` (secondary).
- **Type:** Bricolage Grotesque (`ag-display`) bold for headings and big numbers. Geist Sans for everything else (16–19px body, line-height relaxed). Headings in sentence case, no all-caps labels, no eyebrow text above headings, no "→" on buttons, no middle-dot meta strings.
- **Layout:** `max-w-[1240px]`, generous vertical space (`py-24 sm:py-32`), alternate section tones (night hero → white → haze → white → gold close). Use real product UI built in HTML (cards with real example numbers) as the main imagery on product pages, plus the owner's photos where a slot exists.
- **Radius by hierarchy:** 32px panels, 20–24px cards, 12px buttons/inputs, full pills only for chips and grade keys.
- **Shadows:** soft coloured shadows only on things floating over photos or the hero card.
- **Forms:** inputs `rounded-xl bg-white ring-1 ring-ag-ink/15 focus:ring-2 focus:ring-ag-violet px-4 py-3`, labels above (`text-[0.875rem] font-medium`), errors in `text-[#C2361F]` with an icon or word, never colour alone. On dark: `bg-white/5 ring-white/15 text-white`.
- **Motion:** one entrance on the hero (`ag-rise`), feedback on interaction. No fade-up on every section. Respect `prefers-reduced-motion`.
- **Mobile first:** at 390px nothing overflows horizontally (`grid-cols-[minmax(0,1fr)]` on grids that contain wide things, `min-w-0` on flex children, `truncate` where needed); touch targets ≥ 36–44px; one column.
- **Copy:** plain, specific, Nigerian-student vocabulary. Never invent testimonials, counts or endorsements. No "coming soon", "beta" or developer wording. AcadeMind is the assistant name; the timetable builder is never called AI.

## 4. Keep everything that works

- Every route, URL parameter, redirect, kill switch, data read, form flow, consent, metadata, canonical, JSON-LD and noindex stays.
- **Logic modules stay and are reused:** `lib/public/*`, `components/public/tools/calculator-model.ts`, `calculator-url.ts`, `app/(public)/tools/tool-math.ts`, `lib/cgpa/academicRules.ts`, auth hooks, `lib/legal/*`, share PIN logic, etc. You are replacing the presentation layer, not the logic.
- Old presentation components (`components/public/*` stationery: `Slip`, `Stripe`, `edges`, `Perforation`, `ChoiceKeys`, `Field`, page CSS files like `product.css`, `tools.css`, `company.css`, `auth.css`, `system.css`, `home.css`) should no longer be used by your pages. Do not delete shared ones (the lead cleans up at the end); you may delete page-specific CSS/components that only your pages used, after confirming with Grep.
- **Tests:** update the tests for your pages to the new markup, keeping every behavioural assertion (flows, calculations, states, metadata, JSON-LD). Never delete a behavioural test to make it pass.

## 5. Shells

- **Normal public pages:** the layout gives header/footer. Your page renders sections only (no `<main>`), wrapped in `<div className="ag-site">`.
- **Auth pages** use `components/public/shells/AuthShell.tsx`, and share/course-code/maintenance/offline/404/iOS use `components/public/shells/MinimalShell.tsx`. The auth lane OWNS both shell files and restyles them to v2 (AuthShell: a split screen, form on a white panel on the left, the slot photo with a night overlay and one reassurance line on the right at ≥1024px; MinimalShell: a slim night top bar with the logo and "Back to AcadeGrade", a quiet footer line). Other lanes must not edit these two files.

## 6. Verify by looking (required)

- **Screenshots:** for each page use the tasteskill inspector as a screenshot tool (it opens its own headless browser, so lanes don't fight over one browser):
  `node C:\Users\joshu\.claude\skills\design-taste-frontend\scripts\inspect.mjs http://localhost:3000/<route> --out .taste-skill/v2/<name>`
  Then open `desktop-fold.jpg`, `desktop-page-01.jpg`… and `mobile-fold.jpg`, `mobile-page-01.jpg`… with the Read tool and LOOK at them.
- **Its house-rule FAILs about gradients, shadows, glass, radius, eyebrows etc. do NOT apply to v2. Ignore them.** DO act on: horizontal overflow, covered text, headline line counts over 3, tiny text (<13px), contrast, and anything that looks broken, cramped, misaligned, empty or inconsistent with the home page.
- **Iterate:** fix, re-screenshot, until each page looks as finished as the home page at 1440 and 390.
- **Do not use the Playwright MCP browser** (the lead uses it).

## 7. Hard rules

- **Tests:** the owner's PC is slow. Run only the test files you touch (`npx.cmd vitest run <files>`), one `npx.cmd tsc --noEmit` at the end. Never the full suite.
- **No git commits, deploys, or live Firestore writes.** Never print secrets.
- **Encoding:** never pipe source files through PowerShell `Get-Content -Raw | Set-Content` (encoding corruption). Use the Edit/Write tools. Use `-LiteralPath` for paths with `[brackets]` or `(parens)`.
- **Ownership:** edit only the pages and folders listed in your brief, plus new files under `components/site/<your-lane>/`. If you need a change in `components/site/ui.tsx`, add a NEW component in your own lane folder instead and tell the lead.
- **Report:** pages done, files changed or deleted, tests and their results, screenshots you reviewed (paths), anything you could not finish, and owner items.
