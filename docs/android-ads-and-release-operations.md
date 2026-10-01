# Android ads and APK release controls

The admin screens are `/admin/ads` (Android AdMob) and `/admin/mobile-release` (APK update notice). Both are off until an administrator saves enabled settings. Mobile reads public, validated configuration; it does not receive admin credentials.

iOS preparation (2026-10-01): `/admin/ads` also has an independent iOS AdMob section for Dashboard banner, Results banner, and reserved Rewarded IDs. It saves to `config/iosAds` and exposes `/api/ads/ios`; Android continues using `config/mobileAds` and `/api/ads/mobile`. The supplied iOS App ID is recorded in `AcadeGrade-Mobile-App-iOS/app.json` as `GADApplicationIdentifier`. The iOS native SDK/plugin, consent flow, and banner renderer still need integration before these settings can show ads. Keep iOS ads off while preparing its units.

## Android AdMob beta

Placement update (2026-10-01): `/admin/ads` now has separate Dashboard and Results banner ad unit ID fields. Each enabled live placement requires its own ID; test mode uses test units. Legacy shared-ID records populate both fields, and the public API keeps a shared ID for older installed clients. Rebuild Android to use the separate placement IDs. Android rewarded refresh now has its own opt-in switch; iOS rewarded delivery remains reserved.

The Android Expo plugin now uses the operator's real AdMob App ID from `acadegrade-mobile/acadegrade_apis.txt`. The banner guard derives live eligibility from that configuration instead of a hard-coded sample flag. Build a new APK for this native configuration change and separate Dashboard/Results routing. Test mode and development builds still request Google's test banner units. Development builds hide rewarded delivery when admin test mode is off, rather than mixing a live server session with a demo ad.

Keep **Use test ads** on for APK development, even when real unit IDs have been entered in admin. Native SDK/plugin changes need a new Android build; Expo Go does not include this SDK. The dashboard and results overview are the only banner placements, using inline adaptive banners and hiding labels/spacing on load failure. No ad blocks a form, OCR, or a normal Insights refresh. The app delays ad measurement, requests UMP consent before SDK initialization, and loads no ad when consent does not permit requests. Configure the privacy message in AdMob before device testing. The separate iOS project has admin configuration prepared but no native ad renderer yet.

Before live delivery, build and verify the new APK with the real App ID and test ads, confirm the saved placement IDs and consent setup, then switch off test mode only when device and account readiness checks are complete. Previously installed sample-ID APKs still suppress live delivery. APK-only distribution may receive limited ad serving until the app is linked to a supported store and reviewed. Use test units on developer devices.

## APK update notice

Build number comes from Android's installed native version code, currently initialized as `1` in `app.json`; the admin `Latest build` must exceed that number to show an update. `Minimum supported build` makes only *lower* installed builds mandatory. If set to `0`, the `Allow users to ignore` switch controls whether all older builds receive an optional or mandatory notice. Admins upload optional notice artwork in the release editor; Save publishes the hosted image URL with the release record. Set the APK download URL to an HTTPS location you control, test that it opens and installs before publishing a mandatory notice, and use the admin enable switch as the emergency kill switch. Optional metadata uses a 24-hour cache; mandatory-capable notices revalidate on app resume so the kill switch can take effect promptly (subject to the API's short HTTP cache). Invalid or unavailable metadata fails open; a mandatory notice offers temporary recovery after failed reachability or browser handoff. Only Download now opens the link.

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
