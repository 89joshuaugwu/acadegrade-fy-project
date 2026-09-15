import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy notice',
  description: 'Learn what information AcadeGrade handles, why it is used, how sharing and AI-assisted features work, and the choices available to you.',
  path: '/privacy',
});

const sections: LegalSection[] = [
  {
    id: 'information-we-handle',
    title: 'Information we handle',
    content: <>
      <p>We handle information you provide when creating and using an account, including your name, email address, matriculation number, institution, department, programme, academic timeline, courses, scores, grades, credit units, and preferences.</p>
      <p>When you use result scanning, we process the image or PDF you submit and the extracted course information. We may also receive technical information such as device type, browser, IP-derived region, request timestamps, error logs, and feature usage needed to operate and protect the service.</p>
    </>,
  },
  {
    id: 'how-we-use-data',
    title: 'How we use information',
    content: <>
      <p>We use information to provide account access, maintain your academic record, calculate performance metrics, generate transcripts, deliver requested notifications, improve reliability, prevent abuse, and respond to support requests.</p>
      <p>Academic calculations are based on the records and grading context available in AcadeGrade. They do not replace calculations or decisions made by your institution.</p>
    </>,
  },
  {
    id: 'ai-and-scanning',
    title: 'AI-assisted features and result scanning',
    content: <>
      <p>When you choose an AI-assisted or scanning feature, relevant content may be sent to a service provider that helps us extract text or generate the requested response. We limit the information sent to what is reasonably needed for that operation.</p>
      <p>Generated extractions, forecasts, and explanations can be incomplete or inaccurate. Review result-slip extractions before saving and verify academic guidance against your official records.</p>
    </>,
  },
  {
    id: 'sharing',
    title: 'Sharing and disclosure',
    content: <>
      <p>We do not sell your academic record. We may share information with service providers that support hosting, authentication, databases, email delivery, analytics, security, scanning, and AI-assisted features, subject to their role in delivering the service.</p>
      <p>If you create a share link, anyone with that link may be able to view the information included until the link expires or is revoked. Share links are not intended to replace official transcripts.</p>
      <p>We may disclose information when required by law, to protect users or the service, or as part of a business reorganisation with appropriate safeguards.</p>
    </>,
  },
  {
    id: 'retention-security',
    title: 'Retention and security',
    content: <>
      <p>We retain account and academic information while your account is active and for a limited period when reasonably needed for security, dispute resolution, legal obligations, or recovery. Retention periods can differ by data type and purpose.</p>
      <p>We use access controls, encrypted transport, managed infrastructure, and operational safeguards intended to protect information. No online system can guarantee absolute security, so please use a strong password and protect your verification codes and devices.</p>
    </>,
  },
  {
    id: 'choices',
    title: 'Your choices and rights',
    content: <>
      <p>You can review and update many profile and academic details from your account. You may also request access, correction, deletion, restriction, or another right available under applicable law.</p>
      <p>Deleting an account may not immediately remove limited records we must retain for security, fraud prevention, or legal compliance. To make a privacy request, contact <a className="font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline" href="mailto:support@acadegrade.com?subject=Privacy%20request">support@acadegrade.com</a>.</p>
    </>,
  },
  {
    id: 'children-changes',
    title: 'Age, changes, and contact',
    content: <>
      <p>AcadeGrade is intended for university students who can lawfully use the service. If local law requires consent from a parent or guardian, do not create an account without that consent.</p>
      <p>We may update this notice as the product, providers, or legal requirements change. Material updates will be communicated through an appropriate product or contact channel, and the effective date above will change.</p>
      <p>Questions can be sent through the <Link className="font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline" href="/support">support page</Link> or by email.</p>
    </>,
  },
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="Trust centre" title="Privacy notice" summary="This notice explains how AcadeGrade handles information when you use our website, mobile application, and connected services." effectiveDate="15 September 2026" sections={sections} />;
}
