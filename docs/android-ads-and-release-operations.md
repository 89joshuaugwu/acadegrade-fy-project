# Android ads and APK release controls

The admin screens are `/admin/ads` (Android AdMob) and `/admin/mobile-release` (APK update notice). Both are off until an administrator saves enabled settings. Mobile reads public, validated configuration; it does not receive admin credentials.

iOS preparation (2026-10-01): `/admin/ads` also has an independent iOS AdMob section for Dashboard banner, Results banner, and reserved Rewarded IDs. It saves to `config/iosAds` and exposes `/api/ads/ios`; Android continues using `config/mobileAds` and `/api/ads/mobile`. The supplied iOS App ID is recorded in `AcadeGrade-Mobile-App-iOS/app.json` as `GADApplicationIdentifier`. The iOS native SDK/plugin, consent flow, and banner renderer still need integration before these settings can show ads. Keep iOS ads off while preparing its units.

## Android AdMob beta

Placement update (2026-10-01): `/admin/ads` now has separate Dashboard and Results banner ad unit ID fields. Each enabled live placement requires its own ID; test mode uses test units. Legacy shared-ID records populate both fields, and the public API keeps a shared ID for older installed clients. Rebuild Android to use the separate placement IDs. Android rewarded refresh now has its own opt-in switch; iOS rewarded delivery remains reserved.

The Android Expo plugin now uses the operator's real AdMob App ID from `acadegrade-mobile/acadegrade_apis.txt`. The banner guard derives live eligibility from that configuration instead of a hard-coded sample flag. Build a new APK for this native configuration change and separate Dashboard/Results routing. Test mode and development builds still request Google's test banner units. Development builds hide rewarded delivery when admin test mode is off, rather than mixing a live server session with a demo ad.

Keep **Use test ads** on for APK development, even when real unit IDs have been entered in admin. Native SDK/plugin changes need a new Android build; Expo Go does not include this SDK. The dashboard and results overview are the only banner placements, using inline adaptive banners and hiding labels/spacing on load failure. No ad blocks a form, OCR, or a normal Insights refresh. The app delays ad measurement, requests UMP consent before SDK initialization, and loads no ad when consent does not permit requests. Configure the privacy message in AdMob before device testing. The separate iOS project has admin configuration prepared but no native ad renderer yet.

Before live delivery, build and verify the new APK with the real App ID and test ads, confirm the saved placement IDs and consent setup, then switch off test mode only when device and account readiness checks are complete. Previously installed sample-ID APKs still suppress live delivery. APK-only distribution may receive limited ad serving until the app is linked to a supported store and reviewed. Use test units on developer devices.

## Android sponsor campaigns (independent of AdMob)

Under `/admin/ads` → Android, **Android house promotions** controls the new native sponsor slots. These default off. Enable sharing, choose Dashboard and/or Results, and save this section independently of AdMob. Active campaigns, artwork, scheduling, weights and caps remain under Web → My promotions. The web master switch does not enable Android, and the Android switch does not enable web. Optional legacy fallback reuses active legacy banners only when no new campaign is eligible. No campaigns or old banner records are migrated or deleted.

This uses `config/mobileHouseAds` through `/api/admin/ads/house` and the display-only `/api/ads/house`. A new Android APK is required for the `HousePromotion` renderer. Public payloads contain display fields only; no scripts, secrets, administrator credentials or arbitrary native code are sent. Local per-installation caps are consumed only when the promotion is visibly on the focused foreground screen; they are not server-certified advertiser analytics. Failed artwork/configuration/storage hides optional content rather than blocking results.

## Feature credits and allowances

`/admin/usage` manages the free daily ceilings for Written Analysis, Forecast, What-if guidance and result scanning. The existing default values and burst limits remain until you explicitly save different daily values. Lowering a ceiling applies against existing counters without resetting them; zero pauses new free provider requests but not cached results or local calculations. Per-feature summaries are authenticated snapshots from `/api/ai/usage`, not client-owned coin balances. See `lib/usage/README.md` for reset semantics.

If `/admin/usage` shows a yellow policy warning, some stored fields were missing or invalid and their defaults are in force (every valid stored field, including a 0 pause, is still honoured). Review the named fields and save to replace them. A deployment saved before coins existed shows "Coin settings (not saved yet)" until the first save. Transcript sharing has no new monthly cap.

