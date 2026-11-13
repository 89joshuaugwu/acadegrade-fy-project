# Admin information architecture and help-content spec

Date: 2026-11-13
Status: proposal for implementation.

## Scope

**In scope:**
- the web admin dashboard (`app/(admin)/admin/*`)
- the authenticated student web pages (`app/(student)/*`)
- the Android app (`acadegrade-mobile/app/**`)

**Out of scope:** iOS. It is mentioned only where an iOS setting appears in the admin.

**How this was written:**
- It comes from reading the working tree on 2026-11-13. Several files were mid-edit by other agents (coin wallet, ad diagnostics, Results ad placement), and each in-flight item is marked **(in flight)**.
- No code was run. Statements about what code does come from reading it.
- Statements about device behaviour (Part 5) are code-read estimates and need a device check.

**Rule for every proposal:** reorganise the UI over the same storage. Part 3.6 lists the few places where behaviour (not storage) should change, and Part 3.7 lists what installed Android APKs depend on and must not change.

---

## Part 1. Admin settings inventory

**Shared plumbing:**
- **Admin access.** Firestore `config/admins.emails` (a lowercase email list). Every `/api/admin/*` route checks it, and the browser checks it via `POST /api/admin/verify`. It cannot be edited in the UI.
- **Navigation.**
  - Labels come from `lib/ui/route-meta.ts`; groups come from `components/layout/AdminShell.tsx`.
  - **Platform:** Overview, Users, Course catalogue, Academic catalog.
  - **Monitoring:** Analytics, API monitor, AI Operations, Feature credits.
  - **Delivery & settings:** Advertising, Android release, Settings.
- **Headers.** Only Advertising and AI Operations use the shared `PageHeader` (`components/shared/PageHeader.tsx`). Every other page writes its own `<h1>`.

### 1.1 Overview (`/admin/dashboard`, H1 "Admin Dashboard")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Total Users, Avg CGPA, Avg PI, Active This Week | KPI tiles. "Active" means created **or** last login within 7 days. | `GET /api/admin/stats`, which reads every `users` doc and each user's completed `semesters` | admin only | — |
| CGPA Distribution | Students in 0.5-point CGPA bands | same | admin | — |
| New Signups | Registrations over the last 30 days | same | admin | — |
| Department Breakdown | Top 10 departments: user count and average CGPA | same | admin | — |
| **Reset All Onboarding (Test)** (red button) | Runs in the browser. Loops over **every** `users/{uid}` and sets `tourCompleted=false` and `resultsTourCompleted=false`. | `users/*` | web tours (legacy flags only) | No confirmation |

### 1.2 Users (`/admin/users`, H1 "User Management")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Search | Client-side filter by name, matric or email | — | — | empty |
| Row expand | Shows Email, Matric, Semesters and Joined | `GET /api/admin/users` (reads all users and every `semesters` subcollection) | admin | collapsed |
| Disable Account / Enable Account | Sets Firebase Auth `disabled`, and `users/{uid}.disabled` | Firebase Auth plus `users/{uid}.disabled` | sign-in on web **and** Android (Auth-level) | `false`; **no confirmation** |
| Copy email | Copies to the clipboard | — | — | — |

### 1.3 Course catalogue (`/admin/courses`, nav "Course catalogue", H1 "Course Catalog")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Search | Filter by code, title or department | — | — | — |
| Add Course (styled **danger/red**), Edit (modal) | Fields: Course Code (upper-cased), Credit Units, Course Title, Department, Level, Semester | `courseCatalog/{autoId}` via `/api/admin/courses` | **None.** No web or Android code reads `courseCatalog`. | empty |
| Delete (inline Yes/No) | Deletes the document | same | none | — |

### 1.4 Academic catalogue (`/admin/academic-catalog`, nav and H1 "Academic catalog")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Kind tabs | University, Department, Programme | — | — | University |
| Search; Active/Archived filter | Filter the list | — | — | Active |
| Add / Edit entry | Name must be 2–180 characters with no markup; duplicates are rejected after normalisation | `config/academicCatalog` `{revision, entries[{id,kind,name,status,source}]}`, versioned by revision | `GET /api/academic-catalog` (public). Used by web register and **Android register** (which falls back to a bundled list offline). | Built-in lists (`NIGERIAN_UNIVERSITIES`, `ACADEMIC_DEPARTMENTS`, `ACADEMIC_PROGRAMMES`) as revision 1 |
| Archive / Restore | Archive hides the entry from sign-up. Archive asks for confirmation. | same | same | active |
| Pending suggestions: Approve / Reject | Approve adds the student's suggestion to the catalogue | `_academic_catalog_suggestions` (status `pending` → `approved`/`rejected`) plus `config/academicCatalog` | students suggest via `POST /api/academic-catalog/suggestions` (web and Android) | — |

### 1.5 Analytics (`/admin/analytics`, nav "Analytics", H1 "Platform Analytics")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| CGPA Distribution | Histogram with reference lines at 4.5, 3.5, 2.4 and 1.5 | `GET /api/admin/stats` (the **same** full scan as Overview) | admin | — |
| Platform Metric Averages | Average CGPA and average PI | same | admin | — |
| Degree Class Distribution | Pie chart | same | admin | — |
| Department Leaderboard | Departments ranked | same | admin | — |
| Export CSV | Downloads `Department,Users,Avg CGPA` | client | admin | — |

### 1.6 API monitor (`/admin/api-analytics`, nav "API monitor", H1 "API Analytics")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Range select | Last 24h, Last 7 Days, Last 30 Days | `GET /api/admin/api-analytics?range=` reading `api_logs` | admin | Last 7 Days |
| Auto-refresh toggle | Re-fetches every 30 s | — | — | off |
| Refresh | Re-fetches now | — | — | — |
| Tiles: Total API Calls, Error Rate, Avg Response Time, Failed Calls | Request health | `api_logs` | admin | — |
| Usage Timeline; By Category; AI Provider Distribution; Top Endpoints; Top API Consumers (shows user identity); Recent Errors | Breakdowns | `api_logs` plus `users/{uid}` lookups | admin | — |

### 1.7 AI Operations (`/admin/ai`, H1 "AI Operations", eyebrow "Provider control plane")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Status line | "Managed revision N", or "Bootstrap mode: saving activates managed routing" | `_ai_runtime/config.source` and `.revision` | server | Bootstrap. **In bootstrap mode every AI call fails with "AI routing is not configured"** (`lib/ai/manager.ts`). |
| Route card per feature, labelled "Academic insights", "Forecast", "What-if planner" and "Result extraction (OCR)" | Execution mode: Disabled, Local calculation only (What-if only), Single provider, or Ordered fallback list | `_ai_runtime/config.routes.{insights,forecast,whatif,extract}` (revisioned, optimistic concurrency) | server AI routes used by **web and Android** | Disabled (no saved route) |
| Per target: Provider, Model, Credential | Chooses who answers, in priority order. Move up/down, Remove, "Add fallback target" (max 12). | same | server | — |
| "Use saved connection priorities" | Rebuilds the chain from active keys in a fixed provider order | draft only | — | — |
| Save models and routing | Validates that each model is in the catalogue and each credential is active, then saves a new revision | `_ai_runtime/config` | server | — |
| Model catalog (per provider) | Add or remove model IDs, max 20 per provider | `_ai_runtime/config.providerModels` (saved with routing) | server | — |
| Saved connections: Disable / Activate | Flips key state **immediately**, without checking routes that use the key | `_ai_secrets/{secretId}.state` | server | — |
| Add or rotate a connection | Fields: Connection label, Key slot (an existing slot rotates its key), Gemini role (OCR or Fallback), Model ID, API key (encrypted, never shown again), Priority 1–12 | `_ai_secrets/{provider-slot}`; audit in `_ai_audit` | server | — |

**Related setting in another page:** Settings → "AI System Prompt" (`config/settings.aiSystemPrompt`, max 30 000 characters). It is used only by Written Analysis (`app/api/ai/insights`).

### 1.8 Feature allowances (`/admin/usage`, nav "Feature credits", H1 "Feature allowances")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Written Analysis daily limit | Free requests per user per 24-hour fixed window, which starts at the first request. 0 pauses free requests. | `config/usage.dailyLimits.insights` | server `/api/ai/insights`; summary `GET /api/ai/usage` (web and Android) | 3 (burst 2/hour; 12-hour refresh cooldown) |
| Forecast daily limit | same | `.dailyLimits.forecast` | `/api/ai/forecast` | 8 (burst 2/hour; 1-hour cache) |
| What-if guidance daily limit | same | `.dailyLimits.whatif` | `/api/ai/whatif` | 20 (burst 3 per 5 minutes) |
| Result scanning daily limit | same | `.dailyLimits.ocr` | `/api/results/extract` | 20 (burst 5 per 15 minutes) |
| Save allowances | Writes `{dailyLimits}`. The coin section is kept if it is omitted. | `PUT /api/admin/usage` | — | — |
| Card "Rewarded extras are separate" | Static copy: Written Analysis rewards are at most 2 per UTC day; the other reward paths are "pending". **Stale once coins ship.** | — | — | — |
| **(in flight) Coins (Android rewarded ads):** master switch | Turns earning and spending of coins on or off | `config/usage.coins.enabled` | server wallet (`lib/ads/reward/coins.ts`) and Android `CoinSpendPanel` | `false` |
| (in flight) Coins per ad | Coins credited per verified ad | `.coins.coinsPerAd` (range 1–10) | server | 2 |
| (in flight) Daily earn cap | Most coins earnable per UTC day | `.coins.dailyEarnCap` (0–100) | server | 10 |
| (in flight) Balance cap | Most coins a user can hold | `.coins.balanceCap` (1–500) | server | 30 |
| (in flight) Per-feature: enabled, price, daily coin-use cap | Whether coins can pay for the feature, the price per use, and the most coin-paid uses per UTC day | `.coins.features.{insights,forecast,whatif,ocr}` | server | Written Analysis 2 coins (cap 2); Forecast 1 (cap 5); What-if 1 (cap 10); Scanning 3 (cap 5); all enabled |

> **(in flight) Mismatch:** `GET /api/admin/usage` now returns `{policy, source, fallbacks}`, but `app/(admin)/admin/usage/page.tsx` still parses the whole response as a policy. The page will show a load error until the in-flight edit lands.

### 1.9 Advertising (`/admin/ads`, H1 "Advertising")

The page has three platform tabs: **Web**, **Android** and **iOS**. The Web tab has three sub-tabs: My promotions, Delivery status and Ad networks. Every section has its own save.

#### 1.9.1 Web → My promotions → house campaigns

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| "Enable house campaign delivery" | Master switch for website house campaigns | `config/settings.adsConfig.enabled` | web `AdPlacement` | off |
| "House / internal" mode switch | A second gate: house campaigns are served only if this is on | `.adsConfig.deliveryModes.house` (rewarded and thirdParty are forced `false`) | web | on |
| Placements: Dashboard overview, Results overview | Enable each web slot | `.adsConfig.placements[]` | web Dashboard; web Results **(in flight: new Results slot)** | Dashboard on, Results off (older configs omit it, which means off) |
| Campaign card: Active switch, Duplicate, Delete (confirm modal; removed from the draft only) | — | `.adsConfig.campaigns[]` (max 24) | web; Android (see 1.9.4) | new campaigns start inactive |
| Campaign fields | Campaign name; Delivery mode (only House is selectable); Placements checkboxes; Headline; Call-to-action label; Supporting copy; Creative image URL (HTTPS); Image alternative text; Destination URL (HTTPS); Starts at; Ends at; Delivery weight 1–100; Max views 1–100 per Hours 1–720 | same | web, Android | weight 1; cap 3 per 24 h |
| Save house campaigns | Strict validation; invalid stored campaigns are reported and dropped on save | `PUT /api/admin/ads` | — | — |

#### 1.9.2 Web → My promotions → "Legacy house banners" (collapsed)

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Add Advert; per banner: Active switch, Image URL (or Upload to Cloudinary preset `acadegrade_avatars`), Target link, Delete (no confirm) | Old image-and-link promotions | `config/settings.advertBanners[]` (max 12) via `POST /api/admin/settings {field:'advertBanners'}` | web Dashboard fallback: 1 view per banner per 6 h, and it **ignores the web master switch**. Also Android fallback when "Include legacy" is on. | none |
| Save Adverts | Saves the whole list | same | — | — |

#### 1.9.3 Web → Delivery status (diagnostics, in flight) and → Ad networks

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Web placement status, "Recheck now", previews | Shows what *should* serve now, and why, from saved settings. It is not proof of delivery. | computed (`lib/ads/diagnostics.ts`) | admin | — |
| Google AdSense: enable, Publisher ID (`ca-pub-` + 16 digits), Slot ID (digits) | AdSense unit on the web Dashboard only | `config/settings.adsProviderConfig.adsense` | web `ProviderPlacement` (Dashboard) | off |
| Adsterra SmartLink: enable, HTTPS URL | Outbound link call-to-action on the web Dashboard | `.adsProviderConfig.adsterra` | web | off |
| Save provider settings | — | `PUT /api/admin/ads/providers` | — | — |

