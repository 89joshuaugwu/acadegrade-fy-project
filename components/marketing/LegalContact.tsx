import Link from 'next/link';
import { contactHref } from '@/lib/site/contact-email';

export const legalLinkClass = 'font-semibold text-[var(--acade-primary)] underline underline-offset-4';

/**
 * The configured contact address as a mailto, or the support page when no
 * address is published. Never hard-codes an address.
 */
export function LegalContact({ email, subject }: { email: string | null; subject?: string }) {
  if (email) {
    return <a className={legalLinkClass} href={contactHref(email, subject)}>{email}</a>;
  }
  return <Link className={legalLinkClass} href="/support">the AcadeGrade support page</Link>;
}
