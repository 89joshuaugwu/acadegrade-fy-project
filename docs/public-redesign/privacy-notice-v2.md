# Privacy notice, version 2 (ready to publish)

This is the corrected Privacy notice (owner decision A2, `pages/legal-privacy.md` §13). It is the same text as the built-in fallback in `lib/legal/builtin.ts`. Nothing has been published to Firestore.

## How to publish

1. Open **Admin → Legal documents** and pick **Privacy**.
2. Paste the fields below: Title, Summary, Effective date, and the Body (everything between the two `BODY` lines, without those lines).
3. Optional change note: "Share links last 1, 7 or 30 days, with an optional PIN and a summary-only option; support requests, timetables and catalogue suggestions added; AI features named AcadeMind."
4. Choose **Save draft**, check the preview shows no formatting problems, then **Publish**. Publishing asks every student to agree again.

Have a Nigerian data-protection lawyer review the wording before you publish.

## What changed from version 2026-11-13

- Share links: expire after the period the student chooses (1, 7 or 30 days), can carry a PIN, and can share a summary only. Expired snapshots are removed by the daily clean-up.
- Information we collect: timetables, catalogue suggestions, and help and support requests (including from the public Support page without signing in).
- AI features are named as **AcadeMind**; Build with AcadeMind (the timetable builder) is stated to use fixed rules and no AI providers.
- Retention table: timetables in the account row; new rows for help and support requests (until 180 days after closing), catalogue suggestions, and the note kept while an account deletion is in progress (within 21 days).

## Fields

- **Title:** Privacy notice
- **Version:** 2026-11-17
- **Effective date:** 2026-11-17
- **Summary:** How AcadeGrade handles your information on the website, in the Android app and in the services behind them, and the choices and rights you have.

BODY (start)

## Who runs AcadeGrade {#who-we-are}

AcadeGrade is operated by Joshua Chimaobie Ugwu, an individual based in Enugu State, Nigeria. The operator is the data controller for the information described in this notice.

Contact us about privacy at {{contact:Privacy request}}. Our data protection contact is Joshua Chimaobie Ugwu, who can be reached at the same address.

This notice covers the AcadeGrade website, the Android app and the services behind them. AcadeGrade is a personal academic planning tool. It is not affiliated with, issued by or verified by any university.

## Information we collect {#information-we-handle}

**You give us:**

- Account details: name, email address, matriculation number, institution, department, programme, level, academic timeline and, if you add one, a profile photo. If you sign in with Google, we receive your Google account name and email.
- Academic records: courses, scores, grades, credit units, semesters and sessions you enter or confirm.
- Your answers: your age group (18 or older, or under 18), the versions of these documents you accepted, your AI-processing choice and your product-news choice.
- Result slips you choose to scan (an image or PDF), and the course rows you confirm from them.
- Timetables you build: lectures, reading and exams, and their reminders.
- Suggestions you send for the university and course lists.
- Help and support requests you send us (from your account, or from the Support page without signing in), and reports you make about AI answers.

**Created as you use AcadeGrade:**

- Calculations (GPA, CGPA, Performance Index), forecasts and saved AI analysis.
- Share links you create, notifications, and device push tokens if you turn notifications on.
- In the Android app: your coin balance and coin history, and records of rewarded ads you choose to watch.
- Security and operations records: request logs, rate-limit records, error logs, device and browser type, and approximate region derived from IP address.
- Your cookie choice, stored on your device.

## How we use information, and why we are allowed to {#how-we-use-data}

Under the Nigeria Data Protection Act 2023 (NDPA) each use needs a lawful basis:

| What we do | Lawful basis |
| --- | --- |
| Run your account, store your records, calculate your results, make transcripts and the share links you create, send service notifications. | Contract: it is needed to provide the service you asked for. |
| Verification codes, security, fraud and abuse prevention, rate limits, protecting rewarded ads against replay. | Legitimate interests in keeping AcadeGrade and its users safe. |
| AI analysis, AI forecast labels, what-if notes and result scanning through our AI providers. | Your consent, which also covers sending that data abroad. It is optional and off until you turn it on. |
| Personalised ads, ad measurement and non-essential cookies. | Your consent. |
| Occasional product news by email. | Your consent. It is off unless you turn it on. |
| Keeping records the law requires, answering lawful requests, and handling breaches. | Legal obligation. |