#### 1.9.4 Android tab

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| "Share website house campaigns on Android" | Android opt-in to web campaigns | `config/mobileHouseAds.enabled` | `GET /api/ads/house` → Android `HousePromotion` | off |
| "Include legacy banner fallback" | Uses up to 24 legacy banners when no campaign is eligible | `.includeLegacy` | Android | on |
| House promotions on Dashboard overview / Results overview | Android slots | `.placements.dashboard` / `.results` | Android | Dashboard on, Results off |
| Save Android house promotions | — | `PUT /api/admin/ads/house` | — | — |
| Android house-promotion status (diagnostics) | As on web | computed | admin | — |
| Enable Android ads | AdMob master switch. **It also gates rewarded ads** (`rewardedDelivery()` needs `enabled && rewardedEnabled`). | `config/mobileAds.enabled` | `GET /api/ads/mobile` → Android banners; reward sessions; coin earning | off |
| Use test ads | Google test units. Rewarded uses `ca-app-pub-3940256099942544/5224354917`. | `.testMode` | Android, server | **on** |
| Dashboard overview banner / Results overview banner | Banner slots | `.placements.dashboard` / `.results` | Android | off |
| Dashboard banner ad unit ID; Results banner ad unit ID | Live unit IDs (`ca-app-pub-…/…`), required when live and the slot is on | `.dashboardBannerUnitId`, `.resultsBannerUnitId`; `.bannerUnitId` is kept for old APKs | Android | empty |
| "Enable rewarded Insights refresh" | Rewarded ad switch, labelled as one extra Written Analysis refresh, up to 2 per day | `.rewardedEnabled` | reward sessions (legacy refresh **and** coins) | off |
| Rewarded ad unit ID | Required for live rewarded ads | `.rewardedUnitId` | server, which hands the unit to Android | empty |
| "Saved but no ad?" checklist | Static guidance | — | — | — |
| Save Android ad settings | — | `PUT /api/admin/ads/mobile` | — | — |

**Server-side AdMob requirement (not editable):** the SSV callback URL must be `/api/ads/rewards/ssv`, and the live reward must be amount **1**, item **"Insights refresh"**. That stays true **even for coin sessions**: the server credits `coinsPerAd` and ignores the AdMob amount (`lib/ads/reward/service.ts`).

#### 1.9.5 iOS tab

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| The same editor as Android, minus rewarded: Enable iOS ads, test, placements, unit IDs, "Rewarded ad unit ID (reserved)" | "Configuration only — integration pending" | `config/iosAds` | `GET /api/ads/ios`. No shipped app renders it. | off |

### 1.10 Android release (`/admin/mobile-release`, H1 "Android release notice")

| Control / field | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| Enable notice | Shows the update notice on Android | `config/mobileRelease.enabled` | `GET /api/mobile-release` → Android `UpdateNoticeHost` and `AppUpdatesCard` | off |
| Version (x.y.z); Build number | The published release. The notice shows to builds lower than this. | `.latestVersion`, `.latestBuild` | Android | empty / 0 |
| Minimum supported build | Builds below this **must** update | `.minSupportedBuild` | Android | 0 |
| Headline (≤100 chars), Message (≤400) | Notice text | `.headline`, `.message` | Android | "A new AcadeGrade update is available" / "Download the latest Android app…" |
| Notice image: Upload (PNG/JPEG/WebP ≤5 MB, Cloudinary) / Remove | Artwork | `.imageUrl` | Android | none |
| Download URL (HTTPS) | Where "Download now" goes | `.downloadUrl` | Android | empty |
| Allow users to ignore | If off, every older build must update | `.allowIgnore` | Android | on |
| Preview; Build eligibility simulator ("Installed build") | Shows how a given build will be treated | client only | admin | installed build 14 |
| Save release notice | Asks for confirmation ("Publish mandatory update?") when the change makes the update mandatory | `PUT /api/admin/mobile-release` | — | — |

### 1.11 Settings (`/admin/settings`, nav "Settings", route title "Admin settings", H1 "Platform Settings")

The page is one long column with seven independent saves. Some switches save instantly; other fields need a Save button.

| Section → control | What it does | Stored / source | Consumer | Default |
|---|---|---|---|---|
| **Email delivery** → General email, OTP email: sender email, Gmail App Password, Save, "Verify Gmail login" | SMTP senders. OTP falls back to the General account, then to environment variables. | `_email_secrets/email-general`, `email-otp` (encrypted) via `/api/admin/email` | server mailer (welcome, OTP, semester saved, degree class, admin emails) | environment variables `GMAIL_USER`/`GMAIL_PASS` (and `OTP_*`) |
| **AI System Prompt** → textarea, Save Prompt | Overrides the Written Analysis system prompt | `config/settings.aiSystemPrompt` | `/api/ai/insights` only | empty (built-in prompt) |
| **Grade Scale** → 6 rows (Grade, Min, Max, Points), Reset to Default, Save Scale | Validated to cover 0–100 with no gaps | `config/settings.gradeScale` | **None.** Both calculators use a hard-coded scale (`lib/utils/constants.ts` `GRADE_SCALE`, Android `lib/cgpa/gradeScale.ts`). | A70 / B60 / C50 / D45 / E40 / F0 → 5/4/3/2/1/0 |
| **Announcement Banner** → text, Clear, Publish | Publish saves the text **and sends a broadcast notification** (`/api/notifications/send uid:'all'`) on every click. Clear saves `null` immediately. | `config/settings.announcementBanner` | web `StudentShell` banner (each browser can dismiss it); every user's inbox plus push (skipped if `adminBroadcasts=false`) | none |
| **Maintenance Mode** → "Disable Platform Access" | Copy says "only admins can log in". In reality it is a **client-side redirect** to `/maintenance` on web login, register and student layout. **Android and all APIs ignore it.** Saves instantly. | `config/settings.maintenanceMode` | web only | off |
| → "Disable Sign Ups" | Blocks new accounts | `config/settings.disableSignups` | server `/api/auth/otp/send` and `/api/auth/register/finalize` (web **and** Android); web register page | off |
| → Feature Maintenance: Add Semester, Extract Result Slip, Share / Import Course Code, Edit Profile Settings, Generate AI Insights | Disables those **web buttons only** (`usePlatformSettings`). APIs and Android ignore them. Saves instantly. | `config/settings.disabledFeatures[]` | web Results, Semester, Settings and Insights pages | none |
| **Mobile App Downloads** → Android APK download URL, iOS App Store/TestFlight URL, Save download links | Public download links | `config/settings.mobileAppLinks` | web `MobileAppDownload` (home, sign-in, sign-up); Android Settings "Share AcadeGrade" (reads `iosUrl` directly from Firestore) | Android falls back to the GitHub v1.0.0 APK URL in the page code; iOS empty |
| **About Page Content** → Headline, Platform Description, Mission, Trust and privacy statement, Public contact email, Save About Page | Public About page | `config/about` (`target:'about'`) | public `/about` | built-in copy, support@acadegrade.com |
| Header link "managed in Advertising" | Pointer to the Advertising page | — | — | — |

There is **no separate Email page**. Email is the first section of Settings.

---

## Part 2. Problems, ranked by user impact

Impact puts students first (wrong numbers, mass notifications, broken access), then the risk of an admin making a mistake, then clutter.

| # | Problem | Evidence | Impact | Fix (Part 3 reference) |
|---|---|---|---|---|
| 1 | **"Maintenance" and "feature" switches pretend to be platform-wide but are web-only browser checks.** "Disable Platform Access … only admins can log in" does not stop Android or any API. The five Feature Maintenance switches grey out web buttons only. An admin who flips them during an incident believes students are blocked when they are not. | `app/(student)/layout.tsx:31`, `app/(public)/login/page.tsx:69`, `hooks/usePlatformSettings.ts`. There are no Android or API reads of these fields. | High | Rename to what they do; move to Settings → Access (3.5.9); add server and Android enforcement later (3.6) |
| 2 | **Three overlapping "turn AI off" mechanisms that behave differently.** (a) Settings "Generate AI Insights" hides a web button only. (b) AI route mode "Disabled" stops the feature on the server for web and Android. (c) Free uses limit 0 stops free requests, but coins can still pay. Nothing explains which to use. | `settings-schema.ts`, `lib/ai/manager.ts:58-60`, `lib/usage/policy.ts` | High | AI providers owns the real off switch. The Settings switch becomes "Hide on web", and the free-uses help explains that 0 is not off when coins are on. |
| 3 | **Rewarded switch vs coins: split across two pages, with a hidden four-way dependency.** Earning coins needs: `mobileAds.enabled`, plus `rewardedEnabled`, plus a valid unit (or test mode), plus `usage.coins.enabled`. The switch is labelled "Enable rewarded Insights refresh", which is wrong once coins replace the refresh on Android (`insights.tsx:713`). The AdMob reward item must still be "Insights refresh" ×1 for coin sessions. The usage page still says other reward paths are "pending". | `lib/ads/reward/delivery.ts`, `coins.ts summary()`, `service.ts:146` | High (live money and ad settings) | 3.5.6 / 3.5.7: storage stays split (delivery vs economy), both pages show one shared "Rewarded readiness" strip, and labels are renamed |
| 4 | **"Reset All Onboarding (Test)" is on the Overview page.** It is a red button with no confirmation. It writes every user document from the browser. It also does not actually re-show tours: web tours also read `tourVersions` (`ProductTour.tsx:78`), and Android tours use `mobileUsageTour*`. | `admin/dashboard/page.tsx:57-75` | High (bulk write, mis-click risk) | Remove from Overview; Settings → Advanced → Developer tools with typed confirmation, or delete (3.5.9) |
| 5 | **Announcement "Publish" sends a push and inbox notification to every user on every click.** There is no preview, no confirmation and no duplicate guard. The banner itself appears only on web; Android users get only the notification. "Clear" saves instantly. | `admin/settings/page.tsx:handlePublishBanner`, `api/notifications/send` | High | Settings → Announcements, with separate "Save banner" and "Send notification" actions, a confirmation, and a preview (3.5.9) |
| 6 | **The Grade Scale editor saves a scale nothing uses.** Both calculators hard-code the 5-point scale. The editor also mutates its default rows in place (a shallow array copy). Admins can believe they changed grading. | `lib/cgpa/calculator.ts` → `lookupGrade(GRADE_SCALE)`; the mobile port is the same | High (false confidence about grading) | Replace with a read-only "Grading used by the apps" panel under Advanced (3.5.9) |
| 7 | **One concept, several names.** "Feature credits" (nav) vs "Feature allowances" (H1) vs "free credits" (student) vs coins. AI page "Academic insights / What-if planner / Result extraction (OCR)" vs student "Written Analysis / What-If / Result scanning". "Course catalogue" vs "Academic catalog". "API monitor" vs "API Analytics". "Admin settings" vs "Platform Settings". Web "Default Metric" vs Android "Primary Metric", and Android shows "CGPA (4.0 Scale)" on a 5-point app (`profile.tsx:468`). | `route-meta.ts`, page H1s | Medium–High | The rename table in 3.3 and the glossary in 4.3 |
| 8 | **Settings is a junk drawer.** It holds email credentials, the AI prompt, the grade scale, announcements, maintenance, download links and the About page: 7 save buttons, with some switches saving instantly and others not. | `admin/settings/page.tsx` | Medium | Tabs: Access, Announcements, Public site, Email, Advanced (3.5.9) |
| 9 | **The AI prompt lives apart from AI Operations, and "Bootstrap mode" hides that AI is off.** In bootstrap mode every AI call fails, but the copy reads like a setting. Disabling a credential is instant and does not check routes that use it. There is no "test this key". | `AiOperations.tsx`, `lib/ai/manager.ts` | Medium–High | 3.5.5: status banner "AI is off until routing is saved"; prompt moves into the Written Analysis card (Advanced); confirm before disabling a used key |
| 10 | **House promotions need six switches in two places to line up.** Web: master, then `deliveryModes.house`, then placement, then campaign Active, then campaign placement. Android: share switch, then Android placement. Android takes only campaigns ticked for web **Dashboard overview**, even for the Android Results slot (`lib/ads/house.ts`). Legacy banners ignore the web master switch. The copy still says "Dashboard-only" while a Results slot is being added. | `AdsEditor.tsx`, `house.ts:buildHouseDelivery`, `config.ts:legacyBannersToAdsConfig` | Medium | 3.5.7: one "Where promotions show" matrix, `deliveryModes.house` hidden under Advanced, honest checkbox label, diagnostics first |
| 11 | **Course catalogue manages data no app reads.** `courseCatalog` has zero consumers. Its "Add Course" is a red danger button. | grep: only `api/admin/courses` | Medium (wasted effort, confusion with Academic catalogue) | Remove from nav; link from Settings → Advanced as "Legacy course list (not used by the apps)" |
| 12 | **The iOS ad editor is shown although iOS cannot render ads.** It is a full tab with the same fields as Android. | `ads/page.tsx` iOS tab | Medium (noise, risk of thinking iOS ads are live) | Collapse under Advanced on the AdMob tab, titled "iOS (not connected)" |
| 13 | **Users → Disable Account has no confirmation.** It locks the student out of web and Android immediately. | `users/page.tsx:206` | Medium | Confirmation dialog naming the user, with the consequence |
| 14 | **Overview and Analytics duplicate charts and both run a full scan** of every user and semester (CGPA distribution, averages, departments). | `api/admin/stats` | Medium (cost, clutter) | Overview keeps KPIs, signups and shortcuts; distribution and departments move to Academic analytics only |
| 15 | **Two Android download URLs.** Settings → Mobile App Downloads `androidUrl` (public site; the page silently fills the old GitHub v1.0.0 APK) vs Android release `downloadUrl` (update notice). They drift. | `settings/page.tsx` `DEFAULT_ANDROID_DOWNLOAD_URL` | Medium | Keep both fields. Show them side by side in Android release → "Download links", with "Use release link for public site" and a mismatch warning. |
| 16 | **"Configured" and "verified" are blurred.** Ads say "serving not verified", which is good but repeated four times. AI keys cannot be tested. Email "Verify" is not remembered. The release download URL is not checked in admin (the app does a HEAD check). | multiple | Medium | Standard status chip: Off / Configured / Verified at ‹time› / Problem (3.4) |
| 17 | **Repetitive helper text.** "Saved configuration — serving not verified" ×4, "saves independently" ×4. Long paragraphs repeat what the Help drawer should hold. | ads editors | Low–Medium | Move explanations into Help; keep one-line inline hints |
| 18 | **Danger styling is used for routine actions.** "Add Course" is red; the "Clear all" notifications button on student web uses danger styling (fine) but has no confirmation. | `courses/page.tsx:115` | Low | primary/outline buttons; confirm destructive bulk actions |