## Coins (Android rewarded ads)

Decision 2026-11-13: rewarded extras use one server-owned coin balance. One verified rewarded ad earns coins; each feature has a coin price that is charged only when its free allowance (or the Written Analysis regeneration cooldown) would refuse the request. Coins are not money and cannot be bought, transferred or cashed out. Coins are **off by default**.

Operator steps, in order, none of which this repository change performed:

1. Deploy the web API **and** `firestore.rules` (new server-only collections `_coin_wallets`, `_coin_ledger`, `_coin_requests`; clients are denied). Do not configure TTL on `_coin_requests` or `_coin_ledger`: deleting them would reopen double charges or erase the audit trail.
2. Keep the existing AdMob rewarded unit and its SSV callback (`/api/ads/rewards/ssv`). The unit's reward item stays exactly **Insights refresh** with amount **1**: the server decides how many coins a verified ad is worth, and the session (`custom_data`) binds the callback to a coin session. No second unit is needed.
3. In `/admin/ads` → Android, enable ads and **Enable rewarded Insights refresh** with a valid rewarded unit (or test mode). Earning coins requires this switch; spending existing coins does not.
4. Build and install an Android APK with coins support. Installed APKs without it never create coin sessions or spend coins, and keep using the legacy Written Analysis refresh (2 per UTC day), which is independent of coins.
5. On an AdMob-registered test device with test ads, in `/admin/usage` → **Coins (Android rewarded ads)** set coins per ad (1–10), daily earn cap (0–100), balance cap (1–500) and, per feature, enabled, price (1–20) and daily coin uses (0–50). Defaults: 2 per ad, 10 per day, cap 30; scanning 3 coins/5 per day, Written Analysis 2/2, Forecast 1/5, What-if 1/10. Then switch **Enable coins** on and save.
6. Verify end to end before telling users: a pending → credited session after a signed callback, the balance in the app, a free request costing nothing (`X-Coins-Spent: 0`), a refused free request charging the price once, a provider failure refunding ("your coins were not spent"), and replays not charging twice. The admin status lines remain "Live delivery not verified" until you have done this.

To stop coins quickly, switch **Enable coins** off: new sessions and spends are refused (403), callbacks for pending coin sessions are rejected, and balances are kept. Switching the Android rewarded switch off stops earning only. A daily earn cap of 0 pauses earning; a feature's daily coin uses of 0 blocks spending on that feature. Lowering prices or caps applies to the next request.

## APK update notice

Build number comes from Android's installed native version code, not the local `app.json` value when EAS remote auto-increment is enabled. Read the actual installed build in Settings > App updates or EAS build details. Admin `Latest build` must exceed that number to show an update. `Minimum supported build` makes only *lower* installed builds mandatory. If set to `0`, the `Allow users to ignore` switch controls whether all older builds receive an optional or mandatory notice. Admins upload optional notice artwork in the release editor; Save publishes the hosted image URL with the release record. Set the APK download URL to an HTTPS location you control, test that it opens and installs before publishing a mandatory notice, and use the admin enable switch as the emergency kill switch. Optional metadata refreshes every six hours while active and on the next launch/resume after expiry; Android may suspend closed/background apps, so this is not an exact background alarm. Settings > Check for updates bypasses the cache immediately and can reopen a dismissed optional notice without erasing its stored dismissal. Mandatory-capable notices revalidate on app resume so the kill switch can take effect promptly (subject to the API's short HTTP cache). Invalid or unavailable metadata fails open; a mandatory notice offers temporary recovery after failed reachability or browser handoff. Only Download now opens the link. These client changes require an updated APK; changing admin configuration cannot add new code to an older installed app.

Before browser handoff, Android now checks HTTPS reachability with a five-second deadline. HEAD-unsupported servers are checked with a ranged GET. HTTP errors, unsafe redirects, network failure, timeout, and browser handoff failure expose Retry and a session-only continue action for mandatory notices. This cannot prove that a successful HTTP 200 page contains a valid/installable APK: test the complete download/install manually.

Do not enable a mandatory release until the APK has been tested on an older installed build and the download URL is proven reachable. Roll back by disabling the notice in admin. A currently open modal re-checks when the app next resumes; verify this with an older-build device before relying on the kill switch operationally.