Your calculations and forecasts are automated estimates about your own results. They are not decisions about you and have no legal effect. If you want a person to look at how an estimate was produced, contact us.

## AI processing and result scanning {#ai-and-scanning}

AcadeGrade's AI features are shown in the app as **AcadeMind**: Written Analysis, AI forecast labels, What-if notes and result scanning. They only run if you are 18 or older and have allowed AI processing. You can allow or withdraw it at any time in Settings → Privacy & AI choices. Withdrawing is as easy as allowing, and your records, calculations and the mathematical forecast keep working without it.

**Build with AcadeMind**, the timetable builder, works by fixed rules inside AcadeGrade. It does not send your data to AI providers and does not need AI processing to be allowed.

When you use one of these features, we send the data needed for that request to these AI providers, who process it on our behalf:

- Google (Gemini API)
- Groq
- OpenRouter, which may route a request to other model providers

What is sent: your courses, scores, grades, GPA/CGPA and programme details. We remove your name, email, matriculation number and similar identifiers from Written Analysis requests. Forecast and What-if requests send numbers only.

**A scanned result slip is sent as the whole image or PDF, so it can show your name and matriculation number.** We do not keep the file after the scan; only the rows you confirm are saved.

These providers are in the United States and possibly other countries. Some keep request logs for a limited time for abuse monitoring (for example, up to 55 days). Where a provider lets us, we ask that your data is not used to train models; for OpenRouter we request providers that do not collect data. AI output can be wrong or incomplete. It is guidance only and never replaces your institution's records, rules or advisers. You can report an AI answer from the answer itself.

## Who we share information with {#sharing}

We do not sell your personal information. We share it only with service providers that process it for us, and as described here:

- Google: Firebase Authentication, Cloud Firestore, Realtime Database and Cloud Messaging (hosting your account and records), the Gemini API (AI, with your consent), AdMob and AdSense (ads), and Gmail (sending email).
- Vercel: website hosting and server functions.
- Cloudinary: profile photos.
- Groq and OpenRouter: AI processing, with your consent.
- Partner ad networks shown on the website after you allow ads, currently Google AdSense and Adsterra.

If you create a share link, anyone with the link can see the record it contains until the link expires after the period you choose (1, 7 or 30 days), you revoke it, or you delete your account. You can protect a link with a PIN, which the viewer must enter, and you can share a summary only (your results without course rows). Shared records are labelled as self-reported and unofficial.

We may disclose information when the law requires it, to protect users or the service, or as part of a reorganisation of the operator with equivalent protection.

## Where your data is stored {#transfers}

AcadeGrade is hosted outside Nigeria. Our providers (Google/Firebase, Vercel, Cloudinary, Groq, OpenRouter and our ad partners) store or process data mainly in the United States, and possibly in other countries where they operate. The Nigeria Data Protection Commission has not issued an adequacy decision for these countries, so your data may not have the same level of protection there as in Nigeria.

We rely on: our contracts with these providers, including their data-processing terms and contractual clauses; the need to transfer data to provide the service you asked for; and, for AI features and personalised ads, your consent. We also use encryption in transit and access controls. Contact {{contact:Privacy request}} for details of these safeguards.

## How long we keep information {#retention-security}

| Information | How long |
| --- | --- |
| Account, profile and academic records, timetables, saved AI analysis, notifications | While your account is open. Deleted when you delete your account. Copies in backups: up to 30 days. |
| Share-link snapshots | The link stops working after the period you choose (1, 7 or 30 days). An expired snapshot can no longer be viewed and is deleted by our daily clean-up. It is also deleted when you revoke the link or delete your account. |
| Help and support requests | Until 180 days after the request is closed. Requests sent from your account are deleted when you delete your account. |
| Suggestions for the university and course lists | While your account is open. Deleted when you delete your account. A name we add to the lists stays there, without your details. |
| Verification codes | Expire after 5 minutes. |
| Rewarded-ad sessions (Android) | Expire after 30 minutes and are marked for deletion a day later. |
| Coin balance and coin history (stored under a one-way hash of your user ID) | While your account is open. Deleted when you delete your account. |
| Request, security and rate-limit records linked to your account | Up to 90 days, and deleted when you delete your account. |
| Scanned result-slip files | Not stored. They are processed during the scan only. AI providers may keep request logs as described above. |
| Profile photo | Until you replace it or delete your account. Cached copies on the image network: up to 30 days. |
| Emails we have sent, and logs held by our hosting and AI providers | Our own server logs: up to 90 days. Our hosting, email and AI providers keep their own logs under their own policies. |
| Your cookie choice | Up to 180 days on your device. |
| A note of an account deletion in progress (your user ID and email) | Until the deletion is complete, within 21 days of your request. |