### 2.1 Cross-app correctness issues found while writing help

The help content must be identical across web and Android, so these block "explain things identically". Fix them in code. None needs a storage change.

1. **CGPA scope differs.**
   - Android computes CGPA from **completed** semesters only (`useAcademicData.ts:165`).
   - Web `useCGPA` includes **every** semester with `creditLoaded > 0` (`hooks/useCGPA.ts:46`).
   - Android writes `gpa`/`creditLoaded` to in-progress semesters (`[semesterId].tsx:144`), so web counts semesters that Android excludes.
   - **Recommendation:** make web match Android (completed only), because that is what the transcript and the Android tour say.
2. **Degree-class gaps.** The class ranges (4.50–5.00, 3.50–4.49, 2.40–3.49, 1.50–2.39, 1.00–1.49, 0–0.99) have gaps. An unrounded CGPA such as 4.495 matches no range and falls to "Fail". Both apps have this. **Fix:** compare against lower bounds only (`>= 4.5`, `>= 3.5`, …).
3. **Course-code import differs.** Web *replaces* the course list being edited (`setInitialCourses(imported)`). Android *adds* only codes not already present ("Every course in this code is already in your semester"). **Recommendation:** web should merge like Android.
4. **Record mode** ("From Scratch" / "Complete Record", web Settings) is stored in `users.recordMode` but no calculation reads it. Either hide it or describe it as a label only.
5. **Android "Primary Metric" subtitle** reads "CGPA (4.0 Scale)"; it should read "CGPA (5-point scale)".

---
## Part 3. Proposed information architecture

### 3.1 Principles

1. **Organise by job, then by platform.** Admins think "promotions", "AI", "release". Within a page, platform (Web / Android) is a column or sub-section, not a top-level tab.
2. **Say exactly what a switch does, and where.** Any web-only switch carries a "Web only" chip.
3. **Status before settings.** Each operational page opens with a read-only status strip (Off / Configured / Verified / Problem).
4. **One save per tab.**
   - A sticky save bar lists every unsaved section and saves them in order, reporting the result for each.
   - Instant-save switches are allowed only for low-risk preferences. High-risk switches always go through the save bar and a confirmation.
5. **Advanced is collapsed by default.** It holds rarely used, legacy or not-yet-live settings, plus developer tools.
6. **Long explanations move into the Help drawer** (Part 4). Inline hints are at most one sentence.
7. **Same storage, same APIs.** Part 3.6 lists the exceptions.

### 3.2 Navigation (sidebar and mobile drawer)

| Group | Item (exact label) | Route (unchanged) | Was |
|---|---|---|---|
| — | **Overview** | `/admin/dashboard` | Overview / H1 "Admin Dashboard" |
| Students | **Users** | `/admin/users` | Users / H1 "User Management" |
| Students | **Academic catalogue** | `/admin/academic-catalog` | "Academic catalog" |
| Monitoring | **Academic analytics** | `/admin/analytics` | "Analytics" / H1 "Platform Analytics" |
| Monitoring | **API health** | `/admin/api-analytics` | "API monitor" / H1 "API Analytics" |
| AI, limits & ads | **AI providers** | `/admin/ai` | "AI Operations" |
| AI, limits & ads | **Free uses & coins** | `/admin/usage` | "Feature credits" / H1 "Feature allowances" |
| AI, limits & ads | **Advertising** | `/admin/ads` | unchanged |
| Release & system | **Android release** | `/admin/mobile-release` | H1 "Android release notice" |
| Release & system | **Settings** | `/admin/settings` | route title "Admin settings" / H1 "Platform Settings" |

- **Removed from navigation:** "Course catalogue" (`/admin/courses`). The route stays; it is linked from Settings → Advanced.
- **Grouping:** this keeps today's three-group spirit (Platform / Monitoring / Delivery), with four groups and ten items.
- **Group labels:** they render as now (`text-xs` muted). No icon changes are needed beyond giving Android release a `smartphone` icon instead of reusing `settings`.

### 3.3 Rename table (exact new labels)

| Where | Old | New |
|---|---|---|
| AI providers route cards | Academic insights / Forecast / What-if planner / Result extraction (OCR) | **Written Analysis / Forecast / What-If guidance / Result scanning** (same words students see) |
| AI providers | Execution mode options: Disabled / Local calculation only / Single provider / Ordered fallback list | **Off / Calculator only (no AI) / One provider / Provider with backups** |
| AI providers | "Bootstrap mode: saving activates managed routing." | **"AI is off. No routing has been saved yet, so every AI request fails. Save routing to turn AI on."** |
| AI providers | "Use saved connection priorities" | **Fill from saved keys** |
| AI providers | "Models and credentials" / "Saved connections" / "Key slot" | **Provider keys and models** / **Saved keys** / **Key name** |
| Free uses & coins | "Written Analysis daily limit" (×4 pattern) | **Written Analysis: free uses per 24 hours** |
| Free uses & coins | "Save allowances" | **Save free uses and coins** |
| Free uses & coins | (in flight) "Coins (Android rewarded ads)" master | **Let Android users earn and spend coins** |
| Advertising → AdMob | "Enable Android ads" | **Allow ads in the Android app** |
| Advertising → AdMob | "Use test ads" | **Use Google test ads (no revenue)** |
| Advertising → AdMob | "Enable rewarded Insights refresh" | **Rewarded ads** (hint: "Needed for coins. When coins are off, a verified ad gives one extra Written Analysis refresh.") |
| Advertising → web house | "Enable house campaign delivery" | **Show house promotions on the website** |
| Advertising → Android house | "Share website house campaigns on Android" | **Show house promotions in the Android app** |
| Advertising → Android house | "Include legacy banner fallback" | **Use legacy banners when no campaign fits** |
| Advertising | "My promotions" / "Delivery status" / "Ad networks" | **House promotions** / **Status** / **Web ad networks** |
| Advertising → legacy | "Legacy house banners — existing promotions" / "Add Advert" / "Save Adverts" | **Legacy banners (fallback)** / **Add banner** / **Save legacy banners** |
| Settings → Access | "Disable Platform Access" | **Web maintenance screen** (chip: Web only) |
| Settings → Access | "Disable Sign Ups" | **Pause new sign-ups** (chip: Web + Android) |
| Settings → Access | "Feature Maintenance" | **Hide buttons on the website** (chip: Web only) |
| Settings → Announcements | "Publish" / "Clear" | **Save banner** / **Send as notification…** / **Remove banner** |
| Settings → Public site | "Mobile App Downloads" | **App download links (public site)** |
| Overview | "Reset All Onboarding (Test)" | moved: **Reset web tour flags for all users (testing)** (Advanced) |
| Users | "Disable Account" | **Disable sign-in…** (with confirmation) |
| Student web Settings | "Default Metric" | **Primary metric** (matches Android) |
| Android Settings | "CGPA (4.0 Scale)" / "True Mastery (PI)" | **CGPA (5-point scale)** / **Performance Index (PI)** |
| Student web and Android credits strip | "N of M free credits remaining" | **N of M free uses left** (help explains the 24-hour window) |

### 3.4 Shared status chip (all operational sections)

`<StatusChip state="off|configured|verified|problem" detail="…" />`

| State | Meaning |
|---|---|
| **Off** | Switched off |
| **Configured** | Saved and valid; nothing has confirmed it works yet |
| **Verified** | A real check passed. Detail: "Verified 13 Nov, 14:02". Used for: Email "Verify Gmail login"; AI "Test key" (future); diagnostics "would serve now". |
| **Problem** | Saved but cannot work. Example: "Rewarded ads on, unit ID missing". |

This replaces the four repeated "Saved configuration — serving not verified" strings.

### 3.5 Page by page: sections and field order

Each page header gets a **Help** button (Part 4); that is not repeated below.

#### 3.5.1 Overview

1. KPI tiles: Total users · Active this week · Average CGPA · Average PI.
2. New signups (30 days).
3. **Needs attention** (new, read-only links):
   - pending catalogue suggestions (count)
   - AI is off / bootstrap
   - Android release notice is mandatory
   - Web maintenance screen is on
   - coins on but rewarded ads not ready
4. Shortcuts to Academic analytics and API health.

Removed: the CGPA distribution and Department breakdown (they live in Academic analytics), and "Reset All Onboarding" (moved).

#### 3.5.2 Users

1. Search.
2. Table: name, email, matric, semesters, joined, status.
3. Row actions: Copy email · **Disable sign-in…** / **Enable sign-in**. Confirmation: "Turn off sign-in for ‹name›? They will be signed out of web and Android and cannot sign back in until you enable them. Their data is kept."

#### 3.5.3 Academic catalogue

1. **Pending suggestions** first (they need action).
2. Kind tabs (Universities · Departments · Programmes).
3. Search and Active/Archived.
4. List with Edit and Archive.
5. **Advanced:** link "Legacy course list (not used by the apps)" → `/admin/courses`. On that page, add a banner: "No app reads this list. Course codes students share are created from their own semesters." Change "Add Course" from danger to the primary style.

#### 3.5.4 Academic analytics and API health

- **Academic analytics:** Averages · CGPA distribution · Degree class distribution · Department leaderboard · Export CSV.
- **API health:** unchanged order. Add a privacy hint on "Top API consumers".

#### 3.5.5 AI providers

1. **Status strip:** "AI is on (revision N)" or the bootstrap banner (3.3). Show per-feature chips: Off / One provider / Backups.
2. **Features** (route cards in student order). Each card shows: Mode → targets (Provider, Model, Key) → "Fill from saved keys".
   - Written Analysis. **Advanced: Custom instructions (system prompt)**. This is the old Settings "AI System Prompt"; storage stays `config/settings.aiSystemPrompt` via `POST /api/admin/settings {field:'aiSystemPrompt'}`. It has its own "Save instructions" button and a "Restore built-in instructions" button that saves an empty string.
   - Forecast.
   - What-If guidance (offers "Calculator only").
   - Result scanning (image-capable providers only).
3. **Save routing** (sticky).
4. **Provider keys and models**: one card per provider with Models → Saved keys → Add or rotate key.
   - "Disable" on a key used by the *saved* routing opens a confirmation: "‹Feature› uses this key. Disabling it makes that feature fail, or fall back to the next provider, immediately."

**Kill-switch guidance (Help):** to stop an AI feature everywhere, set its mode to **Off** here. Settings → "Hide buttons on the website" only hides web buttons.

#### 3.5.6 Free uses & coins (`/admin/usage`)

1. **Rewarded readiness** (read-only; shared component with Advertising; four checks, each linking to where it is fixed):
   - ✓/✗ Android app ads allowed (`mobileAds.enabled`)
   - ✓/✗ Rewarded ads on (`mobileAds.rewardedEnabled`)
   - ✓/✗ Rewarded unit ready (test mode **or** a valid `rewardedUnitId`)
   - ✓/✗ Coins on (`usage.coins.enabled`)

   Result line: "Students can earn coins now" / "Earning is off because …". Spending existing balances still works whenever coins and that feature are enabled.
2. **Free uses per 24 hours**: 4 number fields, with the burst limit as hint text (e.g. "Also limited to 2 per hour"), plus the cooldown and cache notes for Written Analysis and Forecast.
3. **Coins (Android)**, in this order:
   - master switch
   - Earning: coins per ad · daily earn cap · balance cap
   - Spending: a table with one row per feature (Written Analysis, Forecast, What-If guidance, Result scanning) and columns Coins allowed · Price · Coin uses per day
4. **Legacy extra refresh** (shown only while coins are off): "Without coins, a verified rewarded ad gives one extra Written Analysis refresh (max 2 per UTC day)." Delete the stale "pending" sentence.
5. One **Save free uses and coins** button (`PUT` with both `dailyLimits` and `coins`). Confirm when coins go from off to on: "Students on Android will see coin prices and can watch ads to earn. Check Rewarded readiness first."

**Why not merge the rewarded switch into this page?** `config/mobileAds.rewardedEnabled` and `rewardedUnitId` are read by the reward-session server **and** by the legacy refresh path, and `/api/ads/mobile` returns them to installed APKs. Moving storage would break old builds. So:
- Advertising keeps ad delivery (switch and unit).
- This page keeps the economy (prices and caps).
- Both pages show the same readiness strip, so neither hides the other's half.

#### 3.5.7 Advertising

Tabs in this order: **Status · House promotions · Web ad networks · Android AdMob**. The current Web / Android / iOS tabs go away.

1. **Status** (default tab; diagnostics, in flight):
   - one card per slot: Web Dashboard, Web Results, Android Dashboard, Android Results
   - each card shows: outcome (House campaign / Legacy fallback / Nothing to serve), reasons, next schedule change, preview
   - also: Web ad networks (Off / Configured / Incomplete), AdMob banners (Off / Test / Live, unverified), and the shared **Rewarded readiness** strip
   - "Recheck now"