## Rewarded Written Analysis refresh

The Android Written Analysis tab offers an optional ad button when Android ads and **Enable rewarded Insights refresh** are both enabled. Normal free refresh and cached analysis remain available. A completed ad earns one extra refresh, not an unlimited cooldown bypass. The server limits earned and used rewards to two per UTC day, with additional session-creation limits. Pending sessions expire after 30 minutes; earned rewards expire after 24 hours. The mobile callback never grants a reward.

Deploy the web API and Firestore rules before enabling this switch. New server-only collections are `_reward_sessions`, `_reward_daily`, and `_reward_transactions`. Firebase Admin accesses them; client SDKs must remain denied. Transaction tombstones must not be deleted because they prevent replay. Optional Firestore TTL cleanup may be configured on session `ttlAt` only.

Configure the rewarded unit in AdMob with amount **1** and item exactly **Insights refresh**. Its server-side verification callback is:

```text
https://acadegrade.vercel.app/api/ads/rewards/ssv
```

Use your actual deployed API origin if different. This URL is an implementation target, not a claim that deployment has occurred. In the AdMob unit's SSV settings, run its verification tool and save the callback after it succeeds. An unsigned browser visit is expected to fail; it is not a health check. A signed AdMob verification request without an app session is acknowledged as validation-only and grants nothing. The app sets `user_id` and `custom_data` automatically for a server-created session.

The server verifies Google's ECDSA signature over the original query, then binds the transaction to the user, session, unit and reward. Duplicate callbacks cannot grant twice. Refresh uses a transactional lease; successful generation saves analysis and consumes the reward atomically. Provider failure or a cached fallback leaves the reward available to retry. Generation attempts, including failed retries, are capped at six per fixed hour and twelve per UTC day so failure recovery cannot create unlimited provider calls. A crash lease expires after five minutes. No-fill/early-close sessions grant nothing; the user can check delayed confirmation or cancel a still-pending session.

Testing has two distinct stages. **Use test ads** requests Google's demo units for safe rendering/close/no-fill checks; those units belong to Google, not your account, so do not assume your unit's configured callback will receive demo traffic. Verify your callback with AdMob's signed SSV test tool, then exercise the full reward path using your own unit on an AdMob-registered test device and a release/test APK. Confirm the ad is labelled Test Ad before interacting. Register the device before briefly disabling the admin demo-unit mode, and keep ordinary users' ads disabled during this test. Never substitute a client-only grant to make demo ads unlock rewards. See [Google test-ad guidance](https://developers.google.com/admob/android/test-ads) and [SSV validation guidance](https://developers.google.com/admob/android/ssv).

Still required before live delivery: API/rules deployment, signed callback verification, device consent checks, early close/completion/delayed callback/replay tests, AI-failure retry, banner layout checks, and account/store readiness. Native iOS ads are a separate unfinished phase.

## Web delivery status, previews and the Results placement (2026-11-13)

`/admin/ads` → Web → **Delivery status** computes, from saved settings only, what each web placement should serve right now and why: master/format/placement switches, campaigns outside their schedule (with the next schedule change), zero weights, creative gaps, per-browser caps, legacy fallback, and AdSense/Adsterra configuration. The Android tab shows the same for the Android house-promotion slots. This is configuration status, not proof that anything rendered, was approved or filled; unsaved edits are not included. It makes no ad request and records no views.

Campaign and legacy-banner editors have a **Preview** disclosure that renders the creative in the student slot at desktop and 375 px widths. Previews have no link, view counting or ad-network request; only the creative's own image loads.

**Results overview** is an additional web house-campaign placement after the semester list on `/results`. It is off until switched on in Placements and targeted by a campaign; older saved configurations without it are treated as off. Legacy banners and ad networks are never used there, and Android house promotions still use only campaigns that target Dashboard overview.

Delivery behaviour: an image creative renders, and becomes countable, only after its image loads; a failed image hides it. An unfilled or blocked AdSense unit hides its box. Campaign image and destination URLs must be HTTPS without a username or password; a stored campaign that no longer passes validation is skipped on its own (and listed in My promotions) instead of hiding every campaign. Browsers running a cached older build cannot parse a configuration saved with the Results placement and show no house promotion until they load the new build.
