import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of use',
  description: 'Read the terms governing access to AcadeGrade, acceptable use, academic-information boundaries, account responsibilities, and service availability.',
  path: '/terms',
});

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement and eligibility',
    content: <>
      <p>These terms govern your use of AcadeGrade&apos;s website, mobile application, and related services. By creating an account or using the service, you agree to these terms and our <Link className="font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline" href="/privacy">Privacy Notice</Link>.</p>
      <p>You must be able to enter a binding agreement under applicable law. If you use AcadeGrade for another person or organisation, you confirm that you are authorised to accept these terms for them.</p>
    </>,
  },
  {
    id: 'account',
    title: 'Your account',
    content: <>
      <p>Provide accurate registration information, keep it current, and protect your password and one-time verification codes. You are responsible for activity carried out through your account unless you promptly report unauthorised access.</p>
      <p>Do not create misleading identities, impersonate another person, transfer an account without permission, or attempt to bypass registration, verification, rate limits, or access controls.</p>
    </>,
  },
  {
    id: 'academic-boundary',
    title: 'Academic-information boundary',
    content: <>
      <p>AcadeGrade is a personal tracking and planning tool. Calculations, degree classifications, forecasts, transcripts, extracted results, and AI-assisted responses are informational and may be incomplete or inaccurate.</p>
      <p>Your institution&apos;s official records, regulations, and decisions always take precedence. You remain responsible for checking entered and extracted information and for decisions made using the service.</p>
    </>,
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    content: <>
      <p>You may not misuse the service, interfere with its operation, probe or bypass security controls, upload unlawful or malicious material, access another person&apos;s data without permission, automate abusive traffic, or use outputs to deceive an institution or third party.</p>
      <p>You must have the right to upload any result slip or other document you submit. Do not upload unnecessary sensitive information about another person.</p>
    </>,
  },
  {
    id: 'content',
    title: 'Your content and product rights',
    content: <>
      <p>You retain your rights in information you submit. You give AcadeGrade the limited permission needed to host, process, reproduce, and transmit that information to operate, secure, and improve features you request.</p>
      <p>AcadeGrade, its interface, branding, software, and original content remain protected by applicable intellectual-property laws. These terms do not transfer ownership of the product to you.</p>
    </>,
  },
  {
    id: 'availability',
    title: 'Availability, changes, and termination',
    content: <>
      <p>We may maintain, change, limit, or discontinue features and may suspend access needed to address security, abuse, legal, or operational risks. We aim for reliable service but do not promise uninterrupted or error-free availability.</p>
      <p>You may stop using AcadeGrade or request account deletion. We may suspend or terminate accounts that materially breach these terms, subject to applicable law.</p>
    </>,
  },
  {
    id: 'liability-contact',
    title: 'Disclaimers, responsibility, and contact',
    content: <>
      <p>To the extent permitted by law, the service is provided on an “as available” basis. AcadeGrade is not responsible for institutional decisions, missed academic requirements, or losses caused by relying on unofficial, user-entered, extracted, forecast, or generated information.</p>
      <p>Nothing in these terms excludes rights or liability that cannot legally be excluded. If part of these terms is unenforceable, the remaining terms continue to apply.</p>
      <p>We may update these terms and will communicate material changes appropriately. Questions can be sent through the <Link className="font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline" href="/support">support page</Link> or to support@acadegrade.com.</p>
    </>,
  },
];

export default function TermsPage() {
  return <LegalPage eyebrow="Service terms" title="Terms of use" summary="These terms set the practical rules for using AcadeGrade and clarify where a personal academic tool ends and your institution's authority begins." effectiveDate="15 September 2026" sections={sections} />;
}