2. **House promotions**:
   - **Where promotions show**. Two columns with one save bar:

     | Web (`config/settings.adsConfig`) | Android (`config/mobileHouseAds`) |
     |---|---|
     | Show house promotions on the website | Show house promotions in the Android app |
     | Dashboard | Dashboard |
     | Results | Results |
     | — | Use legacy banners when no campaign fits |

   - **Campaigns**: Add campaign; each card shows Active, Name, **Show on** (checkboxes "Dashboard" and "Results"; hint under Dashboard: "Android uses only campaigns ticked for Dashboard, in both Android slots"), Creative (headline, copy, call to action, image, alt text), Destination URL, Schedule, Weight, Frequency cap. The "Delivery mode" select is removed (only House is valid).
   - **Advanced (collapsed)**:
     - Legacy banners (fallback) editor, with hint: "Shown on the web Dashboard when no campaign fits, even if website promotions are off. Turn a banner's Active switch off to stop it."
     - "Allow house delivery mode" (`deliveryModes.house`, keep on).
3. **Web ad networks**: Google AdSense (switch, Publisher ID, Slot ID) · Adsterra SmartLink (switch, HTTPS URL). Hint: "Web Dashboard only."
4. **Android AdMob**:
   1. Allow ads in the Android app
   2. Use Google test ads (no revenue)
   3. **Banners**: each slot switch with its unit ID on the same row (Dashboard, Results)
   4. **Rewarded ads**: switch, rewarded unit ID, readiness strip, link "Coin prices and caps → Free uses & coins"
   5. "Saved but no ad?" checklist (move to Help; keep a link)
   6. **Advanced → iOS (not connected yet)**: the existing iOS editor, collapsed, with chip "Not live"

#### 3.5.8 Android release

1. Status line: "Live: optional update to 1.4.0 (build 15)" or "Mandatory below build 12" or "Off".
2. **Release**: Enable notice → Version → Build number → Minimum supported build → Allow users to ignore.
3. **Message**: Headline → Message → Image.
4. **Download links**:
   - Update download URL (`mobileRelease.downloadUrl`)
   - Public site Android link (`config/settings.mobileAppLinks.androidUrl`; same storage, saved via `POST /api/admin/settings {field:'mobileAppLinks'}`, sending both URLs)
   - "Use the update link for the public site" button, and a mismatch warning
5. Preview and build-eligibility simulator (unchanged).
6. Save (the existing confirmation for mandatory updates stays).

#### 3.5.9 Settings (`/admin/settings`, H1 "Settings")

Tabs, deep-linkable with `?tab=`: **Access · Announcements · Public site · Email · Advanced**.

1. **Access**:
   - **Pause new sign-ups** (Web + Android, enforced by the server). Confirmation when turning on.
   - **Web maintenance screen** (Web only). Hint: "Sends web visitors to the maintenance page. The Android app and APIs keep working. To stop AI, use AI providers." Confirmation when turning on.
   - **Hide buttons on the website** (Web only): Add semester · Import result slip · Share and import course codes · Edit profile · Refresh AI insights. Hint: "Only hides web buttons. Android and the API are not affected."
   - These switches stop saving instantly and use the save bar.
2. **Announcements**:
   - Banner text, plus a live preview of the web banner.
   - **Save banner** (web only, no notification).
   - **Send as notification…** opens a confirmation: "Send '‹text›' to every student's inbox and phone? Students who turned off admin broadcasts are skipped. This cannot be undone." It calls the same `/api/notifications/send`.
   - **Remove banner**.
   - Show "Last sent: ‹time›" from local state, and warn when sending the same text twice.
3. **Public site**:
   - App download links: Android (also shown in Android release) and iOS (blank shows "iOS coming soon").
   - About page content (unchanged fields).
4. **Email**: the EmailSettings component unchanged, with StatusChip (Configured / Verified at …).
5. **Advanced**:
   - **Grading used by the apps** (read-only table of the built-in scale and degree classes). Remove the editor; leave any stored `config/settings.gradeScale` untouched.
   - Legacy course list link.
   - **Developer tools**: "Reset web tour flags for all users (testing)". Typed confirmation `RESET`. Its help states that it does not reset Android guides or versioned web tours. **Preferred: delete this control.**

What moved out of Settings: AI System Prompt → AI providers; Android APK link → Android release (also mirrored in Public site); Grade scale → Advanced (read-only).

### 3.6 Storage and API: what changes

**No Firestore path or API contract needs to change** for this IA. All moves are UI moves over the same endpoints:
- `aiSystemPrompt` and `mobileAppLinks` keep using `POST /api/admin/settings`.
- The rewarded switch stays in `config/mobileAds`.
- Coins stay in `config/usage.coins`.

Recommended **behaviour** changes. These are separate from the IA, with no new storage:

1. Enforce `maintenanceMode` and `disabledFeatures` on the server (the AI, results and share-code routes). Once that is done, change the chips to "Web + Android". Until then, keep the honest "Web only" labels.
2. Android: read `config/settings.maintenanceMode` (it already listens to `config/settings` in `profile.tsx:135`) and show a maintenance screen. This only helps new builds.
3. `buildHouseDelivery`: accept campaigns ticked for `results.overview` for the Android Results slot. This needs no storage change, and old APKs keep working because they only see the delivery payload.
4. Fix the five cross-app correctness issues in 2.1.

### 3.7 Must not change: what installed Android APKs depend on

| Contract | Used by Android for |
|---|---|
| `GET /api/ads/mobile` → `MobileAdsConfig` incl. legacy `bannerUnitId`, `placements.{dashboard,results}`, `rewardedEnabled`, `rewardedUnitId`, `testMode` | AdMob banners and rewarded availability |
| `GET /api/ads/house` → `HouseDelivery {version, enabled, placements, campaigns, legacyCampaigns}` | House promotions |
| `/api/ads/rewards/session` (POST/GET/DELETE) and the SSV callback; AdMob reward item **"Insights refresh" ×1** | Legacy refresh and coin earning |
| `GET /api/ai/usage` shape (`features[]`, `writtenRewards`, coin fields **(in flight)**) | Credits strip, coin panel |
| `/api/ai/insights`, `/api/ai/forecast`, `/api/ai/whatif`, `/api/results/extract` request and response (incl. `coinSpend`, `rewardSessionId`) | AI features |
| `GET /api/mobile-release` → `MobileReleaseConfig` fields | Update notice, App updates card |
| `config/settings.mobileAppLinks.iosUrl` (direct Firestore listener) | Share AcadeGrade QR |
| `GET /api/academic-catalog`, `POST /api/academic-catalog/suggestions` | Registration |
| Firestore `shareCodes/{code}` `{code, authorId, useCount, createdAt, courses[{code,title,units}]}` | Course codes |
| Firestore `shared_transcripts`, `POST /api/transcript/share`, `POST /api/transcript/generate` | Transcript links and PDF |
| `users/{uid}` fields `gradeMode`, `notificationPreferences.{semesterSaved,degreeClass,aiInsights,adminBroadcasts}`, `mobileUsageTourVersion`, `mobileUsageTourCompletedChapters`, `mobileUsageTourSkipped`; subcollections `semesters/*/courses` with `isAR`, `pending`, `isComplete`; `notifications/{uid}/items` | Everything else |
| `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/password/reset`, `/api/user/delete-account`, `/api/notifications/send` | Account flows |

---

## Part 4. Help system

### 4.1 One pattern, three surfaces

| | Web admin | Web student | Android |
|---|---|---|---|
| Trigger | **Help** button (icon `CircleHelp` plus the label "Help") in the page header actions | **Help** button in the shell header: the mobile `StudentShell` header next to the theme control, and the desktop header (`StudentShell.tsx:270`) | **"?"** icon button in the screen header (48×48 dp hit area) |
| Container | ≥1024 px: right-side **drawer**, 420 px wide, full height. <1024 px: **bottom sheet**, max 85dvh, drag handle, inner scroll. | same | `@gorhom/bottom-sheet` `BottomSheetModal` (already used by the More sheet) with `BottomSheetScrollView`, `enableDynamicSizing`, `maxDynamicContentSize = windowHeight − insets.top − 24`, `paddingBottom = insets.bottom + 16` |
| Opens to | The entry for the current route id; for tabbed pages, the active tab's entry, with a link back to the parent | same | same |
| Extra action | none | **Replay tour** on Dashboard (`tourId: 'dashboard'`) and Results, New semester and Semester (`'results'`). It calls the existing, unused `requestTourReplay(tourId)` and then the page reload path. | **Replay tour** when a tour chapter exists. It closes the sheet, then calls `useTourStore.getState().startChapter(TOUR_CHAPTERS[id], true)`. |
| Also | Shortcut `?` (Shift+/) when focus is not in a field | same | Android back closes the sheet first |

**Accessibility (web):**
- The button carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
- The panel is a `role="dialog"` with `aria-modal="true"` and is labelled by its title.
- Focus moves to the title on open and is trapped. Esc closes. Focus returns to the button.
- Animation respects `prefers-reduced-motion`.
- Sections are `<h3>`, steps are `<ol>`, terms are `<dl>`, and links are real links.
- Build on the existing `components/ui/Sheet.tsx` / `Modal.tsx`. Do not add a library.

**Accessibility (Android):**
- The button has `accessibilityRole="button"`, `accessibilityLabel="Help for ‹screen title›"` and `hitSlop` to 48 dp.
- On open, the sheet announces its title via `AccessibilityInfo.announceForAccessibility`.
- Text uses the app type scale with `maxFontSizeMultiplier` 2.0 for body and 1.3 for chips.

**Placement on Android screens.** Screens using `FixedPageHeader` get the "?" through the existing `right` slot: Results, New semester, Semester, Transcript. The other screens need it added to their custom header: Dashboard (next to the avatar), Insights, Notifications (left of "Mark all read"), Settings (`profile.tsx` header), and the Scanner (next to the existing tips button).

The scanner already has a tips sheet. Its "?" opens the help entry, and the tips stay where they are.

**Visual:** same navy and purple tokens. The section headings use the existing eyebrow style. Cautions use the warning surface (`--acade-warning` at 10% tint, as in Advertising alerts; on Android `colors.warningDim`). No new components beyond `HelpButton` and `HelpPanel` (web) and `HelpButton` and `HelpSheet` (Android).

### 4.2 Content shape and location

```ts
// web: lib/help/types.ts   android: lib/help/types.ts  (identical file)
export type HelpAudience = 'admin' | 'student';
export type HelpPlatform = 'web' | 'android';

export interface HelpTerm { term: string; meaning: string }
export interface HelpTask { title: string; steps: string[] }       // 2–6 steps
export interface HelpLink { label: string; to: HelpId | { href: string } }

export interface HelpEntry {
  id: HelpId;                       // stable key, see 4.4
  audience: HelpAudience;
  title: string;                    // ≤ 40 chars
  summary: string;                  // what this page does, 1–2 sentences
  terms?: HelpTerm[];               // ≤ 8
  tasks?: HelpTask[];               // ≤ 5
  cautions?: string[];              // ≤ 4, each one sentence
  related?: HelpLink[];             // ≤ 5
  tourId?: string;                  // web ProductTour id or Android TourChapterId
  only?: HelpPlatform;              // entry exists on one platform only
  /** Sentences that differ by platform; rendered after the shared text. */
  platformNotes?: Partial<Record<HelpPlatform, string[]>>;
}
```

**Files:**
- Web admin: `lib/help/admin.ts`. Web only, `audience: 'admin'`.
- Shared student content: **`lib/help/student.ts`, one canonical file in the web repo**, copied byte-for-byte to `acadegrade-mobile/lib/help/student.ts`.
  - A script `scripts/sync-help.mjs` (web repo) copies the file and stamps `export const HELP_CONTENT_VERSION = '2026-11-13.1'`.
  - Both repos get a unit test asserting the exported version and a SHA-256 of the entries match `lib/help/student.lock.json`, so drift fails CI.
  - Platform differences go only in `platformNotes` or `only`.
- `lib/help/index.ts` exports `getHelp(id, platform)`, which merges `platformNotes[platform]` and drops entries whose `only` does not match.
- Route maps:
  - Web: `lib/help/routes.ts` maps a pathname to `HelpId` using the same matching as `getRouteMeta`.
  - Android: each screen passes its id literally.

**Writing rules:**
- Plain English, second person, present tense.
- Numbers must match the code, and each is listed in 4.6 with its source.
- No marketing.
- A term defined in the glossary (4.3) is not re-explained in long form on each page; it links to the glossary entry `student.glossary`.

### 4.3 Shared glossary (`student.glossary`, also linked from admin entries)

