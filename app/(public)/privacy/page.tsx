import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalContact, legalLinkClass } from '@/components/marketing/LegalContact';
import { LegalPage, Placeholder, type LegalSection } from '@/components/marketing/LegalPage';
import { createPageMetadata } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';
import { DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy notice',
  description: 'What AcadeGrade collects, why, the lawful basis for each use, AI providers, international transfers, retention, ads and cookies, under-18 rules and your rights.',
  path: '/privacy',
});

/** The version this text represents. Bump it with `config/legal.privacyVersion` when the wording changes. */
const PRIVACY_NOTICE_VERSION = DEFAULT_LEGAL_VERSION;

const PRIVACY_SUBJECT = 'Privacy request';

function privacySections(email: string | null): LegalSection[] {
  const contact = <LegalContact email={email} subject={PRIVACY_SUBJECT} />;

  return [
    {
      id: 'who-we-are',
      title: 'Who runs AcadeGrade',
      content: <>
        <p>AcadeGrade is operated by <Placeholder>OPERATOR NAME</Placeholder>, <Placeholder>OPERATOR ADDRESS</Placeholder> (<Placeholder>REGISTRATION NUMBER, IF ANY</Placeholder>). The operator is the data controller for the information described in this notice.</p>
        <p>Contact us about privacy at {contact}. Our data protection officer can be reached at <Placeholder>DPO CONTACT</Placeholder>.</p>
        <p>This notice covers the AcadeGrade website, the Android app and the services behind them. AcadeGrade is a personal academic planning tool. It is not affiliated with, issued by or verified by any university.</p>
      </>,
    },
    {
      id: 'information-we-handle',
      title: 'Information we collect',
      content: <>
        <p><strong>You give us:</strong></p>
        <ul>
          <li>Account details: name, email address, matriculation number, institution, department, programme, level, academic timeline and, if you add one, a profile photo. If you sign in with Google, we receive your Google account name and email.</li>
          <li>Academic records: courses, scores, grades, credit units, semesters and sessions you enter or confirm.</li>
          <li>Your answers: your age group (18 or older, or under 18), the versions of these documents you accepted, your AI-processing choice and your product-news choice.</li>
          <li>Result slips you choose to scan (an image or PDF), and the course rows you confirm from them.</li>
          <li>Messages you send us and reports you make about AI answers.</li>
        </ul>
        <p><strong>Created as you use AcadeGrade:</strong></p>
        <ul>
          <li>Calculations (GPA, CGPA, Performance Index), forecasts and saved AI analysis.</li>
          <li>Share links you create, notifications, and device push tokens if you turn notifications on.</li>
          <li>In the Android app: your coin balance and coin history, and records of rewarded ads you choose to watch.</li>
          <li>Security and operations records: request logs, rate-limit records, error logs, device and browser type, and approximate region derived from IP address.</li>
          <li>Your cookie choice, stored on your device.</li>
        </ul>
      </>,
    },
    {
      id: 'how-we-use-data',
      title: 'How we use information, and why we are allowed to',
      content: <>
        <p>Under the Nigeria Data Protection Act 2023 (NDPA) each use needs a lawful basis:</p>
        <table>
          <thead><tr><th scope="col">What we do</th><th scope="col">Lawful basis</th></tr></thead>
          <tbody>
            <tr><td>Run your account, store your records, calculate your results, make transcripts and the share links you create, send service notifications.</td><td>Contract: it is needed to provide the service you asked for.</td></tr>
            <tr><td>Verification codes, security, fraud and abuse prevention, rate limits, protecting rewarded ads against replay.</td><td>Legitimate interests in keeping AcadeGrade and its users safe.</td></tr>
            <tr><td>AI analysis, AI forecast labels, what-if notes and result scanning through our AI providers.</td><td>Your consent, which also covers sending that data abroad. It is optional and off until you turn it on.</td></tr>
            <tr><td>Personalised ads, ad measurement and non-essential cookies.</td><td>Your consent.</td></tr>
            <tr><td>Occasional product news by email.</td><td>Your consent. It is off unless you turn it on.</td></tr>
            <tr><td>Keeping records the law requires, answering lawful requests, and handling breaches.</td><td>Legal obligation.</td></tr>
          </tbody>
        </table>
        <p>Your calculations and forecasts are automated estimates about your own results. They are not decisions about you and have no legal effect. If you want a person to look at how an estimate was produced, contact us.</p>
      </>,
    },
    {
      id: 'ai-and-scanning',
      title: 'AI processing and result scanning',
      content: <>
        <p>Written Analysis, AI forecast labels, What-if notes and result scanning only run if you are 18 or older and have allowed AI processing. You can allow or withdraw it at any time in Settings → Privacy &amp; AI choices. Withdrawing is as easy as allowing, and your records, calculations and the mathematical forecast keep working without it.</p>
        <p>When you use one of these features, we send the data needed for that request to these AI providers, who process it on our behalf:</p>
        <ul>
          <li>Google (Gemini API)</li>
          <li>Groq</li>
          <li>OpenRouter, which may route a request to other model providers</li>
        </ul>
        <p>What is sent: your courses, scores, grades, GPA/CGPA and programme details. We remove your name, email, matriculation number and similar identifiers from Written Analysis requests. Forecast and What-if requests send numbers only.</p>
        <p><strong>A scanned result slip is sent as the whole image or PDF, so it can show your name and matriculation number.</strong> We do not keep the file after the scan; only the rows you confirm are saved.</p>
        <p>These providers are in the United States and possibly other countries. Some keep request logs for a limited time for abuse monitoring (for example, up to 55 days). Where a provider lets us, we ask that your data is not used to train models; for OpenRouter we request providers that do not collect data. AI output can be wrong or incomplete. It is guidance only and never replaces your institution&apos;s records, rules or advisers. You can report an AI answer from the answer itself.</p>
      </>,
    },
    {
      id: 'sharing',
      title: 'Who we share information with',
      content: <>
        <p>We do not sell your personal information. We share it only with service providers that process it for us, and as described here:</p>
        <ul>
          <li>Google: Firebase Authentication, Cloud Firestore, Realtime Database and Cloud Messaging (hosting your account and records), the Gemini API (AI, with your consent), AdMob and AdSense (ads), and Gmail (sending email).</li>
          <li>Vercel: website hosting and server functions.</li>
          <li>Cloudinary: profile photos.</li>
          <li>Groq and OpenRouter: AI processing, with your consent.</li>
          <li>Partner ad networks shown on the website after you allow ads, currently <Placeholder>AD PARTNERS — e.g., Adsterra</Placeholder>.</li>
        </ul>
        <p>If you create a share link, anyone with the link can see the record it contains until the link expires (30 days) or you delete your account. Shared records are labelled as self-reported and unofficial.</p>
        <p>We may disclose information when the law requires it, to protect users or the service, or as part of a reorganisation of the operator with equivalent protection.</p>
      </>,
    },
    {
      id: 'transfers',
      title: 'Where your data is stored',
      content: <>
        <p>AcadeGrade is hosted outside Nigeria. Our providers (Google/Firebase, Vercel, Cloudinary, Groq, OpenRouter and our ad partners) store or process data mainly in the United States, and possibly in other countries where they operate. The Nigeria Data Protection Commission has not issued an adequacy decision for these countries, so your data may not have the same level of protection there as in Nigeria.</p>
        <p>We rely on: our contracts with these providers, including their data-processing terms and contractual clauses; the need to transfer data to provide the service you asked for; and, for AI features and personalised ads, your consent. We also use encryption in transit and access controls. Contact {contact} for details of these safeguards.</p>
      </>,
    },
    {
      id: 'retention-security',
      title: 'How long we keep information',
      content: <>
        <table>
          <thead><tr><th scope="col">Information</th><th scope="col">How long</th></tr></thead>
          <tbody>
            <tr><td>Account, profile and academic records, saved AI analysis, notifications</td><td>While your account is open. Deleted when you delete your account. Copies in backups: <Placeholder>RETENTION PERIOD</Placeholder>.</td></tr>
            <tr><td>Share-link snapshots</td><td>The link stops working 30 days after it is created. The snapshot is deleted when you delete your account; automatic clean-up of expired snapshots: <Placeholder>RETENTION PERIOD</Placeholder>.</td></tr>
            <tr><td>Verification codes</td><td>Expire after 5 minutes.</td></tr>
            <tr><td>Rewarded-ad sessions (Android)</td><td>Expire after 30 minutes and are marked for deletion a day later.</td></tr>
            <tr><td>Coin balance and coin history (stored under a one-way hash of your user ID)</td><td>While your account is open. Deleted when you delete your account.</td></tr>
            <tr><td>Request, security and rate-limit records linked to your account</td><td><Placeholder>RETENTION PERIOD</Placeholder>, and deleted when you delete your account.</td></tr>
            <tr><td>Scanned result-slip files</td><td>Not stored. They are processed during the scan only. AI providers may keep request logs as described above.</td></tr>
            <tr><td>Profile photo</td><td>Until you replace it or delete your account. Cached copies on the image network: <Placeholder>RETENTION PERIOD</Placeholder>.</td></tr>
            <tr><td>Emails we have sent, and logs held by our hosting and AI providers</td><td><Placeholder>RETENTION PERIOD</Placeholder>.</td></tr>
            <tr><td>Your cookie choice</td><td>Up to 180 days on your device.</td></tr>
          </tbody>
        </table>
        <p>See the <Link className={legalLinkClass} href="/account-deletion">account deletion page</Link> for what happens when you delete your account.</p>
      </>,
    },
    {
      id: 'ads-cookies',
      title: 'Ads, cookies and your consent',
      content: <>
        <p><strong>On the website,</strong> we use necessary storage to keep you signed in, remember your theme and remember your cookie choice. These need no consent. Ads and analytics cookies are used only if you choose “Allow ads &amp; analytics” in the cookie choices panel; with “Necessary only”, AdSense and partner ads are not loaded. You can change your choice at any time from <a className={legalLinkClass} href="#cookie-choices">Cookie choices</a>, also linked in the footer of every page.</p>
        <p>When you allow ads, third-party vendors including Google use cookies to serve ads based on your prior visits to this and other websites. Google&apos;s use of advertising cookies lets it and its partners serve ads based on those visits. You can opt out of personalised advertising in <a className={legalLinkClass} href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ads Settings</a>.</p>
        <p><strong>In the Android app,</strong> Google AdMob shows ads and may use your device&apos;s advertising ID. <Placeholder>ANDROID AD CONSENT — describe the consent message shown in the app</Placeholder>. Rewarded ads are optional: you choose to watch one to earn coins that unlock extra AI requests. Coins have no cash value.</p>
      </>,
    },
    {
      id: 'children',
      title: 'Users under 18',
      content: <>
        <p>We ask your age group when you sign up. If you are under 18, you can still track your results, but AI features and result scanning are turned off, so none of your data is sent to AI providers, and you cannot earn coins for AI requests. If you are under 18, please make sure a parent or guardian knows you use AcadeGrade.</p>
        <p>If you turn 18, you can update this in Settings → Privacy &amp; AI choices. To correct an age you entered by mistake, contact {contact}.</p>
      </>,
    },
    {
      id: 'choices',
      title: 'Your rights and how to use them',
      content: <>
        <ul>
          <li><strong>Access and a copy of your data:</strong> use Download my data in Settings → Privacy &amp; AI choices. It gives you your profile, semesters, courses, saved analysis and notifications as a file you can keep or move elsewhere.</li>
          <li><strong>Correction:</strong> edit your profile and results in the app at any time.</li>
          <li><strong>Deletion:</strong> delete your account in Settings, or follow the steps on the <Link className={legalLinkClass} href="/account-deletion">account deletion page</Link>.</li>
          <li><strong>Withdrawing consent:</strong> turn off AI processing or product news in Settings → Privacy &amp; AI choices, and change cookies from Cookie choices. Withdrawing does not affect processing that already happened.</li>
          <li><strong>Objection and restriction:</strong> you can object to processing based on our legitimate interests, and to direct marketing at any time.</li>
          <li><strong>Automated estimates:</strong> you can ask a person to review how a calculation or forecast about you was produced.</li>
        </ul>
        <p>For anything you cannot do in the app, contact {contact}. We may need to confirm your identity. We aim to respond within <Placeholder>RESPONSE TIME — e.g., 21 days</Placeholder>.</p>
      </>,
    },
    {
      id: 'complaints',
      title: 'Complaints',
      content: <>
        <p>If you are unhappy with how we handle your data, please contact us first at {contact}. You also have the right to complain to the <a className={legalLinkClass} href="https://ndpc.gov.ng" rel="noopener noreferrer" target="_blank">Nigeria Data Protection Commission (NDPC)</a>.</p>
      </>,
    },
    {
      id: 'security-breaches',
      title: 'Security and data breaches',
      content: <>
        <p>We use encrypted connections, access controls, server-only handling of sensitive operations, and limits on what is sent to third parties. No online service can guarantee complete security, so please use a strong password and keep verification codes private.</p>
        <p>If a personal data breach is likely to put your rights at risk, we will notify the Nigeria Data Protection Commission within 72 hours of becoming aware of it. If the risk to you is high, we will tell you directly and promptly, in plain language, with steps you can take. We keep a record of every breach.</p>
      </>,
    },
    {
      id: 'changes-contact',
      title: 'Changes to this notice',
      content: <>
        <p>This notice has a version number (shown at the top). When we make a material change, we publish a new version and ask you to review it again in AcadeGrade before you continue.</p>
        <p>Questions: {contact}, or the <Link className={legalLinkClass} href="/support">support page</Link>.</p>
      </>,
    },
  ];
}

export default async function PrivacyPage() {
  const email = await getContactEmail();
  return (
    <LegalPage
      title="Privacy notice"
      summary="How AcadeGrade handles your information on the website, in the Android app and in the services behind them, and the choices and rights you have."
      version={PRIVACY_NOTICE_VERSION}
      effectiveDate="13 November 2026"
      sections={privacySections(email)}
    />
  );
}
