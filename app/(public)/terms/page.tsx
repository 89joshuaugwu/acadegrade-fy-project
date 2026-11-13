import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalContact, legalLinkClass } from '@/components/marketing/LegalContact';
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { createPageMetadata } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';
import { DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of use',
  description: 'The rules for using AcadeGrade: eligibility and the under-18 rule, unofficial records, AI output, coins, acceptable use, account deletion, changes and governing law.',
  path: '/terms',
});

/** The version this text represents. Bump it with `config/legal.termsVersion` when the wording changes. */
const TERMS_VERSION = DEFAULT_LEGAL_VERSION;

function termsSections(email: string | null): LegalSection[] {
  const contact = <LegalContact email={email} subject="Terms of use question" />;

  return [
    {
      id: 'agreement',
      title: 'Agreement and eligibility',
      content: <>
        <p>These terms are an agreement between you and Joshua Chimaobie Ugwu, who operates AcadeGrade from Enugu State, Nigeria, for the AcadeGrade website, Android app and related services. By creating an account or using AcadeGrade you agree to these terms and acknowledge our <Link className={legalLinkClass} href="/privacy">Privacy notice</Link>.</p>
        <p><strong>Age.</strong> When you sign up we ask whether you are 18 or older. You must answer truthfully. If you are under 18 you can use AcadeGrade to record and track your results, but AI features, result scanning and earning coins are not available to you, and you should make sure a parent or guardian knows you use AcadeGrade. If you turn 18 you can update your age in Settings. We may restrict or correct an account whose age answer we believe is wrong.</p>
        <p>If you use AcadeGrade for another person or organisation, you confirm that you are authorised to accept these terms for them.</p>
      </>,
    },
    {
      id: 'account',
      title: 'Your account',
      content: <>
        <p>Give accurate registration information, keep it up to date, and protect your password and verification codes. You are responsible for activity on your account unless you promptly tell us about unauthorised access.</p>
        <p>Do not create misleading identities, impersonate another person, transfer an account, or try to get around registration, verification, rate limits or access controls.</p>
      </>,
    },
    {
      id: 'unofficial-records',
      title: 'Unofficial records',
      content: <>
        <p>Everything in AcadeGrade, including calculations, degree classes, forecasts, transcripts, share links and scanned results, is based on information you enter or confirm. <strong>AcadeGrade records are self-reported. They are not issued, verified or endorsed by any university or by the National Universities Commission</strong>, and AcadeGrade is not affiliated with any institution. Your institution&apos;s official records, rules and decisions always take precedence.</p>
        <p>You must not present an AcadeGrade transcript, share link or screenshot as an official record, alter one to mislead anyone, or use AcadeGrade to forge or misrepresent results. Doing so breaks these terms and may be a criminal offence. We may disable share links and accounts used this way.</p>
      </>,
    },
    {
      id: 'ai-output',
      title: 'AI features and their output',
      content: <>
        <p>AI features (Written Analysis, AI forecast labels, What-if notes and result scanning) are optional. They are available only to users aged 18 or over who have allowed AI processing, as explained in the Privacy notice.</p>
        <p>AI output is an automated estimate. It can be wrong, incomplete or out of date, and it is not official academic, financial or career advice. Check important decisions with your department, faculty or adviser, and always review scanned results before you save them. You are responsible for decisions you make using AI output.</p>
        <p>If an AI answer looks wrong, offensive or unsafe, report it with the report control on the answer, or contact {contact}.</p>
      </>,
    },
    {
      id: 'coins',
      title: 'Coins',
      content: <>
        <p>In the Android app you can earn coins by choosing to watch rewarded ads. Coins can only be used inside AcadeGrade, to unlock extra AI requests after your free allowance.</p>
        <ul>
          <li>Coins are earned only by watching rewarded ads. They cannot be bought.</li>
          <li>Coins are not money and have no cash value. They cannot be sold, transferred, gifted, exchanged for cash, airtime, data or anything else, or used outside AcadeGrade.</li>
          <li>We may change how many coins an ad earns, what a request costs, and daily and balance limits. Unused coins may expire, and we may remove or end coins, with reasonable notice in the app where we can give it.</li>
          <li>There are no refunds for coins. If a request you spent coins on fails, the coins are restored.</li>
          <li>We do not reward clicking on ads. We may remove coins, and suspend coin earning or the account, for fraud, automation, abuse or coins credited by a technical error.</li>
          <li>When you delete your account, your coins are deleted and cannot be restored.</li>
        </ul>
      </>,
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      content: <>
        <p>You must not misuse AcadeGrade. In particular, you must not interfere with the service, probe or bypass security, upload unlawful or malicious material, access another person&apos;s data without permission, generate automated or abusive traffic, manipulate ads or rewards, or use AcadeGrade or its output to deceive an institution, employer or anyone else.</p>
        <p>Only upload result slips and documents you have the right to use, and do not upload unnecessary personal information about other people.</p>
      </>,
    },
    {
      id: 'content',
      title: 'Your content and our rights',
      content: <>
        <p>You keep your rights in the information you submit. You give AcadeGrade the limited permission needed to host, process, copy and transmit it to provide, secure and improve the features you use.</p>
        <p>AcadeGrade&apos;s interface, branding, software and original content are protected by intellectual-property law. These terms do not transfer ownership of them to you.</p>
      </>,
    },
    {
      id: 'deletion',
      title: 'Ending your account',
      content: <>
        <p>You can stop using AcadeGrade at any time and delete your account in Settings, in the app or on the web. The <Link className={legalLinkClass} href="/account-deletion">account deletion page</Link> explains what is deleted and what may be kept for a short time.</p>
        <p>We may suspend or close accounts that seriously or repeatedly break these terms, or where the law requires it. Where appropriate we will tell you why.</p>
      </>,
    },
    {
      id: 'availability',
      title: 'Availability and liability',
      content: <>
        <p>We may maintain, change, limit or discontinue features, and may suspend access to deal with security, abuse, legal or operational risks. We aim for a reliable service but do not promise that it will be uninterrupted or error-free.</p>
        <p>To the extent the law allows, AcadeGrade is provided “as available”, and we are not responsible for institutional decisions, missed academic requirements, or losses caused by relying on self-reported, scanned, forecast or AI-generated information. Nothing in these terms excludes rights or liability that cannot legally be excluded. If part of these terms is unenforceable, the rest still applies.</p>
      </>,
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      content: <>
        <p>These terms have a version number (shown at the top). When we make a material change, we publish a new version and ask you to agree to it again in AcadeGrade before you continue using your account.</p>
      </>,
    },
    {
      id: 'law-contact',
      title: 'Governing law and contact',
      content: <>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria, without affecting any consumer rights you have under the law where you live.</p>
        <p>Questions about these terms: {contact}, or the <Link className={legalLinkClass} href="/support">support page</Link>.</p>
      </>,
    },
  ];
}

export default async function TermsPage() {
  const email = await getContactEmail();
  return (
    <LegalPage
      title="Terms of use"
      summary="The practical rules for using AcadeGrade, and where a personal academic tool ends and your institution's authority begins."
      version={TERMS_VERSION}
      effectiveDate="13 November 2026"
      sections={termsSections(email)}
    />
  );
}