| Term | Meaning (exactly as the code works) |
|---|---|
| **Total score** | CA (0–30) + exam (0–70) = 0–100. |
| **Grade and grade point** | A 70–100 = 5 · B 60–69 = 4 · C 50–59 = 3 · D 45–49 = 2 · E 40–44 = 1 · F 0–39 = 0. This scale is built into both apps. |
| **GPA** | Your semester's grade points weighted by credit units: Σ(grade point × units) ÷ Σ(units). Only courses with a score or grade count. |
| **CGPA** | Your cumulative GPA: every completed semester's GPA weighted by its credit units. (Web must be fixed to count completed semesters only; see 2.1.) |
| **PI (Performance Index)** | Like GPA, but it uses your exact score instead of the grade band: each course gives (total ÷ 100) × 5 points, weighted by units. For example, 69% gives PI points of 3.45 but grade points of 4 (a B). If you entered a letter grade only, PI uses that grade's points (an estimate). |
| **Degree class** | Based on CGPA. First Class 4.50–5.00 · Second Class Upper (2:1) 3.50–4.49 · Second Class Lower (2:2) 2.40–3.49 · Third Class 1.50–2.39 · Pass 1.00–1.49 · Fail below 1.00. It is a projection, not your university's official award. |
| **Credit units** | 1–6 per course. More units mean the course moves your GPA more. |
| **Awaiting result (AR)** | A course your result slip marks "AR" because its result is not out yet. The scanner saves it without a score, it shows "AR", and it is left out of GPA, PI and credits until a score is entered. |
| **Pending / "Add score"** | A course saved without scores (for example, imported from a course code, or a scan with an unreadable score). Android will not complete the semester until each one has a score or grade. |
| **Completed semester** | A semester you marked complete (web: saved with at least one graded course; Android: "Complete semester"). Only completed semesters count toward CGPA, Insights and the transcript. |
| **At risk / Needs attention** | A completed course with a total below 50%. On the web Dashboard, a course entered with a letter grade only also counts when it is D, E or F. |
| **Free uses** | Each AI feature has its own free allowance per 24-hour window. The window starts at your first request for that feature and is not a midnight reset. There is also a short-term limit (Written Analysis and Forecast 2 per hour; What-If 3 per 5 minutes; scanning 5 per 15 minutes). |
| **Cached result** | A saved answer shown again without a new AI request, so it does not use a free use. Forecasts are reused for up to 1 hour when your results have not changed. Written Analysis stays readable until you regenerate it, and free regeneration is allowed once every 12 hours. |
| **Coins (Android)** | Points you earn by watching a short rewarded ad on Android, and spend when a feature's free uses run out. They are not money and cannot be bought or transferred. There are daily earning limits, a maximum balance, and a daily limit of coin uses per feature. If a coin-paid request fails, the coins are refunded. Earning and spending days reset at midnight UTC. |
| **Extra refresh (legacy)** | When coins are off, a verified rewarded ad on Android gives one extra Written Analysis refresh, up to 2 per day (UTC). |
| **Course code (share code)** | A 6-character code that copies a semester's course list (code, title, units) to a classmate. It never includes scores or grades. You need at least 3 courses to create one. Codes do not expire. |
| **Transcript link** | A public web link to a snapshot of your completed semesters. It **expires after 30 days**, and you can delete it sooner. It shows the record as it was when you created it; make a new link after adding results. |
| **Primary metric** | Whether your dashboard leads with CGPA or PI. It changes the display only, not the calculations. |

### 4.4 Route ids

| Help id | Web route | Android screen | Tour |
|---|---|---|---|
| `admin.overview` | `/admin/dashboard` | — | — |
| `admin.users` | `/admin/users` | — | — |
| `admin.academic-catalogue` | `/admin/academic-catalog` | — | — |
| `admin.course-list` | `/admin/courses` | — | — |
| `admin.analytics` | `/admin/analytics` | — | — |
| `admin.api-health` | `/admin/api-analytics` | — | — |
| `admin.ai` | `/admin/ai` | — | — |
| `admin.usage` | `/admin/usage` | — | — |
| `admin.ads` (+ `admin.ads.status`, `.house`, `.networks`, `.admob`) | `/admin/ads` (by tab) | — | — |
| `admin.release` | `/admin/mobile-release` | — | — |
| `admin.settings` (+ `.access`, `.announcements`, `.public-site`, `.email`, `.advanced`) | `/admin/settings` (by tab) | — | — |
| `student.dashboard` | `/dashboard` | `(tabs)/dashboard` | web `dashboard`, Android `dashboard` |
| `student.results` | `/results` | `(tabs)/results/index` | web `results`, Android `results` |
| `student.new-semester` | `/results/new` | `(tabs)/results/new` | web `results`, Android `new-semester` |
| `student.semester` | `/results/[semesterId]` | `(tabs)/results/[semesterId]` | web `results`, Android `semester` |
| `student.course-entry` | — (inline grade table) | course entry sheet | Android `course-entry` |
| `student.course-codes` | share/import modals | course code sheet | Android `course-code` |
| `student.scanner` | "Import Result Slip" modal | `ResultScannerModal` | Android `scanner` |
| `student.insights` (+ `.forecast`, `.whatif`, `.risk`, `.analysis`) | `/insights` (by tab) | `(tabs)/insights` (by tab) | Android `insights` |
| `student.transcript` | `/transcript` | `(tabs)/transcript` | Android `transcript` |
| `student.notifications` | `/notifications` | `(tabs)/notifications` | Android `notifications` |
| `student.settings` | `/settings` | `(tabs)/profile` | Android `settings` |
| `student.app-updates` | — | Settings → App updates card, update notice | — |
| `student.app-lock` | — | Settings → App Lock, lock screen | — |
| `student.more` | — | More sheet | Android `more` |
| `student.glossary` | linked | linked | — |

### 4.5 Help content

**Format:** each entry lists its title, then **Does**, **Terms**, **Tasks**, **Cautions** and **Related**. The `platformNotes` sentences appear as "Web:" and "Android:".

#### 4.5.1 Admin pages

**`admin.overview` — Overview**
- **Does:** Shows the size and health of AcadeGrade at a glance: users, activity, average results and anything that needs your attention.
- **Terms:**
  - *Active this week*: an account created, or signed in, in the last 7 days.
  - *Average CGPA / PI*: the average over students who have at least one completed semester.
- **Tasks:**
  - Check what needs attention:
    1. Read the Needs attention list.
    2. Open each link to fix it.
- **Cautions:**
  - Numbers are recalculated from every account each time the page loads, so it can be slow with many users.
- **Related:** Academic analytics · API health · Users

**`admin.users` — Users**
- **Does:** Find a student account and turn its sign-in off or on.
- **Terms:**
  - *Disabled*: the account cannot sign in on the website or the Android app. Their data is kept.
- **Tasks:**
  - Disable sign-in:
    1. Search by name, matric number or email.
    2. Open the row.
    3. Choose Disable sign-in.
    4. Confirm.
  - Restore access:
    1. Open the row.
    2. Choose Enable sign-in.
- **Cautions:**
  - Disabling takes effect straight away on every device.
  - This page cannot delete accounts or edit results; students do that themselves.
- **Related:** Settings → Access

**`admin.academic-catalogue` — Academic catalogue**
- **Does:** Manages the universities, departments and programmes students pick from when they sign up on the website or the Android app.
- **Terms:**
  - *Suggestion*: a name a student typed that is not in the list yet.
  - *Archived*: hidden from sign-up but kept, so existing profiles are unaffected. You can restore it.
- **Tasks:**
  - Review suggestions:
    1. Open Pending suggestions.
    2. Approve to add the name, or Reject.
  - Fix a spelling:
    1. Choose the tab.
    2. Search.
    3. Edit.
    4. Save.
  - Retire an entry:
    1. Choose Archive.
    2. Confirm.
- **Cautions:**
  - Names must be unique within a type (case and spacing are ignored).
  - The Android app keeps a built-in list for when it is offline, so new names appear there once it reconnects.
- **Related:** Users

**`admin.course-list` — Legacy course list**
- **Does:** An old list of course codes and titles. No part of the website or Android app reads it.
- **Tasks:** None needed. Leave it, or export what you need and stop maintaining it.
- **Cautions:**
  - Editing this list does not change any student's courses or course codes.
- **Related:** Academic catalogue

**`admin.analytics` — Academic analytics**
- **Does:** Shows how students are doing overall: CGPA spread, degree classes and department averages.
- **Terms:**
  - *Degree class bands*: First 4.50+, 2:1 3.50+, 2:2 2.40+, Third 1.50+, Pass 1.00+.
- **Tasks:**
  - Export department figures: choose Export CSV (department, users, average CGPA).
- **Cautions:**
  - Figures are self-reported by students and only include completed semesters.
- **Related:** Overview

**`admin.api-health` — API health**
- **Does:** Shows API traffic, errors and response times from server logs, so you can spot outages and heavy use.
- **Terms:**
  - *Error rate*: failed calls ÷ all calls in the range.
  - *Top consumers*: the accounts making the most calls.
- **Tasks:**
  - Investigate a spike:
    1. Pick the range.
    2. Check Recent errors.
    3. Open the endpoint in Top endpoints.
  - Watch live: turn on Auto-refresh (every 30 seconds).
- **Cautions:**
  - Top consumers shows personal details; do not screenshot it into public channels.
- **Related:** AI providers

**`admin.ai` — AI providers**
- **Does:** Controls which AI provider, model and key answers each AI feature (Written Analysis, Forecast, What-If guidance and Result scanning) on both the website and the Android app.
- **Terms:**
  - *Off*: the feature makes no AI calls anywhere.
  - *Calculator only*: What-If shows the maths without AI advice.
  - *One provider / Provider with backups*: backups are tried in order when a provider fails.
  - *Key*: an encrypted API key. It is never shown again after saving.
  - *Revision*: the version number of the saved routing.
- **Tasks:**
  - Turn AI on for the first time:
    1. Add a key for a provider.
    2. Pick a mode and target for each feature.
    3. Save routing.
  - Rotate a key: in Add or rotate key, reuse the same key name, paste the new key and save.
  - Stop a feature everywhere: set its mode to Off and save routing.
  - Change Written Analysis wording: Written Analysis → Advanced → Custom instructions.
- **Cautions:**
  - Until routing is saved once, every AI request fails.
  - Disabling a key used by a feature makes that feature fail, or fall back, immediately.
  - Result scanning needs a provider that can read images.
  - A saved key is not proof it works; try the feature after saving.
- **Related:** Free uses & coins · API health

**`admin.usage` — Free uses & coins**
- **Does:** Sets how many free AI requests each student gets per feature, and how Android coins are earned and spent once the free uses run out.
- **Terms:**
  - *Free uses per 24 hours*: counted per student and per feature. The window starts at the student's first request and does not reset at midnight. 0 pauses free use.
  - *Short-term limit*: fixed (Written Analysis and Forecast 2/hour; What-If 3 per 5 minutes; scanning 5 per 15 minutes).
  - *Coins*: earned on Android by watching a rewarded ad and spent per feature at the price you set. Days reset at midnight UTC.
  - *Rewarded readiness*: the four switches that must all be on for students to earn coins.
- **Tasks:**
  - Change free uses:
    1. Edit the numbers (0–1000).
    2. Save. It applies to the next request; it does not clear anyone's count.
  - Turn coins on:
    1. Check Rewarded readiness. It needs: ads allowed in the Android app, Rewarded ads on, a rewarded unit (or test ads), and coins on.
    2. Set coins per ad (1–10), daily earn cap (0–100) and balance cap (1–500).
    3. Set each feature's price (1–20) and coin uses per day (0–50).
    4. Save and confirm.
  - Pause coin spending for one feature: untick Coins allowed for it.
- **Cautions:**
  - Setting free uses to 0 does not turn a feature off while coins can pay for it. To stop a feature, use AI providers → Off.
  - Turning off "Allow ads in the Android app" or "Rewarded ads" stops new earning but keeps balances.
  - Coins are not money. Never describe them as purchasable.
  - In AdMob, the reward must stay amount 1, item "Insights refresh", even though students receive coins.
- **Related:** Advertising → Android AdMob · AI providers

**`admin.ads` — Advertising** (one entry per tab)

*Advertising: Status* (`admin.ads.status`)
- **Does:** Shows what each ad slot (web Dashboard, web Results, Android Dashboard, Android Results) should show right now, and why, based on saved settings.
- **Terms:**
  - *House campaign*: your own promotion.
  - *Legacy fallback*: an old image banner used when no campaign fits.
  - *Nothing to serve*: the slot stays empty and takes no space.
- **Tasks:**
  - Find why a promotion is not showing:
    1. Open its slot.
    2. Read the reasons in order.
    3. Fix the first one.
    4. Recheck now.
- **Cautions:**
  - This is not proof that an ad rendered, was approved or got filled; unsaved edits are not included.
- **Related:** House promotions · Android AdMob

*Advertising: House promotions* (`admin.ads.house`)
- **Does:** Creates your own promotions and chooses where they appear on the website and in the Android app.
- **Terms:**
  - *Weight*: the relative share when several campaigns fit (1–100).
  - *Frequency cap*: the most views per person in a time window. It is counted per browser or per Android install.
  - *Schedule*: optional start and end times.
- **Tasks:**
  - Launch a campaign:
    1. Add campaign.
    2. Write the headline and copy, and add an HTTPS image and link.
    3. Tick Show on.
    4. Turn on Active.
    5. Turn on the surface in Where promotions show.
    6. Save.
    7. Check Status.
  - Show on Android:
    1. Turn on "Show house promotions in the Android app" and the Android slot.
    2. Make sure the campaign is ticked for Dashboard.
- **Cautions:**
  - Android uses only campaigns ticked for Dashboard, in both Android slots.
  - Legacy banners (Advanced) appear on the web Dashboard even when website promotions are off; switch each banner's Active off to stop them.
  - Image and link URLs must start with https://.
- **Related:** Status

*Advertising: Web ad networks* (`admin.ads.networks`)
- **Does:** Connects Google AdSense and an Adsterra SmartLink on the web Dashboard.
- **Tasks:**
  - Turn on AdSense:
    1. Enter the Publisher ID (ca-pub- plus 16 digits) and the Slot ID (digits).
    2. Switch it on.
    3. Save.
  - Turn on Adsterra:
    1. Paste the HTTPS SmartLink.
    2. Switch it on.
    3. Save.