See the [account deletion page](/account-deletion) for what happens when you delete your account.

## Ads, cookies and your consent {#ads-cookies}

**On the website,** we use necessary storage to keep you signed in, remember your theme and remember your cookie choice. These need no consent. Ads and analytics cookies are used only if you choose “Allow ads & analytics” in the cookie choices panel; with “Necessary only”, AdSense and partner ads are not loaded. You can change your choice at any time from [Cookie choices](#cookie-choices), also linked in the footer of every page.

When you allow ads, third-party vendors including Google use cookies to serve ads based on your prior visits to this and other websites. Google's use of advertising cookies lets it and its partners serve ads based on those visits. You can opt out of personalised advertising in [Google Ads Settings](https://adssettings.google.com).

**In the Android app,** Google AdMob shows ads and may use your device's advertising ID. Where the law requires it, the app shows Google's consent message before any ad loads, and you can change your choice later from the app's privacy options. If consent cannot be confirmed, the app does not request ads. For users under 18, or whose age is not yet confirmed, ads are limited to content suitable for all ages and are not personalised. Rewarded ads are optional: you choose to watch one to earn coins that unlock extra AI requests. Coins have no cash value.

## Users under 18 {#children}

We ask your age group when you sign up. If you are under 18, you can still track your results, but AI features and result scanning are turned off, so none of your data is sent to AI providers, and you cannot earn coins for AI requests. If you are under 18, please make sure a parent or guardian knows you use AcadeGrade.

If you turn 18, you can update this in Settings → Privacy & AI choices. To correct an age you entered by mistake, contact {{contact:Privacy request}}.

## Your rights and how to use them {#choices}

- **Access and a copy of your data:** use Download my data in Settings → Privacy & AI choices. It gives you your profile, semesters, courses, saved analysis and notifications as a file you can keep or move elsewhere.
- **Correction:** edit your profile and results in the app at any time.
- **Deletion:** delete your account in Settings, or follow the steps on the [account deletion page](/account-deletion).
- **Withdrawing consent:** turn off AI processing or product news in Settings → Privacy & AI choices, and change cookies from Cookie choices. Withdrawing does not affect processing that already happened.
- **Objection and restriction:** you can object to processing based on our legitimate interests, and to direct marketing at any time.
- **Automated estimates:** you can ask a person to review how a calculation or forecast about you was produced.

For anything you cannot do in the app, contact {{contact:Privacy request}}. We may need to confirm your identity. We aim to respond within 21 days.

## Complaints {#complaints}

If you are unhappy with how we handle your data, please contact us first at {{contact:Privacy request}}. You also have the right to complain to the [Nigeria Data Protection Commission (NDPC)](https://ndpc.gov.ng).

## Security and data breaches {#security-breaches}

We use encrypted connections, access controls, server-only handling of sensitive operations, and limits on what is sent to third parties. No online service can guarantee complete security, so please use a strong password and keep verification codes private.

If a personal data breach is likely to put your rights at risk, we will notify the Nigeria Data Protection Commission within 72 hours of becoming aware of it. If the risk to you is high, we will tell you directly and promptly, in plain language, with steps you can take. We keep a record of every breach.

## Changes to this notice {#changes-contact}

This notice has a version number (shown at the top). When we make a material change, we publish a new version and ask you to review it again in AcadeGrade before you continue.

Questions: {{contact:Privacy request}}, or the [support page](/support).

BODY (end)
