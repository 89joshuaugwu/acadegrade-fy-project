# Android ads and APK release controls

The admin screens are `/admin/ads` (Android AdMob) and `/admin/mobile-release` (APK update notice). Both are off until an administrator saves enabled settings. Mobile reads public, validated configuration; it does not receive admin credentials.

iOS preparation (2026-10-01): `/admin/ads` also has an independent iOS AdMob section for Dashboard banner, Results banner, and reserved Rewarded IDs. It saves to `config/iosAds` and exposes `/api/ads/ios`; Android continues using `config/mobileAds` and `/api/ads/mobile`. The supplied iOS App ID is recorded in `AcadeGrade-Mobile-App-iOS/app.json` as `GADApplicationIdentifier`. The iOS native SDK/plugin, consent flow, and banner renderer still need integration before these settings can show ads. Keep iOS ads off while preparing its units.

## Android AdMob beta

Placement update (2026-10-01): `/admin/ads` now has separate Dashboard and Results banner ad unit ID fields. Each enabled live placement requires its own ID; test mode uses test units. Legacy shared-ID records populate both fields, and the public API keeps a shared ID for older installed clients. Rebuild Android to use the separate placement IDs. Rewarded refresh remains reserved.

The Android Expo plugin now uses the operator's real AdMob App ID from `acadegrade-mobile/acadegrade_apis.txt`. The banner guard derives live eligibility from that configuration instead of a hard-coded sample flag. Build a new APK for this native configuration change and separate Dashboard/Results routing. Test mode and development builds still request Google's test units. Rewarded refresh is not implemented yet.

Keep **Use test ads** on for APK development, even when real unit IDs have been entered in admin. Native SDK/plugin changes need a new Android build; Expo Go does not include this SDK. The dashboard and results overview are the only banner placements. No ad blocks a form, OCR, or an Insights refresh. The app delays ad measurement, requests UMP consent before SDK initialization, and loads no ad when consent does not permit requests. Configure the privacy message in AdMob before device testing. Rewarded unit ID is reserved and does not grant a refresh yet. The separate iOS project has admin configuration prepared but no native ad renderer yet.

Before live delivery, build and verify the new APK with the real App ID and test ads, confirm the saved placement IDs and consent setup, then switch off test mode only when device and account readiness checks are complete. Previously installed sample-ID APKs still suppress live delivery. APK-only distribution may receive limited ad serving until the app is linked to a supported store and reviewed. Use test units on developer devices.

## APK update notice

Build number comes from Android's installed native version code, currently initialized as `1` in `app.json`; the admin `Latest build` must exceed that number to show an update. `Minimum supported build` makes only *lower* installed builds mandatory. If set to `0`, the `Allow users to ignore` switch controls whether all older builds receive an optional or mandatory notice. Admins upload optional notice artwork in the release editor; Save publishes the hosted image URL with the release record. Set the APK download URL to an HTTPS location you control, test that it opens and installs before publishing a mandatory notice, and use the admin enable switch as the emergency kill switch. Optional metadata uses a 24-hour cache; mandatory-capable notices revalidate on app resume so the kill switch can take effect promptly (subject to the API's short HTTP cache). Invalid or unavailable metadata fails open; a mandatory notice offers a temporary continue action if Android cannot open the download URL. A dead HTTPS page that the OS opens is not yet detected. Only Download now opens the link.

Do not enable a mandatory release until the APK has been tested on an older installed build and the download URL is proven reachable. Roll back by disabling the notice in admin. A currently open modal re-checks when the app next resumes; verify this with an older-build device before relying on the kill switch operationally.