- **Cautions:**
  - AdSense also needs Google's site approval and the visitor's consent; a blank slot after saving is usually approval, consent, an ad blocker or no fill.
- **Related:** Status

*Advertising: Android AdMob* (`admin.ads.admob`)
- **Does:** Controls Google AdMob banners and rewarded ads in the Android app.
- **Terms:**
  - *Test ads*: Google's sample ads; no revenue.
  - *Unit ID*: ca-app-pub-…/… from AdMob.
  - *Rewarded ad*: a video the student chooses to watch. Our server only rewards it after Google's signed confirmation.
- **Tasks:**
  - Go live with banners:
    1. Enter the unit IDs.
    2. Turn on the slots.
    3. Turn off Use Google test ads.
    4. Save.
  - Turn on rewarded ads:
    1. Enter the rewarded unit ID.
    2. Turn on Rewarded ads.
    3. Save.
    4. Then set coins in Free uses & coins.
- **Cautions:**
  - "Allow ads in the Android app" also controls rewarded ads, so turning it off stops coin earning and extra refreshes.
  - SDK or app-ID changes need a new Android build; these switches do not.
  - Consent (UMP) choices on the device can block ads; these switches cannot override them.
  - iOS (Advanced) is saved for later; no iOS app shows ads yet.
- **Related:** Free uses & coins · Status

**`admin.release` — Android release**
- **Does:** Publishes the update notice Android users see, and decides whether older builds may skip it.
- **Terms:**
  - *Build number*: the app's internal version (whole number). Phones on a lower build see the notice.
  - *Minimum supported build*: builds below it must update.
  - *Allow users to ignore*: off makes the update required for every older build.
- **Tasks:**
  - Announce an optional update:
    1. Enter the version (x.y.z), build and HTTPS download link.
    2. Enable notice.
    3. Save.
  - Force an update for very old builds: set Minimum supported build, then Save and confirm.
  - Check who is affected: type a build number into Build eligibility.
- **Cautions:**
  - A required update blocks the app until the student downloads it, so test the download link first.
  - Users who dismissed an optional notice will not see it again until the next release or a manual check.
  - Keep the public site link (Download links) pointing to the same APK.
- **Related:** Settings → Public site

**`admin.settings` — Settings** (one entry per tab)

*Settings: Access* (`admin.settings.access`)
- **Does:** Pauses sign-ups and controls website-only maintenance switches.
- **Terms:**
  - *Pause new sign-ups*: blocks new accounts on the website and Android; existing students can still sign in.
  - *Web maintenance screen*: sends website visitors to a maintenance page. The Android app and APIs keep working.
  - *Hide buttons on the website*: greys out selected website buttons only.
- **Tasks:**
  - Short website maintenance: turn on Web maintenance screen, save, and turn it off when done.
  - Stop an AI feature everywhere: go to AI providers and set it to Off (not here).
- **Cautions:**
  - None of the web-only switches affect the Android app.
- **Related:** AI providers

*Settings: Announcements* (`admin.settings.announcements`)
- **Does:** Shows a banner at the top of the student website, and optionally sends the text as a notification to every student.
- **Tasks:**
  - Banner only: type the text, then Save banner.
  - Notify everyone:
    1. Choose Send as notification….
    2. Check the preview.
    3. Confirm.
  - Remove: Remove banner.
- **Cautions:**
  - Each send reaches every student's inbox and phone (except those who turned off admin broadcasts) and cannot be recalled.
  - Android shows the notification but not the banner.
  - Students can dismiss the banner in their browser.
- **Related:** —

*Settings: Public site* (`admin.settings.public-site`)
- **Does:** Edits the app download links on the public pages and the text of the About page.
- **Tasks:**
  - Update the Android download link (keep it the same as Android release).
  - Leave iOS blank to show "iOS coming soon".
- **Cautions:**
  - The Android app's Share AcadeGrade QR reads the iOS link from here.
- **Related:** Android release

*Settings: Email* (`admin.settings.email`)
- **Does:** Sets the Gmail accounts that send general emails and one-time sign-up codes.
- **Terms:**
  - *App Password*: a 16-character Gmail password for apps; not your normal password.
  - *OTP email*: used for verification codes, and falls back to the General account.
- **Tasks:**
  - Change a sender:
    1. Enter the email and App Password.
    2. Save.
    3. Choose Verify Gmail login.
- **Cautions:**
  - Saved passwords are never shown again.
  - If no account is saved, the server uses its environment settings.
- **Related:** —

*Settings: Advanced* (`admin.settings.advanced`)
- **Does:** Holds reference information and rarely used tools.
- **Terms:**
  - *Grading used by the apps*: the fixed scale (A 70+ = 5 … F below 40 = 0) built into the website and Android. It is not editable here.
- **Cautions:**
  - "Reset web tour flags" touches every student account and does not reset Android guides; use it only on test data.
- **Related:** Legacy course list

#### 4.5.2 Student pages: shared web and Android copy (`lib/help/student.ts`)

**`student.dashboard` — Dashboard**
- **Does:** Your academic home. It shows your current standing, how your GPA is moving, and the most useful next step.
- **Terms:**
  - CGPA, PI, Degree class, At risk (see the glossary).
  - *Current semester*: the GPA (or PI) of your latest semester.
- **Tasks:**
  - Switch the headline between CGPA and PI: Settings → Primary metric.
  - See every course: open Results (Android: View All).
  - Act on the suggestion: follow the next-step card, for example "Complete pending scores".
- **Cautions:**
  - The degree class is a projection from your completed semesters, not your university's official result.
- **Platform notes:**
  - Web: the "AI insight" card shows your last saved Written Analysis summary.
  - Android: when offline, the app shows your saved data and syncs your changes later.
- **Related:** Results · Insights · Glossary
- **Tour:** yes

**`student.results` — Results**
- **Does:** Lists every semester in your programme timeline, with its GPA, credits and courses.
- **Terms:**
  - *Ongoing / In progress*: a semester that is not complete yet, so it does not count toward CGPA.
  - *Completed*: counts toward CGPA, Insights and the transcript.
- **Tasks:**
  - Add the next semester: choose Add semester (Android: Create next semester).
  - Edit a semester: open it.
  - Delete a semester: choose Delete, then confirm. Its courses go with it and your CGPA is recalculated.
- **Cautions:**
  - Deleting cannot be undone.
  - If all programme semesters already exist, increase your programme duration in Settings to add another year.
- **Related:** Semester · New semester
- **Tour:** yes

**`student.new-semester` — New semester**
- **Does:** Creates the next missing semester from your entry session and programme duration, so levels and sessions are never duplicated or skipped.
- **Tasks:**
  - Create the next semester:
    1. Check the level, semester and session shown.
    2. Choose Create.
    3. You land in the new semester.
- **Cautions:**
  - Only the next valid semester can be created.
  - If you see "Academic timeline needed", set your entry session (YYYY/YYYY) and programme duration in Settings first.
- **Related:** Settings
- **Tour:** yes

**`student.semester` — Semester**
- **Does:** Holds one semester's courses. Here you enter scores, scan a result slip, swap course lists with classmates, and complete the semester.
- **Terms:**
  - *CA* 0–30, *Exam* 0–70; the total and grade are calculated for you.
  - *Units* 1–6.
  - *AR* means awaiting result (left out of GPA).
  - *Add score* means the course still needs a score or grade.
- **Tasks:**
  - Add a course:
    1. Enter the code, title and units.
    2. Enter CA and exam, or a letter grade.
    3. Save.
  - Scan a result slip: choose Scan (web: Import Result Slip), review what was found, then confirm.
  - Share your course list: Share, then send the 6-character code.
  - Use a classmate's code: Import, enter the code, then fill in your own scores.
  - Count the semester: complete it (web: Save Semester; Android: Complete semester).
- **Cautions:**
  - A course code shares course names and units only, never scores.
  - You need at least 3 courses to create a code.
  - Completing needs at least one graded course; on Android every imported course needs a score or grade first.
- **Platform notes:**
  - Web: importing a code replaces the course list you are editing. (Planned: merge, as on Android.)
  - Android: importing skips courses already in the semester.
- **Related:** Scanner · Course codes · Glossary
- **Tour:** yes

**`student.course-entry` — Add or edit a course**
- **Does:** Records one course and shows the grade and points it will give before you save.
- **Tasks:**
  - Enter by score: type CA (0–30) and exam (0–70).
  - Enter by grade: switch to Letter Grade and pick A–F.
- **Cautions:**
  - With a letter grade only, PI uses that grade's points, so it is an estimate.
  - Nothing is added until you save.
- **Related:** Glossary
- **Tour:** Android `course-entry`

**`student.course-codes` — Course codes**
- **Does:** Copies a semester's course list (codes, titles, units) between classmates with a 6-character code.
- **Tasks:**
  - Share:
    1. Choose Share.
    2. Copy the code.
  - Import:
    1. Enter a classmate's code.
    2. Import.
    3. Add your own scores.
- **Cautions:**
  - Codes contain no scores, grades or personal details.
  - Anyone with the code can import the list.
  - Codes do not expire.
- **Related:** Semester
- **Tour:** Android `course-code`

**`student.scanner` — Result scanner**
- **Does:** Reads course codes, units and scores from a photo, image or PDF of your result, then lets you check everything before it is saved.
- **Terms:**
  - *Free uses*: scanning has its own daily free uses, and is also limited to 5 scans per 15 minutes.
- **Tasks:**
  - Scan:
    1. Lay the slip flat in even light.
    2. Keep all columns in the frame.
    3. Capture (or choose an image or PDF).
    4. Review.
    5. Confirm.
  - If something is wrong: edit it in review, or choose Enter details manually.
- **Cautions:**
  - Nothing is saved until you confirm.
  - Unreadable scores are left as "Add score" rather than guessed.
  - Courses marked AR on the slip are saved as awaiting result.
- **Platform notes:**
  - Android: when free scans run out and coins are on, you can pay with coins; failed scans refund them.
- **Related:** Semester · Glossary (Free uses, Coins)
- **Tour:** Android `scanner`

**`student.insights` — Insights**
- **Does:** Four tools for planning. Forecast projects your trend. What-If works out the GPA you need. Risk Analysis lists weak courses. Written Analysis gives AI advice.
- **Tasks:** Pick a tab, then open Help again for that tab.
- **Cautions:**
  - Insights use completed semesters only.
  - When your programme timeline is complete, projections stop at graduation.
- **Related:** the four tab entries · Glossary
- **Tour:** Android `insights`

**`student.insights.forecast` — Forecast**
- **Does:** Projects your CGPA or PI for your next semesters from your completed results.
- **Tasks:**
  - Switch between the CGPA and PI views.
  - Choose Refresh forecast after adding results.
- **Cautions:**
  - A forecast is reused for up to 1 hour if your results have not changed. That reuse does not use a free use.
  - New forecasts are limited to 2 per hour and to your daily free uses.
- **Platform notes:**
  - Android: shows up to the next 2 semesters in your timeline.
- **Related:** Glossary (Free uses, Cached result)

**`student.insights.whatif` — What-If**
- **Does:** Works out the GPA you would need in your remaining semesters to reach a target CGPA. You can ask AI whether that is realistic.
- **Terms:**
  - *Required GPA* = (target × (credits so far + future credits) − current CGPA × credits so far) ÷ future credits. Above 5.00 means the target cannot be reached in that time.
  - *Target average score*: the average percentage that would give that number as a PI, i.e. required GPA ÷ 5 × 100. Grades use bands, so a lower score can still earn the grade points (any score from 70 earns an A).
- **Tasks:**
  1. Move the target.
  2. Set the remaining semesters and units per semester.
  3. Read the result.
  4. Optionally choose Get AI guidance.
- **Cautions:**
  - The maths is instant and free.
  - AI guidance is limited to 3 requests per 5 minutes and to your daily free uses.
- **Platform notes:**
  - Android: remaining semesters are capped by your timeline, and units default to 18. Guidance has a 30-second wait between requests.
- **Related:** Glossary

**`student.insights.risk` — Risk Analysis**
- **Does:** Lists completed courses below 50% and an overall risk level, using your saved results and forecast.
- **Cautions:**
  - Opening this tab never makes an AI request.
- **Related:** Dashboard

**`student.insights.analysis` — Written Analysis**
- **Does:** AI-written strengths, concerns, recommendations and degree outlook based on your completed results.
- **Terms:**
  - *Cached*: your last analysis stays readable at any time.
  - *Regenerate*: makes a new analysis; free regeneration is allowed once every 12 hours, within your daily free uses.
- **Tasks:**
  - After adding results, choose Regenerate when the "Your results changed" note appears.
- **Cautions:**
  - If the AI is unavailable you will see your last saved analysis.
  - Advice is guidance, not an official academic decision.
- **Platform notes:**
  - Android, coins on: when free uses run out you can pay coins.
  - Android, coins off: you may watch a rewarded ad for one extra refresh (max 2 a day). The extra refresh is only granted after the ad network confirms the reward to our server, which can take a moment.
- **Related:** Glossary (Coins, Extra refresh)

**`student.transcript` — Transcript**
- **Does:** Builds an unofficial transcript from your completed semesters. You can download it as a PDF or share it by link.
- **Terms:**
  - *Unofficial*: generated by AcadeGrade, not by your university.
  - *Share link*: a public link to a snapshot of your record.
- **Tasks:**
  - Download: Download PDF (web; Print HTML is also available) or Generate & Share PDF (Android).
  - Share: choose whether to include your photo (web: Photo On/Off), then Share Link, then copy it.
  - Stop sharing: in Active shared transcripts, choose Delete, then confirm.
