import type { LegalDocumentId } from './versions';

/**
 * The text that is live before an admin publishes their own version. Written in
 * legal markup (see markup.ts). Never contains an email address: use {{contact}}.
 */
export interface BuiltinLegalDocument {
  version: string;
  /** YYYY-MM-DD */
  effectiveDate: string;
  title: string;
  summary: string;
  body: string;
}

export const BUILTIN_LEGAL: Record<LegalDocumentId, BuiltinLegalDocument> = {
  terms: {
    version: '2026-11-13',
    effectiveDate: '2026-11-13',
    title: 'Terms of use',
    summary: "The practical rules for using AcadeGrade, and where a personal academic tool ends and your institution's authority begins.",
    body: `## Agreement and eligibility {#agreement}

These terms are an agreement between you and Joshua Chimaobie Ugwu, who operates AcadeGrade from Enugu State, Nigeria, for the AcadeGrade website, Android app and related services. By creating an account or using AcadeGrade you agree to these terms and acknowledge our [Privacy notice](/privacy).

**Age.** When you sign up we ask whether you are 18 or older. You must answer truthfully. If you are under 18 you can use AcadeGrade to record and track your results, but AI features, result scanning and earning coins are not available to you, and you should make sure a parent or guardian knows you use AcadeGrade. If you turn 18 you can update your age in Settings. We may restrict or correct an account whose age answer we believe is wrong.

If you use AcadeGrade for another person or organisation, you confirm that you are authorised to accept these terms for them.

## Your account {#account}

Give accurate registration information, keep it up to date, and protect your password and verification codes. You are responsible for activity on your account unless you promptly tell us about unauthorised access.

Do not create misleading identities, impersonate another person, transfer an account, or try to get around registration, verification, rate limits or access controls.

## Unofficial records {#unofficial-records}

Everything in AcadeGrade, including calculations, degree classes, forecasts, transcripts, share links and scanned results, is based on information you enter or confirm. **AcadeGrade records are self-reported. They are not issued, verified or endorsed by any university or by the National Universities Commission**, and AcadeGrade is not affiliated with any institution. Your institution's official records, rules and decisions always take precedence.

You must not present an AcadeGrade transcript, share link or screenshot as an official record, alter one to mislead anyone, or use AcadeGrade to forge or misrepresent results. Doing so breaks these terms and may be a criminal offence. We may disable share links and accounts used this way.

## AI features and their output {#ai-output}

AI features (Written Analysis, AI forecast labels, What-if notes and result scanning) are optional. They are available only to users aged 18 or over who have allowed AI processing, as explained in the Privacy notice.

AI output is an automated estimate. It can be wrong, incomplete or out of date, and it is not official academic, financial or career advice. Check important decisions with your department, faculty or adviser, and always review scanned results before you save them. You are responsible for decisions you make using AI output.

If an AI answer looks wrong, offensive or unsafe, report it with the report control on the answer, or contact {{contact:Terms of use question}}.

## Coins {#coins}

In the Android app you can earn coins by choosing to watch rewarded ads. Coins can only be used inside AcadeGrade, to unlock extra AI requests after your free allowance.

- Coins are earned only by watching rewarded ads. They cannot be bought.
- Coins are not money and have no cash value. They cannot be sold, transferred, gifted, exchanged for cash, airtime, data or anything else, or used outside AcadeGrade.
- We may change how many coins an ad earns, what a request costs, and daily and balance limits. Unused coins may expire, and we may remove or end coins, with reasonable notice in the app where we can give it.
- There are no refunds for coins. If a request you spent coins on fails, the coins are restored.
- We do not reward clicking on ads. We may remove coins, and suspend coin earning or the account, for fraud, automation, abuse or coins credited by a technical error.
- When you delete your account, your coins are deleted and cannot be restored.

## Acceptable use {#acceptable-use}

You must not misuse AcadeGrade. In particular, you must not interfere with the service, probe or bypass security, upload unlawful or malicious material, access another person's data without permission, generate automated or abusive traffic, manipulate ads or rewards, or use AcadeGrade or its output to deceive an institution, employer or anyone else.

Only upload result slips and documents you have the right to use, and do not upload unnecessary personal information about other people.

## Your content and our rights {#content}

You keep your rights in the information you submit. You give AcadeGrade the limited permission needed to host, process, copy and transmit it to provide, secure and improve the features you use.

AcadeGrade's interface, branding, software and original content are protected by intellectual-property law. These terms do not transfer ownership of them to you.

## Ending your account {#deletion}

You can stop using AcadeGrade at any time and delete your account in Settings, in the app or on the web. The [account deletion page](/account-deletion) explains what is deleted and what may be kept for a short time.

We may suspend or close accounts that seriously or repeatedly break these terms, or where the law requires it. Where appropriate we will tell you why.

## Availability and liability {#availability}

We may maintain, change, limit or discontinue features, and may suspend access to deal with security, abuse, legal or operational risks. We aim for a reliable service but do not promise that it will be uninterrupted or error-free.

To the extent the law allows, AcadeGrade is provided “as available”, and we are not responsible for institutional decisions, missed academic requirements, or losses caused by relying on self-reported, scanned, forecast or AI-generated information. Nothing in these terms excludes rights or liability that cannot legally be excluded. If part of these terms is unenforceable, the rest still applies.

## Changes to these terms {#changes}

These terms have a version number (shown at the top). When we make a material change, we publish a new version and ask you to agree to it again in AcadeGrade before you continue using your account.

## Governing law and contact {#law-contact}

These terms are governed by the laws of the Federal Republic of Nigeria, without affecting any consumer rights you have under the law where you live.

Questions about these terms: {{contact:Terms of use question}}, or the [support page](/support).`,
  },
  privacy: {
    version: '2026-11-13',
    effectiveDate: '2026-11-13',
    title: 'Privacy notice',
    summary: 'How AcadeGrade handles your information on the website, in the Android app and in the services behind them, and the choices and rights you have.',
    body: `## Who runs AcadeGrade {#who-we-are}

AcadeGrade is operated by Joshua Chimaobie Ugwu, an individual based in Enugu State, Nigeria. The operator is the data controller for the information described in this notice.

Contact us about privacy at {{contact:Privacy request}}. Our data protection contact is Joshua Chimaobie Ugwu, who can be reached at the same address.

This notice covers the AcadeGrade website, the Android app and the services behind them. AcadeGrade is a personal academic planning tool. It is not affiliated with, issued by or verified by any university.

## Information we collect {#information-we-handle}

**You give us:**

- Account details: name, email address, matriculation number, institution, department, programme, level, academic timeline and, if you add one, a profile photo. If you sign in with Google, we receive your Google account name and email.
- Academic records: courses, scores, grades, credit units, semesters and sessions you enter or confirm.
- Your answers: your age group (18 or older, or under 18), the versions of these documents you accepted, your AI-processing choice and your product-news choice.
- Result slips you choose to scan (an image or PDF), and the course rows you confirm from them.
- Messages you send us and reports you make about AI answers.

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

Written Analysis, AI forecast labels, What-if notes and result scanning only run if you are 18 or older and have allowed AI processing. You can allow or withdraw it at any time in Settings → Privacy & AI choices. Withdrawing is as easy as allowing, and your records, calculations and the mathematical forecast keep working without it.

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

If you create a share link, anyone with the link can see the record it contains until the link expires (30 days) or you delete your account. Shared records are labelled as self-reported and unofficial.

We may disclose information when the law requires it, to protect users or the service, or as part of a reorganisation of the operator with equivalent protection.

## Where your data is stored {#transfers}

AcadeGrade is hosted outside Nigeria. Our providers (Google/Firebase, Vercel, Cloudinary, Groq, OpenRouter and our ad partners) store or process data mainly in the United States, and possibly in other countries where they operate. The Nigeria Data Protection Commission has not issued an adequacy decision for these countries, so your data may not have the same level of protection there as in Nigeria.

We rely on: our contracts with these providers, including their data-processing terms and contractual clauses; the need to transfer data to provide the service you asked for; and, for AI features and personalised ads, your consent. We also use encryption in transit and access controls. Contact {{contact:Privacy request}} for details of these safeguards.

## How long we keep information {#retention-security}

| Information | How long |
| --- | --- |
| Account, profile and academic records, saved AI analysis, notifications | While your account is open. Deleted when you delete your account. Copies in backups: up to 30 days. |
| Share-link snapshots | The link stops working 30 days after it is created. An expired snapshot can no longer be viewed, and it is deleted when you revoke the link or delete your account. |
| Verification codes | Expire after 5 minutes. |
| Rewarded-ad sessions (Android) | Expire after 30 minutes and are marked for deletion a day later. |
| Coin balance and coin history (stored under a one-way hash of your user ID) | While your account is open. Deleted when you delete your account. |
| Request, security and rate-limit records linked to your account | Up to 90 days, and deleted when you delete your account. |
| Scanned result-slip files | Not stored. They are processed during the scan only. AI providers may keep request logs as described above. |
| Profile photo | Until you replace it or delete your account. Cached copies on the image network: up to 30 days. |
| Emails we have sent, and logs held by our hosting and AI providers | Our own server logs: up to 90 days. Our hosting, email and AI providers keep their own logs under their own policies. |
| Your cookie choice | Up to 180 days on your device. |

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

Questions: {{contact:Privacy request}}, or the [support page](/support).`,
  },
};