- **Cautions:**
  - Anyone with the link can view it until it expires after 30 days or you delete it.
  - The link shows your record at the moment you created it; create a new one after adding results.
- **Related:** Results · Glossary
- **Tour:** Android `transcript`

**`student.notifications` — Notifications**
- **Does:** Your inbox for semester saves, degree-class changes, new AI insights and announcements from AcadeGrade.
- **Tasks:**
  - Read: tap an item.
  - Mark all read: Mark all read.
  - Choose which alerts you get: Settings → Notifications.
- **Platform notes:**
  - Web: Clear all deletes every notification in your inbox.
- **Related:** Settings
- **Tour:** Android `notifications`

**`student.settings` — Settings**
- **Does:** Your profile, academic timeline, display preferences, notifications and account security.
- **Terms:**
  - *Entry session*: the year you started (YYYY/YYYY, consecutive years).
  - *Programme duration*: years in your programme (1–10). Together these define which semesters you can create.
  - *Primary metric*: whether your dashboard leads with CGPA or PI.
- **Tasks:**
  - Fix your timeline: change the entry session or duration, then save.
  - Turn alerts on or off: switch Semester saved, Degree class change, AI insights ready, or Admin broadcasts.
  - Delete your account: Delete account, confirm with your password (web: also type DELETE).
- **Cautions:**
  - Deleting your account erases all semesters, courses, transcript links and your profile, and cannot be undone.
  - Matric number changes need the AcadeGrade team.
- **Platform notes:**
  - Web: also has Profile picture, Change password, Push notifications for this browser, and Record mode. Record mode is saved but does not change calculations.
  - Android: also has Appearance, App Lock, App updates, Share AcadeGrade, Export transcript, and Replay usage guide.
- **Related:** App updates · App Lock
- **Tour:** Android `settings`

**`student.glossary` — Terms used in AcadeGrade:** the table in 4.3, rendered as a `<dl>`.

#### 4.5.3 Android-only entries (`only: 'android'`)

**`student.app-updates` — App updates**
- **Does:** Tells you when a newer AcadeGrade Android build is available, and opens its download.
- **Terms:**
  - *Optional update*: you can choose Not now.
  - *Required update*: the app asks you to update before continuing (you may see "Continue temporarily" if the download cannot be reached).
- **Tasks:**
  - Check now: Settings → App updates → Check for updates.
  - Install: Download now, open the downloaded APK, then allow installation from this source if asked.
- **Cautions:**
  - The app checks automatically every six hours while open, and on launch or resume.
  - A dismissed optional update reappears when you choose Check for updates.
- **Related:** Settings

**`student.app-lock` — App Lock**
- **Does:** Requires your fingerprint, face or device passcode each time you return to AcadeGrade from the background.
- **Tasks:**
  - Turn on: Settings → App Lock. You need a fingerprint or face unlock set up on the phone first.
  - Unlock: Unlock Now, or Use Passcode.
- **Cautions:**
  - App Lock protects this phone only; it does not change your account password.
- **Related:** Settings

**`student.more` — More**
- **Does:** Holds Notifications and Settings, plus quick Light, Dark or System appearance.
- **Tasks:**
  - Change appearance: swipe the More sheet up and pick a theme.
- **Tour:** Android `more`

### 4.6 Numbers used in help, with code sources (keep in sync)

| Fact | Value | Source |
|---|---|---|
| Grade bands and points | A70 B60 C50 D45 E40 F0 → 5..0 | web `lib/utils/constants.ts` `GRADE_SCALE`; Android `lib/cgpa/gradeScale.ts` |
| CA / exam / units ranges | 0–30 / 0–70 / 1–6 | `lib/results/semester-save.ts` |
| PI point | total ÷ 100 × 5; letter grade only → grade point | `lib/cgpa/calculator.ts` (both repos) |
| Degree classes | 4.5 / 3.5 / 2.4 / 1.5 / 1.0 | `DEGREE_CLASSES` (both repos) |
| At risk | total < 50 (web Dashboard also: grade D, E or F) | `lib/dashboard/summary.ts`; Android `useAcademicData.ts` |
| Free uses defaults | Written Analysis 3, Forecast 8, What-If 20, Scanning 20 per 24 h | `lib/usage/policy.ts` |
| Burst limits | 2/h, 2/h, 3 per 5 min, 5 per 15 min | same |
| Written Analysis cooldown | 12 h | `lib/ai/insight-cooldown.ts`, `usage/server.ts` |
| Forecast cache | 1 h, same inputs | `app/api/ai/forecast/route.ts` `FORECAST_CACHE_MS` |
| Legacy extra refresh | max 2 per UTC day | `lib/ads/reward/README.md` |
| Coin defaults | per ad 2, earn cap 10/day, balance cap 30; prices 2/1/1/3; uses per day 2/5/10/5 | `DEFAULT_COIN_POLICY` |
| Coin hold refund | 5 min | `COIN_HOLD_TTL` |
| Transcript link expiry | 30 days | `app/api/transcript/share/route.ts` |
| Course code | 6 characters, ≥3 courses, code/title/units only | web `results/[semesterId]/page.tsx`; Android `[semesterId].tsx` |
| Update check | every 6 h while active, plus launch/resume | Android `AppUpdatesCard.tsx` |

---

## Part 5. Android responsiveness checklist

**Method:**
- This comes from a static read of `acadegrade-mobile` on 2026-11-13. Line numbers refer to that working tree, and files are being edited, so re-check before fixing.
- Overflow widths are estimates (about 0.6 em per character) and need confirming on a device.

**Facts:**
- `app.json` sets `orientation: "portrait"` and `android.softwareKeyboardLayoutMode: "resize"`. The manifest has `screenOrientation="portrait"` and `adjustResize`.
- `edgeToEdgeEnabled=true` and targetSdk 36.
- There are no `Dimensions.get` calls; widths come from `useWindowDimensions`.
- **No `allowFontScaling` or `maxFontSizeMultiplier` anywhere.**
- NativeWind is configured, but no screen uses `className`; all layout is inline styles.

**Test matrix:**
- screens: 320×640, 360×640, 411×891, and a ≥600 dp tablet or unfolded foldable in landscape
- font scale (`adb shell settings put system font_scale …`): 1.0, 1.3 and 2.0
- navigation: 3-button and gesture

### 5.1 Fixed sizes

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app/(tabs)/dashboard.tsx:125` | The snapshot header (greeting, hero card, 3 stat cards, about 290 dp) sits **outside** the ScrollView. At large font or on short screens almost nothing is left to scroll. | Move it into the ScrollView, or collapse it on scroll; keep only the greeting fixed. |
| High | `app/(auth)/onboarding-tour.tsx:133` | The hero is `height: 280` and the slide does not scroll vertically, so it overflows 360×640. | `clamp(140, height*0.3, 280)`; vertical ScrollView per slide. |
| Med | `app/(tabs)/profile.tsx:383` (name at :398–399, stats at :407) | Fixed 176 dp identity overlay, with the name absolutely placed and no `numberOfLines`. A long name or big font overlaps the stats. | `numberOfLines={2}` plus a cap; derive the offset from `onLayout`. |
| Low | `app/(tabs)/profile.tsx:76` | `insets.top` is added inside a SafeAreaView that already pads it, which leaves an extra gap. | `edges={['bottom']}`, or drop the extra inset. |
| Med | `components/results/ResultScannerModal.tsx:168` (scan line :81) | Camera frame fixed at `height: 276`; the permission state clips at large font; the scan-line travel is hard-coded to 214. | `aspectRatio: 3/4`, `maxHeight: 0.45*height`; derive the travel from the measured height. |
| Med | `app/(tabs)/insights.tsx:601` (ring :603–607) | Risk card fixed at 142 dp wide with a 116 dp ring; at 320 dp the sibling card gets about 106 dp. | `width: '42%'`, `maxWidth: 180`; ring sized from `onLayout`. |
| Low | `app/(tabs)/insights.tsx:628` | A 40×40 box holds 9 px course-code text, which clips when scaled. | `minWidth` and padding; cap the multiplier at 1.2. |
| Low | `app/(tabs)/results/[semesterId].tsx:454` | Grade badge `height: 30` holds "ADD SCORE". | `minHeight` and vertical padding. |
| Low | `app/(auth)/register.tsx:406, :487, :509` | "Get Code" fixed at 48; chips fixed at 40 and 36. | `minHeight`. |
| Low | `components/ui/PickerField.tsx:139, :205, :214` | Field height 54; search box 50 with `height:'100%'`. | `minHeight`. |
| Info | `components/dashboard/CGPAArc.tsx:9`, `BentoGrid`, `KPICard` | Fixed SIZE 240; these components are not imported anywhere. | Delete them, or size from props if revived. |

### 5.2 Text overflow at 320–360 dp and font scale 1.3–2.0

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app/(tabs)/dashboard.tsx:147` (label :154) | Hero row: a 40 px number next to "2:1 · Second Class Upper (2:1)", with no flex or shrink. That is about 370 dp in about 296 dp, so the degree label is cut for 2:1 and 2:2 students. | Right column `flex:1, flexShrink:1, numberOfLines:2`; drop the duplicated short label. |
| High | `app/(tabs)/dashboard.tsx:157` | The pills row has no `flexWrap`; three pills (about 300 dp) overflow at ≤360 dp. | `flexWrap:'wrap'`, `rowGap`. |
| High | `app/(tabs)/_layout.tsx:186` (label :189) | Tab bar: the focused pill (min 106 dp) plus 4×46 dp exceeds 280 dp at 320 dp, and overflows at 360 dp from scale about 1.3. | Cap the label at 1.2; compute the pill width from the available width; hide the label below a threshold. |
| Med | `app/(tabs)/dashboard.tsx:128` (:130) | The greeting has no `flex:1`; a long name pushes the avatar off-screen. | `flex:1`, `numberOfLines`. |
| Med | `app/(tabs)/dashboard.tsx:263` | Stat card about 64 dp wide at 320 dp; overflows at ≥1.3. | Stack the icon over the label; value with `numberOfLines={1}` and `adjustsFontSizeToFit`. |
| Med | `components/ui/Button.tsx:75` | The label has no `flexShrink` or `numberOfLines`. "Create 400L Second Semester" (`new.tsx:143`), side-by-side buttons (`[semesterId].tsx:410–413`) and `transcript.tsx:207` overflow. | `flexShrink:1`, `textAlign:'center'`, `numberOfLines:2`. |
| Med | `app/(tabs)/transcript.tsx:198` | The photo toggle plus "Share Link" need about 283 dp. | Stack on compact widths. |
| Med | `app/(tabs)/insights.tsx:465` (:467) | The trend pill shows server text next to a 30 px number, with no shrink. | `flexShrink:1`, `numberOfLines:2`. |
| Med | `app/(tabs)/insights.tsx:286` | 4 segment tabs at about 70 dp each with 10 px labels; ellipsised at ≥1.5. | Cap at 1.3, or use scrollable segments. |
| Med | `app/(tabs)/insights.tsx:560` | "Remaining semesters (max N)" wraps, so the inputs misalign. | Shorter label, or stack below 360 dp. |
| Med | `app/(tabs)/results/index.tsx:272` | Fixed 32/36/42 dp columns with 9–10 px text. | Cap cells at 1.3; `minWidth`. |
| Med | `app/(tabs)/transcript.tsx:323` | Preview uses 7–9 px text in 24–35 dp columns. | A horizontally scrolling table at ≥11 px, or a rendered PDF image. |
| Med | `app/(tabs)/notifications.tsx:115` | The title collides with "Mark all read" at large font. | Use `FixedPageHeader` (it already has the right pattern at `FixedPageHeader.tsx:52`). |
| Low | `[semesterId].tsx:398`; `dashboard.tsx:150`; `insights.tsx:464, :552, :608` | Hero numbers at 2.0 overflow a 320 dp card. | `maxFontSizeMultiplier ≈ 1.2` for hero numbers. |
| Low | `results/new.tsx:99`; `profile.tsx:470` (:720) | The left group has no flex; the timeline subtitle is cut to 1 line. | `flex:1`; allow 2 lines. |
| Low | `_layout.tsx:204`, `:127` and many 9–10 px labels | Informative text is below 11 sp. | Minimum 11–12 sp. |

### 5.3 Safe areas

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app/(tabs)/notifications.tsx:143` | FlatList `paddingBottom: 24` sits under the absolute tab bar (about 64 dp plus inset), so the last items cannot scroll clear. | `paddingBottom = tabBarHeight + 16` via a shared hook. |
| Med | `app/(tabs)/results/new.tsx:84` | `paddingBottom: 48` is less than the tab bar overlap, so the Create button sits under the bar. | Same hook. |
| Med | `app/(tabs)/_layout.tsx:154` | The tab bar is absolute on every route, including pushed Results screens and the hidden profile and notifications routes. Every screen hard-codes `paddingBottom: 120` (`dashboard.tsx:181`, `results/index.tsx:121`, `[semesterId].tsx:391`, `insights.tsx:300`, `profile.tsx:407`, `transcript.tsx:196`). | Export a `useTabBarOverlap()` hook; hide the bar on pushed routes. |
| Med | `[semesterId].tsx:608` (CourseCodeModal), `:735` (AddCourseModal); `profile.tsx:526` (theme sheet); `ResultScannerModal.tsx:391` (tips) | Sheets use a fixed `paddingBottom: 32`. Edge-to-edge Modals draw under a 48 dp 3-button nav bar. | `paddingBottom = insets.bottom + 16`. |
| Med | `app/(tabs)/_layout.tsx:42` | The More sheet adds `min(insets.bottom, 24)`, but a 3-button bar is 48 dp. | Pass `bottomInset={insets.bottom}`. |
| Low | `components/RootErrorBoundary.tsx:43`; `app/_layout.tsx:200` | Hard-coded `paddingTop: 80` / no safe area. | SafeAreaView. |

### 5.4 Keyboard avoidance

The app is edge-to-edge, so Android does **not** resize the window for `adjustResize`. Only JS keyboard handling moves content. Verify this on a device.

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app/(tabs)/insights.tsx:295` (inputs :560–561) | The What-If inputs sit in a ScrollView with no KeyboardAvoidingView. `automaticallyAdjustKeyboardInsets` (:297) is iOS-only, so the keyboard covers the inputs. | `react-native-keyboard-controller` `KeyboardAwareScrollView`. |
| High | `app/(tabs)/profile.tsx:584` (input :597) | Timeline sheet: a KAV wraps a non-scrolling sheet of about 590 dp, so the top and the input are pushed off-screen. | Sheet `maxHeight` plus an inner ScrollView (`keyboardShouldPersistTaps="handled"`). |
| Med | `app/(tabs)/profile.tsx:636` | Delete-account sheet: same pattern. | Same. |
| Med | `app/(tabs)/results/[semesterId].tsx:603` | CourseCodeModal does not scroll; the header and close button are pushed off. | Same. |
| Med (verify) | `[semesterId].tsx:713`; `profile.tsx:584, :636` | KAVs inside an RN `Modal` (a separate window). It is unconfirmed whether they receive keyboard events under edge-to-edge. | keyboard-controller's KAV. |
| Low | `[semesterId].tsx:802, :805` | `scrollTo({y:215})` is hard-coded on focus. | Measure-based scroll-to-input. |
| Low | `components/ui/PickerField.tsx:178` | `android_keyboardInputMode="adjustResize"` assumes a window resize. | keyboard-controller, or `adjustPan`. |
| OK | `login.tsx:70`, `forgot-password.tsx:92`, `register.tsx:327`, `[semesterId].tsx:713–741` | KAV plus ScrollView plus `keyboardShouldPersistTaps`. | — |

### 5.5 Landscape and tablet

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app.json:6`; `AndroidManifest.xml:28` | Portrait lock. With targetSdk 36, Android 16 **ignores** orientation and resizability locks on displays ≥600 dp, so tablets and foldables will run landscape and resizable anyway. | Make layouts width-aware (below). The `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` opt-out is temporary. |
| Med | all screens | No maximum content width except the tab bar (430 dp, `_layout.tsx:155`) and the tour card (420 dp). Cards stretch to 800–1200 dp. | A shared `Screen` wrapper: `maxWidth: 640`, `alignSelf: 'center'`. |
| Low | `onboarding-tour.tsx:92` | The pager does not re-snap when the width changes. | `scrollTo(index*width)` on width change. |
| Low | `dashboard.tsx:166`; `results/index.tsx:125`; `[semesterId].tsx:401, :761, :810` | Fixed 3- and 6-column chip rows (about 42 dp chips at 320 dp). | `flexWrap`, or 2 rows when compact. |
| Low | `components/ads/AndroidBanner.tsx:26` | The inline adaptive banner has no `width` or `maxHeight`. | Pass the container width and `maxHeight ≈ 120`. |

### 5.6 Sheet and modal heights

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| High | `app/(tabs)/profile.tsx:543` (QR :562) | Share-app sheet about 590 dp and not scrollable; the top is cut at ≥1.3 on 640 dp phones. | `maxHeight = height − insets.top − 24` plus ScrollView; QR `min(172, width*0.45)`. |
| High | `components/results/ResultScannerModal.tsx:389` | Scanner tips sheet about 540 dp, not scrollable; the close button is cut off. | Same. |
| Med | `components/release/UpdateNoticeHost.tsx:125` (image :126) | Centred card that does not scroll; a long required-update message pushes "Download now" off-screen. | ScrollView plus `maxHeight`. |
| Med | `app/(tabs)/_layout.tsx:41` (:110) | More sheet: fixed snap points 220/340 and a non-scrolling view. | `enableDynamicSizing`, or `BottomSheetScrollView`. |
| Low | `components/ui/SwipeDismissSheet.tsx:53` | Dismiss animates to a fixed 520 dp. | Animate to the window height; add `maxHeight` and inset props. |
| Low | `components/ui/ConfirmDialogHost.tsx:77` | No scroll for long messages at 2.0. | ScrollView for the message. |

### 5.7 Charts

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| Low | `app/(tabs)/insights.tsx:457`; `dashboard.tsx:236` | Width is `window − 64`, but the real inner width is `window − 66` (2 dp overflow). | Measure the container with `onLayout`. |
| Low | `components/dashboard/TrendChart.tsx:56, :67–68` | 8–9 px axis text ignores font scale, and one label per point collides at 10+ semesters. | 10–11 px × `min(fontScale, 1.3)`; skip labels when the step is under 22 dp. |
| Med | `app/(tabs)/insights.tsx:604` | Fixed 116 dp risk ring. | See 5.1. |

### 5.8 Tap targets under 48 dp

| Sev | file:line | Issue | Fix |
|---|---|---|---|
| Med | `app/(auth)/login.tsx:112, :134`; `register.tsx:375` | Text links about 18 dp tall, no `hitSlop`. | `minHeight: 48`, or `hitSlop: 15`. |
| Med | `app/(tabs)/dashboard.tsx:188` (avatar :132) | "View All" about 18 dp; the 42 dp avatar has no slop. | `hitSlop`. |
| Med | `app/(tabs)/notifications.tsx:117, :123` | Back button 42 dp; "Mark all read" about 18 dp. | `FixedPageHeader` plus a 48 dp `IconButton`. |
| Med | `[semesterId].tsx:618, :626, :747` | Close X 37 dp; copy button 42 dp. | 48 dp `IconButton`. |
| Med | `[semesterId].tsx:768, :788, :812` | Unit and grade chips about 39 dp; mode segment about 33 dp. | `minHeight: 48`. |
| Med | `ResultScannerModal.tsx:133, :372, :377` | Close 42 dp; "Scan again" about 30 dp; "Enter details manually" about 31 dp. | `minHeight: 48`. |
| Low | `insights.tsx:283, :472, :486` | Segments 40 dp; "Refresh forecast" about 31 dp; mode toggle 36 dp. | `minHeight: 48`. |
| Low | `transcript.tsx:205, :215` | Share icon 34 dp; Switch scaled to 0.65. | Pad to 48. |
| Low | `results/index.tsx:312`; `profile.tsx:511, :601, :606, :611` | "＋ Add Course" 37 dp; Log Out 43 dp; steppers 44 dp; chips 33 dp. | `minHeight: 48`. |
| Low | `login.tsx:106, :157`; `register.tsx:446, :451, :487, :509`; `forgot-password.tsx:120`; `onboarding-tour.tsx:79` | Password eye 34 dp; segmented pill 37 dp; chips 36–40 dp; Skip 33 dp. | `hitSlop: 15` / `minHeight: 48`. |
| Low | `components/ui/ToastHost.tsx:58`; `UsageTourHost.tsx:222`; `_layout.tsx:186` | Toast X 37 dp; tour X 41 dp; unfocused tabs 46×50. | `hitSlop: 16`; `minWidth: 48`. |

### 5.9 Other things found

- **Security:** `components/security/AppLockScreen.tsx:77`. The lock screen is an `absoluteFill` View, not a Modal, so RN Modals (sheets, scanner, update notice, tour) draw **above** it. Render it as a top-level Modal, or close open modals on lock.
- **Toasts under Modals:** `ToastHost` renders beneath any open RN Modal, so toasts such as "Code copied" (`[semesterId].tsx:504`) and the scanner errors are invisible while a sheet is open.
- **Hard-coded tour scroll offsets** misalign at other font scales: `results/index.tsx:146`, `[semesterId].tsx:429, :759, :782`, `profile.tsx:464, :471`, `transcript.tsx:219, :241`. Use measured positions.
- **The native `android/` folder is committed**, so `app.json` orientation and keyboard edits need `npx expo prebuild` or manual manifest edits.

### 5.10 Global fixes, in order

1. **Keyboard:** add `react-native-keyboard-controller` (`KeyboardProvider` at the root, `KeyboardAwareScrollView` for forms, its KAV inside sheets).
2. **Font-scale policy:** add `AppText` / `AppTextInput` wrappers with caps: hero numbers 1.2; tab, segment, pill, badge and table labels 1.3; body 2.0. Give `Button` labels `flexShrink`.
3. **`useResponsive()`** returns `{ width, fontScale, isCompact: width < 360, isExpanded: width >= 600, contentWidth: min(width, 640) − gutters }`. Use it for charts, QR codes, hero sizes and column counts.
4. **Shared building blocks:**
   - `Screen`: top-edge safe area, `maxWidth: 640`, bottom padding from `useTabBarOverlap()`
   - `Sheet`: `maxHeight`, inner scroll, inset padding, keyboard-aware. Use it for **Help**, timeline, delete, share, tips and course-code sheets.
   - `IconButton`: 48 dp minimum. Use it for the Help "?".
5. **Tab bar:** export its height; hide it on pushed or hidden routes and while the keyboard is open; cap label scaling; size the pill from the available width.
6. **Tablet:** support width-aware layouts (Android 16 ignores the portrait lock on ≥600 dp).
7. Replace the hard-coded tour offsets.

### 5.11 Top 10 by user impact

1. `dashboard.tsx:147–161`: the hero row and pills overflow at ≤360 dp, cutting off the degree class.
2. `_layout.tsx:155–189`: the tab bar overflows at 320 dp, and at 360 dp from font scale 1.3.
3. `insights.tsx:295/560`: the keyboard covers the What-If inputs.
4. `profile.tsx:583–681` and `[semesterId].tsx:602–641`: non-scrolling sheets with inputs; the keyboard pushes them off-screen.
5. `dashboard.tsx:125–175`: the fixed header eats the viewport at large font or on short screens.
6. `welcome.tsx:28–64` and `onboarding-tour.tsx:133`: the first-run calls to action become unreachable at large font.
7. `profile.tsx:543`, `ResultScannerModal.tsx:389`, `UpdateNoticeHost.tsx:125`: tall cards and sheets that do not scroll are clipped.
8. Content under the tab bar (`notifications.tsx:143`, `new.tsx:84`) and sheets under the 3-button nav bar (`[semesterId].tsx:608/735`, `profile.tsx:526`, `ResultScannerModal.tsx:391`).
9. No font-scale policy, `Button.tsx:75` labels cannot shrink, and fixed-width tables (`results/index.tsx:272`, `transcript.tsx:323`).
10. Many tap targets under 48 dp (auth links, close X's, chips, segments, header text actions).

---

## Part 6. Implementation order

1. **Safety first** (small, high value):
   - Users → confirm before Disable.
   - Remove or relocate "Reset All Onboarding".
   - Announcements → split Save from Send, with a confirmation.
   - Honest "Web only" labels on maintenance and feature switches.
   - Replace the Grade Scale editor with a read-only panel.
2. **Labels and navigation:** route-meta, AdminShell groups and H1s (the 3.3 table). Fix the Android "CGPA (4.0 Scale)" label.
3. **Help system:**
   - `lib/help/*` (types, admin, student, routes)
   - web `HelpButton` and `HelpPanel`, wired to `PageHeader` and `StudentShell`
   - Android `HelpButton` and `HelpSheet`, plus "Replay tour"
   - the sync script and lock test
4. **Page restructures:**
   - Settings tabs.
   - AI providers (bootstrap banner, prompt moved in, key-disable confirmation).
   - Free uses & coins: readiness strip. This waits for the in-flight coin section to land, and the page must read `data.policy`.
   - Advertising tabs: Status first, then the House promotions matrix. Do this after the in-flight diagnostics land.
   - Android release download links.
5. **Cross-app correctness (2.1):**
   - web CGPA scope
   - degree-class bounds
   - web code import merge
   - record mode
6. **Android responsiveness:**
   - global fixes 1–5, then the top-10 list
   - add the Help "?" to every header in the same pass
7. **Optional behaviour:** server and Android enforcement of maintenance (3.6).

## Part 7. Decisions taken (owner said "you are the boss")

- **Rewarded switch vs coins:** storage stays split. Advertising owns ad delivery (`config/mobileAds`); Free uses & coins owns the economy (`config/usage.coins`). A shared readiness strip on both pages removes the hidden coupling. This is the only arrangement that keeps installed APKs working.
- **iOS ad settings:** kept, but collapsed under Advanced on the Android AdMob tab.
- **Course catalogue:** removed from navigation and kept reachable. Delete it later if nobody objects.
- **Grade scale:** read-only. Making it editable would change every student's historic grades on both apps and needs an Android release; the current fixed Nigerian 5-point scale stays.
- **Email:** a tab in Settings, not a separate page (one fewer nav item, same component).
- **Student help copy:** one canonical file, synced to Android and checked by a test.
- **Help on web student pages:** the button lives in the shell header, so every authenticated page gets it without per-page edits.

**Questions that need the owner** (everything else is decided above):

1. Should **maintenance mode** really block the Android app and the APIs (a behaviour change, 3.6), or is a web-only maintenance page enough? Until the owner answers, the label stays "Web maintenance screen".
2. Can the **"Reset All Onboarding (Test)"** control be deleted outright? It writes to every account and does not do what its name says.
